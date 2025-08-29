import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Basic CORS for local dev and deployment
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({ origin: corsOrigins, credentials: true, allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Warning: SUPABASE_URL or SUPABASE_SERVICE_KEY missing. /health will likely fail.');
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

// -----------------------------
// Auth helpers and middleware
// -----------------------------
async function getUserFromAuthHeader(req) {
  const auth = req.headers?.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error) return null;
    return data?.user || null;
  } catch {
    return null;
  }
}

async function requireAdmin(req, res, next) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();
    if (error) return res.status(403).json({ error: 'Forbidden' });
    if (profile?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    req.user = { id: user.id, role: profile.role };
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

async function requireAuth(req, res, next) {
  try {
    const user = await getUserFromAuthHeader(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single();
    if (error) return res.status(401).json({ error: 'Unauthorized' });
    req.user = { id: user.id, role: profile?.role || 'user' };
    return next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

app.get('/health', async (req, res) => {
  try {
    const { error } = await supabase.from('company_settings').select('id').limit(1);
    const ok = !error;
    res.json({ ok, supabase: ok, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// -----------------------------
// Trips API (auth required)
// -----------------------------

// Whitelist of allowed trip fields to protect against schema mismatches
const ALLOWED_TRIP_FIELDS = [
  'origin_address',
  'origin_lat',
  'origin_lng',
  'destination_address',
  'destination_lat',
  'destination_lng',
  'distance_km',
  'distance_miles',
  'duration_minutes',
  'trip_date',
  'trip_time',
  'base_price',
  'surcharges',
  'discounts',
  'final_price',
  'status',
  'driver_name',
  'vehicle_number',
  'payment_method',
  'notes',
  'user_id'
];

function sanitizeTripPayload(body, { forUpdate = false } = {}) {
  const b = { ...(body || {}) };

  // Backward-compat: map nested/legacy fields if present
  if (!b.origin_address && b.origin) {
    if (typeof b.origin === 'string') b.origin_address = b.origin;
    else if (b.origin?.address) b.origin_address = b.origin.address;
    else if (b.origin?.description) b.origin_address = b.origin.description;
  }
  if (!b.destination_address && b.destination) {
    if (typeof b.destination === 'string') b.destination_address = b.destination;
    else if (b.destination?.address) b.destination_address = b.destination.address;
    else if (b.destination?.description) b.destination_address = b.destination.description;
  }

  const numericFields = new Set([
    'origin_lat', 'origin_lng', 'destination_lat', 'destination_lng',
    'distance_km', 'distance_miles', 'duration_minutes', 'base_price',
    'surcharges', 'discounts', 'final_price'
  ]);

  const out = {};
  ALLOWED_TRIP_FIELDS.forEach((k) => {
    if (b[k] !== undefined && b[k] !== null) {
      if (numericFields.has(k)) {
        const n = Number(b[k]);
        out[k] = Number.isNaN(n) ? null : n;
      } else {
        out[k] = typeof b[k] === 'string' ? b[k] : String(b[k]);
      }
    }
  });

  // For PATCH we don't enforce required fields
  if (forUpdate) return out;

  // Validate minimally required fields for INSERT to avoid DB errors
  const required = [
    'origin_address',
    'destination_address',
    'distance_km',
    'distance_miles',
    'duration_minutes',
    'trip_date',
    'base_price',
    'final_price'
  ];
  const missing = required.filter((k) => out[k] === undefined || out[k] === null || out[k] === '');
  return { payload: out, missing };
}

// GET /trips
app.get('/trips', requireAuth, async (req, res) => {
  try {
    const { status, dateFrom, dateTo, all, userId } = req.query || {};
    const isAdmin = req.user?.role === 'admin';

    let query = supabase
      .from('trips')
      .select(`
        *,
        profiles:profiles!trips_user_id_fkey (
          id,
          full_name,
          email
        ),
        trip_surcharges (*, surcharge_factors (*)),
        trip_discounts (*, discounts (*))
      `)
      .order('trip_date', { ascending: false });

    if (!(isAdmin && String(all).toLowerCase() === 'true')) {
      query = query.eq('user_id', req.user.id);
    }
    if (status) query = query.eq('status', status);
    if (isAdmin && userId) query = query.eq('user_id', userId);
    if (dateFrom) query = query.gte('trip_date', dateFrom);
    if (dateTo) query = query.lte('trip_date', dateTo);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Helper: ensure user can access a trip
async function assertCanAccessTrip(user, tripId) {
  const { data: trip, error } = await supabase
    .from('trips')
    .select('id, user_id')
    .eq('id', tripId)
    .single();
  if (error) throw error;
  if (!trip) throw new Error('Trip not found');
  if (user.role !== 'admin' && trip.user_id !== user.id) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  return trip;
}

// GET /trips/:id
app.get('/trips/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await assertCanAccessTrip(req.user, id);
    const { data, error } = await supabase
      .from('trips')
      .select(`
        *,
        profiles:profiles!trips_user_id_fkey (
          id,
          full_name,
          email
        ),
        trip_surcharges (*, surcharge_factors (*)),
        trip_discounts (*, discounts (*))
      `)
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    const status = e.status || 400;
    res.status(status).json({ error: e.message });
  }
});

// POST /trips
app.post('/trips', requireAuth, async (req, res) => {
  try {
    const tripNumber = `TRIP-${Date.now()}`;
    const { payload, missing } = sanitizeTripPayload(req.body || {});
    if (missing && missing.length) {
      return res.status(400).json({ error: 'Missing required fields for trip creation', fields: missing });
    }
    const insert = { ...payload, trip_number: tripNumber };
    if (req.user.role !== 'admin') insert.user_id = req.user.id; // enforce ownership (also satisfies RLS)
    // Warn (non-fatal) on unexpected fields to aid diagnostics
    const extraKeys = Object.keys(req.body || {}).filter(k => !ALLOWED_TRIP_FIELDS.includes(k) && k !== 'trip_number');
    if (extraKeys.length) {
      console.warn('Dropping unexpected trip fields:', extraKeys);
    }
    const { data, error } = await supabase
      .from('trips')
      .insert(insert)
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /trips/:id
app.patch('/trips/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await assertCanAccessTrip(req.user, id);
    const updates = sanitizeTripPayload(req.body || {}, { forUpdate: true });
    const { data, error } = await supabase
      .from('trips')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    const status = e.status || 400;
    res.status(status).json({ error: e.message });
  }
});

// DELETE /trips/:id
app.delete('/trips/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await assertCanAccessTrip(req.user, id);
    const { error } = await supabase.from('trips').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    const status = e.status || 400;
    res.status(status).json({ error: e.message });
  }
});

// Trip surcharges
app.post('/trips/:id/surcharges', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await assertCanAccessTrip(req.user, id);
    const { surcharge_id, amount } = req.body || {};
    const { data, error } = await supabase
      .from('trip_surcharges')
      .insert({ trip_id: id, surcharge_id, amount: Number(amount || 0) })
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    const status = e.status || 400;
    res.status(status).json({ error: e.message });
  }
});

app.delete('/trips/:id/surcharges/:surchargeId', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await assertCanAccessTrip(req.user, id);
    const surchargeId = req.params.surchargeId;
    const { error } = await supabase
      .from('trip_surcharges')
      .delete()
      .eq('trip_id', id)
      .eq('surcharge_id', surchargeId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    const status = e.status || 400;
    res.status(status).json({ error: e.message });
  }
});

// Trip discounts
app.post('/trips/:id/discounts', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await assertCanAccessTrip(req.user, id);
    const { discount_id, amount } = req.body || {};
    const { data, error } = await supabase
      .from('trip_discounts')
      .insert({ trip_id: id, discount_id, amount: Number(amount || 0) })
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    const status = e.status || 400;
    res.status(status).json({ error: e.message });
  }
});

app.delete('/trips/:id/discounts/:discountId', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await assertCanAccessTrip(req.user, id);
    const discountId = req.params.discountId;
    const { error } = await supabase
      .from('trip_discounts')
      .delete()
      .eq('trip_id', id)
      .eq('discount_id', discountId);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    const status = e.status || 400;
    res.status(status).json({ error: e.message });
  }
});

// -----------------------------
// Orders API (auth required)
// -----------------------------

function orderSelect() {
  return `
    *,
    order_items (
      *,
      trips (*)
    )
  `;
}

async function assertCanAccessOrder(user, orderId) {
  const { data: order, error } = await supabase
    .from('orders')
    .select('id, user_id')
    .eq('id', orderId)
    .single();
  if (error) throw error;
  if (!order) throw new Error('Order not found');
  if (user.role !== 'admin' && order.user_id !== user.id) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  return order;
}

// GET /orders
app.get('/orders', requireAuth, async (req, res) => {
  try {
    const { status, orderNumber, all, userId } = req.query || {};
    const isAdmin = req.user?.role === 'admin';
    let query = supabase
      .from('orders')
      .select(orderSelect())
      .order('created_at', { ascending: false });

    if (!(isAdmin && String(all).toLowerCase() === 'true')) {
      query = query.eq('user_id', req.user.id);
    }
    if (status) query = query.eq('status', status);
    if (orderNumber) query = query.eq('order_number', orderNumber);
    if (isAdmin && userId) query = query.eq('user_id', userId);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /orders/:id
app.get('/orders/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await assertCanAccessOrder(req.user, id);
    const { data, error } = await supabase
      .from('orders')
      .select(orderSelect())
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    const status = e.status || 400;
    res.status(status).json({ error: e.message });
  }
});

function sanitizeOrderPayload(body, { forUpdate = false } = {}) {
  const b = { ...(body || {}) };
  const numeric = new Set(['subtotal', 'tax_amount', 'discount_amount', 'total_amount']);
  const allowed = [
    'user_id',
    'status',
    'subtotal',
    'tax_amount',
    'discount_amount',
    'total_amount',
    'currency',
    'payment_status',
    'payment_date',
    'notes'
  ];
  const out = {};
  allowed.forEach((k) => {
    if (b[k] !== undefined && b[k] !== null) {
      if (numeric.has(k)) out[k] = Number(b[k]);
      else out[k] = b[k];
    }
  });
  if (forUpdate) return out;
  const required = ['subtotal', 'total_amount'];
  const missing = required.filter((k) => out[k] === undefined || out[k] === null);
  return { payload: out, missing };
}

// POST /orders
app.post('/orders', requireAuth, async (req, res) => {
  try {
    const orderNumber = `ORDER-${Date.now()}`;
    const { payload, missing } = sanitizeOrderPayload(req.body || {});
    if (missing && missing.length) {
      return res.status(400).json({ error: 'Missing required fields for order creation', fields: missing });
    }
    const insert = { ...payload, order_number: orderNumber };
    if (req.user.role !== 'admin') insert.user_id = req.user.id;
    const { data, error } = await supabase
      .from('orders')
      .insert(insert)
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /orders/:id
app.patch('/orders/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await assertCanAccessOrder(req.user, id);
    const updates = sanitizeOrderPayload(req.body || {}, { forUpdate: true });
    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    const status = e.status || 400;
    res.status(status).json({ error: e.message });
  }
});

// DELETE /orders/:id
app.delete('/orders/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await assertCanAccessOrder(req.user, id);
    const { error } = await supabase.from('orders').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    const status = e.status || 400;
    res.status(status).json({ error: e.message });
  }
});

// Order Items
function sanitizeOrderItemPayload(body) {
  return {
    trip_id: body?.trip_id,
    description: body?.description || null,
    quantity: body?.quantity != null ? Number(body.quantity) : 1,
    unit_price: Number(body?.unit_price ?? 0),
    amount: Number(body?.amount ?? 0)
  };
}

// GET /orders/:id/items
app.get('/orders/:id/items', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await assertCanAccessOrder(req.user, id);
    const { data, error } = await supabase
      .from('order_items')
      .select('*, trips(*)')
      .eq('order_id', id)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    const status = e.status || 400;
    res.status(status).json({ error: e.message });
  }
});

