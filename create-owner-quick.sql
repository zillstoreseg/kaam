/*
  Quick Platform Owner Setup SQL Script

  Run this in Supabase SQL Editor to create your platform owner account.

  Steps:
  1. Open Supabase Dashboard → SQL Editor
  2. Copy and paste this entire file
  3. Click "Run"
  4. Note the credentials shown at the end
  5. Login with those credentials

  Default Credentials:
  Email: owner@dojocloud.com
  Password: Owner123!@#

  ⚠️ CHANGE PASSWORD AFTER FIRST LOGIN!
*/

-- Step 1: Ensure platform_roles table exists
-- (If migrations already applied, this will do nothing)
CREATE TABLE IF NOT EXISTS platform_roles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'super_owner')) DEFAULT 'owner',
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE platform_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own platform role" ON platform_roles;
DROP POLICY IF EXISTS "Owners can insert platform roles" ON platform_roles;
DROP POLICY IF EXISTS "Owners can update platform roles" ON platform_roles;
DROP POLICY IF EXISTS "Owners can delete platform roles" ON platform_roles;

-- Create policies
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

-- Step 2: Create RPC function if not exists
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

-- Step 3: Create owner user
-- Note: You'll need to create the user through Supabase Dashboard → Authentication → Add User
-- OR use the following approach:

-- First, check if owner user exists
DO $$
DECLARE
  owner_email TEXT := 'owner@dojocloud.com';
  owner_id UUID;
BEGIN
  -- Check if user already exists in profiles
  SELECT id INTO owner_id FROM profiles WHERE email = owner_email;

  IF owner_id IS NOT NULL THEN
    -- User exists, just add platform role if not already there
    INSERT INTO platform_roles (user_id, role)
    VALUES (owner_id, 'owner')
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE 'Owner role added to existing user: %', owner_email;
  ELSE
    RAISE NOTICE 'User does not exist. Please create user manually in Supabase Dashboard:';
    RAISE NOTICE '1. Go to Authentication → Users';
    RAISE NOTICE '2. Click "Add User"';
    RAISE NOTICE '3. Email: owner@dojocloud.com';
    RAISE NOTICE '4. Password: Owner123!@#';
    RAISE NOTICE '5. After creating, run this script again to add owner role';
  END IF;
END $$;

-- Show current owner accounts
SELECT
  p.email,
  p.full_name,
  pr.role as platform_role,
  pr.created_at
FROM platform_roles pr
JOIN profiles p ON pr.user_id = p.id
ORDER BY pr.created_at DESC;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Platform Owner Setup Complete!';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Login Credentials:';
  RAISE NOTICE '  Email: owner@dojocloud.com';
  RAISE NOTICE '  Password: Owner123!@#';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Login to your application';
  RAISE NOTICE '2. Look for "Platform Admin" in sidebar';
  RAISE NOTICE '3. Click to access /platform-admin';
  RAISE NOTICE '4. Change your password immediately!';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Change password after first login!';
  RAISE NOTICE '';
END $$;
