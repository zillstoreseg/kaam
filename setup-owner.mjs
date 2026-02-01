#!/usr/bin/env node

/**
 * DOJO CLOUD - Platform Owner Setup Script
 *
 * This script creates a platform owner account that can access /platform-admin
 *
 * Usage: node setup-owner.mjs
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Error: Missing Supabase credentials in .env file');
  console.error('Required: VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupOwner() {
  console.log('🚀 DOJO CLOUD - Platform Owner Setup\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Default owner credentials
  const email = 'owner@dojocloud.com';
  const password = 'Owner123!@#';
  const fullName = 'Platform Owner';

  try {
    // First check if platform_roles table exists
    console.log('🔍 Checking database setup...');
    const { error: tableCheckError } = await supabase
      .from('platform_roles')
      .select('user_id')
      .limit(1);

    if (tableCheckError && tableCheckError.message.includes('does not exist')) {
      console.log('\n❌ Platform tables not found!\n');
      console.log('You need to apply the database migrations first.\n');
      console.log('📋 Steps to apply migrations:\n');
      console.log('1. Go to Supabase Dashboard: https://viwgdxffvehogkflhkjw.supabase.co');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and run these files in order:');
      console.log('   - supabase/migrations/20260201000000_create_saas_platform_owner_layer.sql');
      console.log('   - supabase/migrations/20260201000001_seed_platform_data.sql');
      console.log('\nOR use the quick setup file:');
      console.log('   - create-owner-quick.sql (includes table creation)\n');
      console.log('After migrations are applied, run this script again.\n');
      process.exit(1);
    }

    console.log('✅ Database setup verified\n');
    console.log('📧 Creating owner account...');
    console.log(`   Email: ${email}`);

    // Check if user already exists in auth
    const { data: authUsers, error: authListError } = await supabase.auth.admin.listUsers();

    let userId = null;
    let userExists = false;

    if (authUsers && authUsers.users) {
      const existingUser = authUsers.users.find(u => u.email === email);
      if (existingUser) {
        userId = existingUser.id;
        userExists = true;
        console.log('✅ User already exists');
      }
    }

    if (!userExists) {
      // Create the user using admin API
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName
        }
      });

      if (authError) {
        if (authError.message.includes('already been registered')) {
          console.log('✅ User already exists (found in auth)');
          // Try to get user ID from profiles as fallback
          const { data: profileData } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .maybeSingle();

          if (profileData) {
            userId = profileData.id;
          } else {
            console.error('❌ User exists but cannot find user ID');
            console.log('Please check Supabase Dashboard → Authentication → Users');
            process.exit(1);
          }
        } else {
          console.error('❌ Error creating user:', authError.message);
          process.exit(1);
        }
      } else {
        userId = authData.user.id;
        console.log('✅ User account created');

        // Create profile
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            email: email,
            full_name: fullName,
            role: 'super_admin'
          });

        if (profileError) {
          console.log('⚠️  Profile creation note:', profileError.message);
          // This might fail if profile trigger already created it, which is fine
        } else {
          console.log('✅ Profile created');
        }
      }
    }

    // Check if already an owner
    const { data: existingOwner } = await supabase
      .from('platform_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (existingOwner) {
      console.log(`✅ Already a platform ${existingOwner.role}`);
    } else {
      // Add platform owner role
      const { error: roleError } = await supabase
        .from('platform_roles')
        .insert({
          user_id: userId,
          role: 'owner'
        });

      if (roleError) {
        console.error('❌ Error adding platform role:', roleError.message);
        process.exit(1);
      }

      console.log('✅ Platform owner role assigned');
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🎉 SUCCESS! Platform owner account is ready!\n');
    console.log('📝 Login Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('🔐 How to Login:');
    console.log('   1. Go to your app login page');
    console.log('   2. Enter the credentials above');
    console.log('   3. After login, you will see "Platform Admin" in the sidebar');
    console.log('   4. Click "Platform Admin" to access /platform-admin');
    console.log('   5. Manage academies, plans, and features\n');

    console.log('⚠️  IMPORTANT:');
    console.log('   - Change the password after first login');
    console.log('   - Keep credentials secure');
    console.log('   - The /platform-admin route is hidden from non-owners');
    console.log('   - Regular users will see 404 if they try to access it\n');

    console.log('📚 Documentation:');
    console.log('   See /docs/SAAS_PLATFORM_NOTES.md for complete guide\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the setup
setupOwner();
