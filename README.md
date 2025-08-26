# JG Travelex - Sistema de Gestión de Viajes

Aplicación web moderna para calcular distancias, gestionar viajes y generar facturas, construida con React + Vite y respaldada por Supabase.

A modern frontend-only web application powered by Supabase for calculating trip distances, generating orders and invoices, and tracking trip statistics. Designed for transportation businesses to manage trip calculations, financial tracking, and reporting with direct database integration.

This project provides a comprehensive solution for transportation businesses looking for route calculation, pricing management, and invoice generation with seamless Supabase integration.

</div>

## :rocket: Características

- 🗺️ Cálculo de distancias usando Google Maps
- 💰 Cálculo automático de precios con tarifas configurables
- 📊 Dashboard con estadísticas en tiempo real
- 📋 Gestión completa de órdenes
- 📄 Generación de facturas PDF
- 👤 Sistema de autenticación con Supabase Auth
- ⚙️ Panel de configuración de tarifas, recargos y descuentos
- 🔒 Control de acceso basado en roles (admin/usuario)
- 📱 Diseño responsivo y moderno con Tailwind CSS

## :gear: Instalación y Ejecución

### Prerrequisitos

- Node.js 16+ y npm
- Cuenta de Supabase (https://supabase.com)
- Clave API de Google Maps (para el cálculo de distancias)

### Pasos de instalación

1. Clonar el repositorio
```bash
git clone <url-del-repositorio>
cd jg-travelex
```

2. Instalar dependencias
```bash
npm install
```

3. Configurar variables de entorno
```bash
cp .env.template .env
```

Editar `.env` con las siguientes variables:
```env
# Supabase Configuration
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Google Maps API
VITE_GOOGLE_MAPS_API_KEY=tu_google_maps_api_key
```

4. Configurar la base de datos en Supabase
```bash
# Ejecutar el script de esquema en tu proyecto de Supabase
node scripts/create-admin-supabase.js
```

5. Ejecutar la aplicación
```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`.

## :hammer_and_wrench: Tecnologías

### Frontend
- **React 18** - Framework de UI
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework de estilos utility-first
- **React Router** - Navegación SPA
- **Chart.js** - Visualización de datos
- **jsPDF** - Generación de PDFs
- **Google Maps API** - Cálculo de distancias y rutas

### Backend
- **Supabase** - Backend as a Service
  - PostgreSQL Database
  - Row Level Security (RLS)
  - Realtime subscriptions
  - Authentication
- **Service Role Key** - Operaciones administrativas seguras

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

## :wrench: Uso

### Credenciales de administrador por defecto
- Usuario: `jgam`
- Contraseña: `jgampro777`

### Funcionalidades principales

#### Para Administradores:
- Ver y gestionar todos los viajes y órdenes
- Configurar tarifas base, recargos y descuentos
- Actualizar estado de órdenes
- Generar facturas para cualquier orden
- Ver estadísticas globales del sistema

#### Para Usuarios:
- Calcular distancias y precios de viajes
- Crear y guardar viajes
- Generar órdenes de viajes
- Ver historial personal de viajes y órdenes
- Descargar facturas en PDF

## :world_map: Despliegue

### Despliegue en Vercel

1. Conectar el repositorio a Vercel
2. Configurar las variables de entorno en Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_SERVICE_ROLE_KEY`
   - `VITE_GOOGLE_MAPS_API_KEY`
3. Configurar el comando de build: `npm run build`
4. Configurar el directorio de output: `dist`
5. Desplegar

## Seguridad

- Las credenciales de Supabase se mantienen seguras usando variables de entorno
- Service Role Key solo se usa para operaciones administrativas
- Autenticación basada en SHA256 para compatibilidad con sistema legacy
- Row Level Security (RLS) habilitado en tablas de Supabase

## Licencia

MIT

## :brain: Acknowledgments

_"Whoever loves discipline loves knowledge, but whoever hates correction is stupid."_