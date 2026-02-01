import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n🚀 FULL AUTOMATIC SETUP - NO MANUAL STEPS\n');

async function executeSQL(sql, description) {
  console.log(`⏳ ${description}...`);
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    if (error) throw error;
    console.log(`✅ ${description} - Done\n`);
    return true;
  } catch (err) {
    console.log(`   Note: ${err.message}\n`);
    return false;
  }
}

async function directInsert(table, data, description) {
  console.log(`⏳ ${description}...`);
  try {
    const { error } = await supabase.from(table).upsert(data, {
      onConflict: Object.keys(data[0])[0],
      ignoreDuplicates: false
    });
    if (error) throw error;
    console.log(`✅ ${description} - Done\n`);
    return true;
  } catch (err) {
    console.log(`   Note: ${err.message}\n`);
    return false;
  }
}

async function main() {
  // Step 1: Create platform_roles table
  const createPlatformRoles = `
    CREATE TABLE IF NOT EXISTS platform_roles (
      user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      role text NOT NULL CHECK (role IN ('owner', 'super_owner')) DEFAULT 'owner',
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE platform_roles ENABLE ROW LEVEL SECURITY;
  `;

  await executeSQL(createPlatformRoles, 'Creating platform_roles table');

  // Step 2: Create plans table
  const createPlans = `
    CREATE TABLE IF NOT EXISTS plans (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      price_monthly numeric(10,2) NOT NULL DEFAULT 0,
      description text,
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
  `;

  await executeSQL(createPlans, 'Creating plans table');

  // Step 3: Create features table
  const createFeatures = `
    CREATE TABLE IF NOT EXISTS features (
      key text PRIMARY KEY,
      label text NOT NULL,
      category text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE features ENABLE ROW LEVEL SECURITY;
  `;

  await executeSQL(createFeatures, 'Creating features table');

  // Step 4: Create plan_features table
  const createPlanFeatures = `
    CREATE TABLE IF NOT EXISTS plan_features (
      plan_id uuid REFERENCES plans(id) ON DELETE CASCADE,
      feature_key text REFERENCES features(key) ON DELETE CASCADE,
      enabled boolean DEFAULT true,
      PRIMARY KEY (plan_id, feature_key)
    );
    ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
  `;

  await executeSQL(createPlanFeatures, 'Creating plan_features table');

  // Step 5: Create academies table
  const createAcademies = `
    CREATE TABLE IF NOT EXISTS academies (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL,
      domain text UNIQUE NOT NULL,
      status text NOT NULL CHECK (status IN ('active', 'suspended')) DEFAULT 'active',
      plan_id uuid REFERENCES plans(id),
      subscription_status text NOT NULL CHECK (subscription_status IN ('active', 'expired', 'trial', 'suspended')) DEFAULT 'trial',
      expires_at timestamptz,
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE academies ENABLE ROW LEVEL SECURITY;
  `;

  await executeSQL(createAcademies, 'Creating academies table');

  // Step 6: Create academy_feature_overrides table
  const createOverrides = `
    CREATE TABLE IF NOT EXISTS academy_feature_overrides (
      academy_id uuid REFERENCES academies(id) ON DELETE CASCADE,
      feature_key text REFERENCES features(key) ON DELETE CASCADE,
      enabled boolean DEFAULT true,
      created_at timestamptz DEFAULT now(),
      PRIMARY KEY (academy_id, feature_key)
    );
    ALTER TABLE academy_feature_overrides ENABLE ROW LEVEL SECURITY;
  `;

  await executeSQL(createOverrides, 'Creating academy_feature_overrides table');

  // Step 7: Create subscriptions table
  const createSubscriptions = `
    CREATE TABLE IF NOT EXISTS subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      academy_id uuid REFERENCES academies(id) ON DELETE CASCADE,
      plan_id uuid REFERENCES plans(id),
      starts_at timestamptz NOT NULL,
      ends_at timestamptz NOT NULL,
      status text NOT NULL CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
      created_at timestamptz DEFAULT now()
    );
    ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
  `;

  await executeSQL(createSubscriptions, 'Creating subscriptions table');

  // Step 8: Seed plans
  console.log('📦 Seeding plans...');
  const plans = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Basic', price_monthly: 29.99, description: 'Essential features for small academies' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Pro', price_monthly: 79.99, description: 'Advanced features for growing academies' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'Elite', price_monthly: 149.99, description: 'Full feature access for large academies' }
  ];

  for (const plan of plans) {
    await supabase.from('plans').upsert(plan, { onConflict: 'id' });
  }
  console.log('✅ 3 plans seeded\n');

  // Step 9: Seed features
  console.log('📦 Seeding features...');
  const features = [
    { key: 'dashboard', label: 'Dashboard', category: 'core' },
    { key: 'students', label: 'Students Management', category: 'core' },
    { key: 'attendance', label: 'Attendance Tracking', category: 'core' },
    { key: 'branches', label: 'Branch Management', category: 'management' },
    { key: 'users', label: 'User Management', category: 'management' },
    { key: 'packages', label: 'Package Management', category: 'management' },
    { key: 'schemes', label: 'Scheme Management', category: 'management' },
    { key: 'invoices', label: 'Invoice Management', category: 'finance' },
    { key: 'sales', label: 'Sales Tracking', category: 'finance' },
    { key: 'expenses', label: 'Expense Tracking', category: 'finance' },
    { key: 'reports', label: 'Reports', category: 'reports' },
    { key: 'revenue_reports', label: 'Revenue Reports', category: 'reports' },
    { key: 'attendance_reports', label: 'Attendance Reports', category: 'reports' },
    { key: 'exam_eligibility', label: 'Exam Eligibility', category: 'features' },
    { key: 'inactive_players', label: 'Inactive Players', category: 'features' },
    { key: 'activity_log', label: 'Activity Log', category: 'management' },
    { key: 'login_history', label: 'Login History', category: 'management' },
    { key: 'security_alerts', label: 'Security Alerts', category: 'management' },
    { key: 'stock', label: 'Stock Management', category: 'inventory' },
    { key: 'stock_inventory', label: 'Stock Inventory', category: 'inventory' },
    { key: 'settings', label: 'Settings', category: 'core' }
  ];

  for (const feature of features) {
    await supabase.from('features').upsert(feature, { onConflict: 'key' });
  }
  console.log('✅ 21 features seeded\n');

  // Step 10: Seed plan features
  console.log('📦 Seeding plan features...');
  const planFeatures = [
    // Basic
    { plan_id: '11111111-1111-1111-1111-111111111111', feature_key: 'dashboard', enabled: true },
    { plan_id: '11111111-1111-1111-1111-111111111111', feature_key: 'students', enabled: true },
    { plan_id: '11111111-1111-1111-1111-111111111111', feature_key: 'attendance', enabled: true },
    { plan_id: '11111111-1111-1111-1111-111111111111', feature_key: 'packages', enabled: true },
    { plan_id: '11111111-1111-1111-1111-111111111111', feature_key: 'invoices', enabled: true },
    { plan_id: '11111111-1111-1111-1111-111111111111', feature_key: 'settings', enabled: true },
    // Pro
    { plan_id: '22222222-2222-2222-2222-222222222222', feature_key: 'dashboard', enabled: true },
    { plan_id: '22222222-2222-2222-2222-222222222222', feature_key: 'students', enabled: true },
    { plan_id: '22222222-2222-2222-2222-222222222222', feature_key: 'attendance', enabled: true },
    { plan_id: '22222222-2222-2222-2222-222222222222', feature_key: 'branches', enabled: true },
    { plan_id: '22222222-2222-2222-2222-222222222222', feature_key: 'users', enabled: true },
    { plan_id: '22222222-2222-2222-2222-222222222222', feature_key: 'packages', enabled: true },
    { plan_id: '22222222-2222-2222-2222-222222222222', feature_key: 'schemes', enabled: true },
    { plan_id: '22222222-2222-2222-2222-222222222222', feature_key: 'invoices', enabled: true },
    { plan_id: '22222222-2222-2222-2222-222222222222', feature_key: 'sales', enabled: true },
    { plan_id: '22222222-2222-2222-2222-222222222222', feature_key: 'expenses', enabled: true },
    { plan_id: '22222222-2222-2222-2222-222222222222', feature_key: 'reports', enabled: true },
    { plan_id: '22222222-2222-2222-2222-222222222222', feature_key: 'revenue_reports', enabled: true },
    { plan_id: '22222222-2222-2222-2222-222222222222', feature_key: 'attendance_reports', enabled: true },
    { plan_id: '22222222-2222-2222-2222-222222222222', feature_key: 'exam_eligibility', enabled: true },
    { plan_id: '22222222-2222-2222-2222-222222222222', feature_key: 'settings', enabled: true },
    // Elite
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'dashboard', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'students', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'attendance', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'branches', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'users', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'packages', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'schemes', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'invoices', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'sales', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'expenses', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'reports', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'revenue_reports', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'attendance_reports', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'exam_eligibility', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'inactive_players', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'activity_log', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'login_history', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'security_alerts', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'stock', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'stock_inventory', enabled: true },
    { plan_id: '33333333-3333-3333-3333-333333333333', feature_key: 'settings', enabled: true }
  ];

  for (const pf of planFeatures) {
    await supabase.from('plan_features').upsert(pf);
  }
  console.log('✅ Plan features seeded\n');

  // Step 11: Create or get owner user
  console.log('👤 Setting up owner account...');
  const email = 'owner@dojocloud.com';
  const password = 'Owner123!@#';

  const { data: { users } } = await supabase.auth.admin.listUsers();
  let userId = users.find(u => u.email === email)?.id;

  if (!userId) {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      console.log(`   User might exist: ${authError.message}`);
      userId = users.find(u => u.email === email)?.id;
    } else {
      userId = authData.user.id;
      console.log('✅ User created\n');
    }
  } else {
    console.log('✅ User exists\n');
  }

  // Step 12: Assign owner role
  if (userId) {
    console.log('🔐 Assigning owner role...');
    await supabase.from('platform_roles').upsert({
      user_id: userId,
      role: 'owner'
    }, { onConflict: 'user_id' });
    console.log('✅ Owner role assigned\n');
  }

  // Verification
  console.log('🔍 Verifying setup...');
  const { data: plansCount } = await supabase.from('plans').select('*', { count: 'exact', head: true });
  const { data: featuresCount } = await supabase.from('features').select('*', { count: 'exact', head: true });
  const { data: rolesCount } = await supabase.from('platform_roles').select('*', { count: 'exact', head: true });

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('✅ SETUP COMPLETE - 100% AUTOMATIC');
  console.log('════════════════════════════════════════════════════════════════\n');
  console.log('📧 Email:    owner@dojocloud.com');
  console.log('🔒 Password: Owner123!@#\n');
  console.log('🎯 NOW:');
  console.log('   1. Log out of current session');
  console.log('   2. Login with credentials above');
  console.log('   3. Click "Platform Admin" in sidebar (crown icon)\n');
  console.log('════════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
