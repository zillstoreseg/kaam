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

console.log('\n🔍 CHECKING PLATFORM SETUP STATUS\n');

async function main() {
  try {
    // Check plans
    const { data: plans, error: plansError } = await supabase.from('plans').select('*');
    if (plansError) {
      console.log('❌ Plans table:', plansError.message);
    } else {
      console.log(`✅ Plans: ${plans.length} found`);
      plans.forEach(p => console.log(`   - ${p.name}: $${p.price_monthly}/mo`));
    }
    console.log();

    // Check features
    const { data: features, error: featuresError } = await supabase.from('features').select('*');
    if (featuresError) {
      console.log('❌ Features table:', featuresError.message);
    } else {
      console.log(`✅ Features: ${features.length} found`);
      const categories = {};
      features.forEach(f => {
        if (!categories[f.category]) categories[f.category] = [];
        categories[f.category].push(f.label);
      });
      Object.keys(categories).forEach(cat => {
        console.log(`   ${cat}: ${categories[cat].length} features`);
      });
    }
    console.log();

    // Check plan_features
    const { data: planFeatures, error: pfError } = await supabase.from('plan_features').select('*');
    if (pfError) {
      console.log('❌ Plan Features table:', pfError.message);
    } else {
      console.log(`✅ Plan Features: ${planFeatures.length} mappings`);
    }
    console.log();

    // Check platform_roles
    const { data: roles, error: rolesError } = await supabase.from('platform_roles').select('*, profiles(email)');
    if (rolesError) {
      console.log('❌ Platform Roles table:', rolesError.message);
      console.log('   This table might need to be created via SQL Editor');
    } else {
      console.log(`✅ Platform Roles: ${roles.length} owner(s)`);
      roles.forEach(r => {
        const email = r.profiles?.email || 'N/A';
        console.log(`   - Role: ${r.role}, User: ${r.user_id.substring(0, 8)}...`);
      });
    }
    console.log();

    // Check academies
    const { data: academies, error: academiesError } = await supabase.from('academies').select('*');
    if (academiesError) {
      console.log('❌ Academies table:', academiesError.message);
    } else {
      console.log(`✅ Academies: ${academies.length} (expected 0 initially)`);
    }
    console.log();

    // Get owner user info
    const { data: { users } } = await supabase.auth.admin.listUsers();
    const ownerUser = users.find(u => u.email === 'owner@dojocloud.com');

    console.log('════════════════════════════════════════════════════════════════');
    console.log('📊 SUMMARY');
    console.log('════════════════════════════════════════════════════════════════');
    console.log(`Plans: ${plans?.length || 0}`);
    console.log(`Features: ${features?.length || 0}`);
    console.log(`Plan Features: ${planFeatures?.length || 0}`);
    console.log(`Platform Owners: ${roles?.length || 0}`);
    console.log(`Academies: ${academies?.length || 0}`);
    console.log(`Owner Account: ${ownerUser ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    console.log('════════════════════════════════════════════════════════════════\n');

    if (ownerUser && roles && roles.length > 0) {
      console.log('✅ ALL SYSTEMS READY!\n');
      console.log('📧 Login: owner@dojocloud.com');
      console.log('🔒 Password: Owner123!@#\n');
      console.log('🎯 Next: Log out → Login → Click "Platform Admin" in sidebar\n');
    } else if (rolesError && rolesError.message.includes('does not exist')) {
      console.log('⚠️  PLATFORM_ROLES TABLE NEEDS CREATION\n');
      console.log('The platform_roles table must be created via Supabase SQL Editor.');
      console.log('Run the SQL in FINAL_SETUP_SQL.sql file.\n');
    } else {
      console.log('⚠️  SETUP INCOMPLETE\n');
      console.log('Some tables or data are missing.');
      console.log('Run: node full-auto-setup.mjs\n');
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
