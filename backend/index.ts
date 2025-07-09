import express from 'express';
import cors from 'cors';
import 'dotenv/config';

// Import routes
import userRoutes from './src/routes/users';
import settingsRoutes from './src/routes/settings';
import surchargeFactorRoutes from './src/routes/surchargeFactors';
import discountRoutes from './src/routes/discounts';
import tripRoutes from './src/routes/trips';
import orderRoutes from './src/routes/orders';
import invoiceRoutes from './src/routes/invoices';
import healthRoutes from './routes/health';

// Initialize express app
const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/surcharge-factors', surchargeFactorRoutes);
app.use('/api/discounts', discountRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/health', healthRoutes);

// Root route
app.get('/', (req: express.Request, res: express.Response) => {
  res.json({ message: 'Travelex API is running' });
});

// Port
const PORT = process.env.PORT || 8000;

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;