export type OrderStatus =
  | 'PENDING_PAYMENT'    // Waiting for admin to verify screenshot
  | 'PAYMENT_VERIFIED'   // Admin verified screenshot
  | 'ORDER_CONFIRMED'    // COD confirmed or QR approved
  | 'PREPARING'          // Safety check & tank loaded
  | 'OUT_FOR_DELIVERY'   // Rider on the way
  | 'DELIVERED'          // Completed
  | 'CANCELLED';

export type PaymentMethod = 'COD' | 'GCASH_QR' | 'MAYA_QR';

export type CylinderOption = 'REFILL' | 'NEW_TANK';

export interface Product {
  id: string;
  name: string;
  weightKg: number;
  category: 'household' | 'commercial' | 'industrial' | 'portable';
  priceRefill: number;
  priceNewTank: number;
  imageUrl: string;
  description: string;
  badge?: string;
  isAvailable: boolean;
}

export interface CartItem {
  productId: string;
  productName: string;
  cylinderOption: CylinderOption;
  unitPrice: number;
  quantity: number;
  imageUrl: string;
  weightKg: number;
}

export interface DeliveryLocation {
  address: string;
  landmark?: string;
  latitude: number;
  longitude: number;
}

export interface Order {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone: string;
  location: DeliveryLocation;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: 'UNPAID' | 'PENDING_VERIFICATION' | 'PAID' | 'REJECTED';
  paymentScreenshot?: string; // base64 or cloud URL
  paymentRefNumber?: string;
  orderStatus: OrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  landmark?: string;
  latitude: number;
  longitude: number;
}

export interface StoreSettings {
  storeName: string;
  branchName: string;
  address: string;
  phoneHotline: string;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  isStoreOpen: boolean;
  operatingHours: string;
  gcash: {
    accountName: string;
    accountNumber: string;
    qrImageUrl: string;
    isEnabled: boolean;
  };
  codEnabled: boolean;
}
