/*
  # Add Comprehensive Features to KAAM System

  ## New Features
  1. **Schemes/Programs Table**
     - Karate, Kickboxing, MMA, etc.
     - Track which sports/programs are offered
  
  2. **Student Enhancements**
     - Add photo_url for student pictures
     - Add trial_student flag
     - Add schemes (many-to-many relationship)
     - Add whatsapp_number for notifications
     - Add joined_date to track when student joined
  
  3. **Package Enhancements**
     - Add scheme_id to link packages to schemes
     - Add currency field (default AED)
  
  4. **Payments/Revenue Table**
     - Track all payments and revenue
     - Link to students and packages
  
  5. **Attendance Enhancements**
     - Already has marked_by field for coach tracking
  
  6. **Settings Enhancements**
     - Add WhatsApp API settings
     - Add academy contact details
  
  ## Security
  - Enable RLS on all new tables
  - Add appropriate policies for each role
*/

-- Create schemes table
CREATE TABLE IF NOT EXISTS schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view schemes"
  ON schemes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Super admin can insert schemes"
  ON schemes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admin can update schemes"
  ON schemes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Super admin can delete schemes"
  ON schemes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Add new columns to students table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE students ADD COLUMN photo_url text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'trial_student'
  ) THEN
    ALTER TABLE students ADD COLUMN trial_student boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'whatsapp_number'
  ) THEN
    ALTER TABLE students ADD COLUMN whatsapp_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'joined_date'
  ) THEN
    ALTER TABLE students ADD COLUMN joined_date date DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Create student_schemes junction table for many-to-many relationship
CREATE TABLE IF NOT EXISTS student_schemes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  scheme_id uuid NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(student_id, scheme_id)
);

ALTER TABLE student_schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view student schemes"
  ON student_schemes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Managers can insert student schemes"
  ON student_schemes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'branch_manager')
    )
  );

CREATE POLICY "Managers can delete student schemes"
  ON student_schemes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'branch_manager')
    )
  );

-- Add scheme_id and currency to packages table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packages' AND column_name = 'scheme_id'
  ) THEN
    ALTER TABLE packages ADD COLUMN scheme_id uuid REFERENCES schemes(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'packages' AND column_name = 'currency'
  ) THEN
    ALTER TABLE packages ADD COLUMN currency text DEFAULT 'AED';
  END IF;
END $$;

-- Create payments table for revenue tracking
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text DEFAULT 'AED',
  payment_date date DEFAULT CURRENT_DATE,
  payment_method text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  branch_id uuid NOT NULL REFERENCES branches(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view payments in their branch"
  ON payments FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM profiles WHERE role = 'super_admin'
    )
    OR
    branch_id IN (
      SELECT branch_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Managers can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'branch_manager')
    )
  );

CREATE POLICY "Managers can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'branch_manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'branch_manager')
    )
  );

-- Add WhatsApp settings to settings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'whatsapp_api_key'
  ) THEN
    ALTER TABLE settings ADD COLUMN whatsapp_api_key text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'whatsapp_enabled'
  ) THEN
    ALTER TABLE settings ADD COLUMN whatsapp_enabled boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE settings ADD COLUMN contact_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE settings ADD COLUMN contact_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'address'
  ) THEN
    ALTER TABLE settings ADD COLUMN address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'tax_rate'
  ) THEN
    ALTER TABLE settings ADD COLUMN tax_rate numeric DEFAULT 0;
  END IF;
END $$;

-- Insert default schemes
INSERT INTO schemes (name, description) VALUES
  ('Karate', 'Traditional Karate training'),
  ('Kickboxing', 'Kickboxing and cardio training'),
  ('MMA', 'Mixed Martial Arts'),
  ('Self Defense', 'Self defense techniques')
ON CONFLICT DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_student_schemes_student ON student_schemes(student_id);
CREATE INDEX IF NOT EXISTS idx_student_schemes_scheme ON student_schemes(scheme_id);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_branch ON payments(branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_students_joined_date ON students(joined_date);
CREATE INDEX IF NOT EXISTS idx_students_trial ON students(trial_student);
