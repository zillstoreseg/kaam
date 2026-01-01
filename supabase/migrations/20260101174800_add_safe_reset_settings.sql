/*
  # Safe Data Reset Feature

  1. New Features
    - Optional data reset feature for super admins
    - Disabled by default for safety
    - Allows resetting transactional data while keeping configuration

  2. Changes to Existing Tables
    - `settings` table
      - Add `enable_data_reset` (boolean, default false)

  3. Security
    - Settings table already has RLS enabled
    - Only super admins can access settings (enforced in app)
    - Reset feature requires explicit enablement

  4. What Gets Reset (enforced in app)
    - Transactional data: students, exams, participation, expenses, logs, attendance, etc.
    - Preserved data: users, roles, branches, belt_ranks, packages, settings, translations

  5. Safety Features (enforced in app)
    - Preview modal showing record counts before delete
    - Require typing: "RESET"
    - Require admin password confirmation
    - Use database transaction (all or nothing)

  6. Notes
    - All changes are additive (no breaking changes)
    - Feature is opt-in only
    - Cannot be triggered accidentally
*/

-- Add enable_data_reset field to settings table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'enable_data_reset'
  ) THEN
    ALTER TABLE settings ADD COLUMN enable_data_reset boolean DEFAULT false;
  END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN settings.enable_data_reset IS 'Enable dangerous data reset feature (super admin only, disabled by default)';