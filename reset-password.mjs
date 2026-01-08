import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY not found in .env file');
  console.log('Please add it to your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const email = 'admin@redamohamed.me';
const newPassword = 'admin123';

console.log('Resetting password for:', email);

const { data: users } = await supabase.auth.admin.listUsers();
const user = users?.users?.find(u => u.email === email);

if (!user) {
  console.error('User not found!');
  process.exit(1);
}

const { error } = await supabase.auth.admin.updateUserById(user.id, {
  password: newPassword
});

if (error) {
  console.error('Error resetting password:', error);
  process.exit(1);
}

console.log('✅ Password reset successfully!');
console.log('\nLogin credentials:');
console.log('Email:', email);
console.log('Password:', newPassword);
console.log('\n⚠️  Please change this password after logging in!');
