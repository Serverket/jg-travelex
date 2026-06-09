# Plan: Admin Quota Dashboard + Monthly Hard-Limit Enforcement

## Goal
Persist per-user Google API usage to PostgreSQL, enforce monthly hard limits in the Edge Function, and expose a real-time admin dashboard to monitor and adjust quotas.

---

## 1. Database (Supabase PostgreSQL)

### 1.1 Extend `company_settings` with default limits
```sql
ALTER TABLE company_settings
ADD COLUMN IF NOT EXISTS default_directions_limit INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS default_autocomplete_limit INTEGER DEFAULT 50;
```

### 1.2 New table: `user_monthly_quotas`
```sql
CREATE TABLE IF NOT EXISTS user_monthly_quotas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    year_month TEXT NOT NULL, -- e.g. '2026-06'
    directions_used INTEGER NOT NULL DEFAULT 0,
    geocode_used INTEGER NOT NULL DEFAULT 0,
    autocomplete_used INTEGER NOT NULL DEFAULT 0,
    directions_limit INTEGER, -- NULL falls back to company default
    autocomplete_limit INTEGER,
    geocode_limit INTEGER, -- rarely needs a limit, but available
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, year_month)
);
```

### 1.3 Atomic increment-and-check function
```sql
CREATE OR REPLACE FUNCTION increment_user_quota(
  p_user_id UUID,
  p_year_month TEXT,
  p_service TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row RECORD;
  v_defaults RECORD;
  v_limit INT;
  v_current INT;
  v_allowed BOOLEAN := false;
BEGIN
  -- Read company defaults once
  SELECT 
    COALESCE(default_directions_limit, 30) AS d_limit,
    COALESCE(default_autocomplete_limit, 50) AS a_limit
  INTO v_defaults
  FROM company_settings
  LIMIT 1;

  -- Upsert this user's row for the month
  INSERT INTO user_monthly_quotas (user_id, year_month)
  VALUES (p_user_id, p_year_month)
  ON CONFLICT (user_id, year_month) DO NOTHING;

  -- Lock the row for update to prevent race conditions
  SELECT 
    directions_used, 
    geocode_used, 
    autocomplete_used,
    COALESCE(directions_limit, v_defaults.d_limit) AS d_limit,
    COALESCE(autocomplete_limit, v_defaults.a_limit) AS a_limit,
    COALESCE(geocode_limit, 9999) AS g_limit
  INTO v_row
  FROM user_monthly_quotas
  WHERE user_id = p_user_id AND year_month = p_year_month
  FOR UPDATE;

  -- Determine if allowed based on service
  IF p_service = 'directions' THEN
    v_current := v_row.directions_used;
    v_limit := v_row.d_limit;
    v_allowed := v_current < v_limit;
  ELSIF p_service = 'geocode' THEN
    v_current := v_row.geocode_used;
    v_limit := v_row.g_limit;
    v_allowed := v_current < v_limit;
  ELSIF p_service = 'autocomplete' THEN
    v_current := v_row.autocomplete_used;
    v_limit := v_row.a_limit;
    v_allowed := v_current < v_limit;
  ELSE
    RETURN jsonb_build_object('allowed', true, 'service', p_service);
  END IF;

  -- Deny if over limit
  IF NOT v_allowed THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'service', p_service,
      'current', v_current,
      'limit', v_limit
    );
  END IF;

  -- Increment the correct column
  IF p_service = 'directions' THEN
    UPDATE user_monthly_quotas 
    SET directions_used = directions_used + 1, updated_at = now()
    WHERE user_id = p_user_id AND year_month = p_year_month;
    v_row.directions_used := v_row.directions_used + 1;
  ELSIF p_service = 'geocode' THEN
    UPDATE user_monthly_quotas 
    SET geocode_used = geocode_used + 1, updated_at = now()
    WHERE user_id = p_user_id AND year_month = p_year_month;
    v_row.geocode_used := v_row.geocode_used + 1;
  ELSIF p_service = 'autocomplete' THEN
    UPDATE user_monthly_quotas 
    SET autocomplete_used = autocomplete_used + 1, updated_at = now()
    WHERE user_id = p_user_id AND year_month = p_year_month;
    v_row.autocomplete_used := v_row.autocomplete_used + 1;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'service', p_service,
    'directions', v_row.directions_used,
    'geocode', v_row.geocode_used,
    'autocomplete', v_row.autocomplete_used
  );
END;
$$;
```

### 1.4 RLS Policy
```sql
-- Users can view only their own quotas
CREATE POLICY "Users can view own quotas" ON user_monthly_quotas
  FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all (or rely on backend service role)
-- Since backend uses service role key, RLS is bypassed on backend.
```

---

## 2. Edge Function Hardening

### 2.1 Secrets Required
```bash
npx supabase secrets set SUPABASE_SERVICE_KEY=<your-service-role-key> --linked
npx supabase secrets set GOOGLE_MAPS_API_KEY=<your-key> --linked
```

### 2.2 Updated `supabase/functions/google-maps-proxy/index.ts`
Logic to inject:
1. Import `createClient` from `https://esm.sh/@supabase/supabase-js@2`.
2. On every request, extract the `Authorization` Bearer token.
3. Call `supabase.auth.getUser(token)` with the service role client to validate the JWT and extract `user_id`.
4. If invalid or missing, return `401 Unauthorized`.
5. Determine `year_month` from current date (`YYYY-MM`).
6. Call `supabase.rpc('increment_user_quota', { p_user_id: userId, p_year_month: yearMonth, p_service: service })`.
7. If `result.data.allowed` is `false`, return `429 Quota Exceeded` with a clear JSON body.
8. Only then call Google API.
9. On Google error, return the Google error raw (already in place).

