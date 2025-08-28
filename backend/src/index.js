import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Basic CORS for local dev and deployment
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(s => s.trim());
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Warning: SUPABASE_URL or SUPABASE_SERVICE_KEY missing. /health will likely fail.');
}

const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

app.get('/health', async (req, res) => {
  try {
    const { error } = await supabase.from('company_settings').select('id').limit(1);
    const ok = !error;
    res.json({ ok, supabase: ok, timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
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

app.listen(PORT, () => {
  console.log(`JG Travelex backend listening on port ${PORT}`);
});
