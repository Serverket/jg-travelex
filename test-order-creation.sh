#!/bin/bash

echo "=== Testing Order Creation Flow ==="

# Step 1: Login and get token
echo "1. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"jgam","password":"jgampro777"}')

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed"
  echo "Response: $LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Login successful, token obtained"

# Step 2: Create a test trip
echo "2. Creating test trip..."
TRIP_DATA='{
  "origin_address": "Test Origin Address",
  "destination_address": "Test Destination Address", 
  "distance_miles": 15.5,
  "distance_km": 24.94,
  "duration_minutes": 45,
  "trip_date": "'$(date +%Y-%m-%d)'",
  "base_price": 35.75,
  "final_price": 35.75
}'

TRIP_RESPONSE=$(curl -s -X POST "http://localhost:8000/trips" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$TRIP_DATA")

TRIP_ID=$(echo $TRIP_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -z "$TRIP_ID" ]; then
  echo "❌ Trip creation failed"
  echo "Response: $TRIP_RESPONSE"
  exit 1
fi

echo "✅ Trip created with ID: $TRIP_ID"

# Step 3: Create order with correct fields
echo "3. Creating order..."
ORDER_DATA='{
  "status": "pending",
  "subtotal": 35.75,
  "total_amount": 35.75
}'

ORDER_RESPONSE=$(curl -s -X POST "http://localhost:8000/orders" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$ORDER_DATA")

ORDER_ID=$(echo $ORDER_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -z "$ORDER_ID" ]; then
  echo "❌ Order creation failed"
  echo "Response: $ORDER_RESPONSE"
  exit 1
fi

echo "✅ Order created with ID: $ORDER_ID"

# Step 4: Create order item
echo "4. Creating order item..."
ORDER_ITEM_DATA='{
  "trip_id": '$TRIP_ID',
  "amount": 35.75
}'

ITEM_RESPONSE=$(curl -s -X POST "http://localhost:8000/orders/$ORDER_ID/items" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$ORDER_ITEM_DATA")

ITEM_ID=$(echo $ITEM_RESPONSE | grep -o '"id":[0-9]*' | cut -d':' -f2)

if [ -z "$ITEM_ID" ]; then
  echo "❌ Order item creation failed"
  echo "Response: $ITEM_RESPONSE"
  exit 1
fi

echo "✅ Order item created with ID: $ITEM_ID"

# Step 5: Verify order retrieval
echo "5. Verifying order retrieval..."
GET_ORDER_RESPONSE=$(curl -s "http://localhost:8000/orders/$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN")

if [[ $GET_ORDER_RESPONSE == *"$ORDER_ID"* ]]; then
  echo "✅ Order retrieval successful"
else
  echo "❌ Order retrieval failed"
  echo "Response: $GET_ORDER_RESPONSE"
  exit 1
fi

echo ""
echo "🎉 Complete order creation flow test PASSED!"
echo "   - Trip ID: $TRIP_ID"
echo "   - Order ID: $ORDER_ID" 
echo "   - Order Item ID: $ITEM_ID"
