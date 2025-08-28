#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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
let adminProfileId;

// Temp variables for CRUD tests
let testSurchargeId;
let testDiscountId;
let originalSettings;

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
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) throw error;
  });

  // Test 2: Profiles Table
  await test('Profiles Table Access', async () => {
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) throw error;
  });

  // Test 3: Admin User Exists
  await test('Admin Profile Exists', async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role, email, username')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (error && error.code === 'PGRST116') {
      throw new Error('No admin profile found. Run: npm run create-admin');
    }
    if (error) throw error;
    if (!data || data.role !== 'admin') {
      throw new Error('Admin profile not found or role mismatch');
    }
    adminProfileId = data.id;
  });

  // Test 3b: Admin Auth user exists in Supabase Auth
  await test('Admin Auth user exists', async () => {
    if (!adminProfileId) throw new Error('Admin profile id not resolved');
    const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw error;
    const users = data?.users || [];
    const found = users.some(u => u.id === adminProfileId);
    if (!found) throw new Error('Admin auth user not found. Run: npm run create-admin');
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

  // Test 9b: Settings CRUD (update and restore)
  await test('Settings CRUD: update and restore', async () => {
    // Read current settings
    const SETTINGS_ID = '11111111-1111-1111-1111-111111111111';
    const { data: current, error: readErr } = await supabase
      .from('company_settings')
      .select('*')
      .eq('id', SETTINGS_ID)
      .single();
    if (readErr) throw readErr;
    originalSettings = current;

    // Prepare updates
    const updates = {
      distance_rate: (current.distance_rate || 1.5) + 0.11,
      duration_rate: (current.duration_rate || 15) + 1
    };

    // Update
    const { data: updated, error: updErr } = await supabase
      .from('company_settings')
      .update(updates)
      .eq('id', SETTINGS_ID)
      .select('*')
      .single();
    if (updErr) throw updErr;
    if (!updated) throw new Error('Settings update returned no data');
    if (updated.distance_rate !== updates.distance_rate) throw new Error('distance_rate did not update');
    if (updated.duration_rate !== updates.duration_rate) throw new Error('duration_rate did not update');

    // Restore
    const { error: restoreErr } = await supabase
      .from('company_settings')
      .update({
        distance_rate: current.distance_rate,
        duration_rate: current.duration_rate
      })
      .eq('id', SETTINGS_ID);
    if (restoreErr) throw restoreErr;
  });

  // Test 9c: Surcharge Factor CRUD - Create
  await test('Surcharge Factors: create', async () => {
    const ts = Date.now();
    const code = `TSUR-${ts}`;
    const name = `Test Surcharge ${ts}`;
    const { data, error } = await supabase
      .from('surcharge_factors')
      .insert({ code, name, type: 'percentage', rate: 5, is_active: true, apply_condition: 'always' })
      .select('*')
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error('Surcharge create returned no id');
    testSurchargeId = data.id;
  });

  // Test 9d: Surcharge Factor CRUD - Update
  if (testSurchargeId) {
    await test('Surcharge Factors: update', async () => {
      const { data, error } = await supabase
        .from('surcharge_factors')
        .update({ rate: 7.5 })
        .eq('id', testSurchargeId)
        .select('*')
        .single();
      if (error) throw error;
      if (data.rate !== 7.5) throw new Error('Surcharge rate did not update');
    });
  }

  // Test 9e: Surcharge Factor CRUD - Delete
  if (testSurchargeId) {
    await test('Surcharge Factors: delete', async () => {
      const { error } = await supabase
        .from('surcharge_factors')
        .delete()
        .eq('id', testSurchargeId);
      if (error) throw error;
    });
  }

  // Test 9f: Discount CRUD - Create
  await test('Discounts: create', async () => {
    const ts = Date.now();
    const code = `TDIS-${ts}`;
    const name = `Test Discount ${ts}`;
    const { data, error } = await supabase
      .from('discounts')
      .insert({ code, name, type: 'percentage', rate: 10, is_active: true, applicable_to: 'all' })
      .select('*')
      .single();
    if (error) throw error;
    if (!data?.id) throw new Error('Discount create returned no id');
    testDiscountId = data.id;
  });

  // Test 9g: Discount CRUD - Update
  if (testDiscountId) {
    await test('Discounts: update', async () => {
      const { data, error } = await supabase
        .from('discounts')
        .update({ rate: 12.5 })
        .eq('id', testDiscountId)
        .select('*')
        .single();
      if (error) throw error;
      if (data.rate !== 12.5) throw new Error('Discount rate did not update');
    });
  }

  // Test 9h: Discount CRUD - Delete
  if (testDiscountId) {
    await test('Discounts: delete', async () => {
      const { error } = await supabase
        .from('discounts')
        .delete()
        .eq('id', testDiscountId);
      if (error) throw error;
    });
  }

  // Test 10: Admin Auth user check already performed above

  // Test 11: Create Test Trip
  let testTripId;
  await test('Create Test Trip', async () => {
    if (!adminProfileId) throw new Error('Admin profile id not resolved');
    const tripNumber = `TRIP-TEST-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    const distanceKm = 10.5;
    const distanceMiles = Number((distanceKm * 0.621371).toFixed(2));
    const basePrice = 25.5;
    const finalPrice = 25.5;

    const { data, error } = await supabase
      .from('trips')
      .insert({
        user_id: adminProfileId,
        trip_number: tripNumber,
        origin_address: 'Test Origin Address',
        destination_address: 'Test Destination Address',
        distance_km: distanceKm,
        distance_miles: distanceMiles,
        duration_minutes: 15,
        trip_date: today,
        base_price: basePrice,
        surcharges: 0,
        discounts: 0,
        final_price: finalPrice,
        status: 'completed'
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
        .update({ final_price: 30.00 })
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

  // Test 18: Invoice creation uses invoice_date and persists correctly
  await test('Invoice creation uses invoice_date', async () => {
    let invTripId;
    let invOrderId;
    let invInvoiceId;
    try {
      if (!adminProfileId) throw new Error('Admin profile id not resolved');

      // Prepare dates
      const invoiceDate = new Date().toISOString().split('T')[0];
      const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Create a trip for this test (minimal required fields)
      const tripNumber = `TRIP-INV-${Date.now()}`;
      const { data: trip, error: tripErr } = await supabase
        .from('trips')
        .insert({
          user_id: adminProfileId,
          trip_number: tripNumber,
          origin_address: 'Invoice Test Origin',
          destination_address: 'Invoice Test Destination',
          distance_km: 1.0,
          distance_miles: 0.62,
          duration_minutes: 1,
          trip_date: invoiceDate,
          base_price: 10.0,
          surcharges: 0,
          discounts: 0,
          final_price: 10.0
        })
        .select()
        .single();
      if (tripErr) throw tripErr;
      invTripId = trip.id;

      // Create an order for the trip (required fields)
      const orderNumber = `ORDER-TEST-${Date.now()}`;
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          user_id: adminProfileId,
          status: 'completed',
          subtotal: trip.final_price,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: trip.final_price,
          currency: 'USD',
          payment_status: 'paid'
        })
        .select()
        .single();
      if (orderErr) throw orderErr;
      invOrderId = order.id;

      // Link trip to order via order_items
      const { error: oiErr } = await supabase
        .from('order_items')
        .insert({ 
          order_id: invOrderId, 
          trip_id: invTripId, 
          description: 'Test trip item',
          quantity: 1,
          unit_price: trip.final_price,
          amount: trip.final_price 
        });
      if (oiErr) throw oiErr;

      // Create invoice with invoice_date
      const invoiceNumber = `INV-TEST-${Date.now()}`;
      const { data: invoice, error: invErr } = await supabase
        .from('invoices')
        .insert({
          order_id: invOrderId,
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          due_date: dueDate,
          status: 'pending'
        })
        .select('*')
        .single();
      if (invErr) throw invErr;
      invInvoiceId = invoice.id;

      // Assertions
      if (!invoice.invoice_date) throw new Error('invoice_date missing on created invoice');
      if ('issue_date' in invoice) throw new Error('issue_date should not exist on created invoice');

      // Fetch to verify persistence
      const { data: fetched, error: fetchErr } = await supabase
        .from('invoices')
        .select('id, order_id, invoice_date, due_date, invoice_number')
        .eq('id', invInvoiceId)
        .single();
      if (fetchErr) throw fetchErr;
      if (!fetched.invoice_date) throw new Error('invoice_date missing on fetched invoice');
    } finally {
      // Cleanup created records
      if (invInvoiceId) await supabase.from('invoices').delete().eq('id', invInvoiceId);
      if (invOrderId) await supabase.from('order_items').delete().eq('order_id', invOrderId);
      if (invOrderId) await supabase.from('orders').delete().eq('id', invOrderId);
      if (invTripId) await supabase.from('trips').delete().eq('id', invTripId);
    }
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
