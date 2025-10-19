/*
  # Add Email Settings to Settings Table

  ## Changes
  1. Add email configuration fields to settings table
  2. Fields for SMTP configuration
  3. Fields for daily report settings

  ## New Fields
  - admin_email: Email address to receive daily reports
  - enable_daily_reports: Boolean to enable/disable daily registration emails
  - smtp_host: SMTP server host (optional for future use)
  - smtp_port: SMTP server port (optional for future use)
  - smtp_user: SMTP username (optional for future use)
  - smtp_password: SMTP password (optional for future use)
*/

-- Add email configuration fields to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS admin_email text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS enable_daily_reports boolean DEFAULT false;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_host text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_port integer;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_user text;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS smtp_password text;

-- Add comments
COMMENT ON COLUMN settings.admin_email IS 'Admin email address to receive daily registration reports';
COMMENT ON COLUMN settings.enable_daily_reports IS 'Enable/disable daily registration email reports';
COMMENT ON COLUMN settings.smtp_host IS 'SMTP server host for sending emails';
COMMENT ON COLUMN settings.smtp_port IS 'SMTP server port';
COMMENT ON COLUMN settings.smtp_user IS 'SMTP username for authentication';
COMMENT ON COLUMN settings.smtp_password IS 'SMTP password for authentication (encrypted)';
