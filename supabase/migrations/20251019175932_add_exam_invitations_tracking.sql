/*
  # Add Exam Invitation Tracking

  ## Changes
  1. Create exam_invitations table to track when students are invited
  2. Add RLS policies for secure access
  3. Update exam_eligibility view to exclude recently invited students

  ## Notes
  - Students invited in last 3 months won't show as eligible
  - Can mark invitation as unsent to make them eligible again
  - Tracks invitation date for reporting
*/

-- Create exam_invitations table
CREATE TABLE IF NOT EXISTS exam_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  branch_id uuid REFERENCES branches(id) NOT NULL,
  invitation_date timestamptz DEFAULT now() NOT NULL,
  invitation_sent boolean DEFAULT true NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES profiles(id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_exam_invitations_student ON exam_invitations(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_invitations_branch ON exam_invitations(branch_id);
CREATE INDEX IF NOT EXISTS idx_exam_invitations_date ON exam_invitations(invitation_date);

-- Enable RLS
ALTER TABLE exam_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view invitations in their branch"
  ON exam_invitations FOR SELECT
  TO authenticated
  USING (
    branch_id IN (
      SELECT CASE 
        WHEN (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin' 
        THEN branch_id
        ELSE (SELECT branch_id FROM profiles WHERE id = auth.uid())
      END
    )
  );

CREATE POLICY "Users can create invitations in their branch"
  ON exam_invitations FOR INSERT
  TO authenticated
  WITH CHECK (
    branch_id IN (
      SELECT CASE 
        WHEN (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin' 
        THEN branch_id
        ELSE (SELECT branch_id FROM profiles WHERE id = auth.uid())
      END
    )
  );

CREATE POLICY "Users can update invitations in their branch"
  ON exam_invitations FOR UPDATE
  TO authenticated
  USING (
    branch_id IN (
      SELECT CASE 
        WHEN (SELECT role FROM profiles WHERE id = auth.uid()) = 'super_admin' 
        THEN branch_id
        ELSE (SELECT branch_id FROM profiles WHERE id = auth.uid())
      END
    )
  );

-- Drop and recreate exam_eligibility view with invitation logic
DROP VIEW IF EXISTS exam_eligibility;

CREATE OR REPLACE VIEW exam_eligibility AS
SELECT 
  s.id as student_id,
  s.full_name,
  s.branch_id,
  s.joined_date,
  EXTRACT(MONTH FROM AGE(CURRENT_DATE, s.joined_date)) as months_with_us,
  COUNT(DISTINCT a.id) FILTER (WHERE a.attendance_date >= DATE_TRUNC('month', CURRENT_DATE)) as classes_this_month,
  COUNT(DISTINCT a.id) as total_classes_attended,
  CASE 
    WHEN EXTRACT(MONTH FROM AGE(CURRENT_DATE, s.joined_date)) >= 3 
      AND COUNT(DISTINCT a.id) FILTER (WHERE a.attendance_date >= DATE_TRUNC('month', CURRENT_DATE)) >= 8
    THEN true
    ELSE false
  END as is_eligible,
  (
    SELECT invitation_sent 
    FROM exam_invitations ei 
    WHERE ei.student_id = s.id 
      AND ei.invitation_sent = true
      AND ei.invitation_date >= CURRENT_DATE - INTERVAL '3 months'
    ORDER BY ei.invitation_date DESC 
    LIMIT 1
  ) as invitation_sent,
  (
    SELECT invitation_date 
    FROM exam_invitations ei 
    WHERE ei.student_id = s.id 
      AND ei.invitation_sent = true
    ORDER BY ei.invitation_date DESC 
    LIMIT 1
  ) as last_invitation_date
FROM students s
LEFT JOIN attendance a ON s.id = a.student_id AND a.status = 'present'
WHERE s.is_active = true
GROUP BY s.id, s.full_name, s.branch_id, s.joined_date;

-- Add comment
COMMENT ON TABLE exam_invitations IS 'Tracks exam invitations sent to students';
COMMENT ON VIEW exam_eligibility IS 'Shows student exam eligibility with invitation tracking (excludes recently invited students)';
