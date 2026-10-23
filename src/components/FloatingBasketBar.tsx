'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

export default function FloatingBasketBar() {
  const pathname = usePathname();
  const { totalItemCount, grandTotal } = useCart();

  // Only show on mobile storefront and subpages, NOT on checkout or admin
  if (totalItemCount === 0 || pathname === '/checkout' || pathname.startsWith('/admin')) {
    return null;
  }

  const handleTap = async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      // Browser fallback
    }
  };

  return (
    <div className="md:hidden fixed bottom-18 left-3 right-3 z-40 animate-in slide-in-from-bottom duration-300">
      <Link
        href="/checkout"
        onClick={handleTap}
        className="w-full bg-gradient-to-r from-orange-600 via-orange-500 to-red-600 text-white rounded-2xl p-3.5 shadow-xl shadow-orange-600/35 border border-white/20 flex items-center justify-between active:scale-[0.98] transition-all cursor-pointer"
      >
        {/* Left: Cart badge & item count */}
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
            <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-slate-950 text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center shadow-md">
              {totalItemCount}
            </span>
          </div>

          <div>
            <p className="text-xs font-black uppercase tracking-wider text-orange-100 leading-tight">
              {totalItemCount} {totalItemCount === 1 ? 'Tank' : 'Tanks'} in Basket
            </p>
            <p className="text-base font-black text-white leading-tight">
              ₱{grandTotal.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Right: Grab-style "View Basket" Call to Action */}
        <div className="flex items-center gap-1.5 bg-white text-orange-600 px-3.5 py-2 rounded-xl font-black text-xs shadow-md">
          <span>View Basket</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </div>
      </Link>
    </div>
  );
}
