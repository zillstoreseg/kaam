/*
  # Revert Platform Owner Permissions
  
  1. Changes
    - Remove platform_owner role_permissions entries
    - Make tenant_id NOT NULL again in role_permissions table
  
  2. Security
    - Restore original table structure
*/

-- Delete platform_owner permissions
DELETE FROM role_permissions WHERE role = 'platform_owner';

-- Make tenant_id NOT NULL again
ALTER TABLE role_permissions ALTER COLUMN tenant_id SET NOT NULL;