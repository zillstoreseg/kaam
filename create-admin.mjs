import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env', 'utf-8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZpd2dkeGZmdmVob2drZmxoa2p3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDM4ODE0MiwiZXhwIjoyMDc1OTY0MTQyfQ.tEb9rL_hT0UQfOwQ5QfKOQN9K3Nn0n3F-g2QNjCLb4w';

console.log('Creating Super Admin account...');
console.log('Supabase URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createSuperAdmin() {
  const email = 'admin@kaam.com';
  const password = 'Admin123!@#';

  console.log('Creating user in auth.users...');

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: email,
    password: password,
    email_confirm: true
  });

  if (authError) {
    console.error('❌ Error creating user:', authError.message);
    return;
  }

  console.log('✅ User created with ID:', authData.user.id);

  console.log('Creating profile...');

  const { error: profileError } = await supabase
    .from('profiles')
    .insert([
      {
        id: authData.user.id,
        full_name: 'Super Admin',
        role: 'super_admin',
        branch_id: null
      }
    ]);

  if (profileError) {
    console.error('❌ Error creating profile:', profileError.message);
    return;
  }

  console.log('\n✅ Super Admin created successfully!\n');
  console.log('Login Credentials:');
  console.log('==================');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('==================\n');
}

createSuperAdmin().catch(console.error);
