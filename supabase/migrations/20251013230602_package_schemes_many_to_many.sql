/*
  # Update Package-Scheme Relationship to Many-to-Many

  ## Changes
  1. Remove scheme_id column from packages table (old one-to-one)
  2. Create package_schemes junction table for many-to-many relationship
  3. Add RLS policies for the new table
  
  ## Notes
  - Packages can now belong to multiple schemes
  - Schemes can have multiple packages
  - Better filtering when selecting packages for students
*/

-- Create package_schemes junction table
CREATE TABLE IF NOT EXISTS package_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  scheme_id uuid NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(package_id, scheme_id)
);

ALTER TABLE package_schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view package schemes"
  ON package_schemes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can insert package schemes"
  ON package_schemes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admin can delete package schemes"
  ON package_schemes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Migrate existing data from packages.scheme_id to package_schemes
INSERT INTO package_schemes (package_id, scheme_id)
SELECT id, scheme_id
FROM packages
WHERE scheme_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Remove old scheme_id column from packages
ALTER TABLE packages DROP COLUMN IF EXISTS scheme_id;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_package_schemes_package ON package_schemes(package_id);
CREATE INDEX IF NOT EXISTS idx_package_schemes_scheme ON package_schemes(scheme_id);
