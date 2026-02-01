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

console.log('\n🔍 CHECKING PLATFORM SETUP STATUS\n');

async function checkTables() {
  const tables = ['platform_roles', 'plans', 'features', 'academies'];
  const results = {};

  for (const table of tables) {
    try {
      const { error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        results[table] = false;
        console.log(`❌ ${table}: Does not exist`);
      } else {
        results[table] = true;
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        console.log(`✅ ${table}: Exists (${count || 0} rows)`);
      }
    } catch (err) {
      results[table] = false;
      console.log(`❌ ${table}: Error - ${err.message}`);
    }
  }

  return results;
}

async function checkFunction() {
  try {
    const { data, error } = await supabase.rpc('get_my_platform_role');
    if (error) {
      console.log(`❌ get_my_platform_role(): Does not exist`);
      return false;
    }
    console.log(`✅ get_my_platform_role(): Exists`);
    return true;
  } catch (err) {
    console.log(`❌ get_my_platform_role(): Error - ${err.message}`);
    return false;
  }
}

async function checkOwner() {
  try {
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const owner = users.find(u => u.email === 'owner@dojocloud.com');

    if (!owner) {
      console.log(`❌ Owner Account: Does not exist`);
      return false;
    }

    const { data, error } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', owner.id)
      .maybeSingle();

    if (error || !data) {
      console.log(`✅ Owner Account: Exists (email: ${owner.email})`);
      console.log(`❌ Owner Role: Not assigned`);
      return false;
    }

    console.log(`✅ Owner Account: ${owner.email} (role: ${data.role})`);
    return true;
  } catch (err) {
    console.log(`❌ Owner Account: Error - ${err.message}`);
    return false;
  }
}

async function main() {
  const tableResults = await checkTables();
  console.log('');
  const functionExists = await checkFunction();
  console.log('');
  const ownerExists = await checkOwner();

  console.log('\n════════════════════════════════════════════════════════════════');

  const allTablesExist = Object.values(tableResults).every(v => v);

  if (allTablesExist && functionExists && ownerExists) {
    console.log('✅ PLATFORM SETUP COMPLETE');
    console.log('════════════════════════════════════════════════════════════════\n');
    console.log('🎯 You can now login:');
    console.log('   Email:    owner@dojocloud.com');
    console.log('   Password: Owner123!@#\n');
    console.log('You will be automatically redirected to Platform Admin.\n');
  } else {
    console.log('⚠️  SETUP INCOMPLETE');
    console.log('════════════════════════════════════════════════════════════════\n');

    if (!allTablesExist || !functionExists) {
      console.log('❌ Migrations Not Applied\n');
      console.log('ACTION REQUIRED:');
      console.log('1. Open: https://viwgdxffvehogkflhkjw.supabase.co/project/viwgdxffvehogkflhkjw/sql/new');
      console.log('2. Copy content from: supabase/migrations/20260201000000_create_saas_platform_owner_layer.sql');
      console.log('3. Paste and click Run');
      console.log('4. Copy content from: supabase/migrations/20260201000001_seed_platform_data.sql');
      console.log('5. Paste and click Run');
      console.log('6. Run this script again\n');
    } else if (!ownerExists) {
      console.log('❌ Owner Account Not Created\n');
      console.log('ACTION REQUIRED:');
      console.log('Run: node create-owner.mjs\n');
    }
  }

  console.log('════════════════════════════════════════════════════════════════\n');
}

main();
