# Jaimes Gamez Travel Experience (JG Travelex) &middot; ![Release Status](https://img.shields.io/badge/release-v1.1.0-brightgreen) [![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE) ![PWA Ready](https://img.shields.io/badge/PWA-Ready-9f7aea) ![React](https://img.shields.io/badge/React-18.0-61dafb) ![Bun](https://img.shields.io/badge/Bun-1.0-f9f1e1) ![MySQL](https://img.shields.io/badge/MySQL-8.0-00758f)

A full-stack web application for calculating trip distances, generating orders and invoices, and tracking trip statistics with an extensive backend for data persistence. Designed for transportation businesses to manage trip calculations, financial tracking, and reporting.

This project provides a comprehensive solution for transportation businesses looking for route calculation, pricing management, and invoice generation with a robust API backend.

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
- 🗄️ **Data persistence**: Full MySQL database backend with API
- 📱 **Responsive interface**: Optimized for all devices with Tailwind CSS
- 🔄 **Real-time updates**: Automatic data refresh and state management
- 🛡️ **Security**: Proper credential handling and API authentication

## :gear: Installation and Execution

### Prerequisites
- 📦 Bun (preferred) or Node.js (version 16 or higher)
- 🗃️ MySQL (version 8.0 or higher)
- ☁️ Google Cloud Platform account to obtain a Google Maps API Key

### Installation Steps

**1. Clone the repository:**
```bash
git clone https://github.com/Serverket/jg-travelex
cd jg-travelex
```

**2. Install frontend dependencies:**
```bash
bun install
```

**3. Install backend dependencies:**
```bash
cd backend
bun install
cd ..
```

**4. Set up the database:**
```bash
# Create a MySQL database named 'travelex'
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS travelex;"
```

**5. Configure environment variables:**

Create a .env file in the project root:
```
VITE_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

Create a .env file in the backend directory:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_NAME=travelex
PORT=8000
```

**6. Start the backend server:**
```bash
cd backend
bun dev
```

**7. Start the frontend server in a new terminal:**
```bash
cd jg-travelex
bun dev
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

* **Backend**:
  * Bun
  * Express
  * MySQL
  * TypeScript
  * JWT Authentication

## :file_folder: Project Structure
```
📂 jg-travelex/
├── 📁 backend/              # Backend API
│   ├── 📁 src/              # Backend source code
│   │   ├── 📁 controllers/  # API controllers
│   │   ├── 📁 models/       # Database models
│   │   └── 📁 routes/       # API routes
│   ├── 📄 index.ts          # Entry point
│   ├── 📄 cleanup.js        # Database cleanup utility
│   ├── 📄 .env              # Backend environment variables
│   └── 📄 package.json      # Backend dependencies
├── 📁 public/               # Static files
│   ├── 📁 icons/            # PWA icons
│   ├── 📄 manifest.json     # PWA manifest
│   └── 📄 sw.js             # Service Worker
├── 📁 src/                  # Frontend source code
│   ├── 📁 components/       # Reusable components
│   ├── 📁 context/          # Global application context
│   ├── 📁 pages/            # Main pages
│   ├── 📁 services/         # API service integration
│   ├── 📁 utils/            # Utility functions
│   ├── 📄 App.jsx           # Main component
│   ├── 📄 main.jsx          # Entry point
│   └── 📄 index.css         # Global styles
├── 📄 .env                  # Frontend environment variables
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

### 🗃️ Database Setup
The application uses MySQL for data persistence. Configure your database connection in `backend/.env`.

### 🔑 API Security
Make sure to set strong credentials for your database in the backend .env file. For production, consider implementing proper JWT expiration and refresh mechanisms.

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
- [x] Database persistence: MySQL backend for all data
- [x] API integration: Full REST API for all operations
- [x] Trip analytics: Comprehensive trip statistics and visualizations
- [x] Address truncation: Improved address display with ellipsis

## :scroll: Licensing

This work is licensed under a [MIT License](LICENSE).

## :brain: Acknowledgments

_"Whoever loves discipline loves knowledge, but whoever hates correction is stupid."_