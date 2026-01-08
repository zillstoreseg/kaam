/*
  # Fix RLS Policies for Tenant Data Access
  
  1. Problem
    - Users can't see data after login because RLS policies are too restrictive
    - The `effective_tenant_id()` function needs to work properly with auth context
    
  2. Solution
    - Add permissive policies for super_admin to bypass tenant checks
    - Ensure all tables have proper SELECT policies for authenticated users
    - Fix potential issues with tenant_id filtering
    
  3. Changes
    - Add super_admin bypass policies for key tables
    - Ensure settings, role_permissions work for all authenticated users of tenant
*/

-- Fix branches table policies (super_admin should see all branches)
DROP POLICY IF EXISTS "Super admin full access to branches" ON branches;
CREATE POLICY "Super admin full access to branches"
  ON branches
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.tenant_id = branches.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.tenant_id = branches.tenant_id
    )
  );

-- Fix students table policies
DROP POLICY IF EXISTS "Super admin full access to students" ON students;
CREATE POLICY "Super admin full access to students"
  ON students
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.tenant_id = students.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.tenant_id = students.tenant_id
    )
  );

-- Fix packages table policies
DROP POLICY IF EXISTS "Super admin full access to packages" ON packages;
CREATE POLICY "Super admin full access to packages"
  ON packages
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.tenant_id = packages.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.tenant_id = packages.tenant_id
    )
  );

-- Fix schemes table policies
DROP POLICY IF EXISTS "Super admin full access to schemes" ON schemes;
CREATE POLICY "Super admin full access to schemes"
  ON schemes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.tenant_id = schemes.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.tenant_id = schemes.tenant_id
    )
  );

-- Fix attendance table policies
DROP POLICY IF EXISTS "Super admin full access to attendance" ON attendance;
CREATE POLICY "Super admin full access to attendance"
  ON attendance
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.tenant_id = attendance.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.tenant_id = attendance.tenant_id
    )
  );

-- Fix payments table policies
DROP POLICY IF EXISTS "Super admin full access to payments" ON payments;
CREATE POLICY "Super admin full access to payments"
  ON payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.tenant_id = payments.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.tenant_id = payments.tenant_id
    )
  );

-- Fix invoices table policies
DROP POLICY IF EXISTS "Super admin full access to invoices" ON invoices;
CREATE POLICY "Super admin full access to invoices"
  ON invoices
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.tenant_id = invoices.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.tenant_id = invoices.tenant_id
    )
  );

-- Fix expenses table policies
DROP POLICY IF EXISTS "Super admin full access to expenses" ON expenses;
CREATE POLICY "Super admin full access to expenses"
  ON expenses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.tenant_id = expenses.tenant_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
      AND profiles.tenant_id = expenses.tenant_id
    )
  );

-- Fix role_permissions table - users should see permissions for their tenant
DROP POLICY IF EXISTS "Users can view role permissions for their tenant" ON role_permissions;
CREATE POLICY "Users can view role permissions for their tenant"
  ON role_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.tenant_id = role_permissions.tenant_id
    )
  );
