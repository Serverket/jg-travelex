# Jaimes Gamez Travel Experience (JG Travelex) &middot; ![Release Status](https://img.shields.io/badge/release-v1.0.0-brightgreen) [![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE) ![PWA Ready](https://img.shields.io/badge/PWA-Ready-9f7aea) ![React](https://img.shields.io/badge/React-18.0-61dafb) ![Vite](https://img.shields.io/badge/Vite-4.0-646cff)

A progressive web application (PWA) for calculating mile distances for trips within the USA, with features for configuring prices, increment factors, discounts, trip tracking, and invoice generation.

This project is for my mentor, and it's very focused on resolving a real-world problem for him, in any case I supposed that if you're trying to create or find something similar this would help to get a hint.

</div>

## :rocket: Key Features

- 🔐 **User authentication**: Simple login system with credentials stored in .env file
- 📍 **Distance calculation**: Google Maps API integration for accurate distance and travel time determination
- 💰 **Rate configuration**: Configurable base rates per mile and hour
- ⚡ **Increment factors**: Ability to add factors like rain, traffic, etc. with fixed amounts or percentages
- 🎯 **Discounts**: Application of fixed amount or percentage discounts
- 📊 **Trip tracking**: Statistics and charts for daily, weekly, and monthly trips
- 📄 **Invoice generation**: Creation of informal reports for completed trips
- 📱 **Responsive interface**: Designed with Tailwind CSS for optimal experience on all devices
- 🔄 **Offline functionality**: Available as PWA for installation and offline use

## :gear: Installation and Execution

### Prerequisites
- 📦 Node.js (version 14 or higher)
- 🔧 NPM or Yarn
- ☁️ Google Cloud Platform account to obtain a Google Maps API Key

### Installation Steps

**Clone the repository:**
   ```
   git clone https://github.com/Serverket/jg-travelex
   cd jg-travelex
   ```
   
**Install dependencies:**
```
npm install
```

**Configure environment variables:**
Create a .env file in the project root:
.env
```
VITE_APP_USERNAME=your_username
VITE_APP_PASSWORD=your_password
VITE_APP_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
```

**Start the development server:**
```
npm run dev
```

Ready! 🎉 Open your browser at http://localhost:5173

## :hammer_and_wrench: Technologies Used
* React
* Vite
* TailwindCSS
* Google Maps
* Chart.js

## :file_folder: Project Structure
```
📂 jg-travelex/
├── 📁 public/               # Static files
│   ├── 📁 icons/            # PWA icons
│   ├── 📄 manifest.json     # PWA manifest
│   └── 📄 sw.js             # Service Worker
├── 📁 src/
│   ├── 📁 components/       # Reusable components
│   ├── 📁 context/          # Global application context
│   ├── 📁 pages/            # Main pages
│   ├── 📄 App.jsx           # Main component
│   ├── 📄 main.jsx          # Entry point
│   └── 📄 index.css         # Global styles
├── 📄 .env                  # Environment variables
├── 📄 index.html            # HTML template
├── 📄 package.json          # Dependencies and scripts
├── 📄 postcss.config.js     # PostCSS configuration
├── 📄 tailwind.config.js    # Tailwind CSS configuration
└── 📄 vite.config.js        # Vite configuration
```

## :wrench: Customization
💵 Rates and factors
You can configure base rates, increment factors, and discounts from the Settings page after logging in.

🔑 Credentials
Modify the .env file to change access credentials.

🗺️ Google Maps API
To obtain a Google Maps API Key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)

2. Create a new project

3. Enable Directions API and Distance Matrix API

4. Generate an API Key and restrict its usage according to your needs

5. Add the API Key to your .env file

## :world_map: Roadmap
Features we're considering for future versions:

- [ ] Auto-estimation: AI for calculating rates based on historical patterns
- [ ] Notifications: Email alerts for scheduled trips
- [ ] Dark mode: Night-friendly theme
- [ ] Multi-language support: Expand language options
- [x] Native mobile app: Native version for iOS and Android
- [x] Cloud sync: Automatic data backup
- [x] Advanced reports: Detailed charts and statistics
- [x] Offline functionality: Usage without internet connection

## :scroll: Licensing

This work is licensed under a [MIT License](LICENSE).

## :brain: Acknowledgments

_"Whoever loves discipline loves knowledge, but whoever hates correction is stupid."_