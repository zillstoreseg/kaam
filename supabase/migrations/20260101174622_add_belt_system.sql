/*
  # Belt System for Karate Academy

  1. New Features
    - Belt ranking system for students
    - Belt master data table
    - Belt tracking and statistics

  2. New Tables
    - `belt_ranks`
      - `id` (uuid, primary key)
      - `belt_key` (text, unique) - Stable enum identifier
      - `belt_name` (text) - Display name (translatable)
      - `belt_order` (int) - Order for sorting and promotion logic
      - `color` (text) - Belt color for UI
      - `created_at` (timestamptz)

  3. Changes to Existing Tables
    - `students` table
      - Add `belt_key` (text, nullable) - References belt_ranks.belt_key
      - Add `belt_order` (int, nullable) - Denormalized for performance
      - Default for new students: '10th_kyu_white'

  4. Security
    - Enable RLS on belt_ranks table
    - Add policies for authenticated users to read belt data
    - Students table already has RLS enabled

  5. Notes
    - All changes are additive (no breaking changes)
    - Existing student records remain unchanged
    - Belt data is read-only for coaches/admins
*/

-- Create belt_ranks master table
CREATE TABLE IF NOT EXISTS belt_ranks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  belt_key text UNIQUE NOT NULL,
  belt_name text NOT NULL,
  belt_order integer UNIQUE NOT NULL,
  color text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add belt fields to students table (nullable for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'belt_key'
  ) THEN
    ALTER TABLE students ADD COLUMN belt_key text DEFAULT '10th_kyu_white';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'belt_order'
  ) THEN
    ALTER TABLE students ADD COLUMN belt_order integer DEFAULT 1;
  END IF;
END $$;

-- Insert belt ranks data
INSERT INTO belt_ranks (belt_key, belt_name, belt_order, color) VALUES
  ('10th_kyu_white', '10th Kyu (White)', 1, '#FFFFFF'),
  ('9th_kyu_yellow', '9th Kyu (Yellow)', 2, '#FFEB3B'),
  ('8th_kyu_orange', '8th Kyu (Orange)', 3, '#FF9800'),
  ('7th_kyu_green', '7th Kyu (Green)', 4, '#4CAF50'),
  ('6th_kyu_blue', '6th Kyu (Blue)', 5, '#2196F3'),
  ('5th_kyu_purple', '5th Kyu (Purple)', 6, '#9C27B0'),
  ('4th_kyu_brown_4', '4th Kyu (Brown 4)', 7, '#795548'),
  ('3rd_kyu_brown_3', '3rd Kyu (Brown 3)', 8, '#6D4C41'),
  ('2nd_kyu_brown_2', '2nd Kyu (Brown 2)', 9, '#5D4037'),
  ('1st_kyu_brown_1', '1st Kyu (Brown 1)', 10, '#4E342E'),
  ('1st_dan_black', '1st Dan (Black)', 11, '#000000')
ON CONFLICT (belt_key) DO NOTHING;

-- Enable RLS on belt_ranks
ALTER TABLE belt_ranks ENABLE ROW LEVEL SECURITY;

-- Policies for belt_ranks (read-only for all authenticated users)
CREATE POLICY "Anyone can view belt ranks"
  ON belt_ranks FOR SELECT
  TO authenticated
  USING (true);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_students_belt_key ON students(belt_key);
CREATE INDEX IF NOT EXISTS idx_students_belt_order ON students(belt_order);