// POST /orders/:id/items
app.post('/orders/:id/items', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await assertCanAccessOrder(req.user, id);
    const payload = sanitizeOrderItemPayload(req.body || {});
    if (!payload.trip_id) return res.status(400).json({ error: 'trip_id is required' });
    const insert = { ...payload, order_id: id };
    const { data, error } = await supabase
      .from('order_items')
      .insert(insert)
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /orders/:id/items/:itemId
app.delete('/orders/:id/items/:itemId', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await assertCanAccessOrder(req.user, id);
    const itemId = req.params.itemId;
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId)
      .eq('order_id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    const status = e.status || 400;
    res.status(status).json({ error: e.message });
  }
});

// -----------------------------
// Invoices API (auth required)
// -----------------------------

// Helper: get invoice with joins
function invoiceSelect() {
  return `
    *,
    orders (
      *,
      profiles:profiles!orders_user_id_fkey (
        id,
        full_name,
        email
      ),
      order_items (
        *,
        trips (*)
      )
    )
  `;
}

// Ensure requester can access invoice via owning order or admin
async function assertCanAccessInvoice(user, invoiceId) {
  const { data: inv, error } = await supabase
    .from('invoices')
    .select('id, order_id')
    .eq('id', invoiceId)
    .single();
  if (error) throw error;
  if (!inv) throw new Error('Invoice not found');
  if (user.role === 'admin') return inv;
  const { data: order, error: oErr } = await supabase
    .from('orders')
    .select('id, user_id')
    .eq('id', inv.order_id)
    .single();
  if (oErr) throw oErr;
  if (!order || order.user_id !== user.id) {
    const err = new Error('Forbidden');
    err.status = 403;
    throw err;
  }
  return inv;
}

