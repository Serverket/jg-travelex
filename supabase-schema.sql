-- JG Travelex-- Supabase Schema for JG Travelex
-- Modern architecture with Supabase Auth integration

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Users profile table (linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user', 'driver')),
    avatar_url TEXT,
    phone VARCHAR(20),
    department VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Company settings table (singleton pattern)
CREATE TABLE IF NOT EXISTS company_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(100) DEFAULT 'JG Travelex',
    base_currency VARCHAR(3) DEFAULT 'USD',
    distance_rate DECIMAL(10, 4) NOT NULL DEFAULT 1.50,
    duration_rate DECIMAL(10, 4) NOT NULL DEFAULT 0.50,
    night_surcharge_percent DECIMAL(5, 2) DEFAULT 20.00,
    weekend_surcharge_percent DECIMAL(5, 2) DEFAULT 15.00,
    fuel_surcharge_percent DECIMAL(5, 2) DEFAULT 10.00,
    tax_rate DECIMAL(5, 2) DEFAULT 8.00,
    min_trip_charge DECIMAL(10, 2) DEFAULT 5.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Surcharge Factors table with conditions
CREATE TABLE IF NOT EXISTS surcharge_factors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    rate DECIMAL(10, 4) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('percentage', 'fixed')),
    is_active BOOLEAN DEFAULT true,
    apply_condition VARCHAR(50) CHECK (apply_condition IN ('always', 'weekend', 'night', 'peak_hours', 'holiday', 'weather', 'distance_based')),
    min_distance DECIMAL(10, 2),
    max_distance DECIMAL(10, 2),
    start_time TIME,
    end_time TIME,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Discounts table with validation rules
CREATE TABLE IF NOT EXISTS discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    rate DECIMAL(10, 4) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('percentage', 'fixed')),
    is_active BOOLEAN DEFAULT true,
    valid_from DATE,
    valid_until DATE,
    min_order_amount DECIMAL(10, 2),
    max_discount_amount DECIMAL(10, 2),
    usage_limit INTEGER,
    usage_count INTEGER DEFAULT 0,
    applicable_to VARCHAR(20) CHECK (applicable_to IN ('all', 'first_time', 'corporate', 'loyalty')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trips table with enhanced features
CREATE TABLE IF NOT EXISTS trips (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    trip_number VARCHAR(20) UNIQUE NOT NULL,
    origin_address VARCHAR(255) NOT NULL,
    origin_lat DECIMAL(10, 8),
    origin_lng DECIMAL(11, 8),
    destination_address VARCHAR(255) NOT NULL,
    destination_lat DECIMAL(10, 8),
    destination_lng DECIMAL(11, 8),
    distance_km DECIMAL(10, 2) NOT NULL,
    distance_miles DECIMAL(10, 2) NOT NULL,
    duration_minutes INTEGER NOT NULL,
    trip_date DATE NOT NULL,
    trip_time TIME,
    base_price DECIMAL(10, 2) NOT NULL,
    surcharges DECIMAL(10, 2) DEFAULT 0,
    discounts DECIMAL(10, 2) DEFAULT 0,
    final_price DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled')),
    driver_name VARCHAR(100),
    vehicle_number VARCHAR(50),
    payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'credit_card', 'invoice', 'company_account')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trip Surcharges junction table with amount tracking
CREATE TABLE IF NOT EXISTS trip_surcharges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    surcharge_id UUID REFERENCES surcharge_factors(id) ON DELETE CASCADE,
    applied_rate DECIMAL(10, 4),
    amount DECIMAL(10, 2),
    UNIQUE(trip_id, surcharge_id)
);

-- Trip Discounts junction table with amount tracking
CREATE TABLE IF NOT EXISTS trip_discounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    discount_id UUID REFERENCES discounts(id) ON DELETE CASCADE,
    applied_rate DECIMAL(10, 4),
    amount DECIMAL(10, 2),
    UNIQUE(trip_id, discount_id)
);

-- Audit log table for tracking changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Orders table with enhanced tracking
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(20) UNIQUE NOT NULL,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'processing', 'completed', 'cancelled', 'refunded')),
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_status VARCHAR(20) DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Order Items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    description VARCHAR(255),
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table with enhanced features
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    billing_address TEXT,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'pending', 'paid', 'partial', 'overdue', 'cancelled')),
    paid_amount DECIMAL(10, 2) DEFAULT 0,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    notes TEXT,
    reminder_sent BOOLEAN DEFAULT false,
    reminder_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_trips_user_id ON trips(user_id);
