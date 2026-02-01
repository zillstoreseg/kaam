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

async function checkStatus() {
  console.log('🔍 Checking Platform Owner Status...\n');

  const email = 'owner@dojocloud.com';
  const password = 'Owner123!@#';

  // 1. Check if user exists
  console.log('1️⃣ Checking if owner@dojocloud.com exists...');
  const { data: { users } } = await serviceSupabase.auth.admin.listUsers();
  const ownerUser = users.find(u => u.email === email);

  if (!ownerUser) {
    console.log('❌ User does NOT exist\n');
    return { userExists: false };
  }
  console.log(`✅ User exists with ID: ${ownerUser.id}\n`);

  // 2. Check if platform_roles entry exists
  console.log('2️⃣ Checking platform_roles table...');
  const { data: roles, error: rolesError } = await serviceSupabase
    .from('platform_roles')
    .select('*')
    .eq('user_id', ownerUser.id);

  if (rolesError) {
    console.log(`❌ Error checking roles: ${rolesError.message}\n`);
    return { userExists: true, roleExists: false, error: rolesError.message, userId: ownerUser.id };
  }

  if (!roles || roles.length === 0) {
    console.log('❌ NO platform role found for this user\n');
    return { userExists: true, roleExists: false, userId: ownerUser.id };
  }

  console.log(`✅ Role found: ${roles[0].role}\n`);

  // 3. Test login
  console.log('3️⃣ Testing login...');
  const { data: loginData, error: loginError } = await anonSupabase.auth.signInWithPassword({
    email,
    password
  });

  if (loginError) {
    console.log(`❌ Login failed: ${loginError.message}\n`);
    return { userExists: true, roleExists: true, loginWorks: false, error: loginError.message };
  }

  console.log('✅ Login successful\n');

  // 4. Test RPC function
  console.log('4️⃣ Testing get_my_platform_role() RPC...');
  const { data: rpcData, error: rpcError } = await anonSupabase.rpc('get_my_platform_role');

  if (rpcError) {
    console.log(`❌ RPC error: ${rpcError.message}\n`);
    await anonSupabase.auth.signOut();
    return { userExists: true, roleExists: true, loginWorks: true, rpcWorks: false, error: rpcError.message };
  }

  console.log(`✅ RPC returns: ${JSON.stringify(rpcData)}\n`);

  if (!rpcData || !rpcData.role) {
    console.log('❌ RPC works but returns no role\n');
    await anonSupabase.auth.signOut();
    return { userExists: true, roleExists: true, loginWorks: true, rpcWorks: false, roleNotReturned: true };
  }

  // 5. Test accessing plans table
  console.log('5️⃣ Testing access to plans table...');
  const { data: plansData, error: plansError } = await anonSupabase
    .from('plans')
    .select('*');

  if (plansError) {
    console.log(`❌ Cannot access plans: ${plansError.message}\n`);
    await anonSupabase.auth.signOut();
    return {
      userExists: true,
      roleExists: true,
      loginWorks: true,
      rpcWorks: true,
      plansAccess: false,
      error: plansError.message
    };
  }

  console.log(`✅ Can access plans: ${plansData.length} plans found\n`);

  await anonSupabase.auth.signOut();

  console.log('════════════════════════════════════════════════════════════════');
  console.log('✅ ALL CHECKS PASSED - PLATFORM OWNER IS FULLY FUNCTIONAL');
  console.log('════════════════════════════════════════════════════════════════\n');

  return {
    userExists: true,
    roleExists: true,
    loginWorks: true,
    rpcWorks: true,
    plansAccess: true,
    allGood: true
  };
}

checkStatus().then(result => {
  if (!result.allGood) {
    console.log('\n❌ SETUP IS INCOMPLETE');
    console.log('Result:', JSON.stringify(result, null, 2));
    process.exit(1);
  }
}).catch(err => {
  console.error('\n❌ Error:', err.message);
  process.exit(1);
});
