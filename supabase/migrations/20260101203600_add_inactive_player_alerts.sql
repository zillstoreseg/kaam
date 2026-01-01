/*
  # Add Inactive Player Alerts & WhatsApp Reminders

  1. New Settings Fields
    - `inactive_threshold_days` (int, default 14) - Days before a player is considered inactive
    - `enable_inactive_alerts` (boolean, default true) - Toggle to enable/disable the feature
    - `whatsapp_message_inactive_en` (text) - English WhatsApp reminder message template
    - `whatsapp_message_inactive_ar` (text) - Arabic WhatsApp reminder message template
    - `whatsapp_message_inactive_hi` (text) - Hindi WhatsApp reminder message template

  2. New Table: player_contacts
    - Track when inactive players were contacted
    - Columns: id, student_id, branch_id, contacted_at, contacted_by, contact_method, notes

  3. Security
    - Enable RLS on player_contacts table
    - Add policies for authenticated users based on branch/role

  Important: This is additive only - no breaking changes to existing tables
*/

-- Add new settings columns to settings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'inactive_threshold_days'
  ) THEN
    ALTER TABLE settings ADD COLUMN inactive_threshold_days INTEGER DEFAULT 14;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'enable_inactive_alerts'
  ) THEN
    ALTER TABLE settings ADD COLUMN enable_inactive_alerts BOOLEAN DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'whatsapp_message_inactive_en'
  ) THEN
    ALTER TABLE settings ADD COLUMN whatsapp_message_inactive_en TEXT DEFAULT 'Hi {student_name}, we noticed you haven''t attended class in a while. We miss you! Please let us know if you need any assistance. - {academy_name}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'whatsapp_message_inactive_ar'
  ) THEN
    ALTER TABLE settings ADD COLUMN whatsapp_message_inactive_ar TEXT DEFAULT 'مرحبا {student_name}، لاحظنا أنك لم تحضر الصف منذ فترة. نحن نفتقدك! يرجى إعلامنا إذا كنت بحاجة إلى أي مساعدة. - {academy_name}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'whatsapp_message_inactive_hi'
  ) THEN
    ALTER TABLE settings ADD COLUMN whatsapp_message_inactive_hi TEXT DEFAULT 'नमस्ते {student_name}, हमने देखा कि आप कुछ समय से कक्षा में नहीं आए हैं। हम आपको याद करते हैं! कृपया हमें बताएं यदि आपको किसी सहायता की आवश्यकता है। - {academy_name}';
  END IF;
END $$;

-- Create player_contacts table to track contact history
CREATE TABLE IF NOT EXISTS player_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  contacted_at TIMESTAMPTZ DEFAULT now(),
  contacted_by UUID REFERENCES profiles(id),
  contact_method TEXT DEFAULT 'whatsapp',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on player_contacts
ALTER TABLE player_contacts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to make migration idempotent)
DROP POLICY IF EXISTS "Super admins can view all player contacts" ON player_contacts;
DROP POLICY IF EXISTS "Branch managers can view their branch contacts" ON player_contacts;
DROP POLICY IF EXISTS "Users can insert player contacts" ON player_contacts;

-- Policy: Super admins can view all contacts
CREATE POLICY "Super admins can view all player contacts"
  ON player_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Policy: Branch managers can view their branch contacts
CREATE POLICY "Branch managers can view their branch contacts"
  ON player_contacts FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'branch_manager'
      AND profiles.branch_id = player_contacts.branch_id
    )
  );

-- Policy: Users can insert contacts for students in their scope
CREATE POLICY "Users can insert player contacts"
  ON player_contacts FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'super_admin'
        OR (profiles.role = 'branch_manager' AND profiles.branch_id = player_contacts.branch_id)
      )
    )
  );

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_player_contacts_student ON player_contacts(student_id);
CREATE INDEX IF NOT EXISTS idx_player_contacts_branch ON player_contacts(branch_id);
CREATE INDEX IF NOT EXISTS idx_player_contacts_date ON player_contacts(contacted_at);

-- Update existing settings row with defaults if it exists
UPDATE settings 
SET 
  inactive_threshold_days = COALESCE(inactive_threshold_days, 14),
  enable_inactive_alerts = COALESCE(enable_inactive_alerts, true),
  whatsapp_message_inactive_en = COALESCE(whatsapp_message_inactive_en, 'Hi {student_name}, we noticed you haven''t attended class in a while. We miss you! Please let us know if you need any assistance. - {academy_name}'),
  whatsapp_message_inactive_ar = COALESCE(whatsapp_message_inactive_ar, 'مرحبا {student_name}، لاحظنا أنك لم تحضر الصف منذ فترة. نحن نفتقدك! يرجى إعلامنا إذا كنت بحاجة إلى أي مساعدة. - {academy_name}'),
  whatsapp_message_inactive_hi = COALESCE(whatsapp_message_inactive_hi, 'नमस्ते {student_name}, हमने देखा कि आप कुछ समय से कक्षा में नहीं आए हैं। हम आपको याद करते हैं! कृपया हमें बताएं यदि आपको किसी सहायता की आवश्यकता है। - {academy_name}')
WHERE id IS NOT NULL;