CREATE INDEX idx_trips_trip_date ON trips(trip_date);
CREATE INDEX idx_trips_status ON trips(status);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_surcharges ENABLE ROW LEVEL SECURITY;
ALTER TABLE trip_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Public profiles are viewable by everyone" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for trips
CREATE POLICY "Users can view their own trips" ON trips
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Users can create their own trips" ON trips
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips" ON trips
    FOR UPDATE USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Admins can delete trips" ON trips
    FOR DELETE USING (EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- RLS Policies for orders
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

CREATE POLICY "Users can create their own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- RLS Policies for invoices
CREATE POLICY "Users can view their own invoices" ON invoices
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders o 
            WHERE o.id = invoices.order_id 
            AND (o.user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
            ))
        )
    );

-- Trigger functions for updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to all tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON company_settings
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_trips_updated_at BEFORE UPDATE ON trips
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_surcharge_factors_updated_at BEFORE UPDATE ON surcharge_factors
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_discounts_updated_at BEFORE UPDATE ON discounts
    FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, username)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
        COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
    );
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert default company settings
INSERT INTO company_settings (id) 
VALUES ('11111111-1111-1111-1111-111111111111')
ON CONFLICT (id) DO NOTHING;

-- Insert default surcharge factors
INSERT INTO surcharge_factors (code, name, description, rate, type, is_active, apply_condition) VALUES
    ('NIGHT', 'Night Surcharge', 'Applied for trips between 10 PM and 6 AM', 20.00, 'percentage', true, 'night'),
    ('WEEKEND', 'Weekend Surcharge', 'Applied for trips on Saturday and Sunday', 15.00, 'percentage', true, 'weekend'),
    ('FUEL', 'Fuel Surcharge', 'Variable fuel cost adjustment', 10.00, 'percentage', true, 'always'),
    ('PEAK', 'Peak Hours', 'Rush hour surcharge', 25.00, 'percentage', true, 'peak_hours'),
    ('LONGDIST', 'Long Distance', 'For trips over 50 miles', 5.00, 'fixed', true, 'distance_based')
ON CONFLICT (code) DO NOTHING;

-- Insert default discounts
INSERT INTO discounts (code, name, description, rate, type, is_active, applicable_to) VALUES
    ('FIRSTRIDE', 'First Time Rider', 'Welcome discount for new customers', 20.00, 'percentage', true, 'first_time'),
    ('CORPORATE', 'Corporate Discount', 'For registered corporate accounts', 15.00, 'percentage', true, 'corporate'),
    ('LOYALTY10', 'Loyalty Discount', '10% off for regular customers', 10.00, 'percentage', true, 'loyalty')
ON CONFLICT (code) DO NOTHING;

-- RLS Policies for users table (users can only see their own data)
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON users  
    FOR UPDATE USING (true);

-- RLS Policies for trips table (users can only see their own trips)
CREATE POLICY "Users can view own trips" ON trips
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own trips" ON trips
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own trips" ON trips
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete own trips" ON trips
    FOR DELETE USING (true);

-- RLS Policies for orders table (users can only see their own orders)
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own orders" ON orders
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own orders" ON orders
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete own orders" ON orders
    FOR DELETE USING (true);

-- RLS Policies for invoices table (users can only see invoices for their orders)
CREATE POLICY "Users can view own invoices" ON invoices
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own invoices" ON invoices
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own invoices" ON invoices
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete own invoices" ON invoices
    FOR DELETE USING (true);

-- RLS Policies for trip_surcharges table
CREATE POLICY "Users can view own trip surcharges" ON trip_surcharges
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own trip surcharges" ON trip_surcharges
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own trip surcharges" ON trip_surcharges
    FOR DELETE USING (true);

-- RLS Policies for trip_discounts table
CREATE POLICY "Users can view own trip discounts" ON trip_discounts
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own trip discounts" ON trip_discounts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can delete own trip discounts" ON trip_discounts
    FOR DELETE USING (true);

-- RLS Policies for order_items table
CREATE POLICY "Users can view own order items" ON order_items
    FOR SELECT USING (true);

CREATE POLICY "Users can insert own order items" ON order_items
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update own order items" ON order_items
    FOR UPDATE USING (true);

CREATE POLICY "Users can delete own order items" ON order_items
    FOR DELETE USING (true);
