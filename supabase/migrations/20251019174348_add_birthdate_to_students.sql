/*
  # Add Birthdate to Students

  ## Changes
  1. Add birthdate column to students table
  2. Column is optional (nullable) for existing students
  3. Date format for proper filtering by year

  ## Notes
  - Allows filtering by birth year
  - Enables age calculations
*/

-- Add birthdate column to students
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'birthdate'
  ) THEN
    ALTER TABLE students ADD COLUMN birthdate date;
  END IF;
END $$;

-- Add index for better performance on birthdate queries
CREATE INDEX IF NOT EXISTS idx_students_birthdate ON students(birthdate);
