import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { testConnection } from './config/db';

// Load environment variables
config();

// Create Express app
const app = express();
const port = process.env.PORT || 8000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test database connection
testConnection().catch(console.error);

// Import routes
import userRoutes from './routes/users';
import settingsRoutes from './routes/settings';
import surchargeFactorsRoutes from './routes/surchargeFactors';
import discountsRoutes from './routes/discounts';
import tripsRoutes from './routes/trips';
import ordersRoutes from './routes/orders';
import invoicesRoutes from './routes/invoices';

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/surcharge-factors', surchargeFactorsRoutes);
app.use('/api/discounts', discountsRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/invoices', invoicesRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('Travelex API is running');
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
