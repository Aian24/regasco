'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Product, CartItem, CylinderOption, StoreSettings } from '@/types';
import { INITIAL_SETTINGS } from '@/data/products';

interface CartContextType {
  cart: Record<string, CartItem>;
  cartItems: CartItem[];
  totalItemCount: number;
  subtotal: number;
  deliveryFee: number;
  grandTotal: number;
  addToCart: (product: Product, option: CylinderOption, quantity?: number) => void;
  updateQuantity: (productId: string, option: CylinderOption, quantity: number) => void;
  removeFromCart: (productId: string, option: CylinderOption) => void;
  clearCart: () => void;
  settings: StoreSettings;
  updateSettings: (newSettings: StoreSettings) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<Record<string, CartItem>>({});
  const [settings, setSettings] = useState<StoreSettings>(INITIAL_SETTINGS);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load cart from localStorage and settings from API
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('regasco_cart');
      if (savedCart) {
        setCart(JSON.parse(savedCart));
      }
    } catch (e) {
      console.warn('Could not read cart from localStorage');
    }

    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.settings) setSettings(data.settings);
        }
      } catch (err) {
        console.warn('Using default settings');
      }
    }

    fetchSettings();
    setIsInitialized(true);
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    if (isInitialized) {
      try {
        localStorage.setItem('regasco_cart', JSON.stringify(cart));
      } catch (e) {}
    }
  }, [cart, isInitialized]);

  const addToCart = (product: Product, option: CylinderOption, quantity = 1) => {
    const key = `${product.id}_${option}`;
    const unitPrice = option === 'REFILL' ? product.priceRefill : product.priceNewTank;

    setCart((prev) => {
      const currentQty = prev[key]?.quantity || 0;
      return {
        ...prev,
        [key]: {
          productId: product.id,
          productName: product.name,
          cylinderOption: option,
          unitPrice,
          quantity: currentQty + quantity,
          imageUrl: product.imageUrl,
          weightKg: product.weightKg,
        },
      };
    });
  };

  const updateQuantity = (productId: string, option: CylinderOption, quantity: number) => {
    const key = `${productId}_${option}`;
    setCart((prev) => {
      const updated = { ...prev };
      if (quantity <= 0) {
        delete updated[key];
      } else if (updated[key]) {
        updated[key] = {
          ...updated[key],
          quantity,
        };
      }
      return updated;
    });
  };

  const removeFromCart = (productId: string, option: CylinderOption) => {
    const key = `${productId}_${option}`;
    setCart((prev) => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const clearCart = () => {
    setCart({});
  };

  const updateSettings = (newSettings: StoreSettings) => {
    setSettings(newSettings);
  };

  const cartItems = Object.values(cart);
  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const deliveryFee =
    subtotal >= settings.freeDeliveryThreshold || totalItemCount === 0
      ? 0
      : settings.deliveryFee;
  const grandTotal = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItems,
        totalItemCount,
        subtotal,
        deliveryFee,
        grandTotal,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        settings,
        updateSettings,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
