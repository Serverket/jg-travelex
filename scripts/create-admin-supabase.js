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

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    console.log('\n=== Create Admin User for JG Travelex ===\n');
    
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
    
    // Step 2: Create profile in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name: fullName,
        username,
        role: 'admin'
      })
      .select()
      .single();
    
    if (profileError) {
      // If profile creation fails, try to delete the auth user
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }
    
    console.log('✓ Admin profile created');
    
    // Step 3: Create initial company settings if they don't exist
    const { data: existingSettings } = await supabase
      .from('company_settings')
      .select('*')
      .single();
    
    if (!existingSettings) {
      const { error: settingsError } = await supabase
        .from('company_settings')
        .insert({
          distance_rate: 2.50,
          duration_rate: 0.50,
          base_fare: 5.00,
          currency: 'USD'
        });
      
      if (settingsError && settingsError.code !== '23505') { // Ignore duplicate key error
        console.warn('Warning: Could not create default settings:', settingsError.message);
      } else {
        console.log('✓ Default company settings created');
      }
    }
    
    // Step 4: Create sample surcharge factors
    const surcharges = [
      { name: 'Peak Hours', rate: 1.5, type: 'percentage' },
      { name: 'Weekend', rate: 1.2, type: 'percentage' },
      { name: 'Airport Fee', rate: 15, type: 'fixed' }
    ];
    
    for (const surcharge of surcharges) {
      const { error } = await supabase
        .from('surcharge_factors')
        .insert(surcharge);
      
      if (error && error.code !== '23505') {
        console.warn(`Warning: Could not create surcharge "${surcharge.name}":`, error.message);
      }
    }
    console.log('✓ Sample surcharge factors created');
    
    // Step 5: Create sample discounts
    const discounts = [
      { name: 'Loyalty Discount', rate: 10, type: 'percentage' },
      { name: 'Corporate Discount', rate: 15, type: 'percentage' },
      { name: 'Promo Code', rate: 5, type: 'fixed' }
    ];
    
    for (const discount of discounts) {
      const { error } = await supabase
        .from('discounts')
        .insert(discount);
      
      if (error && error.code !== '23505') {
        console.warn(`Warning: Could not create discount "${discount.name}":`, error.message);
      }
    }
    console.log('✓ Sample discounts created');
    
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
