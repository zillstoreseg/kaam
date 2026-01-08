/*
  # Platform Audit and Production Enhancements

  ## 1. Platform Audit Table
    - `platform_audit`: Logs all platform-level actions (impersonation, tenant changes, etc.)
    - Includes actor, action, target tenant, metadata, and timestamps
    - Immutable audit trail for compliance

  ## 2. Settings Enhancements
    - Add contact email/phone for subscription blocks
    - Add brand domain for subdomain generation

  ## 3. Security
    - Enable RLS on platform_audit
    - Only platform owners can view audit logs
*/

-- ============================================================================
-- STEP 1: CREATE PLATFORM AUDIT TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS platform_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_name text NOT NULL,
  actor_role text NOT NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  tenant_id uuid REFERENCES tenants(id) ON DELETE SET NULL,
  tenant_name text,
  metadata jsonb,
  ip_address text,
  user_agent text
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_actor ON platform_audit(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_tenant ON platform_audit(tenant_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_action ON platform_audit(action);
CREATE INDEX IF NOT EXISTS idx_platform_audit_created ON platform_audit(created_at DESC);

COMMENT ON TABLE platform_audit IS 'Immutable audit trail for all platform-level actions';
COMMENT ON COLUMN platform_audit.action IS 'Actions: impersonation_start, impersonation_end, tenant_created, tenant_suspended, tenant_activated, subscription_extended, etc.';

-- ============================================================================
-- STEP 2: ENABLE RLS ON PLATFORM AUDIT
-- ============================================================================

ALTER TABLE platform_audit ENABLE ROW LEVEL SECURITY;

-- Platform owners can view all audit logs
DROP POLICY IF EXISTS "Platform owners can view all audit logs" ON platform_audit;
CREATE POLICY "Platform owners can view all audit logs" ON platform_audit
  FOR SELECT TO authenticated
  USING (is_platform_owner());

-- System can insert audit logs (via service role or triggers)
DROP POLICY IF EXISTS "System can insert audit logs" ON platform_audit;
CREATE POLICY "System can insert audit logs" ON platform_audit
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- STEP 3: ADD SETTINGS FOR CONTACT AND BRAND DOMAIN
-- ============================================================================

DO $$
BEGIN
  -- Add support_email if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'support_email'
  ) THEN
    ALTER TABLE settings ADD COLUMN support_email text;
  END IF;

  -- Add support_phone if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'support_phone'
  ) THEN
    ALTER TABLE settings ADD COLUMN support_phone text;
  END IF;

  -- Add support_whatsapp if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'support_whatsapp'
  ) THEN
    ALTER TABLE settings ADD COLUMN support_whatsapp text;
  END IF;

  -- Add brand_domain if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'brand_domain'
  ) THEN
    ALTER TABLE settings ADD COLUMN brand_domain text DEFAULT 'example.com';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTION TO LOG PLATFORM ACTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION log_platform_action(
  p_action text,
  p_entity_type text DEFAULT NULL,
  p_entity_id uuid DEFAULT NULL,
  p_tenant_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid AS $$
DECLARE
  v_actor_profile RECORD;
  v_tenant_name text;
  v_audit_id uuid;
BEGIN
  -- Get actor details
  SELECT id, full_name, role INTO v_actor_profile
  FROM profiles
  WHERE id = auth.uid();

  -- Get tenant name if tenant_id provided
  IF p_tenant_id IS NOT NULL THEN
    SELECT name INTO v_tenant_name
    FROM tenants
    WHERE id = p_tenant_id;
  END IF;

  -- Insert audit log
  INSERT INTO platform_audit (
    actor_user_id,
    actor_name,
    actor_role,
    action,
    entity_type,
    entity_id,
    tenant_id,
    tenant_name,
    metadata
  ) VALUES (
    auth.uid(),
    COALESCE(v_actor_profile.full_name, 'Unknown'),
    COALESCE(v_actor_profile.role, 'unknown'),
    p_action,
    p_entity_type,
    p_entity_id,
    p_tenant_id,
    v_tenant_name,
    p_metadata
  )
  RETURNING id INTO v_audit_id;

  RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_platform_action IS 'Helper function to log platform-level actions for audit trail';

-- ============================================================================
-- STEP 5: CREATE TRIGGER FOR IMPERSONATION LOGGING
-- ============================================================================

-- Function to log impersonation start
CREATE OR REPLACE FUNCTION log_impersonation_start()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_name text;
BEGIN
  SELECT name INTO v_tenant_name
  FROM tenants
  WHERE id = NEW.tenant_id;

  PERFORM log_platform_action(
    'impersonation_start',
    'impersonation_session',
    NEW.id,
    NEW.tenant_id,
    jsonb_build_object(
      'session_id', NEW.id,
      'tenant_name', v_tenant_name,
      'expires_at', NEW.expires_at
    )
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on impersonation_sessions insert
DROP TRIGGER IF EXISTS trigger_log_impersonation_start ON impersonation_sessions;
CREATE TRIGGER trigger_log_impersonation_start
  AFTER INSERT ON impersonation_sessions
  FOR EACH ROW
  EXECUTE FUNCTION log_impersonation_start();

-- Function to log impersonation end
CREATE OR REPLACE FUNCTION log_impersonation_end()
RETURNS TRIGGER AS $$
DECLARE
  v_tenant_name text;
BEGIN
  -- Only log when revoked changes to true
  IF NEW.revoked = true AND OLD.revoked = false THEN
    SELECT name INTO v_tenant_name
    FROM tenants
    WHERE id = NEW.tenant_id;

    PERFORM log_platform_action(
      'impersonation_end',
      'impersonation_session',
      NEW.id,
      NEW.tenant_id,
      jsonb_build_object(
        'session_id', NEW.id,
        'tenant_name', v_tenant_name,
        'duration_minutes', EXTRACT(EPOCH FROM (now() - NEW.created_at)) / 60
      )
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on impersonation_sessions update
DROP TRIGGER IF EXISTS trigger_log_impersonation_end ON impersonation_sessions;
CREATE TRIGGER trigger_log_impersonation_end
  AFTER UPDATE ON impersonation_sessions
  FOR EACH ROW
  WHEN (NEW.revoked = true AND OLD.revoked = false)
  EXECUTE FUNCTION log_impersonation_end();

-- ============================================================================
-- COMPLETED
-- ============================================================================

COMMENT ON TRIGGER trigger_log_impersonation_start ON impersonation_sessions IS 'Automatically logs when impersonation sessions are started';
COMMENT ON TRIGGER trigger_log_impersonation_end ON impersonation_sessions IS 'Automatically logs when impersonation sessions are ended';
