import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { Order, StoreSettings, Product, DispatchRider } from '@/types';

// Check if Neon DATABASE_URL is configured
export function isNeonConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres'));
}

// Get Neon SQL client
export function getDb(): NeonQueryFunction<false, false> | null {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || !dbUrl.startsWith('postgres')) {
    return null;
  }
  try {
    return neon(dbUrl);
  } catch (err) {
    console.error('Failed to initialize Neon connection:', err);
    return null;
  }
}

// Initialize tables in Neon DB if not already existing
export async function initDatabase(): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;

  try {
    // 1. Users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(32) UNIQUE NOT NULL,
        email VARCHAR(255),
        role VARCHAR(32) NOT NULL DEFAULT 'CUSTOMER',
        password_hash VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 2. Riders table
    await sql`
      CREATE TABLE IF NOT EXISTS riders (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(32) NOT NULL,
        plate_number VARCHAR(32) NOT NULL,
        vehicle_model VARCHAR(128) NOT NULL DEFAULT 'Motorcycle with Carrier',
        status VARCHAR(32) DEFAULT 'AVAILABLE',
        current_lat NUMERIC(10, 7),
        current_lng NUMERIC(10, 7),
        heading NUMERIC(6, 2) DEFAULT 0,
        speed NUMERIC(6, 2) DEFAULT 0,
        last_location_updated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 3. Products table
    await sql`
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
    `;

    // 4. Orders table
    await sql`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(64) PRIMARY KEY,
        order_code VARCHAR(32) UNIQUE NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(32) NOT NULL,
        address TEXT NOT NULL,
        landmark TEXT,
        latitude NUMERIC(10, 7) NOT NULL,
        longitude NUMERIC(10, 7) NOT NULL,
        items JSONB NOT NULL,
        subtotal NUMERIC(10, 2) NOT NULL,
        delivery_fee NUMERIC(10, 2) NOT NULL DEFAULT 50.00,
        total_amount NUMERIC(10, 2) NOT NULL,
        payment_method VARCHAR(32) NOT NULL,
        payment_status VARCHAR(32) NOT NULL DEFAULT 'UNPAID',
        payment_screenshot TEXT,
        payment_ref_number VARCHAR(128),
        order_status VARCHAR(32) NOT NULL DEFAULT 'PENDING_PAYMENT',
        assigned_rider JSONB,
        rider_coordinates JSONB,
        safety_check_verified BOOLEAN DEFAULT FALSE,
        notes TEXT,
        reject_reason TEXT,
        proof_of_delivery_url TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // 5. Rider Locations (Real-Time GPS telemetry)
    await sql`
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
    `;

    // 6. Store Settings
    await sql`
      CREATE TABLE IF NOT EXISTS store_settings (
        id VARCHAR(32) PRIMARY KEY DEFAULT 'primary',
        settings_data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    console.log('✅ Neon Database tables verified/initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Neon database tables:', error);
    return false;
  }
}

// Fetch all orders from Neon
export async function getNeonOrders(): Promise<Order[] | null> {
  const sql = getDb();
  if (!sql) return null;

  try {
    const rows = await sql`
      SELECT * FROM orders ORDER BY created_at DESC;
    `;

    return rows.map((r: any) => ({
      id: r.id,
      orderCode: r.order_code,
      customerName: r.customer_name,
      customerPhone: r.customer_phone,
      location: {
        address: r.address,
        landmark: r.landmark || '',
        latitude: Number(r.latitude),
        longitude: Number(r.longitude),
      },
      items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items,
      subtotal: Number(r.subtotal),
      deliveryFee: Number(r.delivery_fee),
      totalAmount: Number(r.total_amount),
      paymentMethod: r.payment_method,
      paymentStatus: r.payment_status,
      paymentScreenshot: r.payment_screenshot || undefined,
      paymentRefNumber: r.payment_ref_number || undefined,
      orderStatus: r.order_status,
      notes: r.notes || undefined,
      assignedRider: r.assigned_rider ? (typeof r.assigned_rider === 'string' ? JSON.parse(r.assigned_rider) : r.assigned_rider) : undefined,
      riderCoordinates: r.rider_coordinates ? (typeof r.rider_coordinates === 'string' ? JSON.parse(r.rider_coordinates) : r.rider_coordinates) : undefined,
      safetyCheckVerified: Boolean(r.safety_check_verified),
      rejectReason: r.reject_reason || undefined,
      createdAt: new Date(r.created_at).toISOString(),
      updatedAt: new Date(r.updated_at).toISOString(),
    }));
  } catch (err) {
    console.warn('Neon query error, falling back:', err);
    return null;
  }
}

// Upsert order in Neon
export async function saveNeonOrder(order: Order): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;

  try {
    await sql`
      INSERT INTO orders (
        id, order_code, customer_name, customer_phone, address, landmark,
        latitude, longitude, items, subtotal, delivery_fee, total_amount,
        payment_method, payment_status, payment_screenshot, payment_ref_number,
        order_status, assigned_rider, rider_coordinates, safety_check_verified,
        notes, reject_reason, created_at, updated_at
      ) VALUES (
        ${order.id}, ${order.orderCode}, ${order.customerName}, ${order.customerPhone},
        ${order.location.address}, ${order.location.landmark || ''},
        ${order.location.latitude}, ${order.location.longitude},
        ${JSON.stringify(order.items)}, ${order.subtotal}, ${order.deliveryFee}, ${order.totalAmount},
        ${order.paymentMethod}, ${order.paymentStatus}, ${order.paymentScreenshot || null}, ${order.paymentRefNumber || null},
        ${order.orderStatus}, ${order.assignedRider ? JSON.stringify(order.assignedRider) : null},
        ${order.riderCoordinates ? JSON.stringify(order.riderCoordinates) : null},
        ${order.safetyCheckVerified || false}, ${order.notes || null}, ${order.rejectReason || null},
        ${new Date(order.createdAt).toISOString()}, ${new Date(order.updatedAt).toISOString()}
      )
      ON CONFLICT (id) DO UPDATE SET
        order_status = EXCLUDED.order_status,
        payment_status = EXCLUDED.payment_status,
        assigned_rider = EXCLUDED.assigned_rider,
        rider_coordinates = EXCLUDED.rider_coordinates,
        safety_check_verified = EXCLUDED.safety_check_verified,
        notes = EXCLUDED.notes,
        reject_reason = EXCLUDED.reject_reason,
        updated_at = NOW();
    `;
    return true;
  } catch (err) {
    console.error('Failed to save order to Neon:', err);
    return false;
  }
}

// Record rider telemetry point
export async function logRiderLocation(params: {
  riderId: string;
  orderId?: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
}): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;

  try {
    await sql`
      INSERT INTO rider_locations (rider_id, order_id, latitude, longitude, speed, heading)
      VALUES (${params.riderId}, ${params.orderId || null}, ${params.latitude}, ${params.longitude}, ${params.speed || 0}, ${params.heading || 0});
    `;

    // Update active coordinates in riders table
    await sql`
      UPDATE riders
      SET current_lat = ${params.latitude},
          current_lng = ${params.longitude},
          speed = ${params.speed || 0},
          heading = ${params.heading || 0},
          last_location_updated_at = NOW()
      WHERE id = ${params.riderId};
    `;
    return true;
  } catch (err) {
    console.error('Failed to record rider location in Neon:', err);
    return false;
  }
}
