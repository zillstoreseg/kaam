/*
  # Fix Exam Eligibility View

  ## Changes
  1. Drop and recreate exam_eligibility view to use the attendance table instead of class_attendance
  2. Count attendance records from the attendance table
  3. Ensure accurate class counting for exam eligibility

  ## Notes
  - Students need 3+ months tenure
  - Students need 8+ classes per month (counted from attendance table)
*/

-- Drop existing view
DROP VIEW IF EXISTS exam_eligibility;

-- Create updated view using attendance table
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
  END as is_eligible
FROM students s
LEFT JOIN attendance a ON s.id = a.student_id AND a.status = 'present'
WHERE s.is_active = true
GROUP BY s.id, s.full_name, s.branch_id, s.joined_date;

-- Add comment
COMMENT ON VIEW exam_eligibility IS 'Shows student exam eligibility based on tenure (3+ months) and monthly attendance (8+ classes from attendance table)';
