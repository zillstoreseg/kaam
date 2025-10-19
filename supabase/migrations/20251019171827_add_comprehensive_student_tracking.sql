/*
  # Add Comprehensive Student Tracking System

  ## Overview
  This migration adds extensive features for student management, revenue tracking, and exam eligibility.

  ## 1. New Student Fields
    - `gender` (text) - Student's gender
    - `email` (text) - Student's email address

  ## 2. Class Attendance Tracking
    - `class_attendance` table to track individual class sessions
      - Links to students and packages
      - Tracks date, time, and attendance status
      - Counts towards exam eligibility

  ## 3. Revenue Analytics
    - Enhanced invoice categorization
    - Support for detailed revenue breakdown by:
      - Type (subscription, renewal, sales)
      - Scheme
      - Item
      - Time period (day, week, month, year, all-time)

  ## 4. Exam Eligibility System
    - Tracks student tenure (months with organization)
    - Tracks class attendance per month
    - Eligibility rules: 3+ months tenure, 8+ classes per month

  ## 5. Enhanced Attendance Records
    - Links attendance to class sessions
    - Tracks entry/exit times
    - Enables detailed attendance history

  ## Security
    - All tables have RLS enabled
    - Policies restrict access by role and branch
*/

-- Add gender and email to students table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'gender'
  ) THEN
    ALTER TABLE students ADD COLUMN gender text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'email'
  ) THEN
    ALTER TABLE students ADD COLUMN email text;
  END IF;
END $$;

-- Create class_attendance table for tracking individual class sessions
CREATE TABLE IF NOT EXISTS class_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  package_id uuid REFERENCES packages(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  check_in_time time,
  check_out_time time,
  attended boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS on class_attendance
ALTER TABLE class_attendance ENABLE ROW LEVEL SECURITY;

-- Policies for class_attendance
CREATE POLICY "Users can view class attendance in their branch"
  ON class_attendance FOR SELECT
  TO authenticated
  USING (
    branch_id IN (
      SELECT branch_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT id FROM branches WHERE auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
    )
  );

CREATE POLICY "Users can create class attendance in their branch"
  ON class_attendance FOR INSERT
  TO authenticated
  WITH CHECK (
    branch_id IN (
      SELECT branch_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT id FROM branches WHERE auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
    )
  );

CREATE POLICY "Users can update class attendance in their branch"
  ON class_attendance FOR UPDATE
  TO authenticated
  USING (
    branch_id IN (
      SELECT branch_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT id FROM branches WHERE auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
    )
  );

CREATE POLICY "Users can delete class attendance in their branch"
  ON class_attendance FOR DELETE
  TO authenticated
  USING (
    branch_id IN (
      SELECT branch_id FROM profiles WHERE id = auth.uid()
      UNION
      SELECT id FROM branches WHERE auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
    )
  );

-- Add invoice_type to invoices for better categorization
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'invoice_type'
  ) THEN
    ALTER TABLE invoices ADD COLUMN invoice_type text DEFAULT 'sale';
  END IF;
END $$;

-- Add scheme_id to track revenue per scheme
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'invoices' AND column_name = 'scheme_id'
  ) THEN
    ALTER TABLE invoices ADD COLUMN scheme_id uuid REFERENCES schemes(id);
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_class_attendance_student ON class_attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_class_attendance_date ON class_attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_class_attendance_branch ON class_attendance(branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_scheme ON invoices(scheme_id);

-- Create view for exam eligibility calculation
CREATE OR REPLACE VIEW exam_eligibility AS
SELECT 
  s.id as student_id,
  s.full_name,
  s.branch_id,
  s.joined_date,
  EXTRACT(MONTH FROM AGE(CURRENT_DATE, s.joined_date)) as months_with_us,
  COUNT(DISTINCT ca.id) FILTER (WHERE ca.attendance_date >= DATE_TRUNC('month', CURRENT_DATE)) as classes_this_month,
  COUNT(DISTINCT ca.id) as total_classes_attended,
  CASE 
    WHEN EXTRACT(MONTH FROM AGE(CURRENT_DATE, s.joined_date)) >= 3 
      AND COUNT(DISTINCT ca.id) FILTER (WHERE ca.attendance_date >= DATE_TRUNC('month', CURRENT_DATE)) >= 8
    THEN true
    ELSE false
  END as is_eligible
FROM students s
LEFT JOIN class_attendance ca ON s.id = ca.student_id AND ca.attended = true
WHERE s.is_active = true
GROUP BY s.id, s.full_name, s.branch_id, s.joined_date;

-- Add comment on view
COMMENT ON VIEW exam_eligibility IS 'Shows student exam eligibility based on tenure (3+ months) and monthly class attendance (8+ classes)';
