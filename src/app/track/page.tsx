'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Package,
  Clock,
  ArrowRight,
  Flame,
  Search,
  ChevronRight,
  CheckCircle2,
  Truck,
  RotateCcw,
  ShoppingBag,
  ExternalLink,
  ShieldCheck,
  MapPin,
  BadgeAlert,
  Calendar,
} from 'lucide-react';
import Header from '@/components/Header';
import { useCart } from '@/context/CartContext';
import { Order, OrderStatus } from '@/types';
import { INITIAL_PRODUCTS } from '@/data/products';

type OrderTab = 'ALL' | 'TO_PAY' | 'TO_RECEIVE' | 'COMPLETED' | 'CANCELLED';

export default function ShopeeOrdersHubPage() {
  const router = useRouter();
  const { settings, addToCart } = useCart();

  const [activeTab, setActiveTab] = useState<OrderTab>('ALL');
  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadOrders = async () => {
    setIsLoading(true);
    let loaded: Order[] = [];

    // 1. Fetch from server API
    try {
      const res = await fetch('/api/orders');
      if (res.ok) {
        const data = await res.json();
        if (data.orders && Array.isArray(data.orders)) {
          loaded = data.orders;
        }
      }
    } catch (e) {}

    // 2. Merge with local storage orders
    try {
      const local = localStorage.getItem('regasco_user_orders');
      if (local) {
        const localOrders: Order[] = JSON.parse(local);
        localOrders.forEach((lo) => {
          if (!loaded.some((o) => o.id === lo.id || o.orderCode === lo.orderCode)) {
            loaded.push(lo);
          }
        });
      }
    } catch (e) {}

    // Sort latest first
    loaded.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    setOrders(loaded);
    setIsLoading(false);
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Filter orders by Shopee-style tabs
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      searchQuery === '' ||
      order.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.items.some((item) => item.productName.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (activeTab === 'ALL') return true;
    if (activeTab === 'TO_PAY') return order.orderStatus === 'PENDING_PAYMENT';
    if (activeTab === 'TO_RECEIVE') {
      return (
        order.orderStatus === 'PAYMENT_VERIFIED' ||
        order.orderStatus === 'ORDER_CONFIRMED' ||
        order.orderStatus === 'PREPARING' ||
        order.orderStatus === 'OUT_FOR_DELIVERY'
      );
    }
    if (activeTab === 'COMPLETED') return order.orderStatus === 'DELIVERED';
    if (activeTab === 'CANCELLED') return order.orderStatus === 'CANCELLED';

    return true;
  });

  // Calculate tab counts
  const countToPay = orders.filter((o) => o.orderStatus === 'PENDING_PAYMENT').length;
  const countToReceive = orders.filter((o) =>
    ['PAYMENT_VERIFIED', 'ORDER_CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)
  ).length;
  const countCompleted = orders.filter((o) => o.orderStatus === 'DELIVERED').length;

  const handleOrderAgain = (order: Order) => {
    order.items.forEach((item) => {
      const matchingProduct = INITIAL_PRODUCTS.find((p) => p.id === item.productId) || {
        id: item.productId,
        name: item.productName,
        weightKg: item.weightKg || 11,
        category: 'household',
        priceRefill: item.unitPrice,
        priceNewTank: item.unitPrice * 2,
        imageUrl: item.imageUrl || '/images/regasco-11kg.jpg',
        description: 'Authentic Regasco cooking gas cylinder.',
        isAvailable: true,
      };
      addToCart(matchingProduct, item.cylinderOption, item.quantity);
    });
    router.push('/checkout');
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'PENDING_PAYMENT':
        return {
          label: 'To Pay / Verifying GCash',
          color: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      case 'PAYMENT_VERIFIED':
        return {
          label: 'Payment Verified',
          color: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'ORDER_CONFIRMED':
        return {
          label: 'Order Confirmed',
          color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        };
      case 'PREPARING':
        return {
          label: 'Safety Inspection',
          color: 'bg-purple-100 text-purple-800 border-purple-200',
        };
      case 'OUT_FOR_DELIVERY':
        return {
          label: 'Rider on the Way',
          color: 'bg-orange-100 text-orange-700 border-orange-300 font-black animate-pulse',
        };
      case 'DELIVERED':
        return {
          label: 'Completed & Delivered',
          color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        };
      case 'CANCELLED':
        return {
          label: 'Cancelled',
          color: 'bg-red-100 text-red-800 border-red-200',
        };
      default:
        return {
          label: status,
          color: 'bg-slate-100 text-slate-800 border-slate-200',
        };
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col pb-28">
      <Header maxWidth="max-w-5xl" phoneHotline={settings.phoneHotline} />

      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 flex-1">
        {/* Page Title & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <Package className="w-7 h-7 text-orange-600" />
              <span>My Cooking Gas Orders</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track live deliveries, review past receipts, or re-order in 1 click
            </p>
          </div>

          {/* Quick search input */}
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by order # or cylinder..."
              className="w-full pl-9 pr-3 py-2 rounded-2xl bg-white border border-slate-200 text-xs text-slate-900 outline-none focus:border-orange-500 shadow-xs"
            />
          </div>
        </div>

        {/* Shopee-style Horizontal Status Tabs */}
        <div className="bg-white rounded-2xl p-1.5 border border-slate-200 shadow-xs flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'ALL', label: 'All Orders', count: orders.length },
            { id: 'TO_PAY', label: 'To Pay / Verify', count: countToPay },
            { id: 'TO_RECEIVE', label: 'To Receive', count: countToReceive },
            { id: 'COMPLETED', label: 'Completed', count: countCompleted },
            { id: 'CANCELLED', label: 'Cancelled', count: 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as OrderTab)}
              className={`flex-1 min-w-[100px] py-2 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="bg-white rounded-3xl p-12 text-center space-y-3 border border-slate-200">
              <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-600">Loading your orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-dashed border-slate-300 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-7 h-7" />
              </div>
              <h3 className="text-base font-black text-slate-800">No orders found in this tab</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {activeTab === 'ALL'
                  ? "You haven't placed any Regasco cooking gas orders yet. Order now for same-day delivery!"
                  : `There are currently no orders under "${activeTab.replace(/_/g, ' ')}".`}
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-black shadow-md shadow-orange-600/30 transition"
              >
                <span>Order Cooking Gas Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            filteredOrders.map((order) => {
              const badge = getStatusBadge(order.orderStatus);
              const isLive = ['PENDING_PAYMENT', 'PAYMENT_VERIFIED', 'ORDER_CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(
                order.orderStatus
              );

              return (
                <div
                  key={order.id || order.orderCode}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden hover:border-orange-300 transition-all"
                >
                  {/* Card Header: Storefront Brand & Status Badge */}
                  <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/50">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-orange-500 text-white flex items-center justify-center">
                        <Flame className="w-4 h-4" />
                      </div>
                      <span className="font-extrabold text-xs text-slate-900">
                        REGASCO Mindanao Ave. Branch
                      </span>
                    </div>

                    <span
                      className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${badge.color}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Card Body: Ordered Cylinder Items */}
                  <div className="p-4 divide-y divide-slate-100">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-14 bg-slate-50 rounded-xl overflow-hidden shrink-0 border border-slate-100 p-1">
                            <Image
                              src={item.imageUrl || '/images/regasco-11kg.jpg'}
                              alt={item.productName}
                              fill
                              className="object-contain"
                            />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-slate-900">{item.productName}</h4>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-orange-50 text-orange-700 border border-orange-200">
                                {item.cylinderOption === 'REFILL' ? 'Refill (Empty Swap)' : 'New Tank Package'}
                              </span>
                              <span className="text-[11px] text-slate-500 font-semibold">
                                x{item.quantity}
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="text-xs font-black text-slate-900">
                          ₱{(item.unitPrice * item.quantity).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Delivery Location Preview */}
                  <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-600">
                    <div className="flex items-center gap-1.5 truncate max-w-md">
                      <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                      <span className="truncate">{order.location.address}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400 shrink-0">
                      {new Date(order.createdAt).toLocaleDateString('en-PH', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  {/* Card Footer: Total Amount & Action Buttons */}
                  <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs text-slate-500">
                        Order #{order.orderCode} • Total:
                      </span>
                      <span className="text-base font-black text-orange-600">
                        ₱{order.totalAmount.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ({order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'GCash QR'})
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Live Tracking Button */}
                      <Link
                        href={`/track/${order.orderCode}`}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition active:scale-95 cursor-pointer ${
                          isLive
                            ? 'bg-orange-600 hover:bg-orange-700 text-white shadow-md shadow-orange-600/30'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>{isLive ? 'Track Live Rider' : 'View Milestones'}</span>
                      </Link>

                      {/* Order Again Button */}
                      <button
                        type="button"
                        onClick={() => handleOrderAgain(order)}
                        className="px-4 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 font-extrabold text-xs transition border border-orange-200 flex items-center gap-1 active:scale-95 cursor-pointer"
                        title="Re-order the exact same cylinders"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Order Again</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
}
