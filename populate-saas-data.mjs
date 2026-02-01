import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function populate() {
  console.log('🚀 Populating SaaS Platform Data...\n');

  // 1. Insert plans
  console.log('📦 Inserting plans...');
  const plans = [
    { id: '11111111-1111-1111-1111-111111111111', name: 'Basic', price_monthly: 29.99, description: 'Essential features for small academies' },
    { id: '22222222-2222-2222-2222-222222222222', name: 'Pro', price_monthly: 79.99, description: 'Advanced features for growing academies' },
    { id: '33333333-3333-3333-3333-333333333333', name: 'Elite', price_monthly: 149.99, description: 'Full feature access for large academies' }
  ];

  for (const plan of plans) {
    const { error } = await supabase
      .from('plans')
      .upsert(plan, { onConflict: 'id' });
    if (error) console.log(`   Error: ${error.message}`);
  }
  console.log('✅ Plans inserted\n');

  // 2. Insert features
  console.log('📦 Inserting features...');
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
    const { error } = await supabase
      .from('features')
      .upsert(feature, { onConflict: 'key' });
    if (error) console.log(`   Error: ${error.message}`);
  }
  console.log('✅ Features inserted\n');

  // 3. Insert plan features
  console.log('📦 Inserting plan features...');
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
    const { error } = await supabase
      .from('plan_features')
      .upsert(pf);
    if (error && !error.message.includes('duplicate')) {
      console.log(`   Error: ${error.message}`);
    }
  }
  console.log('✅ Plan features inserted\n');

  // 4. Create platform owner user
  console.log('👤 Creating platform owner...');
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
      console.log(`   Note: ${authError.message}`);
      userId = users.find(u => u.email === email)?.id;
    } else {
      userId = authData.user.id;
      console.log('✅ User created');
    }
  } else {
    console.log('✅ User already exists');
  }

  // 5. Assign platform owner role
  if (userId) {
    console.log('🔐 Assigning platform owner role...');
    const { error } = await supabase
      .from('platform_roles')
      .upsert({ user_id: userId, role: 'owner' }, { onConflict: 'user_id' });

    if (error) {
      console.log(`   Error: ${error.message}`);
    } else {
      console.log('✅ Platform owner role assigned');
    }
  }

  // Verify
  const { data: plansData } = await supabase.from('plans').select('*');
  const { data: featuresData } = await supabase.from('features').select('*');
  const { data: rolesData } = await supabase.from('platform_roles').select('*');

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('✅ DATA POPULATION COMPLETE');
  console.log('════════════════════════════════════════════════════════════════');
  console.log(`\n📊 ${plansData?.length || 0} plans`);
  console.log(`📊 ${featuresData?.length || 0} features`);
  console.log(`📊 ${rolesData?.length || 0} platform roles\n`);
  console.log('📧 Email:    owner@dojocloud.com');
  console.log('🔒 Password: Owner123!@#\n');
  console.log('🎯 Login now and access Platform Admin from the sidebar!\n');
  console.log('════════════════════════════════════════════════════════════════\n');
}

populate().catch(console.error);
