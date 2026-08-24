import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  try {
    const { distance = 0, duration = 0, surcharges = [], discounts = [] } = await req.json()

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    )

    const { data: settings, error: settingsErr } = await supabase
      .from("company_settings")
      .select("*")
      .eq("id", "11111111-1111-1111-1111-111111111111")
      .single()

    if (settingsErr) throw settingsErr

    const sIds = surcharges.length ? surcharges : ["00000000-0000-0000-0000-000000000000"]
    const dIds = discounts.length ? discounts : ["00000000-0000-0000-0000-000000000000"]

    const [{ data: surchargeRows }, { data: discountRows }] = await Promise.all([
      supabase.from("surcharge_factors").select("*").in("id", sIds),
      supabase.from("discounts").select("*").in("id", dIds)
    ])

    const minCharge = Number(settings.min_trip_charge ?? 5.00)

    let basePrice = (Number(distance) * Number(settings.distance_rate)) + 
                    (Number(duration) * Number(settings.duration_rate))
    
    // Apply Minimum Fare floor
    basePrice = Math.max(minCharge, basePrice)

    const breakdown = { base: basePrice, surcharges: [] as any[], discounts: [] as any[] };

    const surchargesList = surchargeRows || [];
    surchargesList.forEach((s: any) => {
      const amt = s.type === "percentage" ? basePrice * (Number(s.rate) / 100) : Number(s.rate);
      basePrice += amt;
      breakdown.surcharges.push({ id: s.id, name: s.name, amount: Number(amt) });
    });

    const discountsList = discountRows || [];
    discountsList.forEach((d: any) => {
      const amt = d.type === "percentage" ? basePrice * (Number(d.rate) / 100) : Number(d.rate);
      basePrice -= amt;
      breakdown.discounts.push({ id: d.id, name: d.name, amount: Number(amt) });
    });

    const price = Number(Math.max(0, basePrice)).toFixed(2)

    return new Response(JSON.stringify({ price, breakdown }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { "Content-Type": "application/json", ...CORS_HEADERS }
    })
  }
})
