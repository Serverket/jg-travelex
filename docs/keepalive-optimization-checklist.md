# Keep-Alive Optimization — Matrix Checklist

## Objective
Eliminate redundant quota consumption on Render (compute/hours) and Supabase (queries/DB interactions) by making both keep-alive loops traffic-aware and using the cheapest possible ping mechanisms.

---

## Implementation Matrix

| ID | Component | Change | Rationale | Verification |
|----|-----------|--------|-----------|--------------|
| 1 | **Backend** — `index.js` | Added `lastRequestTime` variable at module level | Provides a single source of truth for "when was the last real request handled" | Inspect code at top of `backend/src/index.js`; confirm `let lastRequestTime = 0;` exists |
| 2 | **Backend** — `index.js` | Added traffic-tracking middleware after `express.json()` | Updates `lastRequestTime` on every incoming request so keep-alive timers can skip when app is active | Confirm `app.use((req, res, next) => { lastRequestTime = Date.now(); next(); });` appears after `express.json()` |
| 3 | **Backend** — `index.js` | Added `GET /ping` endpoint | Returns static `200` with body `pong`; does **not** touch Supabase. Render keep-alive should target this instead of `/health` | `curl http://localhost:8000/ping` should return `pong` in < 5 ms with no DB logs |
| 4 | **Backend** — `index.js` | Refactored `scheduleRenderKeepAlive()` | Before each ping, checks `Date.now() - lastRequestTime < interval`. If the app saw traffic within the loop interval, the self-ping is skipped entirely | Run with `RENDER_KEEPALIVE_INTERVAL_MS=10000`, hit any API endpoint, then watch logs; next tick should skip the fetch |
| 5 | **Backend** — `index.js` | Refactored `scheduleSupabaseKeepAlive()` | Before each DB touch, checks `Date.now() - lastRequestTime < interval`. If the app saw traffic within the 12 h window, the query is skipped entirely | Same as ID 4 but with 12 h interval; confirm via temporary short interval test or code review |
| 6 | **Backend** — `index.js` | Changed Supabase keep-alive query from `company_settings` read to `supabase.rpc('keepalive')` | Avoids locking or scanning a real table; `keepalive()` is a no-op `SELECT 1` with minimal overhead | Review the `run` block inside `scheduleSupabaseKeepAlive`; confirm `.rpc('keepalive')` is used |
| 7 | **Render** — `render.yaml` | Updated `RENDER_KEEPALIVE_URL` from `/health` to `/ping` | Ensures Render self-pings the lightweight `/ping` endpoint instead of the DB-touching `/health` | Read `render.yaml`; confirm value ends in `/ping` |
| 8 | **Supabase** — `supabase-schema.sql` | Added `public.keepalive()` RPC function | Provides a cheap, safe, no-op query target that returns `1` without touching transactional tables | Run the SQL in Supabase SQL Editor; confirm `select keepalive() = 1` |

---

## Deployment & Coverage (No Gaps, No Caveats)

| Requirement | Action | Owner |
|-------------|--------|-------|
| **1. Stop double-tax immediately** | Merge `backend/src/index.js` changes. Even without the new SQL function, Render pings skip Supabase because they now hit `/ping`. | Dev |
| **2. Deploy DB function to all environments** | Run the new `keepalive()` function in Supabase SQL Editor (or via `bun run db:reset` on fresh envs). | Dev / DBA |
| **3. Verify env var is still pointing to /ping** | On Render dashboard, confirm `RENDER_KEEPALIVE_URL` ends with `/ping`; re-deploy if it was overridden manually. | DevOps |
| **4. Validate skip logic under load** | Generate a few requests, then inspect application logs. You should see no keep-alive fetches/queries during active traffic. | QA / Dev |
| **5. Validate behavior during idle** | After the app sits idle past the configured interval, confirm that both Render and Supabase keep-alive events still fire and succeed. | QA / Dev |
| **6. Document for future maintainers** | This checklist and the Mermaid diagrams in `docs/keepalive-diagrams.md` are the canonical references. | Dev |

---

## Expected Outcome

| Metric | Before | After (active hours) | After (idle) |
|--------|--------|----------------------|--------------|
| Render self-pings (10 min timer) | 144/day | **~0** (skipped when active) | 144/day (safety net) |
| Supabase queries from keep-alive | 144 + 2 = **~146/day** | **~0** (skipped when active) | 2/day (12 h safety net) |
| Render ping cost per call | 1× render wake-up + 1× DB query via `/health` | 1× render wake-up via `/ping` | 1× render wake-up via `/ping` |
| Supabase keep-alive query cost | Table scan/read on `company_settings` | **N/A** (skipped) | Minimal `SELECT 1` via `keepalive()` |

> **Net result**: During an 8-hour active day, both keep-alive systems now consume **effectively zero** extra quota. When idle, they still protect against Render spin-down and Supabase project suspension, but with the cheapest possible operations.
