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

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createPlatformOwner(email) {
  try {
    console.log(`\nSearching for user with email: ${email}...`);

    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      throw listError;
    }

    const user = users.find(u => u.email === email);

    if (!user) {
      console.error(`\nError: User with email ${email} not found.`);
      console.log('\nPlease make sure the user account exists first.');
      process.exit(1);
    }

    console.log(`Found user: ${user.email} (ID: ${user.id})`);

    const { data: existingRole, error: checkError } = await supabase
      .from('platform_roles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (existingRole) {
      console.log(`\nUser is already a platform owner with role: ${existingRole.role}`);
      return;
    }

    const { error: insertError } = await supabase
      .from('platform_roles')
      .insert([{
        user_id: user.id,
        role: 'owner'
      }]);

    if (insertError) {
      throw insertError;
    }

    console.log('\n✓ Successfully granted platform owner access!');
    console.log(`\nUser ${email} can now access the Platform Admin dashboard at:`);
    console.log('  /platform-admin');
    console.log('\nThis link will appear in the sidebar after they log in.');

  } catch (error) {
    console.error('\nError creating platform owner:', error.message);
    process.exit(1);
  }
}

const email = process.argv[2];

if (!email) {
  console.log('\nUsage: node create-platform-owner.mjs <email>');
  console.log('\nExample: node create-platform-owner.mjs owner@example.com');
  process.exit(1);
}

createPlatformOwner(email);
