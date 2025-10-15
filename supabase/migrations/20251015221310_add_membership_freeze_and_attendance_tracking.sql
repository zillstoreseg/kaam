/*
  # Add Membership Freeze and Attendance Tracking

  1. Changes to Students Table
    - `freeze_start_date` (date) - When freeze period starts
    - `freeze_end_date` (date) - When freeze period ends
    - `freeze_reason` (text) - Reason for freezing
    - `is_frozen` (boolean) - Quick check if currently frozen

  2. New Tables
    - `membership_freeze_history`
      - Track all freeze/unfreeze events
      - `id` (uuid, primary key)
      - `student_id` (uuid, references students)
      - `freeze_start` (date)
      - `freeze_end` (date)
      - `freeze_reason` (text)
      - `frozen_by` (uuid, references profiles)
      - `unfrozen_at` (timestamptz)
      - `unfrozen_by` (uuid, references profiles)
      - `created_at` (timestamptz)

    - `attendance_alerts`
      - Track attendance limit breaches
      - `id` (uuid, primary key)
      - `student_id` (uuid, references students)
      - `attendance_id` (uuid, references attendance)
      - `alert_type` (text) - 'limit_exceeded', 'expired_package', etc.
      - `alert_message` (text)
      - `week_start_date` (date)
      - `session_count` (integer) - Sessions in that week
      - `session_limit` (integer) - Allowed sessions per week
      - `is_resolved` (boolean)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS on all new tables
    - Appropriate access policies
*/

-- Add freeze columns to students table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'freeze_start_date'
  ) THEN
    ALTER TABLE students ADD COLUMN freeze_start_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'freeze_end_date'
  ) THEN
    ALTER TABLE students ADD COLUMN freeze_end_date date;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'freeze_reason'
  ) THEN
    ALTER TABLE students ADD COLUMN freeze_reason text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'is_frozen'
  ) THEN
    ALTER TABLE students ADD COLUMN is_frozen boolean DEFAULT false;
  END IF;
END $$;

-- Create membership_freeze_history table
CREATE TABLE IF NOT EXISTS membership_freeze_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  freeze_start date NOT NULL,
  freeze_end date NOT NULL,
  freeze_reason text,
  frozen_by uuid REFERENCES profiles(id),
  unfrozen_at timestamptz,
  unfrozen_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

-- Create attendance_alerts table
CREATE TABLE IF NOT EXISTS attendance_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  attendance_id uuid REFERENCES attendance(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  alert_message text NOT NULL,
  week_start_date date NOT NULL,
  session_count integer DEFAULT 0,
  session_limit integer DEFAULT 0,
  is_resolved boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE membership_freeze_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_alerts ENABLE ROW LEVEL SECURITY;

-- Policies for membership_freeze_history
CREATE POLICY "Users can view freeze history for their branch"
  ON membership_freeze_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = membership_freeze_history.student_id
      AND (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
        OR students.branch_id IN (SELECT branch_id FROM profiles WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "Authorized users can create freeze history"
  ON membership_freeze_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'branch_manager')
    )
  );

CREATE POLICY "Authorized users can update freeze history"
  ON membership_freeze_history FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'branch_manager')
    )
  );

-- Policies for attendance_alerts
CREATE POLICY "Users can view alerts for their branch"
  ON attendance_alerts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM students
      WHERE students.id = attendance_alerts.student_id
      AND (
        auth.uid() IN (SELECT id FROM profiles WHERE role = 'super_admin')
        OR students.branch_id IN (SELECT branch_id FROM profiles WHERE id = auth.uid())
      )
    )
  );

CREATE POLICY "System can create alerts"
  ON attendance_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authorized users can update alerts"
  ON attendance_alerts FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'branch_manager', 'coach')
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_frozen ON students(is_frozen) WHERE is_frozen = true;
CREATE INDEX IF NOT EXISTS idx_students_freeze_dates ON students(freeze_start_date, freeze_end_date);
CREATE INDEX IF NOT EXISTS idx_freeze_history_student ON membership_freeze_history(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_student ON attendance_alerts(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_unresolved ON attendance_alerts(is_resolved) WHERE is_resolved = false;
CREATE INDEX IF NOT EXISTS idx_attendance_alerts_week ON attendance_alerts(week_start_date);