// GET /invoices
app.get('/invoices', requireAuth, async (req, res) => {
  try {
    const { status, overdue, orderId, invoiceNumber, all, userId } = req.query || {};
    const isAdmin = req.user?.role === 'admin';
    let query = supabase
      .from('invoices')
      .select(invoiceSelect())
      .order('invoice_date', { ascending: false });

    if (!(isAdmin && String(all).toLowerCase() === 'true')) {
      // Restrict to invoices for the authenticated user's orders
      query = query.eq('orders.user_id', req.user.id);
    }
    if (status) query = query.eq('status', status);
    if (String(overdue).toLowerCase() === 'true') {
      query = query.lt('due_date', new Date().toISOString());
      query = query.in('status', ['pending', 'partial']);
    }
    if (orderId) query = query.eq('order_id', orderId);
    if (invoiceNumber) query = query.eq('invoice_number', invoiceNumber);
    if (isAdmin && userId) query = query.eq('orders.user_id', userId);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /invoices/:id
app.get('/invoices/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await assertCanAccessInvoice(req.user, id);
    const { data, error } = await supabase
      .from('invoices')
      .select(invoiceSelect())
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    const status = e.status || 400;
    res.status(status).json({ error: e.message });
  }
});

// POST /invoices
app.post('/invoices', requireAuth, async (req, res) => {
  try {
    const { order_id, invoice_date, due_date, status } = req.body || {};
    if (!order_id) return res.status(400).json({ error: 'order_id is required' });
    // Ownership check
    const { data: order, error: oErr } = await supabase
      .from('orders')
      .select('id, user_id')
      .eq('id', order_id)
      .single();
    if (oErr) throw oErr;
    if (!order) return res.status(404).json({ error: 'Order not found' });
    if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const invoice_number = `INV-${year}${month}-${Date.now().toString().slice(-6)}`;

    const insert = { order_id, invoice_date, due_date, status: status || 'pending', invoice_number };
    const { data, error } = await supabase
      .from('invoices')
      .insert(insert)
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /invoices/:id
app.patch('/invoices/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await assertCanAccessInvoice(req.user, id);
    const { data, error } = await supabase
      .from('invoices')
      .update(req.body || {})
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    const status = e.status || 400;
    res.status(status).json({ error: e.message });
  }
});

// DELETE /invoices/:id
app.delete('/invoices/:id', requireAuth, async (req, res) => {
  try {
    const id = req.params.id;
    await assertCanAccessInvoice(req.user, id);
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    const status = e.status || 400;
    res.status(status).json({ error: e.message });
  }
});

// Pricing endpoint: calculates quote on the server using DB-configured rates/factors
app.post('/pricing/quote', async (req, res) => {
  const { distance = 0, duration = 0, surcharges = [], discounts = [] } = req.body || {};
  try {
    // Load company settings (static singleton row)
    const { data: settings, error: settingsErr } = await supabase
      .from('company_settings')
      .select('*')
      .eq('id', '11111111-1111-1111-1111-111111111111')
      .single();
    if (settingsErr) throw settingsErr;

    // Load selected surcharges/discounts
    const { data: surchargeRows, error: sErr } = await supabase
      .from('surcharge_factors')
      .select('*')
      .in('id', (surcharges || []).length ? surcharges : ['00000000-0000-0000-0000-000000000000']);
    if (sErr) throw sErr;

    const { data: discountRows, error: dErr } = await supabase
      .from('discounts')
      .select('*')
      .in('id', (discounts || []).length ? discounts : ['00000000-0000-0000-0000-000000000000']);
    if (dErr) throw dErr;

    let basePrice = (Number(distance) * Number(settings.distance_rate)) + (Number(duration) * Number(settings.duration_rate));

    const breakdown = { base: basePrice, surcharges: [], discounts: [] };

    (surchargeRows || []).forEach(s => {
      if (s.type === 'percentage') {
        const amt = basePrice * (Number(s.rate) / 100);
        basePrice += amt;
        breakdown.surcharges.push({ id: s.id, name: s.name, amount: Number(amt) });
      } else {
        basePrice += Number(s.rate);
        breakdown.surcharges.push({ id: s.id, name: s.name, amount: Number(s.rate) });
      }
    });

    (discountRows || []).forEach(d => {
      if (d.type === 'percentage') {
        const amt = basePrice * (Number(d.rate) / 100);
        basePrice -= amt;
        breakdown.discounts.push({ id: d.id, name: d.name, amount: Number(amt) });
      } else {
        basePrice -= Number(d.rate);
        breakdown.discounts.push({ id: d.id, name: d.name, amount: Number(d.rate) });
      }
    });

    const price = Number(Math.max(0, basePrice)).toFixed(2);
    res.json({ price, breakdown });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// -----------------------------
// Settings and Admin CRUD APIs
// -----------------------------

// Ensure the singleton settings row exists
async function ensureSettingsRow() {
  const id = '11111111-1111-1111-1111-111111111111';
  const { data, error } = await supabase
    .from('company_settings')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const { error: upErr } = await supabase
      .from('company_settings')
      .insert({ id, distance_rate: 1.5, duration_rate: 15 });
    if (upErr) throw upErr;
  }
  return id;
}

// GET /settings
app.get('/settings', async (req, res) => {
  try {
    const id = await ensureSettingsRow();
    const { data, error } = await supabase
      .from('company_settings')
      .select('id, distance_rate, duration_rate')
      .eq('id', id)
      .single();
    if (error) throw error;
    res.json({ id: data.id, distance_rate: Number(data.distance_rate), duration_rate: Number(data.duration_rate) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PATCH /settings
app.patch('/settings', requireAdmin, async (req, res) => {
  try {
    const id = await ensureSettingsRow();
    const updates = {
      ...(req.body?.distance_rate !== undefined ? { distance_rate: Number(req.body.distance_rate) } : {}),
      ...(req.body?.duration_rate !== undefined ? { duration_rate: Number(req.body.duration_rate) } : {}),
    };
    const { data, error } = await supabase
      .from('company_settings')
      .update(updates)
      .eq('id', id)
      .select('id, distance_rate, duration_rate')
      .single();
    if (error) throw error;
    res.json({ id: data.id, distance_rate: Number(data.distance_rate), duration_rate: Number(data.duration_rate) });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Helper to normalize payload
function sanitizeItemPayload(body) {
  return {
    name: String(body?.name || '').trim(),
    code: body?.code ? String(body.code).trim().toUpperCase() : undefined,
    type: (body?.type || 'fixed').toLowerCase() === 'percentage' ? 'percentage' : 'fixed',
    rate: Number(body?.rate ?? 0)
  };
}

// CRUD for surcharge_factors
app.get('/surcharge-factors', async (req, res) => {
  try {
    const { data, error } = await supabase.from('surcharge_factors').select('*').order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/surcharge-factors', requireAdmin, async (req, res) => {
  try {
    const payload = sanitizeItemPayload(req.body || {});
    const insert = { name: payload.name, rate: payload.rate, type: payload.type, ...(payload.code ? { code: payload.code } : {}) };
    const { data, error } = await supabase
      .from('surcharge_factors')
      .insert(insert)
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(400).json({ error: e.message, code: e.code });
  }
});

app.put('/surcharge-factors/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const payload = sanitizeItemPayload(req.body || {});
    const update = { name: payload.name, rate: payload.rate, type: payload.type };
    const { data, error } = await supabase
      .from('surcharge_factors')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/surcharge-factors/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabase.from('surcharge_factors').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// CRUD for discounts
app.get('/discounts', async (req, res) => {
  try {
    const { data, error } = await supabase.from('discounts').select('*').order('name');
    if (error) throw error;
    res.json(data || []);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post('/discounts', requireAdmin, async (req, res) => {
  try {
    const payload = sanitizeItemPayload(req.body || {});
    const insert = { name: payload.name, rate: payload.rate, type: payload.type, ...(payload.code ? { code: payload.code } : {}) };
    const { data, error } = await supabase
      .from('discounts')
      .insert(insert)
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) {
    res.status(400).json({ error: e.message, code: e.code });
  }
});

app.put('/discounts/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const payload = sanitizeItemPayload(req.body || {});
    const update = { name: payload.name, rate: payload.rate, type: payload.type };
    const { data, error } = await supabase
      .from('discounts')
      .update(update)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/discounts/:id', requireAdmin, async (req, res) => {
  try {
    const id = req.params.id;
    const { error } = await supabase.from('discounts').delete().eq('id', id);
    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.listen(PORT, () => {
  console.log(`JG Travelex backend listening on port ${PORT}`);
});
