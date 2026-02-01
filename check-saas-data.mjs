import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkData() {
  console.log('Checking SaaS platform data...\n');

  const { data: plans, error: plansError } = await supabase
    .from('plans')
    .select('*');

  if (plansError) {
    console.log('❌ Error fetching plans:', plansError.message);
  } else {
    console.log(`✅ Plans: ${plans.length} found`);
    plans.forEach(p => console.log(`   - ${p.name}: $${p.price_monthly}/mo`));
  }

  console.log('');

  const { data: features, error: featuresError } = await supabase
    .from('features')
    .select('*');

  if (featuresError) {
    console.log('❌ Error fetching features:', featuresError.message);
  } else {
    console.log(`✅ Features: ${features.length} found`);
  }

  console.log('');

  const { data: roles, error: rolesError } = await supabase
    .from('platform_roles')
    .select('*');

  if (rolesError) {
    console.log('❌ Error fetching platform roles:', rolesError.message);
  } else {
    console.log(`✅ Platform Roles: ${roles.length} found`);
    roles.forEach(r => console.log(`   - User ID: ${r.user_id} - Role: ${r.role}`));
  }
}

checkData();
