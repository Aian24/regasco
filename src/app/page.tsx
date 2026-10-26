'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Header from '@/components/Header';
import ProductCard from '@/components/ProductCard';
import TrackOrderModal from '@/components/TrackOrderModal';
import { useCart } from '@/context/CartContext';
import { Product } from '@/types';
import { INITIAL_PRODUCTS } from '@/data/products';
import {
  Flame,
  Clock,
  Truck,
  ShieldCheck,
  Search,
  Award,
  Home,
  UtensilsCrossed,
  Compass,
  Building2,
  X,
  Smartphone,
  Download,
} from 'lucide-react';

export default function StorefrontHomePage() {
  const { settings } = useCart();

  const [products, setProducts] = useState<Product[]>(INITIAL_PRODUCTS);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          if (data.products && data.products.length > 0) {
            setProducts(data.products);
          }
        }
      } catch (e) {}

      try {
        const saved = localStorage.getItem('regasco_recent_orders');
        if (saved) setRecentOrders(JSON.parse(saved));
      } catch (e) {}
    }
    loadData();
  }, []);

  // Filter products by category & search
  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === 'ALL' ||
      (selectedCategory === 'HOUSEHOLD' && (p.weightKg === 11 || p.category === 'household')) ||
      (selectedCategory === 'SK' && (p.category === 'portable' || p.id === 'regasco-sk')) ||
      (selectedCategory === 'PORTABLE' && p.weightKg === 5) ||
      (selectedCategory === 'COMMERCIAL' && (p.weightKg >= 22 || p.category === 'commercial' || p.category === 'industrial'));

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col pb-28">
      {/* Modern Interactive Navbar with Integrated Search & Profile Icon */}
      <Header
        onOpenTrackModal={() => setIsTrackModalOpen(true)}
        phoneHotline={settings.phoneHotline}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Mobile-only Search Bar (visible on small mobile screens where desktop navbar search is hidden) */}
      <div className="md:hidden px-4 pt-3 max-w-7xl mx-auto w-full">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Regasco LPG tanks..."
            className="w-full pl-10 pr-8 py-2.5 rounded-2xl bg-white border border-slate-200 text-xs text-slate-900 outline-none focus:border-orange-500 shadow-xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main Container Perfectly Aligned */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-6 flex-1">
        {/* Grab/Foodpanda Style Merchant Storefront Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-sm">
          {/* Official Banner Image */}
          <div className="relative w-full aspect-[21/9] sm:aspect-[24/8] md:aspect-[3/1] max-h-72 overflow-hidden bg-orange-500">
            <Image
              src="/banner.png"
              alt="Regasco Mindanao Ave."
              fill
              priority
              className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent pointer-events-none" />

            <div className="absolute bottom-4 left-4 right-4 text-white flex items-end justify-between">
              <div>
                <span className="px-2.5 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-black uppercase tracking-wider shadow-sm">
                  Official Storefront
                </span>
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight mt-1 drop-shadow-md">
                  REGASCO Mindanao Ave. Branch
                </h1>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/20 text-xs">
                <Award className="w-4 h-4 text-yellow-400" />
                <span className="font-bold text-white">Superbrands Awardee</span>
              </div>
            </div>
          </div>

          {/* Store Info Pills Bar */}
          <div className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                <Award className="w-4 h-4 text-orange-600" />
                <span>4.9 Customer Rating</span>
                <span className="text-slate-400 font-normal">(850+ orders)</span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <Clock className="w-4 h-4 text-orange-600" />
                <span>25-35 mins delivery</span>
              </div>

              <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>₱50 delivery fee (FREE over ₱2,000)</span>
              </div>

              <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Calibrated Weight & Leak Tested</span>
              </div>
            </div>
          </div>
        </div>

        {/* Category Filter Pills (Icons only, strictly no emojis) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'ALL', label: 'All Cylinders', icon: Flame },
            { id: 'HOUSEHOLD', label: 'Household 11 KG', icon: Home },
            { id: 'SK', label: 'Supreme Kalan', icon: UtensilsCrossed },
            { id: 'PORTABLE', label: 'Portable 5 KG', icon: Compass },
            { id: 'COMMERCIAL', label: 'Commercial 22 & 50 KG', icon: Building2 },
          ].map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-600 fill-orange-500" />
              <span>Available Cooking Gas Tanks</span>
            </h2>
            <span className="text-xs text-slate-400 font-semibold">
              {filteredProducts.length} items
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      </main>

      {/* Track Order Modal */}
      <TrackOrderModal
        isOpen={isTrackModalOpen}
        onClose={() => setIsTrackModalOpen(false)}
        recentOrders={recentOrders}
      />
    </div>
  );
}
