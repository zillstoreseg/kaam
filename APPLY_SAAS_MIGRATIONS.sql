-- ============================================================================
-- SAAS PLATFORM MIGRATIONS
-- ============================================================================
-- This file combines both SaaS platform migrations for easy application
-- Run this in the Supabase SQL Editor to enable platform owner features
-- ============================================================================

-- ============================================================================
-- MIGRATION 1: Create SaaS Platform Owner Layer
-- ============================================================================

/*
  # Create SaaS Platform Owner Layer

  ## Overview
  This migration adds a complete multi-tenant SaaS platform layer with owner management,
  academy subscriptions, feature gating, and plan management. This layer wraps the existing
  system without modifying any existing tables or functionality.

  ## New Tables

  ### 1. platform_roles
  Purpose: Identifies platform owners who can access the owner dashboard.

  ### 2. plans
  Purpose: Defines subscription plans with different feature sets and pricing.

  ### 3. features
  Purpose: Master list of all features/modules available in the system.

  ### 4. plan_features
  Purpose: Maps which features are available in each plan.

  ### 5. academies
  Purpose: Represents tenant academies with their subscription status.

  ### 6. academy_feature_overrides
  Purpose: Allows owners to override specific features for individual academies.

  ### 7. subscriptions
  Purpose: Tracks subscription history for each academy.

  ## Security (RLS)
  All tables have Row Level Security enabled with restrictive policies.

  ## RPC Functions
  1. get_my_platform_role() - Returns the current user's platform role (if any)
  2. get_tenant_config_by_domain(domain text) - Returns academy configuration by domain
*/

CREATE TABLE IF NOT EXISTS platform_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'super_owner')) DEFAULT 'owner',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE platform_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own platform role" ON platform_roles;
DROP POLICY IF EXISTS "Owners can insert platform roles" ON platform_roles;
DROP POLICY IF EXISTS "Owners can update platform roles" ON platform_roles;
DROP POLICY IF EXISTS "Owners can delete platform roles" ON platform_roles;

CREATE POLICY "Users can view own platform role"
  ON platform_roles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Owners can insert platform roles"
  ON platform_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can update platform roles"
  ON platform_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can delete platform roles"
  ON platform_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE TABLE IF NOT EXISTS plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_monthly numeric(10,2) NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view plans" ON plans;
DROP POLICY IF EXISTS "Owners can insert plans" ON plans;
DROP POLICY IF EXISTS "Owners can update plans" ON plans;
DROP POLICY IF EXISTS "Owners can delete plans" ON plans;

CREATE POLICY "Owners can view plans"
  ON plans FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can insert plans"
  ON plans FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can update plans"
  ON plans FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can delete plans"
  ON plans FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE TABLE IF NOT EXISTS features (
  key text PRIMARY KEY,
  label text NOT NULL,
  category text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view features" ON features;
DROP POLICY IF EXISTS "Owners can insert features" ON features;
DROP POLICY IF EXISTS "Owners can update features" ON features;
DROP POLICY IF EXISTS "Owners can delete features" ON features;

CREATE POLICY "Owners can view features"
  ON features FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can insert features"
  ON features FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can update features"
  ON features FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can delete features"
  ON features FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE TABLE IF NOT EXISTS plan_features (
  plan_id uuid REFERENCES plans(id) ON DELETE CASCADE,
  feature_key text REFERENCES features(key) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  PRIMARY KEY (plan_id, feature_key)
);

ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view plan features" ON plan_features;
DROP POLICY IF EXISTS "Owners can insert plan features" ON plan_features;
DROP POLICY IF EXISTS "Owners can update plan features" ON plan_features;
DROP POLICY IF EXISTS "Owners can delete plan features" ON plan_features;

CREATE POLICY "Owners can view plan features"
  ON plan_features FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can insert plan features"
  ON plan_features FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can update plan features"
  ON plan_features FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can delete plan features"
  ON plan_features FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE TABLE IF NOT EXISTS academies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  domain text UNIQUE NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'suspended')) DEFAULT 'active',
  plan_id uuid REFERENCES plans(id),
  subscription_status text NOT NULL CHECK (subscription_status IN ('active', 'expired', 'trial', 'suspended')) DEFAULT 'trial',
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE academies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view academies" ON academies;
DROP POLICY IF EXISTS "Owners can insert academies" ON academies;
DROP POLICY IF EXISTS "Owners can update academies" ON academies;
DROP POLICY IF EXISTS "Owners can delete academies" ON academies;

