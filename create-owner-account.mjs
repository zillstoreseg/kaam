import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in .env file');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createOwnerAccount() {
  const email = process.argv[2];
  const password = process.argv[3] || 'Owner@123456';

  if (!email) {
    console.log('\nUsage: node create-owner-account.mjs <email> [password]');
    console.log('\nExample: node create-owner-account.mjs owner@dojocloud.com MySecurePass123');
    console.log('\nIf password is not provided, default is: Owner@123456');
    process.exit(1);
  }

  try {
    console.log('\n=== Creating Platform Owner Account ===\n');
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);

    // Step 1: Create the auth user
    console.log('\n[1/3] Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('✓ User already exists, continuing...');
        
        // Get existing user
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        
        const existingUser = users.find(u => u.email === email);
        if (!existingUser) {
          throw new Error('User exists but could not be found');
        }
        
        authData.user = existingUser;
      } else {
        throw authError;
      }
    } else {
      console.log('✓ Auth user created successfully');
    }

    const userId = authData.user.id;

    // Step 2: Check if profile exists or create one
    console.log('\n[2/3] Creating profile...');
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (!existingProfile) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          full_name: 'Platform Owner',
          role: 'super_admin',
          is_active: true
        }]);

      if (profileError) {
        console.log('Note: Could not create profile (may not be required):', profileError.message);
      } else {
        console.log('✓ Profile created successfully');
      }
    } else {
      console.log('✓ Profile already exists');
    }

    // Step 3: Grant platform owner role
    console.log('\n[3/3] Granting platform owner access...');
    const { data: existingRole } = await supabase
      .from('platform_roles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingRole) {
      console.log(`✓ Already has platform role: ${existingRole.role}`);
    } else {
      const { error: roleError } = await supabase
        .from('platform_roles')
        .insert([{
          user_id: userId,
          role: 'owner'
        }]);

      if (roleError) throw roleError;
      console.log('✓ Platform owner role granted successfully');
    }

    console.log('\n=== ✓ SUCCESS ===\n');
    console.log('Platform Owner Account Created!\n');
    console.log('Login Credentials:');
    console.log(`  Email:    ${email}`);
    console.log(`  Password: ${password}`);
    console.log('\nAfter logging in, you will see a "Platform Admin" link in the sidebar.');
    console.log('Access the platform dashboard at: /platform-admin\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

createOwnerAccount();
