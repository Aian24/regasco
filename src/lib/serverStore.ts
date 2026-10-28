import fs from 'fs';
import path from 'path';
import { Order, StoreSettings, Product, DispatchRider } from '@/types';
import { INITIAL_PRODUCTS, INITIAL_SETTINGS } from '@/data/products';
import { isNeonConfigured, getNeonOrders, saveNeonOrder, logRiderLocation } from '@/lib/db';

const DATA_DIR = path.join(process.cwd(), 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const PRODUCTS_FILE = path.join(DATA_DIR, 'products.json');

// Ensure data directory exists
function ensureDataDir() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  } catch (e) {
    console.error('Error creating data directory', e);
  }
}

// Global in-memory store
const globalStore = global as unknown as {
  _regascoOrders?: Order[];
  _regascoSettings?: StoreSettings;
  _regascoProducts?: Product[];
};

if (!globalStore._regascoProducts) {
  globalStore._regascoProducts = [...INITIAL_PRODUCTS];
}

if (!globalStore._regascoSettings) {
  globalStore._regascoSettings = { ...INITIAL_SETTINGS };
}

// Clean initialization: NO FAKE MOCK ORDERS
if (!globalStore._regascoOrders) {
  globalStore._regascoOrders = [];
}

export function getOrders(): Order[] {
  ensureDataDir();
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
      const parsed: Order[] = JSON.parse(data);
      // Filter out any legacy demo orders if found
      const cleaned = parsed.filter((o) => !o.id.startsWith('demo-order-'));
      globalStore._regascoOrders = cleaned;
      return cleaned;
    }
  } catch (e) {
    console.warn('Fallback to in-memory orders', e);
  }
  return (globalStore._regascoOrders || []).filter((o) => !o.id.startsWith('demo-order-'));
}

export function saveOrders(orders: Order[]): void {
  // Purge any demo orders before saving
  const cleaned = orders.filter((o) => !o.id.startsWith('demo-order-'));
  globalStore._regascoOrders = cleaned;
  ensureDataDir();
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(cleaned, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not write to orders file (serverless mode)', e);
  }

  // If Neon database is configured, sync in background
  if (isNeonConfigured()) {
    Promise.all(cleaned.map((o) => saveNeonOrder(o))).catch((err) =>
      console.warn('Background Neon sync error:', err)
    );
  }
}

export function getStoreSettings(): StoreSettings {
  ensureDataDir();
  let currentSettings: Partial<StoreSettings> = {};
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      currentSettings = JSON.parse(data);
    }
  } catch (e) {
    console.warn('Fallback to in-memory settings', e);
  }

  const memorySettings = globalStore._regascoSettings || INITIAL_SETTINGS;
  const merged: StoreSettings = {
    ...INITIAL_SETTINGS,
    ...memorySettings,
    ...currentSettings,
    gcash: {
      ...INITIAL_SETTINGS.gcash,
      ...(memorySettings.gcash || {}),
      ...(currentSettings.gcash || {}),
    },
    mapSettings: {
      ...INITIAL_SETTINGS.mapSettings!,
      ...(memorySettings.mapSettings || {}),
      ...(currentSettings.mapSettings || {}),
    },
    adminCredentials: {
      ...INITIAL_SETTINGS.adminCredentials!,
      ...(memorySettings.adminCredentials || {}),
      ...(currentSettings.adminCredentials || {}),
    },
    banners: currentSettings.banners || memorySettings.banners || INITIAL_SETTINGS.banners,
    riders: currentSettings.riders || memorySettings.riders || INITIAL_SETTINGS.riders,
  };

  globalStore._regascoSettings = merged;
  return merged;
}

export function saveStoreSettings(settings: StoreSettings): void {
  globalStore._regascoSettings = settings;
  ensureDataDir();
  try {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not write to settings file', e);
  }
}

export function getProducts(): Product[] {
  ensureDataDir();
  try {
    if (fs.existsSync(PRODUCTS_FILE)) {
      const data = fs.readFileSync(PRODUCTS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Fallback to in-memory products', e);
  }
  return globalStore._regascoProducts || INITIAL_PRODUCTS;
}

export function saveProducts(products: Product[]): void {
  globalStore._regascoProducts = products;
  ensureDataDir();
  try {
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(products, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not write to products file', e);
  }
}

// Update live rider coordinates and telemetry
export function updateRiderTelemetry(
  riderId: string,
  coords: [number, number],
  orderId?: string,
  speed?: number,
  heading?: number
) {
  // Update order's rider coordinates if orderId is provided
  const orders = getOrders();
  if (orderId) {
    const orderIndex = orders.findIndex((o) => o.id === orderId || o.orderCode === orderId);
    if (orderIndex !== -1) {
      orders[orderIndex].riderCoordinates = coords;
      orders[orderIndex].updatedAt = new Date().toISOString();
      saveOrders(orders);
    }
  }

  // Update rider status in settings
  const settings = getStoreSettings();
  if (settings.riders) {
    const rider = settings.riders.find((r) => r.id === riderId);
    if (rider && orderId) {
      rider.status = 'ON_DELIVERY';
      saveStoreSettings(settings);
    }
  }

  // Log in Neon if configured
  if (isNeonConfigured()) {
    logRiderLocation({
      riderId,
      orderId,
      latitude: coords[0],
      longitude: coords[1],
      speed,
      heading,
    }).catch((err) => console.warn('Neon location log error:', err));
  }
}

// Extract customer directory from real orders
export function getCustomers(): import('@/types').CustomerSummary[] {
  const orders = getOrders();
  const customerMap = new Map<string, import('@/types').CustomerSummary>();

  for (const order of orders) {
    const phone = (order.customerPhone || '').trim();
    const key = phone || order.customerName.toLowerCase().trim();
    if (!key) continue;

    const existing = customerMap.get(key);
    const orderDate = order.createdAt;

    if (existing) {
      existing.totalOrders += 1;
      existing.totalSpent += Number(order.totalAmount || 0);
      if (new Date(orderDate) > new Date(existing.lastOrderDate)) {
        existing.lastOrderDate = orderDate;
        existing.address = order.location.address || existing.address;
        existing.landmark = order.location.landmark || existing.landmark;
        existing.preferredPaymentMethod = order.paymentMethod;
      }
    } else {
      customerMap.set(key, {
        id: `cust_${phone.replace(/\D/g, '') || Math.random().toString(36).substring(2, 7)}`,
        name: order.customerName,
        phone: order.customerPhone,
        address: order.location.address,
        landmark: order.location.landmark,
        totalOrders: 1,
        totalSpent: Number(order.totalAmount || 0),
        lastOrderDate: orderDate,
        preferredPaymentMethod: order.paymentMethod,
      });
    }
  }

  return Array.from(customerMap.values()).sort(
    (a, b) => new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime()
  );
}
