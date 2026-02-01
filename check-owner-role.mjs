import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const serviceSupabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

const anonSupabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkAndFixRole() {
  console.log('🔍 Checking Platform Owner Status...\n');

  const email = 'owner@dojocloud.com';
  const password = 'Owner123!@#';

  console.log('1️⃣ Checking if user exists...');
  const { data: { users } } = await serviceSupabase.auth.admin.listUsers();
  const ownerUser = users.find(u => u.email === email);

  if (!ownerUser) {
    console.log('❌ User does NOT exist - creating now...\n');
    const { data: authData, error: authError } = await serviceSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) {
      console.log(`❌ Failed to create user: ${authError.message}`);
      return false;
    }

    console.log(`✅ User created with ID: ${authData.user.id}\n`);

    console.log('2️⃣ Adding platform owner role...');
    const { error: roleError } = await serviceSupabase
      .from('platform_roles')
      .insert({ user_id: authData.user.id, role: 'owner' });

    if (roleError) {
      console.log(`❌ Failed to add role: ${roleError.message}`);
      return false;
    }

    console.log('✅ Platform owner role added\n');
    return true;
  }

  console.log(`✅ User exists with ID: ${ownerUser.id}\n`);

  console.log('2️⃣ Checking platform_roles table...');
  const { data: roles, error: rolesError } = await serviceSupabase
    .from('platform_roles')
    .select('*')
    .eq('user_id', ownerUser.id);

  if (rolesError) {
    console.log(`❌ Error checking roles: ${rolesError.message}`);
    return false;
  }

  if (!roles || roles.length === 0) {
    console.log('❌ NO role found - adding now...\n');
    const { error: insertError } = await serviceSupabase
      .from('platform_roles')
      .insert({ user_id: ownerUser.id, role: 'owner' });

    if (insertError) {
      console.log(`❌ Failed to add role: ${insertError.message}`);
      return false;
    }

    console.log('✅ Platform owner role added\n');
  } else {
    console.log(`✅ Role found: ${roles[0].role}\n`);
  }

  console.log('3️⃣ Testing login...');
  const { data: loginData, error: loginError } = await anonSupabase.auth.signInWithPassword({
    email,
    password
  });

  if (loginError) {
    console.log(`❌ Login failed: ${loginError.message}`);
    return false;
  }

  console.log('✅ Login successful\n');

  console.log('4️⃣ Testing get_my_platform_role() RPC...');
  const { data: rpcData, error: rpcError } = await anonSupabase.rpc('get_my_platform_role');

  if (rpcError) {
    console.log(`❌ RPC error: ${rpcError.message}`);
    await anonSupabase.auth.signOut();
    return false;
  }

  console.log(`✅ RPC result: role = ${rpcData?.role || 'null'}\n`);

  if (!rpcData || !rpcData.role) {
    console.log('❌ RPC returns no role');
    await anonSupabase.auth.signOut();
    return false;
  }

  console.log('5️⃣ Testing access to plans table...');
  const { data: plansData, error: plansError } = await anonSupabase
    .from('plans')
    .select('*');

  if (plansError) {
    console.log(`❌ Cannot access plans: ${plansError.message}`);
    await anonSupabase.auth.signOut();
    return false;
  }

  console.log(`✅ Can access plans: ${plansData.length} found\n`);

  await anonSupabase.auth.signOut();

  console.log('════════════════════════════════════════════════════════════════');
  console.log('✅ ALL CHECKS PASSED - PLATFORM OWNER ROLE IS WORKING');
  console.log('════════════════════════════════════════════════════════════════');
  console.log('\n📧 Email:    owner@dojocloud.com');
  console.log('🔒 Password: Owner123!@#\n');

  return true;
}

checkAndFixRole().then(success => {
  if (!success) {
    console.log('\n❌ SETUP FAILED - ROLE IS NOT WORKING\n');
    process.exit(1);
  }
}).catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
