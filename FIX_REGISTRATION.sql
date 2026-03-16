-- ==============================================================
-- FIX REGISTRATION AND MULTI-TENANCY ISSUES
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/viwgdxffvehogkflhkjw/sql/new
-- ==============================================================

-- 1. Add academy_id and platform_role columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS academy_id uuid REFERENCES academies(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platform_role text DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_academy_id ON profiles(academy_id);

-- 2. Allow any authenticated user to insert an academy (for self-registration)
DROP POLICY IF EXISTS "Academy admins can insert their academy" ON academies;
CREATE POLICY "Academy admins can insert their academy"
  ON academies FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Allow academy admins to view their own academy
DROP POLICY IF EXISTS "Academy admins can view own academy" ON academies;
CREATE POLICY "Academy admins can view own academy"
  ON academies FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT academy_id FROM profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM platform_roles WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

-- 4. Allow academy super_admins to update their own academy
DROP POLICY IF EXISTS "Academy super admins can update own academy" ON academies;
CREATE POLICY "Academy super admins can update own academy"
  ON academies FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT academy_id FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM platform_roles WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  )
  WITH CHECK (
    id IN (
      SELECT academy_id FROM profiles WHERE id = auth.uid() AND role = 'super_admin'
    )
    OR
    EXISTS (
      SELECT 1 FROM platform_roles WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner')
    )
  );

-- 5. Allow users to insert their own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- 6. Allow users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Done!
SELECT 'Migration applied successfully!' as status;
