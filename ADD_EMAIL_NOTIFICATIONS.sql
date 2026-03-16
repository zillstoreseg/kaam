-- Email Notifications System
-- Execute this in Supabase SQL Editor

-- Create email notifications tracking table
CREATE TABLE IF NOT EXISTS email_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid REFERENCES academies(id) ON DELETE CASCADE,
  recipient_email text NOT NULL,
  email_type text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  sent_at timestamptz,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_academy ON email_notifications(academy_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications(status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_type ON email_notifications(email_type);

ALTER TABLE email_notifications ENABLE ROW LEVEL SECURITY;

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key text UNIQUE NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL,
  body_text text NOT NULL,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Insert default email templates
INSERT INTO email_templates (template_key, name, subject, body_html, body_text, variables) VALUES
('welcome', 'Welcome Email', 'Welcome to DOJO CLOUD - Your Free Trial Has Started!',
 '<html><body><h1>Welcome to DOJO CLOUD!</h1><p>Hi {{owner_name}},</p><p>Your academy <strong>{{academy_name}}</strong> has been successfully registered.</p><p>Your 14-day free trial has started. You have full access to all features until {{trial_end_date}}.</p></body></html>',
 'Welcome to DOJO CLOUD!\n\nHi {{owner_name}},\n\nYour academy {{academy_name}} has been successfully registered.',
 '["owner_name", "academy_name", "trial_end_date"]'::jsonb),
('trial_reminder', 'Trial Expiring Reminder', 'Your DOJO CLOUD Trial Expires in {{days_remaining}} Days',
 '<html><body><h1>Your Trial is Ending Soon</h1><p>Hi {{owner_name}},</p><p>Your trial will expire in <strong>{{days_remaining}} days</strong>.</p></body></html>',
 'Your trial will expire in {{days_remaining}} days.',
 '["owner_name", "academy_name", "days_remaining"]'::jsonb),
('payment_approved', 'Payment Approved', 'Your Subscription is Now Active!',
 '<html><body><h1>Subscription Activated!</h1><p>Hi {{owner_name}},</p><p>Your payment has been approved!</p></body></html>',
 'Your payment has been approved!',
 '["owner_name", "academy_name", "plan_name"]'::jsonb)
ON CONFLICT (template_key) DO NOTHING;

-- Add email configuration to platform settings
INSERT INTO platform_settings (key, value, category, description) VALUES
('email_enabled', 'false'::jsonb, 'email', 'Enable/disable email notifications'),
('sendgrid_api_key', '""'::jsonb, 'email', 'SendGrid API key'),
('smtp_from_email', '"noreply@dojocloud.com"'::jsonb, 'email', 'From email address')
ON CONFLICT (key) DO NOTHING;

-- RLS Policies
CREATE POLICY "Platform owners can view all email notifications"
  ON email_notifications FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.platform_role = 'platform_owner'));

CREATE POLICY "Academies can view their own email notifications"
  ON email_notifications FOR SELECT TO authenticated
  USING (academy_id IN (SELECT academy_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Platform owners can manage email templates"
  ON email_templates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.platform_role = 'platform_owner'));
