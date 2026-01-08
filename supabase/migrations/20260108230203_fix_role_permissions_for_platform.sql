/*
  # Fix Role Permissions Table for Platform Owner
  
  1. Changes
    - Make tenant_id nullable in role_permissions table
    - Add platform_owner permissions with NULL tenant_id
  
  2. Security
    - NULL tenant_id indicates platform-level permissions
    - Platform owners get access to platform management pages
*/

-- Make tenant_id nullable for platform-level permissions
ALTER TABLE role_permissions ALTER COLUMN tenant_id DROP NOT NULL;

-- Insert platform_owner permissions (tenant_id is NULL for platform-level permissions)
INSERT INTO role_permissions (role, page, can_view, can_create, can_edit, can_delete, tenant_id)
VALUES 
  ('platform_owner', 'dashboard', true, false, false, false, NULL),
  ('platform_owner', 'settings', true, true, true, true, NULL)
ON CONFLICT DO NOTHING;