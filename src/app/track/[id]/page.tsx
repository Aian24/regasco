'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Flame,
  CheckCircle2,
  Clock,
  Truck,
  PhoneCall,
  ShieldCheck,
  MapPin,
  Banknote,
  QrCode,
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  FileText,
  BadgeCheck,
  Navigation,
  MessageSquare,
  ChevronDown,
  ShoppingBag,
  ExternalLink,
  RotateCcw,
  Play,
  Eye,
  X,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import confetti from 'canvas-confetti';
import { Order, OrderStatus } from '@/types';
import { useCart } from '@/context/CartContext';
import { INITIAL_PRODUCTS } from '@/data/products';

const LiveDeliveryMap = dynamic(() => import('@/components/LiveDeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-72 rounded-3xl bg-slate-100 flex items-center justify-center border border-slate-200">
      <div className="text-center space-y-2">
        <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-500">Loading Live Route Map...</p>
      </div>
    </div>
  ),
});

const STATUS_STEPS: {
  key: OrderStatus;
  label: string;
  desc: string;
  icon: any;
}[] = [
  {
    key: 'PENDING_PAYMENT',
    label: 'Order Submitted',
    desc: 'Waiting for store owner verification',
    icon: Clock,
  },
  {
    key: 'PAYMENT_VERIFIED',
    label: 'Payment Verified',
    desc: 'GCash screenshot verified by owner',
    icon: BadgeCheck,
  },
  {
    key: 'ORDER_CONFIRMED',
    label: 'Order Confirmed',
    desc: 'Cylinder scheduled for loading',
    icon: CheckCircle2,
  },
  {
    key: 'PREPARING',
    label: 'Cylinder Safety Inspection',
    desc: 'Calibrated weight check & valve leak test',
    icon: ShieldCheck,
  },
  {
    key: 'OUT_FOR_DELIVERY',
    label: 'Rider on the Way',
    desc: 'Heading to your pinned address in Mindanao Ave.',
    icon: Truck,
  },
  {
    key: 'DELIVERED',
    label: 'Delivered & Installed',
    desc: 'Delivered safely to your doorstep',
    icon: CheckCircle2,
  },
];

function OrderTrackContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const orderId = resolvedParams.id;
  const router = useRouter();
  const { addToCart } = useCart();

  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const fetchOrder = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          setOrder(data.order);
          setError(null);
          setIsLoading(false);
          if (isManual) setIsRefreshing(false);
          return;
        }
      }
    } catch (err) {}

    // Fallback: Check local storage
    try {
      const userSaved = localStorage.getItem('regasco_user_orders');
      if (userSaved) {
        const list: Order[] = JSON.parse(userSaved);
        const match = list.find(
          (o) =>
            o.orderCode.toLowerCase() === orderId.toLowerCase() ||
            o.id.toLowerCase() === orderId.toLowerCase()
        );
        if (match) {
          setOrder(match);
          setError(null);
          setIsLoading(false);
          if (isManual) setIsRefreshing(false);
          return;
        }
      }
    } catch (e) {}

    setError('Order not found. Please verify your order code.');
    setIsLoading(false);
    if (isManual) setIsRefreshing(false);
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(() => {
      fetchOrder();
    }, 6000);
    return () => clearInterval(interval);
  }, [orderId]);

  const advanceLiveStatus = async () => {
    if (!order) return;
    setIsSimulating(true);

    const flow: OrderStatus[] = [
      'PENDING_PAYMENT',
      'PAYMENT_VERIFIED',
      'ORDER_CONFIRMED',
      'PREPARING',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ];
    const currentIndex = flow.indexOf(order.orderStatus);
    const nextStatus = currentIndex < flow.length - 1 ? flow[currentIndex + 1] : flow[0];

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderStatus: nextStatus }),
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data.order);
      } else {
        const updated = {
          ...order,
          orderStatus: nextStatus,
          updatedAt: new Date().toISOString(),
        };
        setOrder(updated);
      }
    } catch (e) {
      const updated = {
        ...order,
        orderStatus: nextStatus,
        updatedAt: new Date().toISOString(),
      };
      setOrder(updated);
    } finally {
      setIsSimulating(false);
    }

    if (nextStatus === 'DELIVERED') {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#FF5A00', '#004B93', '#10B981'],
      });
    }
  };

  const handleOrderAgain = () => {
    if (!order) return;
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

  const getStepStatus = (stepKey: OrderStatus) => {
    if (!order) return 'upcoming';
    if (order.orderStatus === 'CANCELLED') return 'cancelled';

    const orderRankMap: Record<OrderStatus, number> = {
      PENDING_PAYMENT: 1,
      PAYMENT_VERIFIED: 2,
      ORDER_CONFIRMED: 2,
      PREPARING: 3,
      OUT_FOR_DELIVERY: 4,
      DELIVERED: 5,
      CANCELLED: 0,
    };

    const currentRank = orderRankMap[order.orderStatus] || 1;
    const stepRank = orderRankMap[stepKey] || 1;

    if (currentRank > stepRank) return 'completed';
    if (currentRank === stepRank) return 'current';
    return 'upcoming';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-black text-slate-700">Connecting to Mindanao Ave. Dispatch...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 text-center border border-slate-200 shadow-sm space-y-4">
          <AlertCircle className="w-14 h-14 text-orange-600 mx-auto" />
          <h2 className="text-xl font-black text-slate-900">Order Reference Not Found</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            We couldn't locate order #{orderId}. If you just placed an order, please check your My Orders list or contact the Mindanao Ave. branch.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
            <Link
              href="/track"
              className="px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              View My Orders
            </Link>
            <Link
              href="/"
              className="px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-md transition"
            >
              Back to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col pb-28">
      {/* Top Grab/Shopee Tracking Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/track"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-orange-50 hover:text-orange-600 text-slate-700 text-xs font-bold transition border border-slate-200 group"
              title="Back to My Orders"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Orders</span>
            </Link>

            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25">
                <Flame className="w-5 h-5 fill-white stroke-orange-200" />
              </div>
              <span className="text-xl font-black tracking-tight text-blue-900 group-hover:text-orange-600 transition-colors">
                REGASCO
              </span>
            </Link>
          </div>

          <div className="text-center">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
              Live Tracker
            </span>
            <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-200">
              {order.orderCode}
            </span>
          </div>

          <button
            onClick={() => fetchOrder(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition border border-slate-200 active:scale-95 cursor-pointer"
            title="Refresh Status"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </header>

      {/* Main Container Perfectly Aligned to max-w-5xl */}
      <main className="max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5 flex-1">
        {/* Live Simulation Control Bar (Testing & progression controls without AI icons) */}
        <div className="bg-white rounded-2xl p-3 border border-orange-200/80 shadow-xs flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <p className="font-bold text-slate-800 text-[11px] sm:text-xs">
              Live Order Simulation: <span className="text-orange-600">{order.orderStatus.replace(/_/g, ' ')}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={advanceLiveStatus}
            disabled={isSimulating}
            className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-extrabold text-[11px] shadow-sm transition flex items-center gap-1.5 cursor-pointer shrink-0"
            title="Advance order milestone to test tracking progression"
          >
            <Play className="w-3.5 h-3.5 fill-white" />
            <span>Advance Status</span>
          </button>
        </div>

        {/* Grab/Foodpanda Live ETA Hero Card */}
        <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-red-600 rounded-3xl p-6 text-white shadow-xl shadow-orange-600/30 relative overflow-hidden">
          <div className="relative z-10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-300 animate-ping" />
                <span>Express LPG Delivery</span>
              </span>
              <span className="text-xs text-white/80 font-mono">
                {new Date(order.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <div>
              <span className="text-xs text-white/80 font-semibold block uppercase tracking-wide">
                Estimated Arrival
              </span>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-0.5">
                {order.orderStatus === 'DELIVERED'
                  ? 'Delivered & Installed'
                  : order.orderStatus === 'OUT_FOR_DELIVERY'
                  ? '15 - 25 mins'
                  : order.orderStatus === 'PREPARING'
                  ? '20 - 30 mins'
                  : '25 - 35 mins'}
              </h1>
            </div>

            <p className="text-xs text-white/95 font-medium leading-relaxed max-w-lg">
              {order.orderStatus === 'PENDING_PAYMENT' &&
                'Store owner is verifying your GCash payment screenshot. Dispatch preparation begins once confirmed.'}
              {order.orderStatus === 'PAYMENT_VERIFIED' &&
                'GCash payment approved! Cylinder is now being loaded onto the delivery motorcycle.'}
              {order.orderStatus === 'ORDER_CONFIRMED' &&
                'Order confirmed! Preparing authentic calibrated Regasco cylinder for dispatch.'}
              {order.orderStatus === 'PREPARING' &&
                'Safety valve inspection and calibrated weight check in progress before loading.'}
              {order.orderStatus === 'OUT_FOR_DELIVERY' &&
                'Rider is en route to your pinned address in Mindanao Ave. / Quezon City area!'}
              {order.orderStatus === 'DELIVERED' &&
                'Order successfully delivered! Enjoy safe, genuine cooking gas with your authentic Regasco cylinder.'}
            </p>
          </div>

          <div className="absolute -right-12 -bottom-12 w-52 h-52 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        </div>

        {/* Rider & Store Dispatcher Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold overflow-hidden border border-orange-200">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-slate-900 text-sm">
                  Kuya Mark (Regasco Rider)
                </h3>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                  LPG Certified
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Mindanao Ave. Express Motorcycle Unit #8
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <a
              href="tel:09178824242"
              className="w-10 h-10 rounded-2xl bg-orange-50 hover:bg-orange-100 text-orange-600 flex items-center justify-center transition border border-orange-200 active:scale-95"
              title="Call Rider / Store"
            >
              <PhoneCall className="w-4 h-4" />
            </a>
            <a
              href={`sms:09178824242?body=Hi Kuya Mark, following up order ${order.orderCode} at ${order.location.address}`}
              className="w-10 h-10 rounded-2xl bg-blue-50 hover:bg-blue-100 text-blue-600 flex items-center justify-center transition border border-blue-200 active:scale-95"
              title="Send SMS to Rider"
            >
              <MessageSquare className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Grab/Foodpanda Live Delivery Route Map (Shown for all active deliveries & when rider is on the way) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-orange-600" />
              <span>Live Delivery Route Map</span>
            </h2>
            <span className="text-[11px] font-bold text-slate-500">
              Mindanao Ave. Store ➔ Pinned Address
            </span>
          </div>

          <LiveDeliveryMap
            location={order.location}
            orderStatus={order.orderStatus}
            customerName={order.customerName}
          />
        </div>

        {/* Grab/Shopee Progress Stepper Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-wider">
            Live Delivery Milestones
          </h2>

          <div className="space-y-5 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200 before:z-0">
            {STATUS_STEPS.map((step) => {
              const status = getStepStatus(step.key);
              const StepIcon = step.icon;

              return (
                <div key={step.key} className="relative z-10 flex items-start gap-4">
                  {/* Step Icon Badge */}
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all ${
                      status === 'completed'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                        : status === 'current'
                        ? 'bg-orange-600 text-white ring-4 ring-orange-100 shadow-md shadow-orange-600/40'
                        : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <StepIcon className="w-4 h-4" />
                  </div>

                  {/* Step Description */}
                  <div className="flex-1 pt-0.5">
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm font-black ${
                          status === 'completed'
                            ? 'text-slate-900'
                            : status === 'current'
                            ? 'text-orange-600 font-extrabold'
                            : 'text-slate-400'
                        }`}
                      >
                        {step.label}
                      </p>
                      {status === 'completed' && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          Completed
                        </span>
                      )}
                      {status === 'current' && (
                        <span className="text-[10px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full animate-pulse">
                          Active Now
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pinned Delivery Location Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-orange-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">
                Pinned Delivery Address
              </h3>
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${order.location.latitude},${order.location.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
            >
              <span>View Map</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          <div className="text-xs space-y-1.5">
            <p className="font-bold text-slate-900 text-sm">
              {order.customerName} ({order.customerPhone})
            </p>
            <p className="text-slate-700 leading-relaxed font-medium">
              {order.location.address}
            </p>
            {order.location.landmark && (
              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                Landmark / Notes: {order.location.landmark}
              </p>
            )}
          </div>
        </div>

        {/* Order Items & Payment Breakdown */}
        <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-orange-600" />
              <h3 className="font-extrabold text-slate-900 text-sm">
                Order Items ({order.items.length})
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-[10px] font-black px-2.5 py-0.5 rounded-md ${
                  order.paymentMethod === 'COD'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {order.paymentMethod === 'COD' ? 'Cash on Delivery' : 'GCash QR'}
              </span>

              {order.paymentScreenshot && (
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(true)}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200"
                >
                  <Eye className="w-3 h-3" />
                  <span>View Receipt</span>
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {item.quantity}x {item.productName}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {item.cylinderOption === 'REFILL' ? 'Refill (Empty Tank Swap)' : 'New Tank Package'}
                  </span>
                </div>
                <span className="font-bold text-slate-900 text-sm">
                  ₱{(item.unitPrice * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span className="font-bold text-slate-900">₱{order.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Delivery Fee (Mindanao Ave.)</span>
              <span className="font-bold text-slate-900">
                {order.deliveryFee === 0 ? 'FREE' : `₱${order.deliveryFee.toLocaleString()}`}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-100 text-base font-black text-slate-900">
              <span>Total Amount</span>
              <span className="text-orange-600 text-lg">₱{order.totalAmount.toLocaleString()}</span>
            </div>
          </div>

          {/* Action Buttons: Order Again & All Orders */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleOrderAgain}
              className="flex-1 py-3 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-orange-600/30 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Order Again (Same Items)</span>
            </button>
            <Link
              href="/track"
              className="py-3 px-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition text-center"
            >
              All My Orders
            </Link>
          </div>
        </div>
      </main>

      {/* GCash Receipt Preview Modal */}
      {isReceiptModalOpen && order.paymentScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 relative shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-black text-slate-900 text-sm">Uploaded GCash Receipt</h3>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="p-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative w-full aspect-[3/4] rounded-2xl overflow-hidden bg-slate-100">
              <Image
                src={order.paymentScreenshot}
                alt="Payment Receipt"
                fill
                className="object-contain"
              />
            </div>
            {order.paymentRefNumber && (
              <p className="text-xs font-mono text-center text-slate-600 font-bold">
                Ref: {order.paymentRefNumber}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrderTrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-black text-slate-700">Loading Order Tracking...</p>
          </div>
        </div>
      }
    >
      <OrderTrackContent params={params} />
    </React.Suspense>
  );
}
