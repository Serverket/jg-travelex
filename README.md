<div align="center">

![JG TravelEx Logo](./public/icons/jg_logo.png)

# JG TravelEx - Travel Experience

![Version](https://img.shields.io/badge/version-3.1.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Bun](https://img.shields.io/badge/bun-%3E%3D1.0.0-black.svg)
![React](https://img.shields.io/badge/react-18.2.0-blue.svg)
![Supabase](https://img.shields.io/badge/supabase-2.56.0-3ecf8e.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)

*Modern trip management system with React + Vite (frontend) and Express backend connected to Supabase*

</div>

---

## 🌟 Features

- 🗺️ **Distance calculation** using Google Maps
- 💰 **Automatic pricing** with configurable rates
- 📊 **Real-time dashboard**
- 📋 **Order management**
- 📄 **PDF invoice generation**
- 👤 **Authentication** with Supabase Auth
- ⚙️ **Configurable rates**, surcharges and discounts
- 🔒 **Role-based access control** (admin/user)
- 📱 **Modern responsive design** with Tailwind CSS

---

## 🚀 Installation and Running

### 📋 Prerequisites

- **Bun 1.0+** (includes a Node-compatible runtime)
- **Supabase CLI** (https://supabase.com/docs/guides/cli) for local stacks
- **Docker** (required by Supabase CLI)
- **psql** command-line client (ships with PostgreSQL)
- **Supabase account** (https://supabase.com)
- **Google Maps API key** (for distance calculations)

### 📝 Installation Steps

1. **Clone the repository**
```bash
git clone <repository-url>
cd jg-travelex
```

2. **Install dependencies**
```bash
bun install
```

3. **Configure environment variables**
```bash
cp .env.template .env
```

Edit `.env` with the following variables:
```env
# Frontend (Vite)
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_BACKEND_URL=http://localhost:8000

# Backend (Express)
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
CORS_ORIGIN=http://localhost:5173
# Optional (default 8000)
PORT=8000

# Google Maps API
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

4. **Initialize the database in Supabase (schema + defaults)**
   - **Option A** (recommended first time): Open Supabase Dashboard → SQL Editor and run the contents of `supabase-schema.sql`.
   - **Option B** (scripted): Ensure an RPC function `exec_sql(sql text)` exists in your database, then run:
```bash
bun run db:reset
```

If `exec_sql` does not exist, create it in Supabase SQL Editor first (security: service role only runs this in scripts):
```sql
create or replace function public.exec_sql(sql text)
returns void
language plpgsql
security definer
as $$
begin
  execute sql;
end;
$$;

revoke all on function public.exec_sql(text) from public;
grant execute on function public.exec_sql(text) to service_role;
```

5. **Create the admin user**
```bash
bun run create-admin
```

> **Note**: The old `scripts/create-admin.js` helper has been removed. Always use `bun run create-admin`, which runs `scripts/create-admin-supabase.js`.

6. **Start the app (backend and frontend)**
```bash
# Start backend (Express on :8000)
bun run backend:dev              # or: bun --cwd backend run dev

# In another terminal, start frontend (Vite on :5173)
bun run dev
```

**Backend endpoints**:
- `GET /health` on `http://localhost:8000` – checks Supabase connectivity
- `POST /pricing/quote` – server-side pricing calculation using DB-configured rates
  - Request body:
    ```json
    { "distance": 12.3, "duration": 25, "surcharges": ["<uuid>"], "discounts": ["<uuid>"] }
    ```
  - Response:
    ```json
    { "price": "32.75", "breakdown": { "base": 25.5, "surcharges": [], "discounts": [] } }
    ```

> **Note**: `CORS_ORIGIN` supports multiple origins separated by commas (e.g., `https://yourapp.vercel.app,http://localhost:5173`).

### ♻️ Free-tier keep-alive

- **Render**: the backend schedules a lightweight GET to `RENDER_KEEPALIVE_URL` (default `/health`) every `RENDER_KEEPALIVE_INTERVAL_MS` (default 600,000 ms). Update `render.yaml` or your dashboard with your public service URL so the loop can keep the free instance warm.
- **Supabase**: the server touches `company_settings` every `SUPABASE_KEEPALIVE_INTERVAL_MS` (default 43,200,000 ms ≈ 12 h) to avoid free-project suspension after a week with no traffic. Set `SUPABASE_KEEPALIVE_DISABLED=true` to opt out.
- Pair this with an external uptime monitor (e.g., UptimeRobot) if you need an additional safety net; keep intervals ≥5 minutes to avoid Render’s service-initiated traffic guardrails.

## Tech Stack

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - SPA navigation
- **Chart.js** - Data visualization
- **jsPDF** - PDF generation
- **Google Maps API** - Distance and routing

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL Database
  - Row Level Security (RLS)
  - Realtime subscriptions
  - Authentication
- **Service Role Key** - Secure administrative operations

## :file_folder: Project Structure
```
📂 jg-travelex/
├── 📁 backend/              # Express backend (Supabase-powered API)
│   ├── 📄 package.json      # Backend scripts (dev/start)
│   └── 📁 src/              # Backend source (Express app)
├── 📁 public/               # Static files
│   ├── 📁 icons/            # PWA icons
│   ├── 📄 manifest.json     # PWA manifest
│   └── 📄 sw.js             # Service Worker
├── 📁 scripts/              # Maintenance scripts
│   ├── 📄 create-admin-supabase.js  # Creates Auth user + admin profile via Supabase API
│   ├── 📄 reset-database.js         # Resets DB via exec_sql and seeds schema
│   └── 📄 test-api.js               # Smoke test against the backend API
├── 📁 src/                  # Frontend source code
│   ├── 📁 components/       # Reusable components
│   ├── 📁 context/          # Global application context
│   ├── 📁 pages/            # Main pages
│   ├── 📁 services/         # Supabase service integration
│   ├── 📁 utils/            # Utility functions
│   ├── 📄 App.jsx           # Main component
│   ├── 📄 main.jsx          # Entry point
│   └── 📄 index.css         # Global styles
├── 📄 .env                  # Environment variables
├── 📄 .env.template         # Template for environment variables
├── 📄 index.html            # HTML template
├── 📄 package.json          # Dependencies and scripts
├── 📄 postcss.config.js     # PostCSS configuration
├── 📄 tailwind.config.js    # Tailwind CSS configuration
└── 📄 vite.config.js        # Vite configuration
```

## Usage

### Admin user
- Create an admin with: `bun run create-admin` (interactive). The script provisions a Supabase Auth user and a matching row in `profiles` with role `admin`. You choose the email/username/password during the prompt.

- One-shot command (requires `jq`) to provision any admin using your service-role credentials:
  ```bash
  SUPABASE_URL="https://your-project.supabase.co" \
  SERVICE_ROLE_KEY="your-service-role-key" \
  ADMIN_EMAIL="admin@example.com" \
  ADMIN_PASSWORD="ChangeMe123!" \
  ADMIN_NAME="Admin User" \
  ADMIN_USERNAME="admin" \
  sh -c '
    set -euo pipefail
    ADMIN_ID=$(curl -sS "$SUPABASE_URL/auth/v1/admin/users" \
      -H "apikey: $SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\",\"email_confirm\":true,\"user_metadata\":{\"full_name\":\"$ADMIN_NAME\",\"username\":\"$ADMIN_USERNAME\"}}" \
      | jq -er ".id")
    curl -sS "$SUPABASE_URL/rest/v1/profiles?id=eq.$ADMIN_ID" \
      -H "apikey: $SERVICE_ROLE_KEY" \
      -H "Authorization: Bearer $SERVICE_ROLE_KEY" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=representation" \
      -X PATCH \
      -d "{\"role\":\"admin\",\"full_name\":\"$ADMIN_NAME\",\"username\":\"$ADMIN_USERNAME\",\"email\":\"$ADMIN_EMAIL\",\"is_active\":true}"
  '
  ```

- The legacy `scripts/create-admin.js` helper has been removed; always use `bun run create-admin`.

### Core features

#### For Administrators:
- View and manage all trips and orders
- Configure base rates, surcharges, and discounts
- Update order statuses
- Generate invoices for any order
- View global system statistics

#### For Users:
- Calculate trip distances and pricing
- Create and save trips
- Generate trip orders
- View personal history of trips and orders
- Download invoices as PDF

## Testing

Run the automated Supabase/API checks:
```bash
node scripts/test-api.js
```

This suite verifies DB access, admin presence, CRUD basics, and that invoices use `invoice_date` (not `issue_date`). Ensure you have created an admin first.

## Deployment

### Frontend (Vercel)

1. Connect the repo to Vercel
2. Set environment variables in Vercel (Frontend only):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_BACKEND_URL` (your deployed backend URL)
   - `VITE_GOOGLE_MAPS_API_KEY`
3. Build command: `bun run build`
4. Output directory: `dist`
5. Deploy

### Backend (Render or similar)

Use `backend/` with your preferred host (Render example):
- Required env vars:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_KEY`
  - `CORS_ORIGIN` (e.g., your Vercel frontend URL)
- Expose port `8000`
- Health path: `/health`

## Security

- Supabase credentials are kept secure using environment variables
- Service Role Key is only used for secure administrative operations
- Authentication managed by Supabase Auth (email/password)
- Row Level Security (RLS) enabled on Supabase tables

Note: the app expects a singleton row in `company_settings` with id `11111111-1111-1111-1111-111111111111` (seeded by `supabase-schema.sql`).

## License

MIT

This project is licensed under the [MIT License](./LICENSE)..

## :brain: Acknowledgments
_"Whoever loves discipline loves knowledge, but whoever hates correction is stupid."_