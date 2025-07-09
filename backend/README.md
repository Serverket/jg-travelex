# JG Travelex API Server &middot; ![Release Status](https://img.shields.io/badge/release-v1.0.0-brightgreen) [![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg)](LICENSE) ![Bun](https://img.shields.io/badge/Bun-1.2.15-f9f1e1) ![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178c6) ![MySQL](https://img.shields.io/badge/MySQL-8.0-4479a1)

A secure and high-performance backend API server for the Jaimes Gamez Travel Experience (JG Travelex) application. This server provides authenticated endpoints for user management, settings configuration, trip tracking, and invoice generation.

## :rocket: Key Features

- 🔐 **User Authentication**: Secure JWT-based authentication system
- 🔄 **Complete CRUD Operations**: Full API support for all application entities
- ⚡ **High Performance**: Built with Bun runtime for exceptional speed and low latency
- 📊 **Database Integration**: Robust MySQL integration with connection pooling
- 🛡️ **Security**: Input validation, error handling, and secure coding practices
- 📝 **API Documentation**: Clear endpoint documentation for easy integration

## :gear: Installation and Setup

### Prerequisites
- 📦 [Bun](https://bun.sh/) (version 1.2.15 or higher)
- 🗃️ MySQL (version 8.0 or higher)

### Installation Steps

**1. Install dependencies:**
```bash
bun install
```

**2. Configure environment variables:**  
Create a `.env` file in the project root based on the `.env.example` template:
```
DB_HOST=localhost
DB_USER=root
DB_PASS=r00tr00t
DB_NAME=travelex_db
PORT=8000
JWT_SECRET=your_jwt_secret_key
```

**3. Start the server:**
```bash
bun run dev     # Development mode with hot reloading
# OR
bun run start   # Production mode
```

The API server will be running at http://localhost:8000

## :hammer_and_wrench: Technologies Used

- **Bun**: High-performance JavaScript/TypeScript runtime
- **Express**: Web framework for building APIs
- **MySQL**: Relational database for data storage
- **TypeScript**: Type-safe programming language
- **JWT**: JSON Web Tokens for authentication
- **Cors**: Cross-origin resource sharing middleware

## :file_folder: Project Structure

```
📂 backend/
├── 📁 src/
│   ├── 📁 config/        # Configuration files (database, etc.)
│   ├── 📁 controllers/   # Request handlers for each entity
│   ├── 📁 models/        # Database models and schemas
│   ├── 📁 routes/        # API route definitions
│   ├── 📁 middleware/    # Authentication and validation middleware
│   └── 📄 server.ts      # Main server setup
├── 📄 index.ts           # Entry point
├── 📄 .env               # Environment variables (not in repo)
├── 📄 .env.example       # Environment variables template
├── 📄 package.json       # Dependencies and scripts
└── 📄 tsconfig.json      # TypeScript configuration
```

## :globe_with_meridians: API Endpoints

### Authentication
- `POST /api/login` - User login (returns JWT token)

### Settings
- `GET /api/settings` - Get user settings
- `PUT /api/settings` - Update settings

### Surcharge Factors
- `GET /api/surcharge-factors` - Get all surcharge factors
- `POST /api/surcharge-factors` - Create new surcharge factor
- `PUT /api/surcharge-factors/:id` - Update surcharge factor
- `DELETE /api/surcharge-factors/:id` - Delete surcharge factor

### Discounts
- `GET /api/discounts` - Get all discounts
- `POST /api/discounts` - Create new discount
- `PUT /api/discounts/:id` - Update discount
- `DELETE /api/discounts/:id` - Delete discount

### Trips
- `GET /api/trips` - Get all trips
- `POST /api/trips` - Create new trip
- `GET /api/trips/:id` - Get specific trip
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### Orders & Invoices
- `GET /api/orders` - Get all orders
- `POST /api/orders` - Create new order
- `GET /api/invoices` - Get all invoices
- `POST /api/invoices` - Create new invoice

## :shield: Security Considerations

- JWT authentication required for all endpoints except login
- Passwords are securely hashed before storage
- Input validation on all incoming data
- SQL injection protection through parameterized queries
- Rate limiting for sensitive endpoints

Developed with ❤️ using Bun and TypeScript
