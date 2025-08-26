-- JG Travelex Database Schema for Supabase (PostgreSQL)
-- Migration from MySQL to PostgreSQL/Supabase

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    distance_rate DECIMAL(10,2) NOT NULL DEFAULT 1.50,
    duration_rate DECIMAL(10,2) NOT NULL DEFAULT 15.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Surcharge factors table
CREATE TABLE surcharge_factors (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('percentage', 'fixed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Discounts table
CREATE TABLE discounts (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    rate DECIMAL(10,2) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('percentage', 'fixed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trips table
CREATE TABLE trips (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    distance DECIMAL(10,2) NOT NULL,
    duration INTEGER, -- in minutes
    date DATE NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'canceled')),
    total_amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices table
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    invoice_number VARCHAR(255) UNIQUE NOT NULL,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trip surcharges junction table
CREATE TABLE trip_surcharges (
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    surcharge_id INTEGER NOT NULL REFERENCES surcharge_factors(id) ON DELETE CASCADE,
    PRIMARY KEY (trip_id, surcharge_id)
);

-- Trip discounts junction table
CREATE TABLE trip_discounts (
    trip_id INTEGER NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
    discount_id INTEGER NOT NULL REFERENCES discounts(id) ON DELETE CASCADE,
    PRIMARY KEY (trip_id, discount_id)
);

-- Create indexes for better performance
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_date ON trips(date);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_trip_id ON order_items(trip_id);
CREATE INDEX idx_invoices_order_id ON invoices(order_id);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_modtime BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_modtime BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_surcharge_factors_modtime BEFORE UPDATE ON surcharge_factors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_discounts_modtime BEFORE UPDATE ON discounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_trips_modtime BEFORE UPDATE ON trips FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_modtime BEFORE UPDATE ON orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_modtime BEFORE UPDATE ON invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_surcharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_discounts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON users FOR SELECT USING (auth.uid()::text = id::text);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid()::text = id::text);

-- RLS Policies for trips table
CREATE POLICY "Users can view their own trips" ON trips FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert their own trips" ON trips FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own trips" ON trips FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own trips" ON trips FOR DELETE USING (auth.uid()::text = user_id::text);

-- RLS Policies for orders table
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can insert their own orders" ON orders FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);
CREATE POLICY "Users can update their own orders" ON orders FOR UPDATE USING (auth.uid()::text = user_id::text);
CREATE POLICY "Users can delete their own orders" ON orders FOR DELETE USING (auth.uid()::text = user_id::text);

-- RLS Policies for order_items table
CREATE POLICY "Users can view order items for their orders" ON order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND auth.uid()::text = orders.user_id::text)
);
CREATE POLICY "Users can insert order items for their orders" ON order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND auth.uid()::text = orders.user_id::text)
);
CREATE POLICY "Users can update order items for their orders" ON order_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND auth.uid()::text = orders.user_id::text)
);
CREATE POLICY "Users can delete order items for their orders" ON order_items FOR DELETE USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND auth.uid()::text = orders.user_id::text)
);

-- RLS Policies for invoices table
CREATE POLICY "Users can view invoices for their orders" ON invoices FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = invoices.order_id AND auth.uid()::text = orders.user_id::text)
);
CREATE POLICY "Users can insert invoices for their orders" ON invoices FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = invoices.order_id AND auth.uid()::text = orders.user_id::text)
);
CREATE POLICY "Users can update invoices for their orders" ON invoices FOR UPDATE USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = invoices.order_id AND auth.uid()::text = orders.user_id::text)
);
CREATE POLICY "Users can delete invoices for their orders" ON invoices FOR DELETE USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = invoices.order_id AND auth.uid()::text = orders.user_id::text)
);

-- RLS Policies for trip_surcharges table
CREATE POLICY "Users can view surcharges for their trips" ON trip_surcharges FOR SELECT USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_surcharges.trip_id AND auth.uid()::text = trips.user_id::text)
);
CREATE POLICY "Users can insert surcharges for their trips" ON trip_surcharges FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_surcharges.trip_id AND auth.uid()::text = trips.user_id::text)
);
CREATE POLICY "Users can delete surcharges for their trips" ON trip_surcharges FOR DELETE USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_surcharges.trip_id AND auth.uid()::text = trips.user_id::text)
);

-- RLS Policies for trip_discounts table
CREATE POLICY "Users can view discounts for their trips" ON trip_discounts FOR SELECT USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_discounts.trip_id AND auth.uid()::text = trips.user_id::text)
);
CREATE POLICY "Users can insert discounts for their trips" ON trip_discounts FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_discounts.trip_id AND auth.uid()::text = trips.user_id::text)
);
CREATE POLICY "Users can delete discounts for their trips" ON trip_discounts FOR DELETE USING (
    EXISTS (SELECT 1 FROM trips WHERE trips.id = trip_discounts.trip_id AND auth.uid()::text = trips.user_id::text)
);

-- Allow public access to settings, surcharge_factors, and discounts tables (read-only for non-sensitive configuration)
CREATE POLICY "Allow read access to settings" ON settings FOR SELECT USING (true);
CREATE POLICY "Allow read access to surcharge_factors" ON surcharge_factors FOR SELECT USING (true);
CREATE POLICY "Allow read access to discounts" ON discounts FOR SELECT USING (true);

-- Insert default settings
INSERT INTO settings (distance_rate, duration_rate) VALUES (1.50, 15.00);

-- Insert some sample surcharge factors
INSERT INTO surcharge_factors (name, rate, type) VALUES 
    ('Weekend Surcharge', 20.00, 'percentage'),
    ('Rush Hour', 5.00, 'fixed'),
    ('Holiday Premium', 25.00, 'percentage');

-- Insert some sample discounts
INSERT INTO discounts (name, rate, type) VALUES 
    ('Senior Discount', 10.00, 'percentage'),
    ('Loyalty Discount', 15.00, 'fixed'),
    ('Student Discount', 15.00, 'percentage');
