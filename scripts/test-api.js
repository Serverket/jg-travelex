#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Helper function to hash password (matching the app's method)
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

let testsPassed = 0;
let testsFailed = 0;

async function test(name, fn) {
  try {
    console.log(`${colors.blue}Testing: ${name}${colors.reset}`);
    await fn();
    console.log(`${colors.green}✓ ${name} passed${colors.reset}\n`);
    testsPassed++;
  } catch (error) {
    console.log(`${colors.red}✗ ${name} failed: ${error.message}${colors.reset}\n`);
    testsFailed++;
  }
}

async function runTests() {
  console.log(`${colors.magenta}=== JG Travelex API Test Suite ===${colors.reset}\n`);

  // Test 1: Database Connection
  await test('Database Connection', async () => {
    const { data, error } = await supabase.from('profiles').select('count').limit(1);
    if (error) throw error;
  });

  // Test 2: Profiles Table
  await test('Profiles Table Access', async () => {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) throw error;
  });

  // Test 3: Admin User Exists
  await test('Admin User Exists', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', 'jgam')
      .single();
    
    if (error && error.code === 'PGRST116') {
      throw new Error('Admin user not found. Run: npm run create-admin');
    }
    if (error) throw error;
    
    if (data.role !== 'admin') {
      throw new Error('User exists but is not admin');
    }
  });

  // Test 4: Trips Table
  await test('Trips Table Access', async () => {
    const { data, error } = await supabase.from('trips').select('*').limit(1);
    if (error) throw error;
  });

  // Test 5: Orders Table
  await test('Orders Table Access', async () => {
    const { data, error } = await supabase.from('orders').select('*').limit(1);
    if (error) throw error;
  });

  // Test 6: Invoices Table
  await test('Invoices Table Access', async () => {
    const { data, error } = await supabase.from('invoices').select('*').limit(1);
    if (error) throw error;
  });

  // Test 7: Settings Table
  await test('Settings Table Access', async () => {
    const { data, error } = await supabase.from('company_settings').select('*').limit(1);
    if (error) throw error;
  });

  // Test 8: Surcharge Factors
  await test('Surcharge Factors Table', async () => {
    const { data, error } = await supabase.from('surcharge_factors').select('*').limit(1);
    if (error) throw error;
  });

  // Test 9: Discounts Table
  await test('Discounts Table', async () => {
    const { data, error } = await supabase.from('discounts').select('*').limit(1);
    if (error) throw error;
  });

  // Test 10: Authentication (Sign In with Admin)
  await test('Admin Authentication', async () => {
    const hashedPassword = hashPassword('jgampro777');
    
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', 'jgam')
      .eq('password', hashedPassword)
      .single();
    
    if (error) throw new Error('Authentication failed');
    if (!profile) throw new Error('Invalid credentials');
  });

  // Test 11: Create Test Trip
  let testTripId;
  await test('Create Test Trip', async () => {
    const { data: admin } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', 'jgam')
      .single();

    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: admin.id,
        origin: 'Test Origin',
        destination: 'Test Destination',
        distance: 10.5,
        duration: 15,
        date: new Date().toISOString().split('T')[0],
        price: 25.50
      })
      .select()
      .single();
    
    if (error) throw error;
    testTripId = data.id;
  });

  // Test 12: Update Test Trip
  if (testTripId) {
    await test('Update Test Trip', async () => {
      const { data, error } = await supabase
        .from('trips')
        .update({ price: 30.00 })
        .eq('id', testTripId)
        .select();
      
      if (error) throw error;
    });
  }

  // Test 13: Delete Test Trip
  if (testTripId) {
    await test('Delete Test Trip', async () => {
      const { error } = await supabase
        .from('trips')
        .delete()
        .eq('id', testTripId);
      
      if (error) throw error;
    });
  }

  // Test 14: Check Audit Logs
  await test('Audit Logs Table', async () => {
    const { data, error } = await supabase.from('audit_logs').select('*').limit(1);
    if (error) throw error;
  });

  // Test 15: Trip Surcharges Junction
  await test('Trip Surcharges Junction Table', async () => {
    const { data, error } = await supabase.from('trip_surcharges').select('*').limit(1);
    if (error && error.code !== 'PGRST116') throw error; // OK if no data
  });

  // Test 16: Trip Discounts Junction
  await test('Trip Discounts Junction Table', async () => {
    const { data, error } = await supabase.from('trip_discounts').select('*').limit(1);
    if (error && error.code !== 'PGRST116') throw error; // OK if no data
  });

  // Test 17: Order Items Table
  await test('Order Items Table', async () => {
    const { data, error } = await supabase.from('order_items').select('*').limit(1);
    if (error && error.code !== 'PGRST116') throw error; // OK if no data
  });

  // Summary
  console.log(`${colors.magenta}=== Test Results ===${colors.reset}`);
  console.log(`${colors.green}Passed: ${testsPassed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${testsFailed}${colors.reset}`);
  
  if (testsFailed > 0) {
    console.log(`\n${colors.yellow}⚠ Some tests failed. Please check the errors above.${colors.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${colors.green}✅ All tests passed! The API is working correctly.${colors.reset}`);
  }
}

// Run tests
runTests().catch((error) => {
  console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
  process.exit(1);
});
