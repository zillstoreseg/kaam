import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('\n🚀 AUTOMATED COMPLETE SETUP\n');

async function checkTables() {
  console.log('📋 Step 1: Checking tables...\n');

  const tables = ['platform_roles', 'plans', 'features', 'academies'];
  let allExist = true;

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`   ❌ ${table} - Missing`);
      allExist = false;
    } else {
      console.log(`   ✅ ${table} - OK`);
    }
  }

  console.log('');
  return allExist;
}

async function setupOwner() {
  console.log('📋 Step 2: Setting up owner...\n');

  const { data: { users } } = await supabase.auth.admin.listUsers();
  let owner = users.find(u => u.email === 'owner@dojocloud.com');

  if (!owner) {
    console.log('   Creating owner account...');
    const { data: newUser, error } = await supabase.auth.admin.createUser({
      email: 'owner@dojocloud.com',
      password: 'Owner123!@#',
      email_confirm: true
    });

    if (error) {
      console.error('   ❌ Error:', error.message);
      return false;
    }

    owner = newUser.user;
    console.log('   ✅ Account created');
  } else {
    console.log('   ✅ Account exists');
  }

  const { error: roleError } = await supabase
    .from('platform_roles')
    .insert({ user_id: owner.id, role: 'owner' })
    .select();

  if (roleError && !roleError.message.includes('duplicate')) {
    console.error('   ❌ Role error:', roleError.message);
    return false;
  }

  console.log('   ✅ Owner role assigned\n');
  return true;
}

async function main() {
  const tablesExist = await checkTables();

  if (!tablesExist) {
    console.log('❌ TABLES MISSING\n');
    console.log('RUN THIS IN SQL EDITOR:');
    console.log('https://viwgdxffvehogkflhkjw.supabase.co/project/viwgdxffvehogkflhkjw/sql/new\n');

    const migration1 = readFileSync('supabase/migrations/20260201000000_create_saas_platform_owner_layer.sql', 'utf8');
    const migration2 = readFileSync('supabase/migrations/20260201000001_seed_platform_data.sql', 'utf8');

    console.log('════════════ COPY BELOW ════════════\n');
    console.log(migration1 + '\n\n' + migration2);
    console.log('\n════════════ END ════════════\n');
    process.exit(1);
  }

  const ownerOk = await setupOwner();

  if (!ownerOk) {
    process.exit(1);
  }

  console.log('════════════════════════════════════════════════════════════════');
  console.log('✅ COMPLETE - READY NOW');
  console.log('════════════════════════════════════════════════════════════════\n');
  console.log('📧 Email:    owner@dojocloud.com');
  console.log('🔒 Password: Owner123!@#\n');
  console.log('LOGIN → Auto-redirect to Platform Admin\n');
}

main();
