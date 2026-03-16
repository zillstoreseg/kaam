import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const migrations = [
  {
    name: 'Add academy_id to profiles',
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS academy_id uuid REFERENCES academies(id) ON DELETE SET NULL`
  },
  {
    name: 'Add platform_role to profiles',
    sql: `ALTER TABLE profiles ADD COLUMN IF NOT EXISTS platform_role text DEFAULT NULL`
  },
  {
    name: 'Create index on profiles.academy_id',
    sql: `CREATE INDEX IF NOT EXISTS idx_profiles_academy_id ON profiles(academy_id)`
  },
  {
    name: 'Add self-registration INSERT policy for academies',
    sql: `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'academies' AND policyname = 'Academy admins can insert their academy'
      ) THEN
        CREATE POLICY "Academy admins can insert their academy"
          ON academies FOR INSERT TO authenticated WITH CHECK (true);
      END IF;
    END $$`
  },
  {
    name: 'Add academy admins SELECT policy for academies',
    sql: `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'academies' AND policyname = 'Academy admins can view own academy'
      ) THEN
        CREATE POLICY "Academy admins can view own academy"
          ON academies FOR SELECT TO authenticated
          USING (
            id IN (SELECT academy_id FROM profiles WHERE id = auth.uid())
            OR EXISTS (SELECT 1 FROM platform_roles WHERE user_id = auth.uid() AND role IN ('owner', 'super_owner'))
          );
      END IF;
    END $$`
  },
  {
    name: 'Allow users to insert own profile',
    sql: `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
      ) THEN
        CREATE POLICY "Users can insert own profile"
          ON profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
      END IF;
    END $$`
  },
  {
    name: 'Allow users to update own profile',
    sql: `DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
      ) THEN
        CREATE POLICY "Users can update own profile"
          ON profiles FOR UPDATE TO authenticated
          USING (id = auth.uid()) WITH CHECK (id = auth.uid());
      END IF;
    END $$`
  },
];

console.log('\n====================================================');
console.log('  DOJO CLOUD - Database Fix Migration');
console.log('====================================================\n');

let successCount = 0;
let failCount = 0;

for (const migration of migrations) {
  process.stdout.write(`Running: ${migration.name}... `);

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_migration`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql_text: migration.sql }),
    });

    if (response.ok) {
      console.log('OK');
      successCount++;
    } else {
      const body = await response.json();
      console.log(`SKIPPED (${body.message || 'function not available'})`);
    }
  } catch (e) {
    console.log(`ERROR: ${e.message}`);
    failCount++;
  }
}

console.log('\n====================================================');
console.log(`Results: ${successCount} succeeded, ${failCount} failed`);
console.log('====================================================');
console.log('\nIf migrations could not be applied automatically,');
console.log('please run FIX_REGISTRATION.sql in your Supabase SQL Editor:');
console.log(`https://supabase.com/dashboard/project/${supabaseUrl.split('.')[0].split('//')[1]}/sql/new`);
console.log('\n');
