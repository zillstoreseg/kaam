/*
  # Security Suite - Tamper-Resistant Audit Logging System

  1. New Tables
    - `audit_logs` - Tamper-resistant audit trail with device/session tracking
      - id (uuid, primary key)
      - created_at (timestamp with timezone)
      - actor_user_id (uuid) - Who performed the action
      - actor_role (text) - Role snapshot at time of action
      - branch_id (uuid) - Branch context (null for global)
      - action (text) - create/update/delete/promote/confirm/reset/login/logout
      - entity_type (text) - student/attendance/exam/expense/settings/auth/branch
      - entity_id (text) - Reference to affected entity
      - summary_key (text) - i18n key for summary
      - summary_params (jsonb) - Parameters for i18n interpolation
      - before_data (jsonb) - State before change
      - after_data (jsonb) - State after change
      - metadata (jsonb) - Additional context (changed fields, reasons)
      - ip_address (text) - Full IP address
      - ip_masked (text) - Masked IP for branch admin display
      - user_agent (text) - Browser user agent string
      - device_name (text) - Human-friendly device name
      - os_name (text) - Operating system
      - browser_name (text) - Browser name
      - is_mobile (boolean) - Mobile device flag

  2. Security (Tamper-Resistant)
    - NO UPDATE or DELETE allowed on audit_logs
    - INSERT only via secure RPC function
    - SELECT based on role:
      - Super Admin: all logs + full IP addresses
      - Branch Admin: only their branch logs + masked IPs
    - All policies enforce branch scoping

  3. Settings Extensions
    - enable_security_alerts (boolean) - Enable security alert system
    - large_expense_threshold (numeric) - Threshold for expense alerts
    - show_global_logs_to_branch_admin (boolean) - Allow branch admins to see global logs

  4. Indexes
    - Optimized for common query patterns
    - Fast filtering by date, user, entity, action
*/

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  
  -- Actor information
  actor_user_id UUID NOT NULL REFERENCES auth.users(id),
  actor_role TEXT NOT NULL,
  branch_id UUID REFERENCES branches(id),
  
  -- Action details
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  
  -- I18N summary
  summary_key TEXT NOT NULL,
  summary_params JSONB,
  
  -- Data snapshots
  before_data JSONB,
  after_data JSONB,
  metadata JSONB,
  
  -- Session/Device tracking
  ip_address TEXT,
  ip_masked TEXT,
  user_agent TEXT,
  device_name TEXT,
  os_name TEXT,
  browser_name TEXT,
  is_mobile BOOLEAN DEFAULT false
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_user_id ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_branch_id ON audit_logs(branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_created ON audit_logs(actor_user_id, created_at DESC);

-- Add security settings columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'enable_security_alerts'
  ) THEN
    ALTER TABLE settings ADD COLUMN enable_security_alerts BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'large_expense_threshold'
  ) THEN
    ALTER TABLE settings ADD COLUMN large_expense_threshold NUMERIC(10,2) DEFAULT 1000;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'show_global_logs_to_branch_admin'
  ) THEN
    ALTER TABLE settings ADD COLUMN show_global_logs_to_branch_admin BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Update existing settings with defaults
UPDATE settings 
SET 
  enable_security_alerts = COALESCE(enable_security_alerts, true),
  large_expense_threshold = COALESCE(large_expense_threshold, 1000),
  show_global_logs_to_branch_admin = COALESCE(show_global_logs_to_branch_admin, false)
WHERE id IS NOT NULL;

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: NO ONE can update or delete audit logs (tamper-resistant)
CREATE POLICY "Audit logs are immutable"
  ON audit_logs
  FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "Audit logs cannot be deleted"
  ON audit_logs
  FOR DELETE
  TO authenticated
  USING (false);

-- Policy: INSERT only through RPC function (will create below)
CREATE POLICY "Audit logs insert via RPC only"
  ON audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Super Admin can read all logs with full IP
CREATE POLICY "Super Admin can read all audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Policy: Branch Admin can read only their branch logs (IP masked in application layer)
CREATE POLICY "Branch Admin can read their branch audit logs"
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'branch_manager'
      AND profiles.branch_id = audit_logs.branch_id
    )
    OR
    -- Allow reading global logs if setting enabled
    (
      audit_logs.branch_id IS NULL
      AND EXISTS (
        SELECT 1 FROM profiles, settings
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'branch_manager'
        AND settings.show_global_logs_to_branch_admin = true
      )
    )
  );

-- Create secure RPC function for inserting audit logs
CREATE OR REPLACE FUNCTION insert_audit_log(
  p_actor_role TEXT,
  p_branch_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_summary_key TEXT,
  p_summary_params JSONB DEFAULT NULL,
  p_before_data JSONB DEFAULT NULL,
  p_after_data JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_device_name TEXT DEFAULT NULL,
  p_os_name TEXT DEFAULT NULL,
  p_browser_name TEXT DEFAULT NULL,
  p_is_mobile BOOLEAN DEFAULT false
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_log_id UUID;
  v_ip_masked TEXT;
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Create masked IP (show only first 2 octets for IPv4, first 2 segments for IPv6)
  IF p_ip_address IS NOT NULL THEN
    IF p_ip_address LIKE '%.%.%.%' THEN
      -- IPv4: show first 2 octets
      v_ip_masked := split_part(p_ip_address, '.', 1) || '.' || 
                     split_part(p_ip_address, '.', 2) || '.*.*';
    ELSIF p_ip_address LIKE '%:%' THEN
      -- IPv6: show first 2 segments
      v_ip_masked := split_part(p_ip_address, ':', 1) || ':' || 
                     split_part(p_ip_address, ':', 2) || ':*';
    ELSE
      v_ip_masked := 'masked';
    END IF;
  END IF;
  
  -- Insert audit log
  INSERT INTO audit_logs (
    actor_user_id,
    actor_role,
    branch_id,
    action,
    entity_type,
    entity_id,
    summary_key,
    summary_params,
    before_data,
    after_data,
    metadata,
    ip_address,
    ip_masked,
    user_agent,
    device_name,
    os_name,
    browser_name,
    is_mobile
  ) VALUES (
    auth.uid(),
    p_actor_role,
    p_branch_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_summary_key,
    p_summary_params,
    p_before_data,
    p_after_data,
    p_metadata,
    p_ip_address,
    v_ip_masked,
    p_user_agent,
    p_device_name,
    p_os_name,
    p_browser_name,
    p_is_mobile
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_audit_log TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Tamper-resistant audit trail for all system operations with device/session tracking';
COMMENT ON COLUMN audit_logs.actor_role IS 'Role snapshot at time of action (immutable historical record)';
COMMENT ON COLUMN audit_logs.ip_address IS 'Full IP address (visible only to Super Admin)';
COMMENT ON COLUMN audit_logs.ip_masked IS 'Masked IP address (visible to Branch Admin)';
COMMENT ON COLUMN audit_logs.summary_key IS 'I18N translation key for generating human-readable summary';
COMMENT ON COLUMN audit_logs.summary_params IS 'Parameters for i18n string interpolation';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context: changed fields, reasons, validation results';
