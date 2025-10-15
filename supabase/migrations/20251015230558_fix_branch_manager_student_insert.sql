/*
  # Fix Branch Manager Student Insert Permission

  1. Changes
    - Drop and recreate the INSERT policy for students table
    - Change the WITH CHECK clause to properly validate the branch_id being inserted
    - Allow branch managers to insert students into their own branch

  2. Security
    - Ensures branch managers can only add students to their assigned branch
    - Super admins can add students to any branch
*/

DROP POLICY IF EXISTS "Branch managers can insert students" ON students;

CREATE POLICY "Branch managers can insert students"
  ON students FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'super_admin'
        OR (
          profiles.role = 'branch_manager'
          AND profiles.branch_id = students.branch_id
        )
      )
    )
  );
