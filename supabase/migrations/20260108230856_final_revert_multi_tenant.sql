/*
  # Final Revert Multi-Tenant System to Single Tenant
  
  1. Changes
    - Drop multi-tenant specific tables
    - Remove tenant_id columns from existing tables
    - Restore original simple RLS policies
    - Remove platform_owner from role constraints
  
  2. Security
    - Restore original working RLS policies for single tenant
*/

-- Drop all tenant-specific policies first
DROP POLICY IF EXISTS "Platform owners can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile and tenant profiles" ON profiles;
DROP POLICY IF EXISTS "Platform owners can view all students" ON students;
DROP POLICY IF EXISTS "Users can view students in their tenant" ON students;
DROP POLICY IF EXISTS "Platform owners can insert students" ON students;
DROP POLICY IF EXISTS "Users can insert students in their tenant" ON students;
DROP POLICY IF EXISTS "Platform owners can update all students" ON students;
DROP POLICY IF EXISTS "Users can update students in their tenant" ON students;
DROP POLICY IF EXISTS "Platform owners can delete students" ON students;
DROP POLICY IF EXISTS "Users can delete students in their tenant" ON students;

-- Drop multi-tenant specific tables
DROP TABLE IF EXISTS impersonation_sessions CASCADE;
DROP TABLE IF EXISTS platform_audit CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;
DROP TABLE IF EXISTS tenants CASCADE;

-- Remove tenant_id columns from existing tables only
ALTER TABLE profiles DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE branches DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE students DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE packages DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE attendance DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE invoices DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE invoice_items DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE stock_items DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE stock_categories DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE stock_counts DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE settings DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE schemes DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE payments DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE expenses DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE membership_freeze_history DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE belt_ranks DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE exam_invitations DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE exam_participation DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE promotion_log DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE player_contacts DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE whatsapp_messages DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE student_renewals DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE attendance_alerts DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE class_attendance DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE student_schemes DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE package_schemes DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE permissions DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE user_permissions DROP COLUMN IF EXISTS tenant_id CASCADE;
ALTER TABLE role_permissions DROP COLUMN IF EXISTS tenant_id CASCADE;

-- Update profiles role check constraint to remove platform_owner
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('super_admin', 'branch_manager', 'coach', 'accountant', 'stock_manager'));

-- Update role_permissions role check constraint to remove platform_owner
ALTER TABLE role_permissions DROP CONSTRAINT IF EXISTS role_permissions_role_check;
ALTER TABLE role_permissions ADD CONSTRAINT role_permissions_role_check 
  CHECK (role IN ('super_admin', 'branch_manager', 'coach', 'accountant', 'stock_manager'));

-- Restore original simple RLS policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Restore original policies for students
CREATE POLICY "Authenticated users can view students"
  ON students FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert students"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update students"
  ON students FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete students"
  ON students FOR DELETE
  TO authenticated
  USING (true);