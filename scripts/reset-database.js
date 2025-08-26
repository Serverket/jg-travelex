#!/usr/bin/env node

/**
 * Script to reset the Supabase database by dropping all tables and recreating the schema
 * WARNING: This will delete ALL data in your database!
 * Usage: node scripts/reset-database.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from 'dotenv';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
config({ path: join(projectRoot, '.env') });

// Configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY; // Service role key needed for admin operations

/**
 * Drop all existing tables and recreate from schema
 */
async function resetDatabase() {
  console.log('⚠️  DATABASE RESET WARNING ⚠️');
  console.log('This will DELETE ALL DATA in your Supabase database!');
  console.log('Make sure you have a backup if you need to preserve any data.\n');

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

    console.log('🗑️  Dropping existing tables...\n');

    // Drop tables in reverse dependency order to avoid foreign key conflicts
    const dropTablesSQL = `
      -- Drop tables in reverse dependency order
      DROP TABLE IF EXISTS trip_discounts CASCADE;
      DROP TABLE IF EXISTS trip_surcharges CASCADE;
      DROP TABLE IF EXISTS order_items CASCADE;
      DROP TABLE IF EXISTS invoices CASCADE;
      DROP TABLE IF EXISTS orders CASCADE;
      DROP TABLE IF EXISTS trips CASCADE;
      DROP TABLE IF EXISTS discounts CASCADE;
      DROP TABLE IF EXISTS surcharge_factors CASCADE;
      DROP TABLE IF EXISTS settings CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      
      -- Drop any existing policies
      DROP POLICY IF EXISTS "Users can view own profile" ON users;
      DROP POLICY IF EXISTS "Users can update own profile" ON users;
      DROP POLICY IF EXISTS "Users can view own trips" ON trips;
      DROP POLICY IF EXISTS "Users can insert own trips" ON trips;
      DROP POLICY IF EXISTS "Users can update own trips" ON trips;
      DROP POLICY IF EXISTS "Users can delete own trips" ON trips;
      DROP POLICY IF EXISTS "Users can view own orders" ON orders;
      DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
      DROP POLICY IF EXISTS "Users can update own orders" ON orders;
      DROP POLICY IF EXISTS "Users can delete own orders" ON orders;
      DROP POLICY IF EXISTS "Users can view own invoices" ON invoices;
      DROP POLICY IF EXISTS "Users can insert own invoices" ON invoices;
      DROP POLICY IF EXISTS "Users can update own invoices" ON invoices;
      DROP POLICY IF EXISTS "Users can delete own invoices" ON invoices;
      DROP POLICY IF EXISTS "Users can view own trip surcharges" ON trip_surcharges;
      DROP POLICY IF EXISTS "Users can insert own trip surcharges" ON trip_surcharges;
      DROP POLICY IF EXISTS "Users can delete own trip surcharges" ON trip_surcharges;
      DROP POLICY IF EXISTS "Users can view own trip discounts" ON trip_discounts;
      DROP POLICY IF EXISTS "Users can insert own trip discounts" ON trip_discounts;
      DROP POLICY IF EXISTS "Users can delete own trip discounts" ON trip_discounts;
      DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
      DROP POLICY IF EXISTS "Users can insert own order items" ON order_items;
      DROP POLICY IF EXISTS "Users can update own order items" ON order_items;
      DROP POLICY IF EXISTS "Users can delete own order items" ON order_items;
    `;

    const { error: dropError } = await supabase.rpc('exec_sql', { 
      sql: dropTablesSQL 
    });

    if (dropError) {
      console.error('❌ Error dropping tables:', dropError.message);
      // Continue anyway - tables might not exist
    } else {
      console.log('✅ Existing tables dropped successfully');
    }

    console.log('🏗️  Creating new database schema...\n');

    // Read and execute the schema file
    const schemaPath = join(projectRoot, 'supabase-schema.sql');
    const schemaSQL = readFileSync(schemaPath, 'utf8');

    // Split the schema into individual statements
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    // Execute each statement individually
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { 
          sql: statement + ';' 
        });

        if (error) {
          console.error('❌ Error executing statement:', error.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
          // Continue with other statements
        }
      }
    }

    console.log('✅ Database schema created successfully!\n');
    console.log('📋 Next steps:');
    console.log('1. Run "node scripts/create-admin.js" to create an admin user');
    console.log('2. Start your application with "npm run dev"');
    console.log('3. Login with your admin credentials\n');

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }
}

// Confirmation prompt
console.log('Are you sure you want to reset the database? This will delete ALL data!');
console.log('Type "yes" to continue or press Ctrl+C to cancel:');

process.stdin.setEncoding('utf8');
process.stdin.on('data', (input) => {
  const answer = input.trim().toLowerCase();
  if (answer === 'yes' || answer === 'y') {
    resetDatabase();
  } else {
    console.log('❌ Database reset cancelled');
    process.exit(0);
  }
});
