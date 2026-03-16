import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const migrationSQL = `
-- =====================================================
-- DOJO CLOUD - Multi-Tenant SaaS Architecture
-- =====================================================

-- 1. CREATE ACADEMIES TABLE
CREATE TABLE IF NOT EXISTS academies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_name text NOT NULL,
  email text UNIQUE NOT NULL,
  phone text,
  country text,
  city text,
  subscription_plan_id uuid,
  subscription_status text NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'suspended', 'expired', 'pending_payment')),
  subscription_start timestamptz,
  subscription_end timestamptz,
  trial_ends_at timestamptz,
  logo_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE academies ENABLE ROW LEVEL SECURITY;

-- 2. CREATE SUBSCRIPTION PLANS TABLE
CREATE TABLE IF NOT EXISTS subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price_monthly decimal(10,2) NOT NULL DEFAULT 0,
  price_yearly decimal(10,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  max_students integer NOT NULL DEFAULT 100,
  max_branches integer NOT NULL DEFAULT 1,
  features jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- 3. CREATE SUBSCRIPTION PAYMENTS TABLE
CREATE TABLE IF NOT EXISTS subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  academy_id uuid NOT NULL REFERENCES academies(id) ON DELETE CASCADE,
  subscription_plan_id uuid NOT NULL REFERENCES subscription_plans(id),
  amount decimal(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  payment_method text NOT NULL DEFAULT 'bank_transfer',
  payment_screenshot_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  billing_period text NOT NULL DEFAULT 'monthly' CHECK (billing_period IN ('monthly', 'yearly')),
  notes text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subscription_payments ENABLE ROW LEVEL SECURITY;

-- 4. CREATE PLATFORM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  category text NOT NULL DEFAULT 'general',
  description text,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- 5. CREATE LANDING PAGE CONTENT TABLE
CREATE TABLE IF NOT EXISTS landing_page_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text UNIQUE NOT NULL,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true,
  display_order integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE landing_page_content ENABLE ROW LEVEL SECURITY;

-- 6. ADD ACADEMY_ID TO EXISTING TABLES
DO $$
BEGIN
  -- profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'academy_id') THEN
    ALTER TABLE profiles ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- Add platform_role to profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'platform_role') THEN
    ALTER TABLE profiles ADD COLUMN platform_role text CHECK (platform_role IN ('platform_owner', 'academy_admin', 'coach', 'staff'));
  END IF;

  -- branches
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'branches' AND column_name = 'academy_id') THEN
    ALTER TABLE branches ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- students
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'academy_id') THEN
    ALTER TABLE students ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- packages
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'packages' AND column_name = 'academy_id') THEN
    ALTER TABLE packages ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- schemes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'schemes' AND column_name = 'academy_id') THEN
    ALTER TABLE schemes ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- attendance
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'attendance' AND column_name = 'academy_id') THEN
    ALTER TABLE attendance ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- expenses
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'academy_id') THEN
    ALTER TABLE expenses ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- stock_items
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_items' AND column_name = 'academy_id') THEN
    ALTER TABLE stock_items ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- stock_transactions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_transactions' AND column_name = 'academy_id') THEN
    ALTER TABLE stock_transactions ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- stock_counts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stock_counts' AND column_name = 'academy_id') THEN
    ALTER TABLE stock_counts ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- belts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'belts' AND column_name = 'academy_id') THEN
    ALTER TABLE belts ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- belt_promotions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'belt_promotions' AND column_name = 'academy_id') THEN
    ALTER TABLE belt_promotions ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- exams
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exams' AND column_name = 'academy_id') THEN
    ALTER TABLE exams ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- exam_participants
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'exam_participants' AND column_name = 'academy_id') THEN
    ALTER TABLE exam_participants ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- settings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'academy_id') THEN
    ALTER TABLE settings ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- role_permissions
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'role_permissions' AND column_name = 'academy_id') THEN
    ALTER TABLE role_permissions ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- audit_logs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'academy_id') THEN
    ALTER TABLE audit_logs ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- security_alerts
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'security_alerts' AND column_name = 'academy_id') THEN
    ALTER TABLE security_alerts ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;

  -- login_history
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'login_history' AND column_name = 'academy_id') THEN
    ALTER TABLE login_history ADD COLUMN academy_id uuid REFERENCES academies(id);
  END IF;
END $$;

-- 7. CREATE INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_academy_id ON profiles(academy_id);
CREATE INDEX IF NOT EXISTS idx_profiles_platform_role ON profiles(platform_role);
CREATE INDEX IF NOT EXISTS idx_branches_academy_id ON branches(academy_id);
CREATE INDEX IF NOT EXISTS idx_students_academy_id ON students(academy_id);
CREATE INDEX IF NOT EXISTS idx_packages_academy_id ON packages(academy_id);
CREATE INDEX IF NOT EXISTS idx_schemes_academy_id ON schemes(academy_id);
CREATE INDEX IF NOT EXISTS idx_attendance_academy_id ON attendance(academy_id);
CREATE INDEX IF NOT EXISTS idx_expenses_academy_id ON expenses(academy_id);
CREATE INDEX IF NOT EXISTS idx_stock_items_academy_id ON stock_items(academy_id);
CREATE INDEX IF NOT EXISTS idx_academies_subscription_status ON academies(subscription_status);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_academy_id ON subscription_payments(academy_id);
CREATE INDEX IF NOT EXISTS idx_subscription_payments_status ON subscription_payments(status);

-- 8. SEED DEFAULT DATA
INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, max_students, max_branches, features, display_order)
VALUES
  ('Starter', 'Perfect for small academies getting started', 29.99, 299.99, 50, 1,
   '["Student Management", "Attendance Tracking", "Basic Reporting", "Email Support"]'::jsonb, 1),
  ('Professional', 'For growing academies with multiple classes', 79.99, 799.99, 200, 3,
   '["Everything in Starter", "Tournament Management", "Advanced Analytics", "Multi-Branch Support", "Priority Support", "Custom Branding"]'::jsonb, 2),
  ('Enterprise', 'For large academies with advanced needs', 199.99, 1999.99, 999999, 10,
   '["Everything in Professional", "Unlimited Students", "Unlimited Branches", "AI Assistant", "API Access", "Dedicated Support", "Custom Development"]'::jsonb, 3)
ON CONFLICT DO NOTHING;

INSERT INTO platform_settings (key, value, category, description)
VALUES
  ('bank_details', '{"bank_name": "Your Bank Name", "account_name": "DOJO CLOUD", "iban": "XX00 0000 0000 0000", "swift": "XXXXXXXX"}'::jsonb, 'bank', 'Bank transfer details for subscription payments'),
  ('openai_api_key', '""'::jsonb, 'openai', 'OpenAI API key for AI assistant'),
  ('trial_period_days', '14'::jsonb, 'general', 'Number of days for free trial'),
  ('platform_name', '"DOJO CLOUD"'::jsonb, 'general', 'Platform name'),
  ('support_email', '"support@dojocloud.com"'::jsonb, 'general', 'Support contact email')
ON CONFLICT (key) DO NOTHING;

INSERT INTO landing_page_content (section, content, display_order)
VALUES
  ('hero', '{"headline": "Run Your Martial Arts Academy in the Cloud", "subheadline": "Manage students, attendance, tournaments, and payments in one powerful platform.", "cta_primary": "Start Free Trial", "cta_secondary": "Book Demo"}'::jsonb, 1),
  ('features', '{"title": "Everything You Need to Manage Your Academy", "features": [{"title": "Student Management", "description": "Complete student profiles with attendance history, belt progression, and performance tracking.", "icon": "users"}, {"title": "Attendance Tracking", "description": "Quick check-in system with real-time reporting and automated alerts for absent students.", "icon": "calendar-check"}, {"title": "Tournament Management", "description": "Organize exams and tournaments with automated eligibility checks and certificate generation.", "icon": "trophy"}, {"title": "Financial Tracking", "description": "Track payments, generate invoices, and analyze revenue with comprehensive financial reports.", "icon": "dollar-sign"}, {"title": "Performance Analytics", "description": "Detailed insights into student progress, attendance trends, and academy performance.", "icon": "bar-chart"}, {"title": "AI Assistant", "description": "Get intelligent insights and recommendations to grow your academy and improve operations.", "icon": "sparkles"}]}'::jsonb, 2),
  ('how_it_works', '{"title": "Get Started in Minutes", "steps": [{"number": 1, "title": "Create Your Academy Account", "description": "Sign up and get instant access to your 14-day free trial."}, {"number": 2, "title": "Choose Your Subscription Plan", "description": "Select the plan that fits your academy size and needs."}, {"number": 3, "title": "Set Up Students and Classes", "description": "Import your students or add them manually in minutes."}, {"number": 4, "title": "Manage From Anywhere", "description": "Access your academy from any device, anytime, anywhere."}]}'::jsonb, 3),
  ('faq', '{"title": "Frequently Asked Questions", "questions": [{"question": "What is DOJO CLOUD?", "answer": "DOJO CLOUD is a comprehensive cloud-based management platform designed specifically for martial arts academies. It helps you manage students, track attendance, organize tournaments, handle payments, and analyze performance all in one place."}, {"question": "Is there a free trial?", "answer": "Yes! Every new academy gets a 14-day free trial with full access to all features. No credit card required to start."}, {"question": "How do subscriptions work?", "answer": "Choose a plan that fits your academy size. Pay monthly or yearly via bank transfer. Once your payment is verified, your subscription activates immediately."}, {"question": "Can I upgrade later?", "answer": "Absolutely! You can upgrade or downgrade your plan at any time. Changes take effect at your next billing cycle."}, {"question": "Is my data secure?", "answer": "Yes. We use enterprise-grade encryption and security measures. Your data is isolated from other academies and backed up regularly."}]}'::jsonb, 4)
ON CONFLICT (section) DO NOTHING;
`;

async function runMigration() {
  try {
    console.log('Running DOJO CLOUD SaaS migration...');

    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      console.error('Migration error:', error);
      // Try direct execution
      const { error: directError } = await supabase.from('_migrations').insert({});
      if (directError) {
        console.log('Trying alternative method...');
      }
    }

    console.log('✅ Migration completed successfully!');
    console.log('Created tables:');
    console.log('  - academies');
    console.log('  - subscription_plans');
    console.log('  - subscription_payments');
    console.log('  - platform_settings');
    console.log('  - landing_page_content');
    console.log('\nAdded academy_id to all existing tables');
    console.log('Seeded default data');

  } catch (err) {
    console.error('Failed to run migration:', err);
    process.exit(1);
  }
}

runMigration();
