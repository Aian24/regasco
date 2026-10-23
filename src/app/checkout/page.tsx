'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import LocationPicker from '@/components/LocationPicker';
import PaymentSection from '@/components/PaymentSection';
import { DeliveryLocation, PaymentMethod } from '@/types';
import {
  ArrowLeft,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  MapPin,
  Banknote,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Truck,
  ArrowRight,
  User,
  Phone,
  Edit3,
  Flame,
  PhoneCall,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { INITIAL_PRODUCTS } from '@/data/products';

export default function BasketCheckoutPage() {
  const router = useRouter();
  const {
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
  } = useCart();

  const { user, openAuthModal, updateAddress } = useAuth();

  // Address and Contact from User Profile
  const [customerName, setCustomerName] = useState(user?.name || 'Juan Dela Cruz');
  const [customerPhone, setCustomerPhone] = useState(user?.phone || '0917-882-4242');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [location, setLocation] = useState<DeliveryLocation>({
    address: user?.address || '142 Mindanao Avenue, Barangay Bahay Toro, Project 8, Quezon City',
    landmark: user?.landmark || 'Near 7-Eleven, Green Gate',
    latitude: user?.latitude || 14.6585,
    longitude: user?.longitude || 121.0252,
  });

  // Keep synced with auth profile changes
  useEffect(() => {
    if (user) {
      setCustomerName(user.name);
      setCustomerPhone(user.phone);
      setLocation({
        address: user.address,
        landmark: user.landmark || '',
        latitude: user.latitude || 14.6585,
        longitude: user.longitude || 121.0252,
      });
    }
  }, [user]);

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('COD');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [refNumber, setRefNumber] = useState('');
  const [notes, setNotes] = useState('');

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // If basket is empty
  if (totalItemCount === 0) {
    return (
      <div className="min-h-screen bg-slate-100/70 flex flex-col">
        {/* Modern Interactive Checkout Navbar */}
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 text-xs font-bold transition border border-slate-200 group"
              >
                <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>Store</span>
              </Link>
              <Link href="/" className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25">
                  <Flame className="w-5 h-5 fill-white stroke-orange-200" />
                </div>
                <span className="text-xl font-black tracking-tight text-blue-900">
                  REGASCO
                </span>
              </Link>
            </div>
            <button
              type="button"
              onClick={openAuthModal}
              className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 flex items-center justify-center transition shadow-xs"
            >
              <User className="w-5 h-5 text-slate-700" />
            </button>
          </div>
        </header>

        <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 flex-1">
          {/* Empty Basket Hero Card */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 text-center border border-slate-200/90 shadow-sm space-y-4 max-w-xl mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-orange-100 to-amber-100 text-orange-600 flex items-center justify-center mx-auto shadow-inner border border-orange-200/60">
              <ShoppingBag className="w-10 h-10" />
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Your Basket is Empty</h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
                Looks like you haven't added any Regasco cooking gas cylinders yet. Choose a refill or new tank below to get started.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-orange-600/30 transition cursor-pointer"
              >
                <Flame className="w-4 h-4" />
                <span>Browse Full Store Catalog</span>
              </Link>
              <Link
                href="/track"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 font-extrabold text-xs transition border border-slate-200 cursor-pointer"
              >
                <span>View Order History</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Quick Add Suggestions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-600 fill-orange-500" />
                  <span>Popular Cooking Gas Tanks (Mindanao Ave.)</span>
                </h2>
                <p className="text-xs text-slate-500">Quickly add to your basket with 1 click</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {INITIAL_PRODUCTS.slice(0, 3).map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white rounded-3xl border border-slate-200/90 p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="relative w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden shrink-0 p-1">
                      <Image
                        src={prod.imageUrl}
                        alt={prod.name}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                        {prod.weightKg} KG
                      </span>
                      <h3 className="font-extrabold text-slate-900 text-sm mt-1 leading-snug">
                        {prod.name}
                      </h3>
                      <p className="text-xs font-black text-slate-900 mt-0.5">
                        ₱{prod.priceRefill.toLocaleString()} <span className="text-[10px] text-slate-400 font-normal">refill</span>
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => addToCart(prod, 'REFILL', 1)}
                    className="w-full py-2.5 px-3 rounded-2xl bg-orange-50 hover:bg-orange-600 hover:text-white text-orange-600 font-black text-xs transition active:scale-95 flex items-center justify-center gap-1.5 border border-orange-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add Refill to Basket</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!customerName.trim()) {
      setErrorMessage('Please enter recipient full name.');
      return;
    }

    if (!customerPhone.trim() || customerPhone.length < 10) {
      setErrorMessage('Please enter an active Philippine mobile number.');
      return;
    }

    if (!location.address.trim()) {
      setErrorMessage('Please confirm your delivery address.');
      return;
    }

    if (paymentMethod === 'GCASH_QR' && !screenshot) {
      setErrorMessage('Please upload a screenshot of your GCash payment receipt.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save address back to user profile for future orders
      updateAddress(location.address, location.landmark, location.latitude, location.longitude);

      const orderPayload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        location,
        items: cartItems,
        paymentMethod,
        paymentScreenshot: screenshot || undefined,
        paymentRefNumber: refNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderPayload),
      });

      const data = await res.json();

      if (res.ok && data.order) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#FF5A00', '#004B93', '#FFB800'],
        });

        // Save order to device history & Shopee-style order hub
        try {
          const userSaved = localStorage.getItem('regasco_user_orders');
          const userOrders = userSaved ? JSON.parse(userSaved) : [];
          const updatedUserOrders = [
            data.order,
            ...userOrders.filter((o: any) => o.id !== data.order.id && o.orderCode !== data.order.orderCode),
          ];
          localStorage.setItem('regasco_user_orders', JSON.stringify(updatedUserOrders));

          const saved = localStorage.getItem('regasco_recent_orders');
          const recents = saved ? JSON.parse(saved) : [];
          const updated = [
            {
              id: data.order.orderCode,
              code: data.order.orderCode,
              date: new Date().toISOString(),
              createdAt: data.order.createdAt,
              total: data.order.totalAmount,
              status: data.order.orderStatus,
            },
            ...recents.filter((o: any) => o.code !== data.order.orderCode && o.id !== data.order.orderCode),
          ].slice(0, 10);
          localStorage.setItem('regasco_recent_orders', JSON.stringify(updated));
        } catch (e) {}

        clearCart();
        router.push(`/track/${data.order.orderCode}`);
      } else {
        setErrorMessage(data.error || 'Failed to submit order. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      setErrorMessage('Network connection error. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 pb-28">
      {/* Modern Interactive Checkout Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Back & Brand */}
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 text-xs font-bold transition border border-slate-200 group"
              title="Back to Storefront"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline">Store</span>
            </Link>

            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25 group-hover:scale-105 transition-all">
                <Flame className="w-5 h-5 fill-white stroke-orange-200" />
              </div>
              <span className="text-xl font-black tracking-tight text-blue-900 group-hover:text-orange-600 transition-colors">
                REGASCO
              </span>
            </Link>
          </div>

          {/* Center: Checkout Title */}
          <div className="text-center hidden sm:block">
            <h1 className="text-sm font-black text-slate-900 tracking-tight">
              Order Basket & Checkout
            </h1>
            <p className="text-[11px] text-slate-400 font-semibold">
              Mindanao Ave. Fast Delivery Hub
            </p>
          </div>

          {/* Right: Hotline, Cart Badge, Profile */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Hotline */}
            <a
              href={`tel:${settings.phoneHotline.split('/')[0].trim()}`}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 text-xs font-bold text-slate-700 hover:text-orange-600 transition"
              title="Call Mindanao Ave. Branch"
            >
              <PhoneCall className="w-3.5 h-3.5 text-orange-600" />
              <span>{settings.phoneHotline.split('/')[0].trim()}</span>
            </a>

            {/* Cart Icon Badge (Count Only) */}
            <div
              className="relative w-10 h-10 rounded-full bg-gradient-to-r from-orange-600 to-red-600 text-white flex items-center justify-center shadow-md shadow-orange-600/30"
              title="Items in Basket"
            >
              <ShoppingBag className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-slate-950 text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs">
                {totalItemCount}
              </span>
            </div>

            {/* Profile Icon Button */}
            <button
              type="button"
              onClick={openAuthModal}
              className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 flex items-center justify-center transition shadow-xs hover:border-orange-300"
              title={user ? `Profile: ${user.name}` : 'Sign In / Profile'}
              aria-label="User Profile"
            >
              <User className="w-5 h-5 text-slate-700 hover:text-orange-600 transition-colors" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2 shadow-xs">
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} className="space-y-6">
          {/* SECTION 1: CONFIRMED DELIVERY ADDRESS (Shopee / Lazada / Grab style) */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center">
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-black text-slate-900 text-base">
                      Confirmed Delivery Address
                    </h2>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Default Address
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Saved from your customer profile settings
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingAddress(!isEditingAddress)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold transition border border-orange-200"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditingAddress ? 'Done Editing' : 'Change / Pin on Map'}</span>
              </button>
            </div>

            {/* Confirmed Address Summary Card */}
            {!isEditingAddress ? (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <p className="font-extrabold text-slate-900 text-sm">
                    {customerName}
                  </p>
                  <span className="font-mono text-slate-600 font-bold">
                    {customerPhone}
                  </span>
                </div>
                <p className="text-slate-700 font-medium leading-relaxed">
                  {location.address}
                </p>
                {location.landmark && (
                  <p className="text-[11px] text-slate-500">
                    <strong className="text-slate-600">Landmark:</strong> {location.landmark}
                  </p>
                )}
                <div className="pt-1 text-[10px] text-slate-400">
                  Mindanao Ave. Hub Coordinates: {location.latitude.toFixed(4)}, {location.longitude.toFixed(4)}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Recipient Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cellphone Number
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Interactive Leaflet Map for pinpointing */}
                <LocationPicker location={location} onChange={setLocation} />
              </div>
            )}
          </div>

          {/* SECTION 2: BASKET ITEMS */}
          <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-600" />
                <h2 className="font-black text-slate-900 text-base">
                  Basket Items
                </h2>
              </div>
              <Link
                href="/"
                className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add more tanks
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {cartItems.map((item) => (
                <div
                  key={`${item.productId}_${item.cylinderOption}`}
                  className="py-3.5 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 p-1 shrink-0 overflow-hidden">
                      <Image
                        src={item.imageUrl}
                        alt={item.productName}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-sm">
                        {item.productName}
                      </h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-800">
                          {item.cylinderOption === 'REFILL' ? 'Refill (Empty Tank Swap)' : 'New Tank Package'}
                        </span>
                        <span className="text-xs font-bold text-slate-700">
                          ₱{item.unitPrice.toLocaleString()} each
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quantity Stepper & Remove */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.cylinderOption,
                            item.quantity - 1
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-white hover:bg-slate-200 text-slate-700 flex items-center justify-center transition shadow-xs"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-black text-slate-900">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateQuantity(
                            item.productId,
                            item.cylinderOption,
                            item.quantity + 1
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-orange-600 hover:bg-orange-700 text-white flex items-center justify-center transition shadow-xs"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeFromCart(item.productId, item.cylinderOption)
                      }
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: PAYMENT METHOD (COD or Owner QR Upload) */}
          <PaymentSection
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
            screenshot={screenshot}
            onScreenshotChange={setScreenshot}
            refNumber={refNumber}
            onRefNumberChange={setRefNumber}
            totalAmount={grandTotal}
            settings={settings}
          />

          {/* SECTION 4: PAYMENT BREAKDOWN (Shopee / Foodpanda / Grab receipt) */}
          <div className="bg-gradient-to-br from-slate-900 to-blue-950 rounded-3xl p-6 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-black text-base flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-400" />
                Payment Breakdown
              </span>
              <span className="text-xs text-white/70">
                Mindanao Ave. QC Hub
              </span>
            </div>

            <div className="space-y-2 text-xs text-white/80">
              <div className="flex justify-between">
                <span>Items Subtotal ({totalItemCount} cylinders)</span>
                <span className="font-bold text-white">₱{subtotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between">
                <span>Doorstep Delivery Fee</span>
                <span className="font-bold text-white">
                  {deliveryFee === 0 ? (
                    <span className="text-emerald-400 font-extrabold">FREE DELIVERY</span>
                  ) : (
                    `₱${deliveryFee.toLocaleString()}`
                  )}
                </span>
              </div>

              <div className="flex justify-between pt-3 border-t border-white/10 text-lg font-black text-white">
                <span>Total Amount</span>
                <span className="text-orange-400 text-xl font-black">
                  ₱{grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 active:scale-[0.99] text-white font-black text-base shadow-xl shadow-orange-500/40 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>
                {isSubmitting
                  ? 'Placing Order...'
                  : `Place Order Now • ₱${grandTotal.toLocaleString()}`}
              </span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-white/60 pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>100% Genuine Calibrated Regasco Cylinder & Valve Leak Test</span>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
