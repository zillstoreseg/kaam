/*
  # Add Currency Symbol to Settings

  1. Changes
    - Add currency_symbol field to settings table (default: AED)
    - This will be used throughout the application for displaying amounts
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'currency_symbol'
  ) THEN
    ALTER TABLE settings ADD COLUMN currency_symbol text DEFAULT 'AED';
  END IF;
END $$;
