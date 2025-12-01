/*
  # Add Referral Source Tracking
  
  1. Changes to Students Table
    - Add `referral_source` field (friend, google, facebook, instagram, other)
    - Add `referred_by_student_id` field (references students table for friend referrals)
    - Add `scheme_id` field (references schemes table)
  
  2. Security
    - Update RLS policies to allow reading referral data
  
  3. Notes
    - This enables tracking how students found the academy
    - Friend referrals will link to existing students
    - Analytics can be built from this data
*/

-- Add referral tracking columns to students table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'referral_source'
  ) THEN
    ALTER TABLE students ADD COLUMN referral_source text DEFAULT 'other';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'referred_by_student_id'
  ) THEN
    ALTER TABLE students ADD COLUMN referred_by_student_id uuid REFERENCES students(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'students' AND column_name = 'scheme_id'
  ) THEN
    ALTER TABLE students ADD COLUMN scheme_id uuid REFERENCES schemes(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for faster referral queries
CREATE INDEX IF NOT EXISTS idx_students_referral_source ON students(referral_source);
CREATE INDEX IF NOT EXISTS idx_students_referred_by ON students(referred_by_student_id);
CREATE INDEX IF NOT EXISTS idx_students_scheme ON students(scheme_id);

-- Create a view for referral analytics
CREATE OR REPLACE VIEW referral_analytics AS
SELECT 
  referral_source,
  COUNT(*) as total_students,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_students,
  COUNT(CASE WHEN referred_by_student_id IS NOT NULL THEN 1 END) as friend_referrals
FROM students
GROUP BY referral_source;

-- Grant access to the view
GRANT SELECT ON referral_analytics TO authenticated;