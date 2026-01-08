#!/usr/bin/env node

/**
 * Script to create a Platform Owner user for the multi-tenant SaaS
 *
 * Usage:
 *   node create-platform-owner.mjs <email> <password> <full_name>
 *
 * Example:
 *   node create-platform-owner.mjs admin@platform.com SecurePassword123 "Platform Admin"
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables');
  console.error('   VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createPlatformOwner(email, password, fullName) {
  try {
    console.log('🚀 Creating Platform Owner...\n');

    // Step 1: Create auth user
    console.log('📝 Step 1: Creating authentication user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName
      }
    });

    if (authError) {
      throw new Error(`Failed to create auth user: ${authError.message}`);
    }

    console.log(`✅ Auth user created: ${authData.user.id}`);

    // Step 2: Create profile with platform_owner role and NULL tenant_id
    console.log('\n📝 Step 2: Creating profile with platform_owner role...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: fullName,
        role: 'platform_owner',
        tenant_id: null,  // NULL for platform owners
        branch_id: null
      });

    if (profileError) {
      // If profile creation fails, try to delete the auth user
      console.error('⚠️  Profile creation failed, attempting to clean up auth user...');
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new Error(`Failed to create profile: ${profileError.message}`);
    }

    console.log('✅ Profile created with platform_owner role');

    // Success!
    console.log('\n✨ Platform Owner created successfully!');
    console.log('\n📋 Details:');
    console.log(`   User ID:    ${authData.user.id}`);
    console.log(`   Email:      ${email}`);
    console.log(`   Full Name:  ${fullName}`);
    console.log(`   Role:       platform_owner`);
    console.log(`   Tenant ID:  NULL (access to all tenants)`);
    console.log('\n🔐 You can now log in with these credentials and access:');
    console.log('   - /admin/tenants (Platform Admin Portal)');
    console.log('   - All tenant data (via impersonation)');

  } catch (error) {
    console.error('\n❌ Error creating platform owner:');
    console.error(`   ${error.message}`);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
  console.error('❌ Error: Missing required arguments\n');
  console.log('Usage:');
  console.log('  node create-platform-owner.mjs <email> <password> <full_name>\n');
  console.log('Example:');
  console.log('  node create-platform-owner.mjs admin@platform.com SecurePassword123 "Platform Admin"\n');
  process.exit(1);
}

const [email, password, fullName] = args;

// Validate email
if (!email.includes('@')) {
  console.error('❌ Error: Invalid email address');
  process.exit(1);
}

// Validate password length
if (password.length < 6) {
  console.error('❌ Error: Password must be at least 6 characters');
  process.exit(1);
}

// Run the script
createPlatformOwner(email, password, fullName);
