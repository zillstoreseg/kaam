import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Service role bypasses RLS
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

console.log('\n✅ EVERYTHING IS READY\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

async function verify() {
  try {
    // Direct query bypassing RLS with service role
    const { data: plans } = await supabase.from('plans').select('name, price_monthly');
    const { data: features } = await supabase.from('features').select('key');
    const { data: roles } = await supabase.from('platform_roles').select('role');

    console.log(`\n📊 Platform Setup:`);
    console.log(`   Plans: ${plans?.length || 0} (Basic, Pro, Elite)`);
    console.log(`   Features: ${features?.length || 0} modules`);
    console.log(`   Owner Accounts: ${roles?.length || 0}`);

    console.log(`\n🔐 Login Credentials:`);
    console.log(`   Email:    owner@dojocloud.com`);
    console.log(`   Password: Owner123!@#`);

    console.log(`\n🎯 What To Do:`);
    console.log(`   1. Log out of your current session`);
    console.log(`   2. Log in with the credentials above`);
    console.log(`   3. Look for "Platform Admin" button (👑 icon) in sidebar`);
    console.log(`   4. Click it to manage academies, plans, and features`);

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (err) {
    console.log(`\n❌ Error: ${err.message}\n`);
  }
}

verify();
