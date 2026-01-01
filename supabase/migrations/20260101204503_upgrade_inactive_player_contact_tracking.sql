/*
  # Upgrade Inactive Player Contact Tracking

  1. New Columns
    - `player_contacts.status` (text, nullable) - Track delivery status: 'sent', 'not_sent', 'attempted'
    - `settings.whatsapp_contact_cooldown_days` (integer, default 3) - Days before allowing re-contact

  2. Updates
    - Add status column to track whether message was actually sent
    - Add cooldown setting to prevent spam
    - Maintain backward compatibility (status nullable, existing records unaffected)

  3. Security
    - No RLS changes (existing policies remain)

  Important: Non-breaking changes only - preserves all existing data and functionality
*/

-- Add status column to player_contacts (nullable for backward compatibility)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'player_contacts' AND column_name = 'status'
  ) THEN
    ALTER TABLE player_contacts ADD COLUMN status TEXT DEFAULT NULL;
    COMMENT ON COLUMN player_contacts.status IS 'Delivery status: sent, not_sent, attempted';
  END IF;
END $$;

-- Add cooldown setting
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'whatsapp_contact_cooldown_days'
  ) THEN
    ALTER TABLE settings ADD COLUMN whatsapp_contact_cooldown_days INTEGER DEFAULT 3;
  END IF;
END $$;

-- Update existing settings row with default cooldown
UPDATE settings 
SET whatsapp_contact_cooldown_days = COALESCE(whatsapp_contact_cooldown_days, 3)
WHERE id IS NOT NULL;

-- Add index for faster status queries
CREATE INDEX IF NOT EXISTS idx_player_contacts_status ON player_contacts(status);
CREATE INDEX IF NOT EXISTS idx_player_contacts_student_date ON player_contacts(student_id, contacted_at DESC);
