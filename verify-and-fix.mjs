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

console.log('\n🔍 VERIFYING PLATFORM SETUP...\n');

async function main() {
  const email = 'owner@dojocloud.com';

  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    console.log('❌ Owner user not found. Creating...\n');

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: 'Owner123!@#',
      email_confirm: true
    });

    if (authError) {
      console.error('❌ Error creating user:', authError.message);
      return;
    }

    console.log('✅ User created');

    const { error: roleError } = await supabase
      .from('platform_roles')
      .insert({ user_id: authData.user.id, role: 'owner' });

    if (roleError) {
      console.error('❌ Error assigning role:', roleError.message);
    } else {
      console.log('✅ Owner role assigned\n');
    }
  } else {
    console.log(`✅ User exists: ${user.email}`);
    console.log(`   User ID: ${user.id}\n`);

    const { data: existingRole, error: roleCheckError } = await supabase
      .from('platform_roles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (roleCheckError) {
      console.log('⚠️  platform_roles table might not exist. Creating tables...\n');

      const createPlatformRoles = `
        CREATE TABLE IF NOT EXISTS platform_roles (
          user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
          role text NOT NULL CHECK (role IN ('owner', 'super_owner')) DEFAULT 'owner',
          created_at timestamptz DEFAULT now()
        );
      `;

      try {
        await supabase.rpc('exec_sql', { sql: createPlatformRoles });
        console.log('✅ platform_roles table created\n');
      } catch (err) {
        console.log('   Note: Using direct insert instead...\n');
      }

      const { error: insertError } = await supabase
        .from('platform_roles')
        .insert({ user_id: user.id, role: 'owner' });

      if (insertError) {
        console.error('❌ Error assigning role:', insertError.message);
        console.log('\n⚠️  MANUAL ACTION REQUIRED:');
        console.log('   Go to Supabase Dashboard → SQL Editor');
        console.log('   Run this SQL:\n');
        console.log('   CREATE TABLE IF NOT EXISTS platform_roles (');
        console.log('     user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,');
        console.log('     role text NOT NULL CHECK (role IN (\'owner\', \'super_owner\')) DEFAULT \'owner\',');
        console.log('     created_at timestamptz DEFAULT now()');
        console.log('   );\n');
        console.log(`   INSERT INTO platform_roles (user_id, role) VALUES ('${user.id}', 'owner');\n`);
      } else {
        console.log('✅ Owner role assigned\n');
      }
    } else if (existingRole) {
      console.log(`✅ Owner role already assigned (${existingRole.role})\n`);
    } else {
      console.log('⚠️  No owner role found. Assigning...\n');

      const { error: insertError } = await supabase
        .from('platform_roles')
        .insert({ user_id: user.id, role: 'owner' });

      if (insertError) {
        console.error('❌ Error assigning role:', insertError.message);
        console.log('\n⚠️  MANUAL ACTION REQUIRED:');
        console.log('   Go to Supabase Dashboard → SQL Editor');
        console.log('   Run this SQL:\n');
        console.log(`   INSERT INTO platform_roles (user_id, role) VALUES ('${user.id}', 'owner');\n`);
      } else {
        console.log('✅ Owner role assigned\n');
      }
    }
  }

  const { data: plans } = await supabase.from('plans').select('count');
  const { data: features } = await supabase.from('features').select('count');
  const { data: roles } = await supabase.from('platform_roles').select('count');

  console.log('📊 DATABASE STATUS:');
  console.log(`   Plans: ${plans?.[0]?.count || 0}`);
  console.log(`   Features: ${features?.[0]?.count || 0}`);
  console.log(`   Platform Owners: ${roles?.[0]?.count || 0}\n`);

  console.log('════════════════════════════════════════════════════════════════');
  console.log('✅ VERIFICATION COMPLETE');
  console.log('════════════════════════════════════════════════════════════════\n');
  console.log('📧 Email:    owner@dojocloud.com');
  console.log('🔒 Password: Owner123!@#\n');
  console.log('🎯 NOW DO THIS:');
  console.log('   1. Log out of your current session');
  console.log('   2. Login with credentials above');
  console.log('   3. Look for "Platform Admin" button in sidebar\n');
  console.log('════════════════════════════════════════════════════════════════\n');
}

main().catch(console.error);
