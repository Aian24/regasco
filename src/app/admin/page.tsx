'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Flame,
  Store,
  QrCode,
  Truck,
  CheckCircle2,
  Clock,
  Banknote,
  Search,
  Filter,
  Eye,
  Check,
  X,
  Upload,
  PhoneCall,
  MapPin,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Save,
  Lock,
  DollarSign,
  Package,
} from 'lucide-react';
import { Order, OrderStatus, StoreSettings, Product } from '@/types';

export default function AdminPage() {
  // Simple PIN gate (default 1234)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  // Data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'settings' | 'products'>('orders');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Screenshot inspection modal
  const [selectedOrderForScreenshot, setSelectedOrderForScreenshot] = useState<Order | null>(null);

  // Settings form states
  const [qrUploadLoading, setQrUploadLoading] = useState(false);
  const [saveSettingsSuccess, setSaveSettingsSuccess] = useState(false);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check session authentication
    const authed = sessionStorage.getItem('regasco_admin_authed');
    if (authed === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === '1234' || pinInput === 'admin') {
      setIsAuthenticated(true);
      sessionStorage.setItem('regasco_admin_authed', 'true');
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const fetchData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [ordersRes, settingsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/settings'),
      ]);

      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setOrders(oData.orders || []);
      }

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setSettings(sData.settings);
        setProducts(sData.products || []);
      }
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setIsLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const interval = setInterval(() => {
        fetchData();
      }, 10000); // 10s live poll for new orders
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Update order status action
  const handleUpdateOrderStatus = async (
    orderId: string,
    orderStatus?: OrderStatus,
    paymentStatus?: 'UNPAID' | 'PENDING_VERIFICATION' | 'PAID' | 'REJECTED'
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus, paymentStatus }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local state
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? data.order : o))
        );
        if (selectedOrderForScreenshot?.id === orderId) {
          setSelectedOrderForScreenshot(data.order);
        }
      }
    } catch (err) {
      alert('Failed to update status');
    }
  };

  // Upload new store QR Code
  const handleQrUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !settings) return;

    setQrUploadLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.url) {
        const updatedSettings: StoreSettings = {
          ...settings,
          gcash: {
            ...settings.gcash,
            qrImageUrl: data.url,
          },
        };
        setSettings(updatedSettings);
        // Persist to backend
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ settings: updatedSettings }),
        });
      }
    } catch (err) {
      alert('Failed to upload QR code');
    } finally {
      setQrUploadLoading(false);
    }
  };

  // Save general store settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings, products }),
      });

      if (res.ok) {
        setSaveSettingsSuccess(true);
        setTimeout(() => setSaveSettingsSuccess(false), 3000);
      }
    } catch (err) {
      alert('Failed to save settings');
    }
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesFilter =
      statusFilter === 'ALL' ||
      (statusFilter === 'PENDING_PAYMENT' && o.orderStatus === 'PENDING_PAYMENT') ||
      (statusFilter === 'OUT_FOR_DELIVERY' && o.orderStatus === 'OUT_FOR_DELIVERY') ||
      (statusFilter === 'DELIVERED' && o.orderStatus === 'DELIVERED') ||
      (statusFilter === 'COD' && o.paymentMethod === 'COD');

    const matchesSearch =
      o.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerPhone.includes(searchQuery);

    return matchesFilter && matchesSearch;
  });

  // Calculate quick metrics
  const totalOrdersCount = orders.length;
  const pendingPaymentCount = orders.filter(
    (o) => o.orderStatus === 'PENDING_PAYMENT'
  ).length;
  const outForDeliveryCount = orders.filter(
    (o) => o.orderStatus === 'OUT_FOR_DELIVERY'
  ).length;
  const totalSalesRevenue = orders
    .filter((o) => o.orderStatus === 'DELIVERED' || o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  // If not authenticated, show PIN gate
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="max-w-sm w-full bg-slate-800 rounded-3xl p-6 border border-slate-700 shadow-2xl text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-orange-600/30">
            <Lock className="w-6 h-6" />
          </div>

          <div>
            <h1 className="text-xl font-black text-white">Owner Admin Portal</h1>
            <p className="text-xs text-slate-400 mt-1">
              Regasco Mindanao Ave. Store Management
            </p>
          </div>

          <form onSubmit={handlePinSubmit} className="space-y-3">
            <div>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="Enter Admin PIN (Default: 1234)"
                className="w-full text-center tracking-widest text-lg font-mono py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 outline-none focus:border-orange-500"
              />
              {pinError && (
                <p className="text-xs text-red-400 mt-1">Incorrect PIN. Try 1234</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md transition"
            >
              Access Dashboard
            </button>
          </form>

          <div className="pt-2">
            <Link href="/" className="text-xs text-slate-500 hover:text-white underline">
              Return to Customer Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col pb-16">
      {/* Admin Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900 text-white border-b border-slate-800 px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white font-bold">
              <Store className="w-4 h-4" />
            </div>
            <div>
              <span className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
                REGASCO <span className="text-orange-400 text-xs font-semibold">Store Manager</span>
              </span>
              <p className="text-[10px] text-slate-400">Mindanao Ave. Dispatch Hub</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchData(true)}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Refresh Orders"
            >
              <RefreshCw
                className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`}
              />
            </button>

            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Customer View</span>
            </Link>

            <button
              onClick={() => {
                sessionStorage.removeItem('regasco_admin_authed');
                setIsAuthenticated(false);
              }}
              className="text-xs text-slate-400 hover:text-red-400 underline"
            >
              Lock
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 space-y-6 flex-1">
        {/* KPI Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Total Orders
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-slate-900">
                {totalOrdersCount}
              </span>
              <Package className="w-5 h-5 text-slate-400" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/30 shadow-xs">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
              Needs QR Verification
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-amber-600">
                {pendingPaymentCount}
              </span>
              <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/30 shadow-xs">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
              Out for Delivery
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-blue-600">
                {outForDeliveryCount}
              </span>
              <Truck className="w-5 h-5 text-blue-500" />
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
              Total Revenue
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black text-emerald-600">
                ₱{totalSalesRevenue.toLocaleString()}
              </span>
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'orders'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            Orders List ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
              activeTab === 'settings'
                ? 'bg-orange-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-200'
            }`}
          >
            Store QR & Pricing Settings
          </button>
        </div>

        {/* TAB 1: ORDERS MANAGEMENT */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* Filter & Search Bar */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search */}
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Order #, customer, or phone..."
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-orange-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              {/* Status pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {[
                  { key: 'ALL', label: 'All' },
                  { key: 'PENDING_PAYMENT', label: 'Needs Verification' },
                  { key: 'OUT_FOR_DELIVERY', label: 'In Transit' },
                  { key: 'DELIVERED', label: 'Completed' },
                  { key: 'COD', label: 'COD Orders' },
                ].map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setStatusFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition ${
                      statusFilter === f.key
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Table / Cards */}
            <div className="space-y-3">
              {filteredOrders.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 text-slate-400 text-xs">
                  No orders match your filter criteria.
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 transition-all space-y-3"
                  >
                    {/* Order header row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                          {order.orderCode}
                        </span>
                        <span className="text-xs text-slate-400">
                          {new Date(order.createdAt).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2">
                        {/* Payment Type */}
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 ${
                            order.paymentMethod === 'COD'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {order.paymentMethod === 'COD' ? 'COD' : 'GCash QR'}
                        </span>

                        {/* Order Status */}
                        <span
                          className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md ${
                            order.orderStatus === 'PENDING_PAYMENT'
                              ? 'bg-amber-100 text-amber-800'
                              : order.orderStatus === 'OUT_FOR_DELIVERY'
                              ? 'bg-blue-600 text-white'
                              : order.orderStatus === 'DELIVERED'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {order.orderStatus.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Middle details: Customer, Pinned Map, Items */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* Customer Info */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          Customer
                        </span>
                        <p className="font-bold text-slate-900 text-sm mt-0.5">
                          {order.customerName}
                        </p>
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="text-orange-600 font-semibold flex items-center gap-1 mt-1 hover:underline"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>{order.customerPhone}</span>
                        </a>
                      </div>

                      {/* Pinned Delivery Location */}
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          Delivery Location
                        </span>
                        <p className="text-slate-800 mt-0.5 font-medium leading-relaxed">
                          {order.location.address}
                        </p>
                        {order.location.landmark && (
                          <p className="text-[11px] text-slate-500 italic">
                            Note: {order.location.landmark}
                          </p>
                        )}
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${order.location.latitude},${order.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 text-[11px] font-semibold flex items-center gap-1 mt-1 hover:underline"
                        >
                          <MapPin className="w-3 h-3" /> Open in Google Maps
                        </a>
                      </div>

                      {/* Items & Total */}
                      <div className="md:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase block">
                          Ordered Items
                        </span>
                        <div className="mt-0.5 space-y-0.5">
                          {order.items.map((item, idx) => (
                            <p key={idx} className="font-semibold text-slate-800">
                              {item.quantity}x {item.productName} ({item.cylinderOption === 'REFILL' ? 'Refill' : 'New Tank'})
                            </p>
                          ))}
                        </div>
                        <p className="text-base font-black text-orange-600 mt-1">
                          ₱{order.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Action Bar (Verify Screenshot, Dispatch, Mark Done) */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      {/* Payment Screenshot Button */}
                      <div>
                        {order.paymentScreenshot ? (
                          <button
                            type="button"
                            onClick={() => setSelectedOrderForScreenshot(order)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>
                              View Payment Screenshot
                              {order.paymentStatus === 'PAID' && (
                                <Check className="w-3 h-3 text-emerald-600 inline ml-1" />
                              )}
                            </span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">
                            No screenshot (COD Order)
                          </span>
                        )}
                      </div>

                      {/* Quick Status Changers */}
                      <div className="flex items-center gap-1.5">
                        {order.orderStatus === 'PENDING_PAYMENT' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateOrderStatus(
                                order.id,
                                'ORDER_CONFIRMED',
                                'PAID'
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
                          >
                            Verify & Confirm
                          </button>
                        )}

                        {order.orderStatus !== 'OUT_FOR_DELIVERY' &&
                          order.orderStatus !== 'DELIVERED' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateOrderStatus(
                                  order.id,
                                  'OUT_FOR_DELIVERY'
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1"
                            >
                              <Truck className="w-3.5 h-3.5" />
                              <span>Dispatch Rider</span>
                            </button>
                          )}

                        {order.orderStatus === 'OUT_FOR_DELIVERY' && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateOrderStatus(
                                order.id,
                                'DELIVERED',
                                'PAID'
                              )
                            }
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Mark Delivered</span>
                          </button>
                        )}

                        <Link
                          href={`/track/${order.orderCode}`}
                          target="_blank"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold"
                        >
                          Track
                        </Link>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: STORE SETTINGS & QR CODE UPLOADER */}
        {activeTab === 'settings' && settings && (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            {saveSettingsSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Store settings saved successfully!</span>
              </div>
            )}

            {/* QR Code Upload Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <QrCode className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Store GCash / Maya QR Code
                  </h3>
                  <p className="text-xs text-slate-500">
                    Upload your store's QR code. Customers scan this when paying.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                {/* QR Preview */}
                <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-2xl border border-slate-200">
                  <div className="relative w-48 h-48 rounded-xl overflow-hidden border bg-white shadow-sm">
                    <Image
                      src={settings.gcash.qrImageUrl}
                      alt="Store QR Code"
                      fill
                      className="object-contain p-2"
                    />
                  </div>
                  <span className="text-[11px] text-slate-500 mt-2">
                    Current Active Store QR
                  </span>
                </div>

                {/* Upload Controls */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Upload New QR Image
                    </label>
                    <input
                      type="file"
                      ref={qrFileInputRef}
                      accept="image/*"
                      onChange={handleQrUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={qrUploadLoading}
                      onClick={() => qrFileInputRef.current?.click()}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 font-bold text-xs transition disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      <span>
                        {qrUploadLoading ? 'Uploading...' : 'Choose QR Image from Device'}
                      </span>
                    </button>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Accepts JPG, PNG screenshots of your GCash QR stand
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      GCash Account Name
                    </label>
                    <input
                      type="text"
                      value={settings.gcash.accountName}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          gcash: { ...settings.gcash, accountName: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      GCash Mobile Number
                    </label>
                    <input
                      type="text"
                      value={settings.gcash.accountNumber}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          gcash: { ...settings.gcash, accountNumber: e.target.value },
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* General Delivery & Hotline Settings */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center gap-2 border-b pb-3">
                <Store className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">
                    Branch & Delivery Fees
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update phone hotlines and delivery rates
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Store Phone Hotline
                  </label>
                  <input
                    type="text"
                    value={settings.phoneHotline}
                    onChange={(e) =>
                      setSettings({ ...settings, phoneHotline: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Standard Delivery Fee (₱)
                  </label>
                  <input
                    type="number"
                    value={settings.deliveryFee}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        deliveryFee: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 outline-none"
                  />
                </div>
              </div>

              {/* Product Pricing Controls */}
              <div className="pt-3 border-t">
                <h4 className="font-bold text-xs text-slate-700 mb-2">
                  Cylinder Prices (Mindanao Ave. Branch)
                </h4>
                <div className="space-y-2">
                  {products.map((p, idx) => (
                    <div
                      key={p.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs"
                    >
                      <span className="font-bold text-slate-900 w-44">
                        {p.name}
                      </span>
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-[10px] text-slate-500 block">
                            Refill Price (₱)
                          </span>
                          <input
                            type="number"
                            value={p.priceRefill}
                            onChange={(e) => {
                              const updated = [...products];
                              updated[idx].priceRefill = Number(e.target.value);
                              setProducts(updated);
                            }}
                            className="w-24 px-2 py-1 rounded border border-slate-300 bg-white font-bold"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">
                            New Tank Price (₱)
                          </span>
                          <input
                            type="number"
                            value={p.priceNewTank}
                            onChange={(e) => {
                              const updated = [...products];
                              updated[idx].priceNewTank = Number(e.target.value);
                              setProducts(updated);
                            }}
                            className="w-24 px-2 py-1 rounded border border-slate-300 bg-white font-bold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Store Settings & Prices</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* MODAL: Zoomed Customer Payment Screenshot Inspection */}
        {selectedOrderForScreenshot && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 relative shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <button
                onClick={() => setSelectedOrderForScreenshot(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Inspect Payment Screenshot
                  </h3>
                  <p className="text-xs text-slate-500">
                    Order {selectedOrderForScreenshot.orderCode} • {selectedOrderForScreenshot.customerName}
                  </p>
                </div>
                <span className="font-black text-orange-600 text-lg">
                  ₱{selectedOrderForScreenshot.totalAmount.toLocaleString()}
                </span>
              </div>

              {/* Full Screenshot View */}
              <div className="relative w-full h-80 rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 flex items-center justify-center">
                {selectedOrderForScreenshot.paymentScreenshot ? (
                  <Image
                    src={selectedOrderForScreenshot.paymentScreenshot}
                    alt="Customer GCash Receipt"
                    fill
                    className="object-contain"
                  />
                ) : (
                  <p className="text-slate-400 text-xs">No screenshot available</p>
                )}
              </div>

              {selectedOrderForScreenshot.paymentRefNumber && (
                <div className="p-2.5 bg-slate-50 rounded-xl border text-xs flex items-center justify-between">
                  <span className="text-slate-500">Customer Reference #:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedOrderForScreenshot.paymentRefNumber}
                  </span>
                </div>
              )}

              {/* Verification Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateOrderStatus(
                      selectedOrderForScreenshot.id,
                      'ORDER_CONFIRMED',
                      'PAID'
                    );
                    setSelectedOrderForScreenshot(null);
                  }}
                  className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Approve & Confirm</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleUpdateOrderStatus(
                      selectedOrderForScreenshot.id,
                      'PENDING_PAYMENT',
                      'REJECTED'
                    );
                    setSelectedOrderForScreenshot(null);
                  }}
                  className="py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Reject Screenshot</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
