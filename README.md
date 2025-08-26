# Jaimes Gamez Travel Experience (JG Travelex) &middot; ![Release Status](https://img.shields.io/badge/release-v2.0.0-brightgreen) [![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE) ![PWA Ready](https://img.shields.io/badge/PWA-Ready-9f7aea) ![React](https://img.shields.io/badge/React-18.0-61dafb) ![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ecf8e)

A modern frontend-only web application powered by Supabase for calculating trip distances, generating orders and invoices, and tracking trip statistics. Designed for transportation businesses to manage trip calculations, financial tracking, and reporting with direct database integration.

This project provides a comprehensive solution for transportation businesses looking for route calculation, pricing management, and invoice generation with seamless Supabase integration.

</div>

## :rocket: Key Features

- 🔐 **User authentication**: Full user management system with session persistence
- 📍 **Distance calculation**: Google Maps API integration for accurate distance and travel time determination
- 💰 **Rate configuration**: Configurable base rates per mile and hour with persistence
- ⚡ **Increment factors**: Manage surcharges with fixed amounts or percentages via API
- 🎯 **Discounts**: Apply and manage discounts via an intuitive interface
- 📊 **Trip tracking**: Real-time statistics and charts for daily, weekly, and monthly trips
- 🧾 **Order management**: Create and manage orders from completed trips
- 📄 **Invoice generation**: Generate PDF invoices with automatic calculations
- 🗄️ **Data persistence**: Full Supabase PostgreSQL backend with API
- 📱 **Responsive interface**: Optimized for all devices with Tailwind CSS
- 🔄 **Real-time updates**: Automatic data refresh and state management
- 🛡️ **Security**: Proper credential handling and API authentication

## :gear: Installation and Execution

### Prerequisites
- 📦 Node.js (version 16 or higher)
- 🗃️ Supabase account (free tier available)
- ☁️ Google Cloud Platform account to obtain a Google Maps API Key

### Installation Steps

**1. Clone the repository:**
```bash
git clone https://github.com/Serverket/jg-travelex
cd jg-travelex
```

**2. Install dependencies:**
```bash
npm install
```

## Database Setup

### Supabase Setup

1. **Create Supabase Project**:
   - Visit [supabase.com](https://supabase.com) and create a new project
   - Go to Settings → API to get your project URL and service role key

2. **Setup Database**:
   ```bash
   # In Supabase Dashboard → SQL Editor, run:
   # Copy and paste contents from backend/supabase-schema.sql
   ```

3. **Create Admin User**:
   ```bash
   cat > create-admin.js << 'EOF'
   import { createClient } from '@supabase/supabase-js';
   import crypto from 'crypto';

   const supabase = createClient('YOUR_SUPABASE_URL', 'YOUR_SERVICE_ROLE_KEY');

   const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex');

   await supabase.from('users').insert({
     username: 'admin',
     password: hashPassword('your_password'),
     name: 'Admin User',
     email: 'admin@company.com',
     role: 'admin'
   });
   console.log('✅ Admin created');
   EOF

   node create-admin.js && rm create-admin.js
   ```

## Environment Setup

**Environment Variables (.env):**
```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

## Development

```bash
npm run dev
```

Ready! 🎉 Open your browser at http://localhost:5173

## :hammer_and_wrench: Technologies Used
* **Frontend**:
  * React 18
  * Vite
  * TailwindCSS
  * Chart.js
  * React Router
  * Google Maps API
  * jsPDF
  * Axios

* **Database**:
  * Supabase (PostgreSQL)
  * Row Level Security (RLS)
  * Real-time subscriptions

## :file_folder: Project Structure
```
📂 jg-travelex/
├── 📁 public/               # Static files
│   ├── 📁 icons/            # PWA icons
│   ├── 📄 manifest.json     # PWA manifest
│   └── 📄 sw.js             # Service Worker
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

## :wrench: Customization and Configuration

### 💵 Rates and Surcharges
All pricing configuration is managed through the Settings page after login:
- Base rates per mile and hour
- Surcharge factors (fixed or percentage)
- Discounts (fixed or percentage)

### 🗃️ Database
Uses Supabase PostgreSQL with Row Level Security. The application connects directly to Supabase from the frontend.

### 🔑 API Security
The application uses Supabase's built-in security features:
- Row Level Security (RLS) policies for data isolation
- Environment-based credential management
- No hardcoded secrets in source code
- Admin user creation via secure scripts (not stored in repo)

### 🗺️ Google Maps API
To obtain a Google Maps API Key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the following APIs:
   - Directions API
   - Distance Matrix API
   - Maps JavaScript API
4. Generate an API Key and restrict its usage according to your needs
5. Add the API Key to your frontend .env file

## :world_map: Roadmap
Features we're considering for future versions:

- [ ] Auto-estimation: AI for calculating rates based on historical patterns
- [ ] Notifications: Email alerts for scheduled trips
- [ ] Dark mode: Night-friendly theme
- [ ] Multi-language support: Expand language options
- [ ] User management system: Admin panel for user accounts
- [ ] API rate limiting: Enhanced security for API endpoints
- [x] Order management: Create and manage orders from trips
- [x] Invoice generation: PDF invoice creation with automatic calculations
- [x] Database persistence: Supabase PostgreSQL for all data
- [x] Direct database integration: Frontend connects directly to Supabase
- [x] Trip analytics: Comprehensive trip statistics and visualizations
- [x] Address truncation: Improved address display with ellipsis

## :scroll: Licensing

This work is licensed under a [MIT License](LICENSE).

## :brain: Acknowledgments

_"Whoever loves discipline loves knowledge, but whoever hates correction is stupid."_