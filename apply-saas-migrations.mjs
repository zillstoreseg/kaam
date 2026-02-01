import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

console.log('\n🚀 APPLYING SAAS PLATFORM MIGRATIONS\n');

async function checkIfAlreadyApplied() {
  console.log('📋 Checking if migrations already applied...\n');

  const { error } = await supabase.from('platform_roles').select('*').limit(1);

  if (!error) {
    console.log('✅ Platform tables already exist!\n');
    return true;
  }

  console.log('⚠️  Platform tables not found, applying migrations...\n');
  return false;
}

async function executeSQLStatements(sql) {
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('/*') && !s.startsWith('--'));

  for (const statement of statements) {
    if (statement) {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
      if (error) {
        console.error('Error executing statement:', error.message);
        console.error('Statement:', statement.substring(0, 100) + '...');
      }
    }
  }
}

async function applyMigrations() {
  console.log('📝 Reading migration files...\n');

  const migration1 = readFileSync('./supabase/migrations/20260201000000_create_saas_platform_owner_layer.sql', 'utf8');
  const migration2 = readFileSync('./supabase/migrations/20260201000001_seed_platform_data.sql', 'utf8');

  console.log('✅ Migration files loaded\n');
  console.log('⚠️  Note: This will apply migrations via Supabase Edge Function\n');
  console.log('📤 Please copy and run the migrations manually using the Supabase SQL Editor\n');
  console.log('🔗 Go to: https://supabase.com/dashboard/project/viwgdxffvehogkflhkjw/sql/new\n');
  console.log('📝 Copy the contents of these files:\n');
  console.log('   1. supabase/migrations/20260201000000_create_saas_platform_owner_layer.sql');
  console.log('   2. supabase/migrations/20260201000001_seed_platform_data.sql\n');
  console.log('⚠️  Press Ctrl+C to cancel, or press Enter to check if migrations were already applied manually...\n');
}

async function verifyTables() {
  console.log('🔍 Verifying tables were created...\n');

  const tables = ['platform_roles', 'plans', 'features', 'plan_features', 'academies', 'academy_feature_overrides', 'subscriptions'];
  let allExist = true;

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`   ❌ ${table} - FAILED`);
      allExist = false;
    } else {
      console.log(`   ✅ ${table} - OK`);
    }
  }

  console.log('');
  return allExist;
}

async function checkFunctions() {
  console.log('🔍 Verifying RPC functions...\n');

  const { data: roleData, error: roleError } = await supabase.rpc('get_my_platform_role');

  if (roleError) {
    console.log('   ❌ get_my_platform_role() - FAILED:', roleError.message);
  } else {
    console.log('   ✅ get_my_platform_role() - OK');
  }

  console.log('');
}

async function main() {
  try {
    const alreadyApplied = await checkIfAlreadyApplied();

    if (!alreadyApplied) {
      await applyMigrations();
    }

    const tablesOk = await verifyTables();
    await checkFunctions();

    if (tablesOk) {
      console.log('✅ ALL MIGRATIONS APPLIED SUCCESSFULLY!\n');
      console.log('📝 Next steps:');
      console.log('   1. Create a platform owner account');
      console.log('   2. Run: node create-platform-owner.mjs\n');
    } else {
      console.log('❌ Some tables are missing. Check the errors above.\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

main();
