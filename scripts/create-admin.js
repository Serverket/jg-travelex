#!/usr/bin/env node

/**
 * Script to create an admin user in Supabase
 * Usage: node scripts/create-admin.js
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
config({ path: join(projectRoot, '.env') });

// Configuration - Update these values or use environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service role key needed for admin operations

// Admin user configuration
const ADMIN_CONFIG = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123', // Change this!
  name: process.env.ADMIN_NAME || 'Administrator',
  email: process.env.ADMIN_EMAIL || 'admin@company.com',
  role: 'admin'
};

/**
 * Hash password using SHA256 (matches frontend implementation)
 */
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Create admin user in Supabase
 */
async function createAdminUser() {
  console.log('🚀 Creating admin user in Supabase...\n');

  // Validate environment variables
  if (!SUPABASE_URL) {
    console.error('❌ Error: VITE_SUPABASE_URL is not set in .env file');
    process.exit(1);
  }

  if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_KEY is not set in .env file');
    console.log('💡 Hint: Get the service role key from Supabase Dashboard → Settings → API');
    process.exit(1);
  }

  try {
    // Create Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Check if admin user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', ADMIN_CONFIG.username)
      .single();

    if (existingUser) {
      console.log('⚠️  Admin user already exists:', existingUser.username);
      console.log('👤 User ID:', existingUser.id);
      console.log('📧 Email:', existingUser.email);
      console.log('\n✅ No action needed');
      return;
    }

    // Hash the password
    const hashedPassword = hashPassword(ADMIN_CONFIG.password);

    // Create admin user
    const { data: newUser, error: createError } = await supabase
      .from('profiles')
      .insert({
        username: ADMIN_CONFIG.username,
        password: hashedPassword,
        name: ADMIN_CONFIG.name,
        email: ADMIN_CONFIG.email,
        role: ADMIN_CONFIG.role
      })
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creating admin user:', createError.message);
      process.exit(1);
    }

    console.log('✅ Admin user created successfully!');
    console.log('\n📋 Admin Details:');
    console.log('👤 Username:', newUser.username);
    console.log('👨‍💼 Name:', newUser.name);
    console.log('📧 Email:', newUser.email);
    console.log('🔑 Role:', newUser.role);
    console.log('🆔 User ID:', newUser.id);
    console.log('\n🔐 Login Credentials:');
    console.log('Username:', ADMIN_CONFIG.username);
    console.log('Password:', ADMIN_CONFIG.password);
    console.log('\n⚠️  Remember to change the default password after first login!');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Run the script
createAdminUser();
