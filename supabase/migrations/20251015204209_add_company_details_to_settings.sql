/*
  # Add Company Details to Settings for UAE Invoice Compliance

  ## Changes
  - Add company address fields
  - Add TRN (Tax Registration Number)
  - Add phone, email, website
  - Add slogan/tagline
  
  ## UAE Invoice Requirements
  - Company name ✓ (existing)
  - Logo ✓ (existing)
  - TRN (Tax Registration Number) ✓ (new)
  - Address ✓ (new)
  - Contact details ✓ (new)
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'company_address'
  ) THEN
    ALTER TABLE settings ADD COLUMN company_address text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'company_city'
  ) THEN
    ALTER TABLE settings ADD COLUMN company_city text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'company_country'
  ) THEN
    ALTER TABLE settings ADD COLUMN company_country text DEFAULT 'United Arab Emirates';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'company_phone'
  ) THEN
    ALTER TABLE settings ADD COLUMN company_phone text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'company_email'
  ) THEN
    ALTER TABLE settings ADD COLUMN company_email text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'company_website'
  ) THEN
    ALTER TABLE settings ADD COLUMN company_website text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'tax_registration_number'
  ) THEN
    ALTER TABLE settings ADD COLUMN tax_registration_number text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'settings' AND column_name = 'company_slogan'
  ) THEN
    ALTER TABLE settings ADD COLUMN company_slogan text;
  END IF;
END $$;
