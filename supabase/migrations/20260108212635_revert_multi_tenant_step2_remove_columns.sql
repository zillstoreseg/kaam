/*
  # Step 2: Remove tenant columns and tables
  
  Drops tenant_id from all tables and removes tenant-related tables
*/

-- Drop tenant_id columns from all tables
DO $$
DECLARE
  business_tables text[] := ARRAY[
    'branches', 'students', 'attendance', 'packages', 'schemes', 'payments',
    'invoices', 'invoice_items', 'expenses', 'user_permissions', 'role_permissions',
    'permissions', 'exam_invitations', 'exam_participation', 'promotion_log',
    'student_schemes', 'package_schemes', 'student_renewals', 'whatsapp_messages',
    'membership_freeze_history', 'stock_items', 'stock_categories', 'stock_counts',
    'player_contacts', 'attendance_alerts', 'class_attendance', 'audit_logs', 'settings',
    'profiles'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY business_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'tenant_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS tenant_id CASCADE', tbl);
    END IF;
  END LOOP;
END $$;

-- Drop tenant-related tables
DROP TABLE IF EXISTS platform_audit CASCADE;
DROP TABLE IF EXISTS impersonation_sessions CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Drop tenant-related functions
DROP FUNCTION IF EXISTS is_platform_owner() CASCADE;
DROP FUNCTION IF EXISTS current_tenant_id() CASCADE;
DROP FUNCTION IF EXISTS current_impersonation_tenant() CASCADE;
DROP FUNCTION IF EXISTS effective_tenant_id() CASCADE;

-- Restore original profile role constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('super_admin', 'branch_manager', 'coach'));
