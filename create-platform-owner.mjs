import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const OWNER_EMAIL = 'owner@dojocloud.com';
const OWNER_PASSWORD = 'DojoCloud2024!Owner';
const OWNER_NAME = 'Platform Owner';

async function createPlatformOwner() {
  console.log('🔐 Creating Platform Owner Account...\n');

  try {
    console.log('1️⃣ Creating authentication user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: OWNER_EMAIL,
      password: OWNER_PASSWORD,
      email_confirm: true,
      user_metadata: {
        full_name: OWNER_NAME
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('   ⚠️  User already exists, looking up...');

        const { data: users } = await supabase.auth.admin.listUsers();
        const existingUser = users.users.find(u => u.email === OWNER_EMAIL);

        if (existingUser) {
          console.log(`   ✅ Found existing user: ${existingUser.id}\n`);

          console.log('2️⃣ Updating profile to platform_owner role...');
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              platform_role: 'platform_owner',
              full_name: OWNER_NAME
            })
            .eq('id', existingUser.id);

          if (updateError) throw updateError;
          console.log('   ✅ Profile updated to platform_owner\n');

          console.log('═══════════════════════════════════════════');
          console.log('✨ Platform Owner Account Ready!');
          console.log('═══════════════════════════════════════════');
          console.log(`Email: ${OWNER_EMAIL}`);
          console.log(`Password: ${OWNER_PASSWORD}`);
          console.log(`User ID: ${existingUser.id}`);
          console.log('\nYou can now login with these credentials to access the Platform Owner dashboard.');
        }
      } else {
        throw authError;
      }
    } else {
      console.log(`   ✅ User created: ${authData.user.id}\n`);

      console.log('2️⃣ Setting up profile with platform_owner role...');
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          platform_role: 'platform_owner',
          full_name: OWNER_NAME,
          academy_id: null
        })
        .eq('id', authData.user.id);

      if (profileError) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            full_name: OWNER_NAME,
            email: OWNER_EMAIL,
            platform_role: 'platform_owner',
            academy_id: null
          });

        if (insertError) throw insertError;
      }

      console.log('   ✅ Profile configured\n');

      console.log('═══════════════════════════════════════════');
      console.log('✨ Platform Owner Account Created!');
      console.log('═══════════════════════════════════════════');
      console.log(`Email: ${OWNER_EMAIL}`);
      console.log(`Password: ${OWNER_PASSWORD}`);
      console.log(`User ID: ${authData.user.id}`);
      console.log('\n⚠️  IMPORTANT: Save these credentials securely!');
      console.log('\nYou can now login with these credentials to access the Platform Owner dashboard.');
    }

  } catch (error) {
    console.error('\n❌ Failed to create platform owner:', error.message);
    console.error(error);
    process.exit(1);
  }
}

createPlatformOwner();
