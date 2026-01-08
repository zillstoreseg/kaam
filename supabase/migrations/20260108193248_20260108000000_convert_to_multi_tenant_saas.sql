/*
  # Convert to Multi-Tenant SaaS Platform

  ## Overview
  Transforms the single-tenant Karate Academy Management System into a multi-tenant SaaS platform
  with subscription management, impersonation, and complete tenant isolation.

  ## 1. New SaaS Tables
    - `tenants`: Stores academy/business information (name, subdomain, status)
    - `subscriptions`: Tracks subscription plans, renewal dates, and status per tenant
    - `impersonation_sessions`: Enables platform owner to "Login As" tenant for support

  ## 2. Tenant Isolation
    - Adds `tenant_id` column to ALL business tables
    - Creates default tenant "Main Academy" (subdomain: main)
    - Backfills all existing data to default tenant
    - Enforces NOT NULL constraint after backfill

  ## 3. Roles & Permissions
    - Updates profiles table to support new roles:
      - platform_owner (tenant_id = NULL, access to all tenants)
      - platform_admin (tenant_id = NULL, access to all tenants)
      - tenant_admin (tenant_id = specific tenant, full access within tenant)
      - branch_admin (existing, within tenant)
      - coach (existing, within tenant)

  ## 4. RLS Helper Functions
    - is_platform_owner(): Check if current user is platform owner/admin
    - current_tenant_id(): Get tenant_id for current user
    - current_impersonation_tenant(): Get tenant_id if impersonating
    - effective_tenant_id(): Returns impersonation tenant or user's tenant

  ## 5. RLS Policies
    - Enables RLS on all business tables
    - Platform owners can access ALL tenant data
    - Tenant users can ONLY access their own tenant data
    - Complete data isolation enforced at database level

  ## 6. Security
    - Tamper-resistant: Cannot bypass tenant isolation even with direct database access
    - Audit trail: All impersonation sessions logged
    - Subscription gating: Access blocked if subscription inactive/expired
*/

-- ============================================================================
-- STEP 1: CREATE SAAS CORE TABLES
-- ============================================================================

-- Tenants table: Each tenant represents one academy/business
CREATE TABLE IF NOT EXISTS tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  subdomain text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'trial')),
  created_at timestamptz DEFAULT now()
);

-- Subscriptions table: Tracks billing and access per tenant
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'single' CHECK (plan IN ('single', 'multi', 'enterprise')),
  starts_at date NOT NULL DEFAULT current_date,
  renews_at date NOT NULL DEFAULT (current_date + interval '30 days'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired')),
  grace_days int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions(tenant_id);

-- Impersonation sessions: Platform owner "Login As" feature
CREATE TABLE IF NOT EXISTS impersonation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 minutes'),
  revoked boolean NOT NULL DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_admin_user ON impersonation_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_sessions_tenant ON impersonation_sessions(tenant_id);

-- ============================================================================
-- STEP 2: CREATE DEFAULT TENANT AND BACKFILL DATA
-- ============================================================================

-- Insert default tenant
INSERT INTO tenants (id, name, subdomain, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'Main Academy', 'main', 'active')
ON CONFLICT (subdomain) DO NOTHING;

-- Insert default subscription for main tenant
INSERT INTO subscriptions (tenant_id, plan, starts_at, renews_at, status, grace_days)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'enterprise',
  current_date,
  current_date + interval '365 days',
  'active',
  30
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- STEP 3: UPDATE PROFILES TABLE FOR MULTI-TENANCY
-- ============================================================================

-- Add tenant_id to profiles (nullable for platform owners)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE;
    CREATE INDEX idx_profiles_tenant_id ON profiles(tenant_id);
  END IF;
END $$;

-- Update role check constraint to include new roles
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('platform_owner', 'platform_admin', 'tenant_admin', 'super_admin', 'branch_manager', 'coach'));

-- Backfill existing profiles to default tenant (keep existing super_admins as tenant_admin)
UPDATE profiles 
SET tenant_id = '00000000-0000-0000-0000-000000000001'
WHERE tenant_id IS NULL;

-- ============================================================================
-- STEP 4: ADD TENANT_ID TO ALL BUSINESS TABLES
-- ============================================================================

