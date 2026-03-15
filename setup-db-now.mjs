import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔄 Checking database connection...');

try {
  const { data, error } = await supabase.from('profiles').select('id').limit(1);

  if (error && error.message.includes('does not exist')) {
    console.log('📦 Database needs setup. Applying migrations...');

    const migration = readFileSync('./supabase/migrations/20251013220836_create_kaam_schema.sql', 'utf-8');

    const { error: execError } = await supabase.rpc('exec', { sql: migration });

    if (execError) {
      console.error('❌ Migration failed:', execError.message);
      process.exit(1);
    }

    console.log('✅ Database setup complete!');
  } else if (error) {
    console.error('❌ Database error:', error.message);
    process.exit(1);
  } else {
    console.log('✅ Database is already set up!');
  }
} catch (err) {
  console.error('❌ Setup failed:', err.message);
  process.exit(1);
}