CREATE POLICY "Owners can view academies"
  ON academies FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can insert academies"
  ON academies FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can update academies"
  ON academies FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can delete academies"
  ON academies FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE TABLE IF NOT EXISTS academy_feature_overrides (
  academy_id uuid REFERENCES academies(id) ON DELETE CASCADE,
  feature_key text REFERENCES features(key) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (academy_id, feature_key)
);

ALTER TABLE academy_feature_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view academy feature overrides" ON academy_feature_overrides;
DROP POLICY IF EXISTS "Owners can insert academy feature overrides" ON academy_feature_overrides;
DROP POLICY IF EXISTS "Owners can update academy feature overrides" ON academy_feature_overrides;
DROP POLICY IF EXISTS "Owners can delete academy feature overrides" ON academy_feature_overrides;

CREATE POLICY "Owners can view academy feature overrides"
  ON academy_feature_overrides FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can insert academy feature overrides"
  ON academy_feature_overrides FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can update academy feature overrides"
  ON academy_feature_overrides FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can delete academy feature overrides"
  ON academy_feature_overrides FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid REFERENCES academies(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES plans(id),
  starts_at timestamptz NOT NULL,
  ends_at timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners can view subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Owners can insert subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Owners can update subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Owners can delete subscriptions" ON subscriptions;

CREATE POLICY "Owners can view subscriptions"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can insert subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can update subscriptions"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE POLICY "Owners can delete subscriptions"
  ON subscriptions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_roles
      WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

CREATE OR REPLACE FUNCTION get_my_platform_role()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role text;
BEGIN
  SELECT role INTO user_role
  FROM platform_roles
  WHERE user_id = auth.uid();

  IF user_role IS NULL THEN
    RETURN jsonb_build_object('role', null);
  END IF;

  RETURN jsonb_build_object('role', user_role);
END;
$$;

CREATE OR REPLACE FUNCTION get_tenant_config_by_domain(domain_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  academy_config jsonb;
  academy_plan jsonb;
  academy_features jsonb;
BEGIN
  SELECT jsonb_build_object(
    'academy_id', a.id,
    'name', a.name,
    'domain', a.domain,
    'status', a.status,
    'subscription_status', a.subscription_status,
    'expires_at', a.expires_at
  )
  INTO academy_config
  FROM academies a
  WHERE a.domain = domain_param;

  IF academy_config IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'price_monthly', p.price_monthly,
    'description', p.description
  )
  INTO academy_plan
  FROM academies a
  JOIN plans p ON a.plan_id = p.id
  WHERE a.domain = domain_param;

  SELECT jsonb_agg(f.key)
  INTO academy_features
  FROM (
    SELECT DISTINCT pf.feature_key as key
    FROM academies a
    JOIN plan_features pf ON pf.plan_id = a.plan_id
    WHERE a.domain = domain_param
      AND pf.enabled = true
      AND NOT EXISTS (
        SELECT 1 FROM academy_feature_overrides afo
        WHERE afo.academy_id = a.id
          AND afo.feature_key = pf.feature_key
          AND afo.enabled = false
      )

    UNION

    SELECT afo.feature_key as key
    FROM academies a
    JOIN academy_feature_overrides afo ON afo.academy_id = a.id
    WHERE a.domain = domain_param
      AND afo.enabled = true
  ) f;

  RETURN jsonb_build_object(
    'academy_id', academy_config->>'academy_id',
    'name', academy_config->>'name',
    'domain', academy_config->>'domain',
    'status', academy_config->>'status',
    'subscription_status', academy_config->>'subscription_status',
    'expires_at', academy_config->>'expires_at',
    'plan', academy_plan,
    'features', COALESCE(academy_features, '[]'::jsonb)
  );
END;
$$;

-- ============================================================================
-- MIGRATION 2: Seed Platform Data
-- ============================================================================

/*
  # Seed Platform Data

  ## Overview
  Seeds initial plans and features for the SaaS platform.

  ## Data Seeded
  1. Three subscription plans: Basic, Pro, Elite
  2. All available features from the existing system
  3. Feature mappings for each plan
*/

INSERT INTO plans (id, name, price_monthly, description) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Basic', 29.99, 'Essential features for small academies'),
  ('22222222-2222-2222-2222-222222222222', 'Pro', 79.99, 'Advanced features for growing academies'),
  ('33333333-3333-3333-3333-333333333333', 'Elite', 149.99, 'Full feature access for large academies')
ON CONFLICT (id) DO NOTHING;

INSERT INTO features (key, label, category) VALUES
  ('dashboard', 'Dashboard', 'core'),
  ('students', 'Students Management', 'core'),
  ('attendance', 'Attendance Tracking', 'core'),
  ('branches', 'Branch Management', 'management'),
  ('users', 'User Management', 'management'),
  ('packages', 'Package Management', 'management'),
  ('schemes', 'Scheme Management', 'management'),
  ('invoices', 'Invoice Management', 'finance'),
  ('sales', 'Sales Tracking', 'finance'),
  ('expenses', 'Expense Tracking', 'finance'),
  ('reports', 'Reports', 'reports'),
  ('revenue_reports', 'Revenue Reports', 'reports'),
  ('attendance_reports', 'Attendance Reports', 'reports'),
  ('exam_eligibility', 'Exam Eligibility', 'features'),
  ('inactive_players', 'Inactive Players', 'features'),
  ('activity_log', 'Activity Log', 'management'),
  ('login_history', 'Login History', 'management'),
  ('security_alerts', 'Security Alerts', 'management'),
  ('stock', 'Stock Management', 'inventory'),
  ('stock_inventory', 'Stock Inventory', 'inventory'),
  ('settings', 'Settings', 'core')
ON CONFLICT (key) DO NOTHING;

INSERT INTO plan_features (plan_id, feature_key, enabled) VALUES
  ('11111111-1111-1111-1111-111111111111', 'dashboard', true),
  ('11111111-1111-1111-1111-111111111111', 'students', true),
  ('11111111-1111-1111-1111-111111111111', 'attendance', true),
  ('11111111-1111-1111-1111-111111111111', 'packages', true),
  ('11111111-1111-1111-1111-111111111111', 'invoices', true),
  ('11111111-1111-1111-1111-111111111111', 'settings', true),

  ('22222222-2222-2222-2222-222222222222', 'dashboard', true),
  ('22222222-2222-2222-2222-222222222222', 'students', true),
  ('22222222-2222-2222-2222-222222222222', 'attendance', true),
  ('22222222-2222-2222-2222-222222222222', 'branches', true),
  ('22222222-2222-2222-2222-222222222222', 'users', true),
  ('22222222-2222-2222-2222-222222222222', 'packages', true),
  ('22222222-2222-2222-2222-222222222222', 'schemes', true),
  ('22222222-2222-2222-2222-222222222222', 'invoices', true),
  ('22222222-2222-2222-2222-222222222222', 'sales', true),
  ('22222222-2222-2222-2222-222222222222', 'expenses', true),
  ('22222222-2222-2222-2222-222222222222', 'reports', true),
  ('22222222-2222-2222-2222-222222222222', 'revenue_reports', true),
  ('22222222-2222-2222-2222-222222222222', 'attendance_reports', true),
  ('22222222-2222-2222-2222-222222222222', 'exam_eligibility', true),
  ('22222222-2222-2222-2222-222222222222', 'settings', true),

  ('33333333-3333-3333-3333-333333333333', 'dashboard', true),
  ('33333333-3333-3333-3333-333333333333', 'students', true),
  ('33333333-3333-3333-3333-333333333333', 'attendance', true),
  ('33333333-3333-3333-3333-333333333333', 'branches', true),
  ('33333333-3333-3333-3333-333333333333', 'users', true),
  ('33333333-3333-3333-3333-333333333333', 'packages', true),
  ('33333333-3333-3333-3333-333333333333', 'schemes', true),
  ('33333333-3333-3333-3333-333333333333', 'invoices', true),
  ('33333333-3333-3333-3333-333333333333', 'sales', true),
  ('33333333-3333-3333-3333-333333333333', 'expenses', true),
  ('33333333-3333-3333-3333-333333333333', 'reports', true),
  ('33333333-3333-3333-3333-333333333333', 'revenue_reports', true),
  ('33333333-3333-3333-3333-333333333333', 'attendance_reports', true),
  ('33333333-3333-3333-3333-333333333333', 'exam_eligibility', true),
  ('33333333-3333-3333-3333-333333333333', 'inactive_players', true),
  ('33333333-3333-3333-3333-333333333333', 'activity_log', true),
  ('33333333-3333-3333-3333-333333333333', 'login_history', true),
  ('33333333-3333-3333-3333-333333333333', 'security_alerts', true),
  ('33333333-3333-3333-3333-333333333333', 'stock', true),
  ('33333333-3333-3333-3333-333333333333', 'stock_inventory', true),
  ('33333333-3333-3333-3333-333333333333', 'settings', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- SETUP COMPLETE
-- ============================================================================
-- After running this SQL, you'll need to:
-- 1. Create a platform owner user account
-- 2. Run: node create-platform-owner.mjs <your-email@example.com>
-- ============================================================================
