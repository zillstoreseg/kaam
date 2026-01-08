import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPlatformOwner() {
  try {
    console.log('Creating platform owner account...\n');

    // Create a new auth user
    const email = 'admin@platform.com';
    const password = 'admin123456';

    console.log('Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
    });

    if (authError) {
      // Check if user already exists
      if (authError.message.includes('already')) {
        console.log('User already exists, trying to find profile...');

        const { data: existingAuth } = await supabase.auth.admin.listUsers();
        const existingUser = existingAuth?.users?.find(u => u.email === email);

        if (existingUser) {
          // Check if profile exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', existingUser.id)
            .maybeSingle();

          if (existingProfile) {
            console.log('Profile exists, upgrading to platform_owner...');
            const { error: updateError } = await supabase
              .from('profiles')
              .update({
                role: 'platform_owner',
                tenant_id: null
              })
              .eq('id', existingUser.id);

            if (updateError) {
              console.error('Error updating profile:', updateError);
              return;
            }

            console.log('\n✅ Account upgraded to platform_owner!');
            console.log(`\nLogin Credentials:`);
            console.log(`Email: ${email}`);
            console.log(`Password: ${password}`);
            return;
          } else {
            // Create profile
            console.log('Creating profile...');
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: existingUser.id,
                full_name: 'Platform Admin',
                role: 'platform_owner',
                tenant_id: null
              });

            if (profileError) {
              console.error('Error creating profile:', profileError);
              return;
            }

            console.log('\n✅ Platform owner account created!');
            console.log(`\nLogin Credentials:`);
            console.log(`Email: ${email}`);
            console.log(`Password: ${password}`);
            return;
          }
        }
      }

      console.error('Auth error:', authError);
      return;
    }

    // Create profile
    console.log('Creating profile...');
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        full_name: 'Platform Admin',
        role: 'platform_owner',
        tenant_id: null
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      return;
    }

    console.log('\n✅ Platform owner account created!');
    console.log(`\nLogin Credentials:`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log('\nAfter login, you will be redirected to /admin/tenants');

  } catch (error) {
    console.error('Error:', error);
  }
}

createPlatformOwner();
