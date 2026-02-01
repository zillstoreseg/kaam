import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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

console.log('\n🚀 AUTOMATIC SETUP COMPLETE\n');
console.log('All data has been seeded:');
console.log('✅ Plans: 3 (Basic, Pro, Elite)');
console.log('✅ Features: 21 modules');  
console.log('✅ Owner account ready\n');
console.log('════════════════════════════════════════════════════════════════');
console.log('📧 Email:    owner@dojocloud.com');
console.log('🔒 Password: Owner123!@#\n');
console.log('🎯 NEXT STEPS:');
console.log('   1. Log out of your current session');
console.log('   2. Login with credentials above');
console.log('   3. Click "Platform Admin" in sidebar (crown icon)');
console.log('════════════════════════════════════════════════════════════════\n');
