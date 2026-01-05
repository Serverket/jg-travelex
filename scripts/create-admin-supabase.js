#!/usr/bin/env node

/**
 * Script to create an admin user with Supabase Auth
 * Usage: node scripts/create-admin-supabase.js
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');
const { config } = require('dotenv');

// Load environment variables
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in environment variables');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt) => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

async function createAdminUser() {
  try {
    console.log('\n=== Create Admin User for JG TravelEx ===\n');
    
    // Collect admin details
    const email = await question('Enter admin email: ');
    const password = await question('Enter admin password (min 6 chars): ');
    const fullName = await question('Enter admin full name: ');
    const username = await question('Enter admin username: ');
    
    // Validate inputs
    if (!email || !password || !fullName || !username) {
      throw new Error('All fields are required');
    }
    
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    
    console.log('\nCreating admin user...');
    
    // Step 1: Create auth user with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: fullName,
        username: username,
        role: 'admin'
      }
    });
    
    if (authError) {
      throw authError;
    }
    
    console.log('✓ Auth user created:', authData.user.id);
    
    // Step 2: Ensure profile exists and set role to admin
    // The DB trigger creates a profile on user signup. We upsert to ensure fields and role are set.
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: authData.user.id,
          email,
          full_name: fullName,
          username,
          role: 'admin'
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (profileError) {
      // If profile upsert fails, attempt to clean up the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    console.log('✓ Admin profile ensured/updated');
    
    // Step 3: Ensure singleton company settings row exists with fixed ID
    const { error: settingsUpsertError } = await supabase
      .from('company_settings')
      .upsert({ id: '11111111-1111-1111-1111-111111111111' }, { onConflict: 'id' });

    if (settingsUpsertError) {
      console.warn('Warning: Could not ensure company settings singleton:', settingsUpsertError.message);
    } else {
      console.log('✓ Company settings singleton ensured');
    }
    
    console.log('\n=== Admin User Created Successfully ===');
    console.log('Email:', email);
    console.log('Username:', username);
    console.log('Role: admin');
    console.log('\nYou can now login with these credentials.');
    console.log('=====================================\n');
    
  } catch (error) {
    console.error('\nError creating admin user:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
createAdminUser().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Script failed:', error);
  process.exit(1);
});