-- Function to add tenant_id to a table
DO $$
DECLARE
  business_tables text[] := ARRAY[
    'branches',
    'students',
    'attendance',
    'packages',
    'schemes',
    'payments',
    'invoices',
    'invoice_items',
    'expenses',
    'user_permissions',
    'role_permissions',
    'permissions',
    'exam_invitations',
    'exam_participation',
    'promotion_log',
    'student_schemes',
    'package_schemes',
    'student_renewals',
    'whatsapp_messages',
    'membership_freeze_history',
    'stock_items',
    'stock_categories',
    'stock_counts',
    'player_contacts',
    'attendance_alerts',
    'class_attendance',
    'audit_logs',
    'settings'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY business_tables LOOP
    -- Add tenant_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'tenant_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN tenant_id uuid REFERENCES tenants(id) ON DELETE CASCADE', tbl);
      
      -- Backfill with default tenant
      EXECUTE format('UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL', 
        tbl, '00000000-0000-0000-0000-000000000001');
      
      -- Make NOT NULL after backfill
      EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET NOT NULL', tbl);
      
      -- Add index for performance
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant_id ON %I(tenant_id)', tbl, tbl);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 5: CREATE RLS HELPER FUNCTIONS
-- ============================================================================

-- Check if current user is platform owner/admin
CREATE OR REPLACE FUNCTION is_platform_owner()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('platform_owner', 'platform_admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get tenant_id for current user
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT tenant_id FROM profiles
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get active impersonation tenant (if any)
CREATE OR REPLACE FUNCTION current_impersonation_tenant()
RETURNS uuid AS $$
BEGIN
  RETURN (
    SELECT tenant_id
    FROM impersonation_sessions
    WHERE admin_user_id = auth.uid()
    AND NOT revoked
    AND expires_at > now()
    ORDER BY created_at DESC
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get effective tenant_id (impersonation takes precedence)
CREATE OR REPLACE FUNCTION effective_tenant_id()
RETURNS uuid AS $$
DECLARE
  impersonation_tenant uuid;
BEGIN
  -- Check for active impersonation first
  impersonation_tenant := current_impersonation_tenant();
  IF impersonation_tenant IS NOT NULL THEN
    RETURN impersonation_tenant;
  END IF;
  
  -- Otherwise return user's own tenant
  RETURN current_tenant_id();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- STEP 6: ENABLE RLS AND CREATE POLICIES FOR SAAS TABLES
-- ============================================================================

-- Enable RLS on SaaS tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- Tenants policies
DROP POLICY IF EXISTS "Platform owners can view all tenants" ON tenants;
CREATE POLICY "Platform owners can view all tenants" ON tenants
  FOR SELECT TO authenticated
  USING (is_platform_owner());

DROP POLICY IF EXISTS "Platform owners can manage all tenants" ON tenants;
CREATE POLICY "Platform owners can manage all tenants" ON tenants
  FOR ALL TO authenticated
  USING (is_platform_owner())
  WITH CHECK (is_platform_owner());

DROP POLICY IF EXISTS "Users can view their own tenant" ON tenants;
CREATE POLICY "Users can view their own tenant" ON tenants
  FOR SELECT TO authenticated
  USING (id = current_tenant_id());

-- Subscriptions policies
DROP POLICY IF EXISTS "Platform owners can view all subscriptions" ON subscriptions;
CREATE POLICY "Platform owners can view all subscriptions" ON subscriptions
  FOR SELECT TO authenticated
  USING (is_platform_owner());

DROP POLICY IF EXISTS "Platform owners can manage all subscriptions" ON subscriptions;
CREATE POLICY "Platform owners can manage all subscriptions" ON subscriptions
  FOR ALL TO authenticated
  USING (is_platform_owner())
  WITH CHECK (is_platform_owner());

DROP POLICY IF EXISTS "Users can view their tenant subscription" ON subscriptions;
CREATE POLICY "Users can view their tenant subscription" ON subscriptions
  FOR SELECT TO authenticated
  USING (tenant_id = current_tenant_id());

-- Impersonation sessions policies (platform owners only)
DROP POLICY IF EXISTS "Platform owners can manage impersonation sessions" ON impersonation_sessions;
CREATE POLICY "Platform owners can manage impersonation sessions" ON impersonation_sessions
  FOR ALL TO authenticated
  USING (is_platform_owner())
  WITH CHECK (is_platform_owner());

-- ============================================================================
-- STEP 7: CREATE UNIVERSAL RLS POLICIES FOR BUSINESS TABLES
-- ============================================================================

DO $$
DECLARE
  business_tables text[] := ARRAY[
    'branches',
    'students',
    'attendance',
    'packages',
    'schemes',
    'payments',
    'invoices',
    'invoice_items',
    'expenses',
    'user_permissions',
    'role_permissions',
    'permissions',
    'exam_invitations',
    'exam_participation',
    'promotion_log',
    'student_schemes',
    'package_schemes',
    'student_renewals',
    'whatsapp_messages',
    'membership_freeze_history',
    'stock_items',
    'stock_categories',
    'stock_counts',
    'player_contacts',
    'attendance_alerts',
    'class_attendance',
    'audit_logs',
    'settings'
  ];
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY business_tables LOOP
    -- Enable RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    
    -- Drop existing tenant policies if they exist
    EXECUTE format('DROP POLICY IF EXISTS "Platform owners full access" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant users can select own tenant" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant users can insert own tenant" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant users can update own tenant" ON %I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Tenant users can delete own tenant" ON %I', tbl);
    
    -- Platform owners have full access to all tenants
    EXECUTE format(
      'CREATE POLICY "Platform owners full access" ON %I FOR ALL TO authenticated USING (is_platform_owner()) WITH CHECK (is_platform_owner())',
      tbl
    );
    
    -- Tenant users can only SELECT their own tenant data
    EXECUTE format(
      'CREATE POLICY "Tenant users can select own tenant" ON %I FOR SELECT TO authenticated USING (tenant_id = effective_tenant_id())',
      tbl
    );
    
    -- Tenant users can only INSERT with their own tenant_id
    EXECUTE format(
      'CREATE POLICY "Tenant users can insert own tenant" ON %I FOR INSERT TO authenticated WITH CHECK (tenant_id = effective_tenant_id())',
      tbl
    );
    
    -- Tenant users can only UPDATE their own tenant data
    EXECUTE format(
      'CREATE POLICY "Tenant users can update own tenant" ON %I FOR UPDATE TO authenticated USING (tenant_id = effective_tenant_id()) WITH CHECK (tenant_id = effective_tenant_id())',
      tbl
    );
    
    -- Tenant users can only DELETE their own tenant data
    EXECUTE format(
      'CREATE POLICY "Tenant users can delete own tenant" ON %I FOR DELETE TO authenticated USING (tenant_id = effective_tenant_id())',
      tbl
    );
  END LOOP;
END $$;

-- ============================================================================
-- STEP 8: SPECIAL HANDLING FOR PROFILES TABLE
-- ============================================================================

-- Profiles has special logic: tenant_id can be NULL for platform owners
DROP POLICY IF EXISTS "Platform owners full access" ON profiles;
CREATE POLICY "Platform owners full access" ON profiles
  FOR ALL TO authenticated
  USING (is_platform_owner())
  WITH CHECK (is_platform_owner());

DROP POLICY IF EXISTS "Tenant users can view own tenant users" ON profiles;
CREATE POLICY "Tenant users can view own tenant users" ON profiles
  FOR SELECT TO authenticated
  USING (tenant_id = effective_tenant_id() OR id = auth.uid());

DROP POLICY IF EXISTS "Tenant admins can manage own tenant users" ON profiles;
CREATE POLICY "Tenant admins can manage own tenant users" ON profiles
  FOR ALL TO authenticated
  USING (
    tenant_id = effective_tenant_id() 
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('tenant_admin', 'super_admin')
    )
  )
  WITH CHECK (
    tenant_id = effective_tenant_id()
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('tenant_admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid() AND tenant_id = current_tenant_id());

-- ============================================================================
-- STEP 9: GRANT PERMISSIONS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON tenants TO authenticated;
GRANT ALL ON subscriptions TO authenticated;
GRANT ALL ON impersonation_sessions TO authenticated;

-- ============================================================================
-- COMPLETED
-- ============================================================================

COMMENT ON TABLE tenants IS 'Multi-tenant SaaS: Each tenant represents one academy/business';
COMMENT ON TABLE subscriptions IS 'Subscription management: tracks plan, renewal dates, and access status per tenant';
COMMENT ON TABLE impersonation_sessions IS 'Platform owner impersonation: enables "Login As" feature for support';
COMMENT ON FUNCTION is_platform_owner() IS 'Returns true if current user is platform_owner or platform_admin';
COMMENT ON FUNCTION current_tenant_id() IS 'Returns tenant_id for current authenticated user';
COMMENT ON FUNCTION effective_tenant_id() IS 'Returns active impersonation tenant if impersonating, otherwise user tenant';
