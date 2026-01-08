/*
  # Ensure Role Permissions Exist for All Roles

  1. Purpose
    - Ensures that all default roles have proper permissions configured
    - Adds missing role permissions for super_admin, branch_manager, and coach roles
    - Prevents sidebar from being empty due to missing permissions

  2. Changes
    - Inserts default permissions for all pages for each role
    - Uses ON CONFLICT on (role, page) unique constraint
    - Sets appropriate access levels based on role hierarchy

  3. Security
    - No RLS changes, only data insertion
    - Permissions are properly scoped to tenant_id
*/

-- Get the first tenant_id to use for permissions (since unique constraint doesn't include tenant_id)
DO $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;

  -- Ensure super_admin has all permissions for all pages
  INSERT INTO role_permissions (tenant_id, role, page, can_view, can_create, can_edit, can_delete)
  VALUES 
    (v_tenant_id, 'super_admin', 'dashboard', true, false, false, false),
    (v_tenant_id, 'super_admin', 'students', true, true, true, true),
    (v_tenant_id, 'super_admin', 'attendance', true, true, true, true),
    (v_tenant_id, 'super_admin', 'packages', true, true, true, true),
    (v_tenant_id, 'super_admin', 'schemes', true, true, true, true),
    (v_tenant_id, 'super_admin', 'branches', true, true, true, true),
    (v_tenant_id, 'super_admin', 'stock', true, true, true, true),
    (v_tenant_id, 'super_admin', 'sales', true, true, true, true),
    (v_tenant_id, 'super_admin', 'invoices', true, true, true, true),
    (v_tenant_id, 'super_admin', 'reports', true, true, false, false),
    (v_tenant_id, 'super_admin', 'users', true, true, true, true),
    (v_tenant_id, 'super_admin', 'settings', true, true, true, true)
  ON CONFLICT (role, page) 
  DO UPDATE SET
    can_view = true,
    can_create = EXCLUDED.can_create,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete;

  -- Ensure branch_manager has permissions
  INSERT INTO role_permissions (tenant_id, role, page, can_view, can_create, can_edit, can_delete)
  VALUES 
    (v_tenant_id, 'branch_manager', 'dashboard', true, false, false, false),
    (v_tenant_id, 'branch_manager', 'students', true, true, true, true),
    (v_tenant_id, 'branch_manager', 'attendance', true, true, true, true),
    (v_tenant_id, 'branch_manager', 'packages', true, true, true, true),
    (v_tenant_id, 'branch_manager', 'schemes', true, true, true, true),
    (v_tenant_id, 'branch_manager', 'branches', true, false, false, false),
    (v_tenant_id, 'branch_manager', 'stock', true, true, true, true),
    (v_tenant_id, 'branch_manager', 'sales', true, true, true, true),
    (v_tenant_id, 'branch_manager', 'invoices', true, true, true, true),
    (v_tenant_id, 'branch_manager', 'reports', true, true, false, false),
    (v_tenant_id, 'branch_manager', 'users', true, false, false, false),
    (v_tenant_id, 'branch_manager', 'settings', true, false, true, false)
  ON CONFLICT (role, page) 
  DO UPDATE SET
    can_view = true,
    can_create = EXCLUDED.can_create,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete;

  -- Ensure coach has basic permissions
  INSERT INTO role_permissions (tenant_id, role, page, can_view, can_create, can_edit, can_delete)
  VALUES 
    (v_tenant_id, 'coach', 'dashboard', true, false, false, false),
    (v_tenant_id, 'coach', 'students', true, false, false, false),
    (v_tenant_id, 'coach', 'attendance', true, true, false, false),
    (v_tenant_id, 'coach', 'reports', true, false, false, false)
  ON CONFLICT (role, page) 
  DO UPDATE SET
    can_view = true,
    can_create = EXCLUDED.can_create,
    can_edit = EXCLUDED.can_edit,
    can_delete = EXCLUDED.can_delete;
END $$;
