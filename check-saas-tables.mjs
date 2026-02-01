import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function checkTables() {
  console.log('Checking SaaS platform tables...\n');

  const tables = ['platform_roles', 'plans', 'features', 'plan_features', 'academies', 'academy_feature_overrides', 'subscriptions'];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`❌ ${table}: Does not exist or not accessible`);
      } else {
        console.log(`✅ ${table}: Exists`);
      }
    } catch (err) {
      console.log(`❌ ${table}: Error - ${err.message}`);
    }
  }
}

checkTables();