### 2.3 Rate-Limit Map Cleanup
The existing per-IP in-memory bucket can remain as a **secondary** shield but is no longer the authoritative limit. The DB function is the single source of truth.

---

## 3. Backend Express API (Render)

### 3.1 New Route: `GET /admin/quotas`
- **Auth**: `requireAdmin`
- **Query**: `?year_month=2026-06` (defaults to current month)
- **Logic**:
  - Read `user_monthly_quotas` for the month.
  - Join with `profiles` (id, full_name, email).
  - Join with `company_settings` to show the fallback default limits.
  - Return array:
    ```json
    {
      "user_id": "...",
      "full_name": "...",
      "email": "...",
      "directions_used": 12,
      "autocomplete_used": 4,
      "directions_limit": 30,
      "autocomplete_limit": 50,
      "percent_directions": 40
    }
    ```

### 3.2 New Route: `PATCH /admin/quotas/:userId`
- **Auth**: `requireAdmin`
- **Body**: `{ directions_limit: 100, autocomplete_limit: 200 }` (partial updates)
- **Logic**:
  - Upsert into `user_monthly_quotas` for the current `year_month`.
  - Only update the `*_limit` columns provided.
  - Return the updated row.

### 3.3 New Route: `GET /admin/quota-defaults`
- **Auth**: `requireAdmin`
- Returns the current `company_settings` limit defaults so the admin knows the baseline.

### 3.4 New Route: `PATCH /admin/quota-defaults`
- **Auth**: `requireAdmin`
- Updates `company_settings.default_directions_limit` and `default_autocomplete_limit`.

---

## 4. Frontend: Admin Quota Dashboard

### 4.1 Component: `pages/AdminQuotas.jsx`
**Table columns**:
- User (name + email)
- Directions Used / Limit
- Autocomplete Used / Limit
- Progress Bar (percentage of limit used, turns red at >80%)
- Action: Edit Limits (inline modal)

**Filters**:
- Month Picker (`year_month` selector, default current month)
- Search by name/email

**Actions**:
- "Set Individual Limit" → Opens a modal with inputs for `directions_limit` and `autocomplete_limit`. Submitting calls `PATCH /admin/quotas/:userId`.
- "Set System Defaults" → Calls `PATCH /admin/quota-defaults`.

### 4.2 Routing & Gate
In `App.jsx`, add:
```jsx
<Route
  path="/admin/quotas"
  element={guard('admin_quotas', AdminQuotas, { requireAdmin: true })}
/>
```
Add to the sidebar/layout so admins can navigate to it.

### 4.3 Backend Service Wrappers
In `src/services/backendService.js`, add:
```javascript
async listQuotas(filters = {}) { ... }
async updateUserQuota(userId, updates) { ... }
async getQuotaDefaults() { ... }
async updateQuotaDefaults(updates) { ... }
```

---

## 5. Monthly Reset & Edge Cases

### 5.1 Monthly Reset
- **No cron needed**: The unique constraint is on `(user_id, year_month)`. When June ends and July starts, the Edge Function will use the new `year_month`, automatically creating a new row with fresh usage counters.
- **Hard limits are inherently monthly** because the row is keyed by month.

### 5.2 Edge Cases
1. **User hits limit mid-month**: Edge Function returns `429` with a descriptive body. Frontend catches this and shows a message: "Has alcanzado tu límite mensual de X solicitudes. Contacta al administrador."
2. **Admin sets limit lower than current usage**: The DB function checks `current < limit`. If `current >= new_limit`, the user is immediately blocked. The admin UI should show a warning if setting a limit below current usage.
3. **Anonymous/No token**: The Edge Function must return `401`. Quota is strictly per-user; no global "anonymous" bucket is trusted.

---

## 6. Integration into Existing Auth Flow

The Edge Function already receives the `Authorization` header. By validating it with `supabase.auth.getUser(token)`, we ensure:
- Only logged-in users can call the Google API proxy.
- Every call is tied to a real `user_id` in the database.
- Quota counting is accurate and tamper-resistant (service role key required to modify usage counts).

---

## 7. Deployment Order

1. **Run SQL Migrations** (Supabase SQL Editor or via migration file).
2. **Set Secrets**: `SUPABASE_SERVICE_KEY` and `GOOGLE_MAPS_API_KEY`.
3. **Deploy Edge Function**: Update and deploy `google-maps-proxy`.
4. **Deploy Backend**: Add new `/admin/quotas`, `/admin/quotas/:userId`, `/admin/quota-defaults` routes and push to Render.
5. **Deploy Frontend**: Add `AdminQuotas.jsx` and routing, then push to Vercel.

---

## 8. Success Criteria

- [ ] Edge Function rejects requests when `directions_used >= directions_limit` for that month.
- [ ] Database correctly increments `directions_used` atomically on each successful API call.
- [ ] Admin can open `/admin/quotas`, select a month, and see every user's consumption + limits.
- [ ] Admin can modify a single user's limits from the UI.
- [ ] Admin can modify system-wide default limits from the UI.
- [ ] No in-memory-only rate limit remains as the authority; the DB is the single source of truth.
