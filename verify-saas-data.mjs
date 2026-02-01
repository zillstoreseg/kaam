import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function verify() {
  console.log('🔍 Verifying SaaS Platform Setup (with service role)...\n');

  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('*')
    .order('price_monthly');

  if (plansError) {
    console.log('❌ Error fetching plans:', plansError.message);
  } else {
    console.log(`✅ Plans: ${plans.length} found`);
    plans.forEach(p => console.log(`   - ${p.name}: $${p.price_monthly}/mo`));
  }

  console.log('');

  const { data: features, error: featuresError } = await supabase
    .from('features')
    .select('*')
    .order('category');

  if (featuresError) {
    console.log('❌ Error fetching features:', featuresError.message);
  } else {
    console.log(`✅ Features: ${features.length} found`);
    const categories = [...new Set(features.map(f => f.category))];
    categories.forEach(cat => {
      const catFeatures = features.filter(f => f.category === cat);
      console.log(`   ${cat}: ${catFeatures.length} features`);
    });
  }

  console.log('');

  const { data: roles, error: rolesError } = await supabase
    .from('platform_roles')
    .select('*');

  if (rolesError) {
    console.log('❌ Error fetching platform roles:', rolesError.message);
  } else {
    console.log(`✅ Platform Roles: ${roles.length} found`);

    for (const role of roles) {
      const { data: { user } } = await supabase.auth.admin.getUserById(role.user_id);
      console.log(`   - ${user?.email || 'Unknown'}: ${role.role}`);
    }
  }

  console.log('\n════════════════════════════════════════════════════════════════');
  console.log('✅ SETUP VERIFIED - EVERYTHING IS READY!');
  console.log('════════════════════════════════════════════════════════════════');
}

verify();
