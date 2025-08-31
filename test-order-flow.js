import dotenv from 'dotenv';
import fetch from 'node-fetch';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const baseUrl = process.env.VITE_BACKEND_URL || 'http://localhost:8000';
let authToken = null;

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_ANON_KEY in environment.');
}

const supabaseAnon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const supabaseSvc = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } })
  : null;

async function login() {
  console.log('=== Testing Login via Supabase Auth ===');
  const username = process.env.TEST_USERNAME || 'jgam';
  const password = process.env.TEST_PASSWORD || 'jgampro777';
  let email = process.env.TEST_EMAIL;

  // Resolve email from profiles if not provided, using service key
  if (!email && supabaseSvc) {
    const { data, error } = await supabaseSvc
      .from('profiles')
      .select('email')
      .eq('username', username)
      .single();
    if (error) {
      throw new Error(`Failed to resolve email for username ${username}: ${error.message}`);
    }
    email = data?.email;
  }

  if (!email) {
    throw new Error('Missing TEST_EMAIL and could not resolve email from profiles. Set TEST_EMAIL or SUPABASE_SERVICE_KEY.');
  }

  const { data: signInData, error: signInError } = await supabaseAnon.auth.signInWithPassword({ email, password });
  if (signInError) {
    throw new Error(`Supabase sign-in failed: ${signInError.message}`);
  }
  authToken = signInData.session?.access_token;
  if (!authToken) throw new Error('No access token returned from Supabase sign-in');
  console.log('✓ Login successful, token obtained');
  return signInData;
}

async function testOrderEndpoints() {
  console.log('\n=== Testing Order Endpoints ===');
  
  // Test GET /orders
  console.log('Testing GET /orders...');
  const ordersResponse = await fetch(`${baseUrl}/orders`, {
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json' 
    }
  });
  
  if (!ordersResponse.ok) {
    console.log(`❌ GET /orders failed: ${ordersResponse.status}`);
    const errorText = await ordersResponse.text();
    console.log('Error:', errorText);
  } else {
    const orders = await ordersResponse.json();
    console.log(`✓ GET /orders successful, found ${orders.length} orders`);
    console.log('Orders:', JSON.stringify(orders, null, 2));
  }
  
  // Test GET /orders?all=true (admin)
  console.log('\nTesting GET /orders?all=true...');
  const allOrdersResponse = await fetch(`${baseUrl}/orders?all=true`, {
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json' 
    }
  });
  
  if (!allOrdersResponse.ok) {
    console.log(`❌ GET /orders?all=true failed: ${allOrdersResponse.status}`);
  } else {
    const allOrders = await allOrdersResponse.json();
    console.log(`✓ GET /orders?all=true successful, found ${allOrders.length} orders`);
  }
}

async function testTripAndOrderCreation() {
  console.log('\n=== Testing Trip and Order Creation Flow ===');
  
  // Create a test trip first
  console.log('Creating test trip...');
  const tripData = {
    origin_address: 'Test Origin',
    destination_address: 'Test Destination',
    distance_miles: 10,
    distance_km: 16.09,
    duration_minutes: 30,
    trip_date: new Date().toISOString().split('T')[0],
    base_price: 25.50,
    final_price: 25.50
  };
  
  const tripResponse = await fetch(`${baseUrl}/trips`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(tripData)
  });
  
  if (!tripResponse.ok) {
    const errorText = await tripResponse.text();
    console.log(`❌ Trip creation failed: ${tripResponse.status}`);
    console.log('Error:', errorText);
    return;
  }
  
  const trip = await tripResponse.json();
  console.log('✓ Trip created:', trip.id);
  
  // Create a test order
  console.log('Creating test order...');
  const orderData = {
    status: 'pending',
    subtotal: 25.50,
    total_amount: 25.50
  };
  
  const orderResponse = await fetch(`${baseUrl}/orders`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(orderData)
  });
  
  if (!orderResponse.ok) {
    const errorText = await orderResponse.text();
    console.log(`❌ Order creation failed: ${orderResponse.status}`);
    console.log('Error:', errorText);
    return;
  }
  
  const order = await orderResponse.json();
  console.log('✓ Order created:', order.id);
  
  // Create order item
  console.log('Creating order item...');
  const orderItemData = {
    trip_id: trip.id,
    amount: 25.50
  };
  
  const orderItemResponse = await fetch(`${baseUrl}/orders/${order.id}/items`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(orderItemData)
  });
  
  if (!orderItemResponse.ok) {
    const errorText = await orderItemResponse.text();
    console.log(`❌ Order item creation failed: ${orderItemResponse.status}`);
    console.log('Error:', errorText);
    return;
  }
  
  const orderItem = await orderItemResponse.json();
  console.log('✓ Order item created:', orderItem.id);
  
  // Verify order retrieval
  console.log('Verifying order retrieval...');
  const getOrderResponse = await fetch(`${baseUrl}/orders/${order.id}`, {
    headers: { 
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json' 
    }
  });
  
  if (!getOrderResponse.ok) {
    console.log(`❌ Order retrieval failed: ${getOrderResponse.status}`);
  } else {
    const retrievedOrder = await getOrderResponse.json();
    console.log('✓ Order retrieved successfully');
    console.log('Order data:', JSON.stringify(retrievedOrder, null, 2));
  }
}

async function main() {
  try {
    await login();
    await testOrderEndpoints();
    await testTripAndOrderCreation();
    console.log('\n=== Test Complete ===');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

main();
