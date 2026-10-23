'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, ShoppingBag, Package, User } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

interface BottomNavBarProps {
  onOpenTrackModal?: () => void;
}

export default function BottomNavBar({ onOpenTrackModal }: BottomNavBarProps) {
  const pathname = usePathname();
  const { totalItemCount } = useCart();
  const { openAuthModal, isAuthenticated } = useAuth();

  // Hide on admin portal
  if (pathname.startsWith('/admin')) {
    return null;
  }

  const triggerHaptic = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Haptics not available in web browser fallback
    }
  };

  return (
    <nav
      aria-label="Mobile Bottom Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 shadow-2xl pb-[env(safe-area-inset-bottom)]"
    >
      <div className="grid grid-cols-4 h-16 items-center px-1">
        {/* Tab 1: Storefront / Tanks */}
        <Link
          href="/"
          onClick={triggerHaptic}
          className={`flex flex-col items-center justify-center gap-1 h-full transition-all active:scale-90 ${
            pathname === '/'
              ? 'text-orange-600 font-extrabold'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <div className="relative">
            <Flame
              className={`w-5 h-5 transition-transform ${
                pathname === '/' ? 'fill-orange-600 text-orange-600 scale-110' : ''
              }`}
            />
          </div>
          <span className="text-[10px] tracking-tight leading-none">Store</span>
        </Link>

        {/* Tab 2: Basket / Cart */}
        <Link
          href="/checkout"
          onClick={triggerHaptic}
          className={`flex flex-col items-center justify-center gap-1 h-full transition-all active:scale-90 relative ${
            pathname === '/checkout'
              ? 'text-orange-600 font-extrabold'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <div className="relative">
            <ShoppingBag
              className={`w-5 h-5 transition-transform ${
                pathname === '/checkout' ? 'stroke-orange-600 stroke-[2.5] scale-110' : ''
              }`}
            />
            {totalItemCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-orange-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                {totalItemCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight leading-none">Basket</span>
        </Link>

        {/* Tab 3: Orders / Activity */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            if (onOpenTrackModal) {
              onOpenTrackModal();
            } else {
              window.location.href = '/track';
            }
          }}
          className={`flex flex-col items-center justify-center gap-1 h-full transition-all active:scale-90 ${
            pathname.startsWith('/track')
              ? 'text-orange-600 font-extrabold'
              : 'text-slate-400 hover:text-slate-600 font-medium'
          }`}
        >
          <div className="relative">
            <Package
              className={`w-5 h-5 transition-transform ${
                pathname.startsWith('/track') ? 'stroke-orange-600 stroke-[2.5] scale-110' : ''
              }`}
            />
          </div>
          <span className="text-[10px] tracking-tight leading-none">Orders</span>
        </button>

        {/* Tab 4: Account / Profile */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            openAuthModal();
          }}
          className="flex flex-col items-center justify-center gap-1 h-full text-slate-400 hover:text-orange-600 font-medium transition-all active:scale-90"
        >
          <div className="relative">
            <User className="w-5 h-5" />
            {isAuthenticated && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
            )}
          </div>
          <span className="text-[10px] tracking-tight leading-none">Account</span>
        </button>
      </div>
    </nav>
  );
}
