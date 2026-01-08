/*
  # Fix Platform Owner RLS Policies
  
  1. Changes
    - Add platform_owner bypass policies for all tables
    - Ensure platform_owner can access their own profile
    - Enable full platform access without tenant restrictions
  
  2. Security
    - Platform owners get full read/write access across all tenants
    - No tenant_id restrictions for platform_owner role
*/

-- Drop existing conflicting policies for profiles if they exist
DROP POLICY IF EXISTS "Platform owners can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Platform owners can manage all profiles" ON profiles;

-- Platform owners get full access to profiles (including their own)
CREATE POLICY "Platform owners full profile access"
  ON profiles FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
  );

-- Platform owners get full access to all tenant data
CREATE POLICY "Platform owners full tenant access"
  ON tenants FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
  );

CREATE POLICY "Platform owners full subscription access"
  ON subscriptions FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
  );

CREATE POLICY "Platform owners full impersonation access"
  ON impersonation_sessions FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
  );

CREATE POLICY "Platform owners full platform audit access"
  ON platform_audit FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
  );

-- Platform owners can view all role_permissions
CREATE POLICY "Platform owners view all role_permissions"
  ON role_permissions FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
  );

-- Platform owners can view all settings (for tenant management)
CREATE POLICY "Platform owners view all settings"
  ON settings FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
  );

-- Platform owners can view all audit logs
CREATE POLICY "Platform owners view all audit logs"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'platform_owner'
  );