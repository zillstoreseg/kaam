/*
  # Add Branch Manager Field to Branches Table

  ## Changes
  1. Add `manager_id` column to branches table
     - References profiles table (branch managers)
     - Nullable to allow branches without assigned managers
     - Foreign key constraint ensures valid manager references
  
  2. No RLS changes needed
     - Existing branch RLS policies handle access control
*/

-- Add manager_id column to branches table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'branches' AND column_name = 'manager_id'
  ) THEN
    ALTER TABLE branches ADD COLUMN manager_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END $$;
