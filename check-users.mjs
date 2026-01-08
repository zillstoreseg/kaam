import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkUsers() {
  try {
    console.log('Checking all profiles...');

    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error:', error);
      return;
    }

    if (profiles.length === 0) {
      console.log('\n❌ No profiles found in database.');
      console.log('\nLet me create a platform owner account for you...');
    } else {
      console.log(`\n✅ Found ${profiles.length} profiles:\n`);
      profiles.forEach((p, i) => {
        console.log(`${i + 1}. Name: ${p.full_name}`);
        console.log(`   Role: ${p.role}`);
        console.log(`   Tenant ID: ${p.tenant_id || 'NULL (platform owner)'}`);
        console.log(`   ID: ${p.id}\n`);
      });

      // Upgrade first one to platform owner
      const firstProfile = profiles[0];
      console.log(`\nUpgrading ${firstProfile.full_name} to platform_owner...`);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'platform_owner',
          tenant_id: null
        })
        .eq('id', firstProfile.id);

      if (updateError) {
        console.error('Error updating:', updateError);
      } else {
        console.log('✅ Successfully upgraded to platform_owner!');
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUsers();
