-- REGASCO LPG DELIVERY SYSTEM - POSTGRESQL SCHEMA (NEON)
-- Phase 2 Production Architecture

-- 1. USERS & ROLES TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) UNIQUE NOT NULL,
    email VARCHAR(255),
    role VARCHAR(32) NOT NULL DEFAULT 'CUSTOMER', -- 'CUSTOMER', 'ADMIN', 'RIDER'
    password_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. RIDERS TABLE (Fleet Management)
CREATE TABLE IF NOT EXISTS riders (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    plate_number VARCHAR(32) NOT NULL,
    vehicle_model VARCHAR(128) NOT NULL DEFAULT 'Motorcycle with Carrier',
    status VARCHAR(32) DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'ON_DELIVERY', 'OFFLINE'
    current_lat NUMERIC(10, 7),
    current_lng NUMERIC(10, 7),
    heading NUMERIC(6, 2) DEFAULT 0,
    speed NUMERIC(6, 2) DEFAULT 0,
    last_location_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PRODUCTS TABLE
CREATE TABLE IF NOT EXISTS products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    weight_kg NUMERIC(6, 2) NOT NULL,
    category VARCHAR(64) NOT NULL DEFAULT 'household',
    price_refill NUMERIC(10, 2) NOT NULL,
    price_new_tank NUMERIC(10, 2) NOT NULL,
    image_url TEXT NOT NULL,
    description TEXT,
    badge VARCHAR(64),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    order_code VARCHAR(32) UNIQUE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(32) NOT NULL,
    address TEXT NOT NULL,
    landmark TEXT,
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL,
    delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    payment_method VARCHAR(32) NOT NULL, -- 'COD', 'GCASH_QR', 'MAYA_QR'
    payment_status VARCHAR(32) NOT NULL DEFAULT 'UNPAID', -- 'UNPAID', 'PENDING_VERIFICATION', 'PAID', 'REJECTED'
    payment_screenshot TEXT,
    payment_ref_number VARCHAR(128),
    order_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_PAYMENT', -- 'PENDING_PAYMENT', 'PAYMENT_VERIFIED', 'ORDER_CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'
    assigned_rider_id VARCHAR(64) REFERENCES riders(id) ON DELETE SET NULL,
    assigned_rider_json JSONB,
    rider_coordinates JSONB,
    safety_check_verified BOOLEAN DEFAULT FALSE,
    notes TEXT,
    reject_reason TEXT,
    proof_of_delivery_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
    id VARCHAR(64) PRIMARY KEY,
    order_id VARCHAR(64) REFERENCES orders(id) ON DELETE CASCADE,
    product_id VARCHAR(64) REFERENCES products(id),
    product_name VARCHAR(255) NOT NULL,
    cylinder_option VARCHAR(32) NOT NULL, -- 'REFILL', 'NEW_TANK'
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    weight_kg NUMERIC(6, 2) NOT NULL,
    image_url TEXT
);

-- 6. RIDER LIVE LOCATION HISTORY / AUDIT
CREATE TABLE IF NOT EXISTS rider_locations (
    id BIGSERIAL PRIMARY KEY,
    rider_id VARCHAR(64) NOT NULL,
    order_id VARCHAR(64),
    latitude NUMERIC(10, 7) NOT NULL,
    longitude NUMERIC(10, 7) NOT NULL,
    speed NUMERIC(6, 2) DEFAULT 0,
    heading NUMERIC(6, 2) DEFAULT 0,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. STORE SETTINGS
CREATE TABLE IF NOT EXISTS store_settings (
    id VARCHAR(32) PRIMARY KEY DEFAULT 'primary',
    settings_data JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for lightning fast queries
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_code ON orders(order_code);
CREATE INDEX IF NOT EXISTS idx_orders_assigned_rider ON orders(assigned_rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_locations_rider_id ON rider_locations(rider_id);
CREATE INDEX IF NOT EXISTS idx_rider_locations_order_id ON rider_locations(order_id);
