/*
  # Add Message Templates and Student Renewal Tracking

  1. Changes to settings table
    - Add message template fields for various scenarios
    - Add templates for: expired students, registration, invoice footer, welcome message
  
  2. New Table: student_renewals
    - Track renewal history for students
    - `id` (uuid, primary key)
    - `student_id` (uuid, references students)
    - `old_package_id` (uuid, references packages)
    - `new_package_id` (uuid, references packages)
    - `old_package_end` (date)
    - `new_package_start` (date)
    - `new_package_end` (date)
    - `renewed_by` (uuid, references profiles)
    - `renewal_date` (timestamptz)
    - `notes` (text)
  
  3. New Table: whatsapp_messages
    - Track sent WhatsApp messages
    - `id` (uuid, primary key)
    - `student_id` (uuid, references students)
    - `message_type` (text)
    - `message_content` (text)
    - `sent_date` (timestamptz)
    - `sent_by` (uuid, references profiles)
  
  4. Security
    - Enable RLS on new tables
    - Add policies for authenticated users
*/

-- Add message template columns to settings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'message_template_expired'
  ) THEN
    ALTER TABLE settings ADD COLUMN message_template_expired text DEFAULT 'Dear {student_name}, your package expired on {expiry_date}. It has been {days_expired} days since expiry. Please renew your package to continue training. Contact us at {academy_phone}.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'message_template_registration'
  ) THEN
    ALTER TABLE settings ADD COLUMN message_template_registration text DEFAULT 'Welcome {student_name}! Thank you for joining {academy_name}. Your package starts on {package_start} and ends on {package_end}. We look forward to training with you!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'message_template_renewal'
  ) THEN
    ALTER TABLE settings ADD COLUMN message_template_renewal text DEFAULT 'Dear {student_name}, your package has been successfully renewed! Your new package starts on {package_start} and ends on {package_end}. Thank you for continuing with us!';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'message_template_invoice'
  ) THEN
    ALTER TABLE settings ADD COLUMN message_template_invoice text DEFAULT 'Thank you for your purchase! Invoice #{invoice_number} for {total_amount}. Visit us at {academy_address}. Contact: {academy_phone}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'invoice_footer_text'
  ) THEN
    ALTER TABLE settings ADD COLUMN invoice_footer_text text DEFAULT 'Thank you for your business! We appreciate your trust in us.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'auto_send_expired_message'
  ) THEN
    ALTER TABLE settings ADD COLUMN auto_send_expired_message boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'expired_message_days_interval'
  ) THEN
    ALTER TABLE settings ADD COLUMN expired_message_days_interval integer DEFAULT 7;
  END IF;
END $$;

-- Create student_renewals table
CREATE TABLE IF NOT EXISTS student_renewals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  old_package_id uuid REFERENCES packages(id) ON DELETE SET NULL,
  new_package_id uuid NOT NULL REFERENCES packages(id) ON DELETE RESTRICT,
  old_package_end date,
  new_package_start date NOT NULL,
  new_package_end date NOT NULL,
  renewed_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  renewal_date timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE student_renewals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view renewals for their branch"
  ON student_renewals FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND (
        role = 'super_admin'
        OR EXISTS (
          SELECT 1 FROM students
          WHERE students.id = student_renewals.student_id
          AND students.branch_id = profiles.branch_id
        )
      )
    )
  );

CREATE POLICY "Branch staff can create renewals"
  ON student_renewals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'branch_manager')
    )
  );

-- Create whatsapp_messages table for tracking sent messages
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  message_type text NOT NULL CHECK (message_type IN ('expired', 'registration', 'renewal', 'invoice', 'custom')),
  message_content text NOT NULL,
  sent_date timestamptz DEFAULT now(),
  sent_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  branch_id uuid REFERENCES branches(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages for their branch"
  ON whatsapp_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND (
        role = 'super_admin'
        OR branch_id = whatsapp_messages.branch_id
      )
    )
  );

CREATE POLICY "Users can create messages"
  ON whatsapp_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'branch_manager', 'coach')
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_student_renewals_student_id ON student_renewals(student_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_student_id ON whatsapp_messages(student_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_sent_date ON whatsapp_messages(sent_date);
