/*
  # Medical Information for Students

  1. New Features
    - Track chronic conditions for students
    - Store condition details and treatment information
    - Enable medical statistics and reporting

  2. Changes to Existing Tables
    - `students` table
      - Add `has_chronic_condition` (boolean, nullable, default false)
      - Add `condition_details` (text, nullable)
      - Add `current_treatment` (text, nullable)

  3. Validation Rules
    - If has_chronic_condition = true → condition_details and current_treatment required (enforced in app)
    - If has_chronic_condition = false → condition fields must be empty/null

  4. Security
    - Students table already has RLS enabled
    - Medical information respects existing RLS policies
    - Only admins can view/edit medical information (enforced in app)

  5. Notes
    - All changes are additive (no breaking changes)
    - Existing student records default to has_chronic_condition = false
    - Medical fields are nullable for backward compatibility
*/

-- Add medical information fields to students table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'has_chronic_condition'
  ) THEN
    ALTER TABLE students ADD COLUMN has_chronic_condition boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'condition_details'
  ) THEN
    ALTER TABLE students ADD COLUMN condition_details text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'current_treatment'
  ) THEN
    ALTER TABLE students ADD COLUMN current_treatment text;
  END IF;
END $$;

-- Create index for medical statistics queries
CREATE INDEX IF NOT EXISTS idx_students_has_chronic_condition ON students(has_chronic_condition) WHERE has_chronic_condition = true;

-- Add comment for documentation
COMMENT ON COLUMN students.has_chronic_condition IS 'Indicates if student has any chronic medical condition';
COMMENT ON COLUMN students.condition_details IS 'Details about the chronic condition (required if has_chronic_condition is true)';
COMMENT ON COLUMN students.current_treatment IS 'Current treatment or management plan (required if has_chronic_condition is true)';