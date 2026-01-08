import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function upgradeToPlatformOwner() {
  try {
    // Get the current user (assuming you're logged in or will provide email)
    console.log('Looking for existing admin users...');
    
    // Get all profiles with super_admin or admin-like roles
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['super_admin', 'branch_manager', 'coach', 'accountant'])
      .limit(10);

    if (profileError) {
      console.error('Error fetching profiles:', profileError);
      return;
    }

    console.log('\nFound profiles:');
    profiles.forEach((p, i) => {
      console.log(`${i + 1}. ${p.full_name} (${p.role})`);
    });

    // Update the first super_admin or create one
    const targetProfile = profiles.find(p => p.role === 'super_admin') || profiles[0];

    if (targetProfile) {
      console.log(`\nUpgrading ${targetProfile.full_name} to platform_owner...`);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          role: 'platform_owner',
          tenant_id: null
        })
        .eq('id', targetProfile.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        return;
      }

      console.log('✅ Successfully upgraded to platform_owner!');
      console.log(`\nYou can now login with your existing credentials.`);
      console.log(`After login, you'll be redirected to /admin/tenants`);
    } else {
      console.log('No suitable profile found. Please use the /bootstrap page instead.');
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

upgradeToPlatformOwner();
