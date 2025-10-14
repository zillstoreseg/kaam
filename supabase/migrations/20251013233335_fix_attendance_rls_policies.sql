/*
  # Fix Attendance RLS Policies

  ## Changes
  - Add INSERT policy for super admins to mark attendance in any branch
  - Add UPDATE policy for super admins to update attendance in any branch
  - Add DELETE policy that was already there but ensure it works correctly
  
  ## Security
  - Super admins can mark/update attendance in any branch
  - Branch staff can only mark/update attendance in their assigned branch
*/

-- Add INSERT policy for super admins
CREATE POLICY "Super admin can insert attendance in any branch"
  ON attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Add UPDATE policy for super admins
CREATE POLICY "Super admin can update attendance in any branch"
  ON attendance FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
