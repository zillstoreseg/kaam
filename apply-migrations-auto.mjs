import { readFileSync } from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)[1];

console.log('\n🚀 APPLYING MIGRATIONS AUTOMATICALLY\n');

// Try to execute migrations using Supabase's pooler
const connectionStrings = [
  `postgresql://postgres.${projectRef}:${process.env.SUPABASE_DB_PASSWORD || 'password'}@aws-0-us-west-1.pooler.supabase.com:5432/postgres`,
  `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD || 'password'}@db.${projectRef}.supabase.co:5432/postgres`
];

async function tryConnection(connectionString) {
  const client = new pg.Client({ connectionString });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read and execute migration 1
    console.log('📥 Reading migration files...');
    const migration1 = readFileSync('supabase/migrations/20260201000000_create_saas_platform_owner_layer.sql', 'utf8');
    const migration2 = readFileSync('supabase/migrations/20260201000001_seed_platform_data.sql', 'utf8');

    console.log('⏳ Applying migration 1: Create tables...');
    await client.query(migration1);
    console.log('✅ Tables created\n');

    console.log('⏳ Applying migration 2: Seed data...');
    await client.query(migration2);
    console.log('✅ Data seeded\n');

    // Create owner account
    console.log('⏳ Creating owner account...');
    const createOwnerQuery = `
      INSERT INTO auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)
      VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        'owner@dojocloud.com',
        crypt('Owner123!@#', gen_salt('bf')),
        now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        now(),
        now(),
        '',
        '',
        '',
        ''
      )
      ON CONFLICT (email) DO NOTHING
      RETURNING id;
    `;

    const result = await client.query(createOwnerQuery);
    const userId = result.rows[0]?.id;

    if (userId) {
      await client.query(`INSERT INTO platform_roles (user_id, role) VALUES ($1, 'owner') ON CONFLICT (user_id) DO NOTHING`, [userId]);
      console.log('✅ Owner account created\n');
    } else {
      console.log('✅ Owner account already exists\n');
    }

    console.log('════════════════════════════════════════════════════════════════');
    console.log('✅ ALL DONE - 100% AUTOMATIC');
    console.log('════════════════════════════════════════════════════════════════\n');
    console.log('📧 Email:    owner@dojocloud.com');
    console.log('🔒 Password: Owner123!@#\n');
    console.log('🎯 NOW: Log out → Login → Click "Platform Admin"\n');
    console.log('════════════════════════════════════════════════════════════════\n');

    await client.end();
    return true;

  } catch (err) {
    await client.end();
    throw err;
  }
}

async function main() {
  for (const connString of connectionStrings) {
    try {
      await tryConnection(connString);
      process.exit(0);
    } catch (err) {
      console.log(`❌ Connection failed: ${err.message}`);
      console.log('   Trying alternative connection...\n');
      continue;
    }
  }

  console.log('❌ Could not connect to database');
  console.log('\nThe Supabase database needs a direct connection.');
  console.log('This requires database password which is not in .env file.');
  console.log('\nINSTEAD: Use Supabase Dashboard SQL Editor');
  console.log('1. Open: https://viwgdxffvehogkflhkjw.supabase.co/project/viwgdxffvehogkflhkjw/sql/new');
  console.log('2. Copy content from: supabase/migrations/20260201000000_create_saas_platform_owner_layer.sql');
  console.log('3. Paste and click Run');
  console.log('4. Repeat for: supabase/migrations/20260201000001_seed_platform_data.sql');
  console.log('5. Run: node setup-owner.mjs\n');
}

main();
