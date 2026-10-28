'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Truck, Flame, Clock, CheckCircle2, X, ChevronRight, MapPin, Sparkles } from 'lucide-react';
import { Order } from '@/types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export default function CustomerOrderBanner() {
  const pathname = usePathname();
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const previousStatusRef = useRef<string | null>(null);

  // Suppress on admin and rider cockpit
  const isHiddenRoute =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/rider');

  useEffect(() => {
    if (isHiddenRoute) return;

    const checkActiveCustomerOrder = async () => {
      try {
        // Read recent orders stored on this device
        const rawUserOrders = localStorage.getItem('regasco_user_orders');
        const rawRecents = localStorage.getItem('regasco_recent_orders');

        let candidateCode: string | null = null;
        let candidateId: string | null = null;

        if (rawUserOrders) {
          const parsed = JSON.parse(rawUserOrders);
          if (Array.isArray(parsed) && parsed.length > 0) {
            candidateCode = parsed[0].orderCode || null;
            candidateId = parsed[0].id || null;
          }
        }

        if (!candidateCode && rawRecents) {
          const parsed = JSON.parse(rawRecents);
          if (Array.isArray(parsed) && parsed.length > 0) {
            candidateCode = parsed[0].code || parsed[0].id || null;
          }
        }

        if (!candidateCode && !candidateId) {
          setActiveOrder(null);
          return;
        }

        // Check if user dismissed this specific order banner in this browser session
        const dismissKey = `regasco_dismiss_banner_${candidateCode || candidateId}`;
        if (sessionStorage.getItem(dismissKey) === 'true') {
          setIsDismissed(true);
          return;
        }

        // Fetch live state from backend
        const queryParam = candidateCode ? `code=${encodeURIComponent(candidateCode)}` : `id=${encodeURIComponent(candidateId!)}`;
        const res = await fetch(`/api/orders?${queryParam}`);
        if (res.ok) {
          const data = await res.json();
          const order: Order | undefined = data.order;

          if (!order) {
            setActiveOrder(null);
            return;
          }

          // Check if order is in active state
          const isActive =
            order.orderStatus === 'PENDING_PAYMENT' ||
            order.orderStatus === 'ORDER_CONFIRMED' ||
            order.orderStatus === 'PREPARING' ||
            order.orderStatus === 'OUT_FOR_DELIVERY';

          // If delivered, display for up to 20 minutes after delivery
          const isRecentlyDelivered =
            order.orderStatus === 'DELIVERED' &&
            Date.now() - new Date(order.updatedAt || order.createdAt).getTime() < 20 * 60 * 1000;

          if (isActive || isRecentlyDelivered) {
            // Trigger haptic feedback when status changes to OUT_FOR_DELIVERY
            if (
              previousStatusRef.current &&
              previousStatusRef.current !== 'OUT_FOR_DELIVERY' &&
              order.orderStatus === 'OUT_FOR_DELIVERY'
            ) {
              try {
                Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
              } catch (e) {}
            }
            previousStatusRef.current = order.orderStatus;
            setActiveOrder(order);
          } else {
            setActiveOrder(null);
          }
        }
      } catch (err) {
        // Fallback silently if offline
      }
    };

    checkActiveCustomerOrder();
    const interval = setInterval(checkActiveCustomerOrder, 4000); // 4-second reactive polling
    return () => clearInterval(interval);
  }, [pathname, isHiddenRoute]);

  // Don't render on hidden routes, if dismissed, or if no active order
  if (isHiddenRoute || isDismissed || !activeOrder) {
    return null;
  }

  // Also hide if customer is already on the dedicated track page for this specific order
  if (
    pathname === `/track/${activeOrder.orderCode}` ||
    pathname === `/track/${activeOrder.id}`
  ) {
    return null;
  }

  const handleDismiss = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDismissed(true);
    if (activeOrder) {
      sessionStorage.setItem(`regasco_dismiss_banner_${activeOrder.orderCode || activeOrder.id}`, 'true');
    }
  };

  const isOutForDelivery = activeOrder.orderStatus === 'OUT_FOR_DELIVERY';
  const isDelivered = activeOrder.orderStatus === 'DELIVERED';
  const isPendingPayment = activeOrder.orderStatus === 'PENDING_PAYMENT';
  const isPreparing =
    activeOrder.orderStatus === 'PREPARING' || activeOrder.orderStatus === 'ORDER_CONFIRMED';

  return (
    <div className="fixed bottom-20 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-[420px] z-40 animate-in slide-in-from-bottom-4 duration-300">
      <div
        className={`rounded-3xl p-4 shadow-2xl border transition-all backdrop-blur-xl ${
          isOutForDelivery
            ? 'bg-gradient-to-r from-blue-900/95 via-indigo-950/95 to-slate-900/95 text-white border-blue-400/50 shadow-blue-500/25'
            : isDelivered
            ? 'bg-gradient-to-r from-emerald-900/95 to-teal-950/95 text-white border-emerald-400/50 shadow-emerald-500/25'
            : isPendingPayment
            ? 'bg-gradient-to-r from-amber-900/95 to-orange-950/95 text-white border-amber-400/50 shadow-amber-500/25'
            : 'bg-gradient-to-r from-orange-900/95 via-amber-950/95 to-slate-900/95 text-white border-orange-400/50 shadow-orange-500/25'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Animated Icon Avatar */}
            <div
              className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                isOutForDelivery
                  ? 'bg-blue-600 text-white animate-bounce'
                  : isDelivered
                  ? 'bg-emerald-600 text-white'
                  : isPendingPayment
                  ? 'bg-amber-600 text-white animate-pulse'
                  : 'bg-orange-600 text-white animate-pulse'
              }`}
            >
              {isOutForDelivery ? (
                <Truck className="w-6 h-6 text-white" />
              ) : isDelivered ? (
                <CheckCircle2 className="w-6 h-6 text-white" />
              ) : isPendingPayment ? (
                <Clock className="w-6 h-6 text-white" />
              ) : (
                <Flame className="w-6 h-6 text-white" />
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono font-black text-xs text-white">
                  {activeOrder.orderCode}
                </span>
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1 ${
                    isOutForDelivery
                      ? 'bg-blue-500 text-white animate-pulse'
                      : isDelivered
                      ? 'bg-emerald-500 text-white'
                      : isPendingPayment
                      ? 'bg-amber-500 text-white'
                      : 'bg-orange-500 text-white'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  {isOutForDelivery
                    ? 'Out for Delivery'
                    : isDelivered
                    ? 'Delivered'
                    : isPendingPayment
                    ? 'Verification Pending'
                    : 'Preparing Tank'}
                </span>
              </div>

              <p className="text-xs text-slate-200 font-semibold truncate mt-0.5">
                {isOutForDelivery
                  ? `Rider ${activeOrder.assignedRider?.name || 'Kuya Jun'} is en route to you!`
                  : isDelivered
                  ? 'Cylinder received & safety seal verified!'
                  : isPendingPayment
                  ? 'Payment proof submitted for cashier review.'
                  : 'Safety inspection & tare calibration in progress.'}
              </p>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer shrink-0"
            title="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Link Footer */}
        <div className="mt-3 pt-2.5 border-t border-white/15 flex items-center justify-between gap-2">
          <div className="text-[11px] text-slate-300 truncate flex items-center gap-1">
            <MapPin className="w-3 h-3 text-orange-400 shrink-0" />
            <span className="truncate">{activeOrder.location.address}</span>
          </div>

          <Link
            href={`/track/${activeOrder.orderCode || activeOrder.id}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-tight flex items-center gap-1 transition active:scale-95 shrink-0 ${
              isOutForDelivery
                ? 'bg-blue-500 hover:bg-blue-400 text-white shadow-md shadow-blue-500/30'
                : 'bg-orange-600 hover:bg-orange-500 text-white shadow-md shadow-orange-500/30'
            }`}
          >
            <span>{isOutForDelivery ? 'Live GPS Map' : 'Track Order'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
