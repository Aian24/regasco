'use client';

import React from 'react';
import Image from 'next/image';
import { Truck, ShieldCheck, Clock, Award } from 'lucide-react';

export default function Banner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-white to-orange-100/50 rounded-2xl border border-orange-200/80 shadow-sm my-4">
      {/* Official Regasco Banner Image */}
      <div className="relative w-full aspect-[21/9] sm:aspect-[24/8] md:aspect-[3/1] max-h-72 overflow-hidden rounded-t-2xl bg-orange-500">
        <Image
          src="/banner.png"
          alt="Regasco - Your Kitchen's Perfect Match! Official LPG Mindanao Ave."
          fill
          priority
          sizes="(max-width: 768px) 100vw, 1200px"
          className="object-cover object-center"
        />
        {/* Subtle gradient overlay to enhance mobile text readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Trust & Guarantee Badges below banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-white/90 backdrop-blur-sm border-t border-orange-100 text-xs text-slate-700">
        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-orange-50/70">
          <Truck className="w-4 h-4 text-orange-600 shrink-0" />
          <div>
            <p className="font-bold text-slate-900 leading-tight">Doorstep Delivery</p>
            <p className="text-[10px] text-slate-500">Mindanao Ave. & nearby</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-blue-50/70">
          <Award className="w-4 h-4 text-blue-700 shrink-0" />
          <div>
            <p className="font-bold text-slate-900 leading-tight">Superbrands Award</p>
            <p className="text-[10px] text-slate-500">Certified safe & quality</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-amber-50/70">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <p className="font-bold text-slate-900 leading-tight">Fast 30-45 Min Dispatch</p>
            <p className="text-[10px] text-slate-500">Immediate cylinder loading</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-1.5 rounded-lg bg-emerald-50/70">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <p className="font-bold text-slate-900 leading-tight">Safety Tested Valve</p>
            <p className="text-[10px] text-slate-500">Leak check upon delivery</p>
          </div>
        </div>
      </div>
    </section>
  );
}
