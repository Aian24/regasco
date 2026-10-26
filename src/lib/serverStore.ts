import fs from 'fs';
import path from 'path';
import { Order, StoreSettings, Product } from '@/types';
import { INITIAL_PRODUCTS, INITIAL_SETTINGS } from '@/data/products';

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

// Global in-memory fallback for serverless environments (like Vercel)
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

if (!globalStore._regascoOrders) {
  globalStore._regascoOrders = [
    {
      id: 'demo-order-1',
      orderCode: 'REG-8821',
      customerName: 'Juan Dela Cruz',
      customerPhone: '0917-123-4567',
      location: {
        address: '142 Mindanao Avenue, Barangay Bahay Toro, Project 8, Quezon City',
        landmark: 'Near 7-Eleven, Green Gate',
        latitude: 14.6585,
        longitude: 121.0252,
      },
      items: [
        {
          productId: 'regasco-11kg',
          productName: 'Regasco 11 KG',
          cylinderOption: 'REFILL',
          unitPrice: 990,
          quantity: 1,
          imageUrl: '/images/regasco-11kg.jpg',
          weightKg: 11,
        },
      ],
      subtotal: 990,
      deliveryFee: 50,
      totalAmount: 1040,
      paymentMethod: 'GCASH_QR',
      paymentStatus: 'PENDING_VERIFICATION',
      paymentScreenshot: '/images/regasco-qr-gcash.jpg',
      paymentRefNumber: 'GCASH-991823712',
      orderStatus: 'PENDING_PAYMENT',
      notes: 'Please test valve upon delivery',
      createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    },
    {
      id: 'demo-order-2',
      orderCode: 'REG-8820',
      customerName: 'Maria Santos',
      customerPhone: '0918-987-6543',
      location: {
        address: '45 Sauyo Road, Novaliches, Quezon City',
        landmark: 'Near 7-Eleven store',
        latitude: 14.6975,
        longitude: 121.0421,
      },
      items: [
        {
          productId: 'regasco-sk',
          productName: 'Regasco Supreme Kalan (SK)',
          cylinderOption: 'NEW_TANK',
          unitPrice: 1450,
          quantity: 1,
          imageUrl: '/images/regasco-sk.jpg',
          weightKg: 2.7,
        },
      ],
      subtotal: 1450,
      deliveryFee: 50,
      totalAmount: 1500,
      paymentMethod: 'COD',
      paymentStatus: 'UNPAID',
      orderStatus: 'OUT_FOR_DELIVERY',
      notes: 'Call upon arrival',
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      updatedAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
  ];
}

export function getOrders(): Order[] {
  ensureDataDir();
  try {
    if (fs.existsSync(ORDERS_FILE)) {
      const data = fs.readFileSync(ORDERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.warn('Fallback to in-memory orders', e);
  }
  return globalStore._regascoOrders || [];
}

export function saveOrders(orders: Order[]): void {
  globalStore._regascoOrders = orders;
  ensureDataDir();
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not write to orders file (serverless mode)', e);
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

