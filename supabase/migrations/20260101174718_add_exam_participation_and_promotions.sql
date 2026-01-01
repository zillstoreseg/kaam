/*
  # Exam Participation and Belt Promotions

  1. New Features
    - Track exam attendance and results
    - Automatic belt promotion logic
    - Immutable promotion history

  2. New Tables
    - `exam_participation`
      - `id` (uuid, primary key)
      - `exam_invitation_id` (uuid) - FK to exam_invitations
      - `student_id` (uuid) - FK to students
      - `branch_id` (uuid) - FK to branches
      - `attended` (boolean) - Did student attend the exam
      - `result` (text) - pass/fail (nullable if not attended)
      - `previous_belt_key` (text) - Belt before exam
      - `previous_belt_order` (integer) - Belt order before exam
      - `promoted_to_belt_key` (text, nullable) - New belt if promoted
      - `promoted_to_belt_order` (integer, nullable) - New belt order
      - `notes` (text, nullable)
      - `recorded_by` (uuid) - FK to profiles
      - `recorded_at` (timestamptz)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `promotion_log`
      - `id` (uuid, primary key)
      - `student_id` (uuid) - FK to students
      - `exam_participation_id` (uuid, nullable) - FK to exam_participation
      - `from_belt_key` (text)
      - `from_belt_order` (integer)
      - `to_belt_key` (text)
      - `to_belt_order` (integer)
      - `promotion_date` (date)
      - `promoted_by` (uuid) - FK to profiles
      - `notes` (text, nullable)
      - `created_at` (timestamptz) - Immutable record
      
  3. Security
    - Enable RLS on both tables
    - Branch-scoped policies for viewing/editing
    - Only admins and branch managers can record participation

  4. Business Rules (enforced in app)
    - Result enabled only if attended = true
    - Promotion only if result = 'pass'
    - Cannot promote beyond Black Belt (1st Dan)
    - Idempotent promotion logic (no double promotion)

  5. Notes
    - All changes are additive (no breaking changes)
    - Promotion log is append-only (immutable)
    - Exam invitations table already exists
*/

-- Create exam_participation table
CREATE TABLE IF NOT EXISTS exam_participation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exam_invitation_id uuid REFERENCES exam_invitations(id) ON DELETE CASCADE,
  student_id uuid REFERENCES students(id) ON DELETE CASCADE,
  branch_id uuid REFERENCES branches(id),
  attended boolean DEFAULT false,
  result text CHECK (result IN ('pass', 'fail')),
  previous_belt_key text,
  previous_belt_order integer,
  promoted_to_belt_key text,
  promoted_to_belt_order integer,
  notes text,
  recorded_by uuid REFERENCES profiles(id),
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(exam_invitation_id, student_id)
);

-- Create promotion_log table (immutable)
CREATE TABLE IF NOT EXISTS promotion_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  exam_participation_id uuid REFERENCES exam_participation(id),
  from_belt_key text NOT NULL,
  from_belt_order integer NOT NULL,
  to_belt_key text NOT NULL,
  to_belt_order integer NOT NULL,
  promotion_date date DEFAULT CURRENT_DATE,
  promoted_by uuid REFERENCES profiles(id),
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE exam_participation ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for exam_participation
CREATE POLICY "Super admins can view all exam participation"
  ON exam_participation FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Branch managers can view their branch exam participation"
  ON exam_participation FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'branch_manager'
      AND profiles.branch_id = exam_participation.branch_id
    )
  );

CREATE POLICY "Super admins can insert exam participation"
  ON exam_participation FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Branch managers can insert their branch exam participation"
  ON exam_participation FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'branch_manager'
      AND profiles.branch_id = exam_participation.branch_id
    )
  );

CREATE POLICY "Super admins can update exam participation"
  ON exam_participation FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Branch managers can update their branch exam participation"
  ON exam_participation FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'branch_manager'
      AND profiles.branch_id = exam_participation.branch_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'branch_manager'
      AND profiles.branch_id = exam_participation.branch_id
    )
  );

-- RLS Policies for promotion_log (read-only for most, append-only)
CREATE POLICY "Super admins can view all promotions"
  ON promotion_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Branch managers can view their branch promotions"
  ON promotion_log FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN students s ON s.id = promotion_log.student_id
      WHERE p.id = auth.uid()
      AND p.role = 'branch_manager'
      AND p.branch_id = s.branch_id
    )
  );

CREATE POLICY "Super admins can insert promotions"
  ON promotion_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

CREATE POLICY "Branch managers can insert promotions for their branch"
  ON promotion_log FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      INNER JOIN students s ON s.id = promotion_log.student_id
      WHERE p.id = auth.uid()
      AND p.role = 'branch_manager'
      AND p.branch_id = s.branch_id
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_exam_participation_student_id ON exam_participation(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_participation_exam_invitation_id ON exam_participation(exam_invitation_id);
CREATE INDEX IF NOT EXISTS idx_exam_participation_branch_id ON exam_participation(branch_id);
CREATE INDEX IF NOT EXISTS idx_promotion_log_student_id ON promotion_log(student_id);
CREATE INDEX IF NOT EXISTS idx_promotion_log_promotion_date ON promotion_log(promotion_date);

-- Add comments for documentation
COMMENT ON TABLE exam_participation IS 'Tracks student attendance and results for exams';
COMMENT ON TABLE promotion_log IS 'Immutable log of all belt promotions';
COMMENT ON COLUMN exam_participation.attended IS 'Whether student attended the exam';
COMMENT ON COLUMN exam_participation.result IS 'Exam result: pass or fail (null if not attended)';
COMMENT ON COLUMN promotion_log.created_at IS 'Immutable timestamp - promotion records cannot be modified';