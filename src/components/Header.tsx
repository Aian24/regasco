'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Flame,
  ShoppingBag,
  Search,
  User,
  PhoneCall,
  Clock,
  ChevronDown,
  LogOut,
  Settings,
  MapPin,
  X,
  Package,
  ArrowRight,
  Download,
  Smartphone,
} from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

interface HeaderProps {
  onOpenTrackModal?: () => void;
  phoneHotline?: string;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  maxWidth?: string;
}

export default function Header({
  onOpenTrackModal,
  phoneHotline = '0917-882-4242',
  searchQuery = '',
  onSearchChange,
  maxWidth = 'max-w-7xl',
}: HeaderProps) {
  const { totalItemCount, grandTotal } = useCart();
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();

  const [isBouncing, setIsBouncing] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Trigger bounce animation whenever totalItemCount changes
  useEffect(() => {
    if (totalItemCount > 0) {
      setIsBouncing(true);
      const timer = setTimeout(() => setIsBouncing(false), 800);
      return () => clearTimeout(timer);
    }
  }, [totalItemCount]);

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
      <div className={`${maxWidth} mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-6`}>
        {/* Left: Brand Identity */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-md shadow-orange-500/25 group-hover:scale-105 transition-all">
            <Flame className="w-6 h-6 fill-white stroke-orange-200" />
          </div>
          <span className="text-2xl font-black tracking-tight text-blue-900 group-hover:text-orange-600 transition-colors">
            REGASCO
          </span>
        </Link>

        {/* Center: Integrated Interactive Modern Search Bar */}
        {onSearchChange && (
          <div className="flex-1 max-w-lg hidden md:block">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search Regasco LPG (11kg, Supreme Kalan, 5kg...)"
                className="w-full pl-10 pr-9 py-2 rounded-full bg-slate-100/90 border border-slate-200 focus:border-orange-500 focus:bg-white focus:ring-3 focus:ring-orange-500/15 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Quick Hotline Call */}
          <a
            href={`tel:${phoneHotline.split('/')[0].trim()}`}
            className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-200 text-xs font-bold text-slate-700 hover:text-orange-600 transition"
            title="Mindanao Ave. Hotline"
          >
            <PhoneCall className="w-3.5 h-3.5 text-orange-600" />
            <span>{phoneHotline.split('/')[0].trim()}</span>
          </a>

          {/* Direct Download Android APK Button (Mobile icon button, desktop pill) */}
          <a
            href="/regasco-app.apk"
            download="regasco-app.apk"
            className="flex items-center gap-1.5 w-10 h-10 sm:w-auto sm:px-3 sm:py-1.5 rounded-full bg-orange-50 hover:bg-orange-100 border border-orange-200 text-xs font-bold text-orange-700 transition shadow-xs hover:border-orange-300 justify-center active:scale-95 cursor-pointer shrink-0"
            title="Download Official Regasco Android App (4.6 MB APK)"
            aria-label="Download Android App APK"
          >
            <Smartphone className="w-5 h-5 sm:w-3.5 sm:h-3.5 text-orange-600 shrink-0" />
            <span className="hidden sm:inline">Get App</span>
            <span className="hidden md:inline-block text-[10px] bg-orange-600 text-white font-black px-1.5 py-0.2 rounded-full">APK</span>
          </a>

          {/* Track Order / My Orders Button (Desktop only; mobile uses BottomNavBar) */}
          <Link
            href="/track"
            className="hidden sm:flex w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-orange-600 items-center justify-center transition shadow-xs hover:border-orange-300 relative group cursor-pointer"
            title="My Orders & Live Tracking"
            aria-label="My Orders"
          >
            <Package className="w-5 h-5 text-slate-700 group-hover:text-orange-600 transition-colors" />
          </Link>

          {/* Animated Cart Button with Number Badge Only (No price text) */}
          <Link
            href="/checkout"
            id="navbar-cart-btn"
            className={`relative w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 ${
              totalItemCount > 0
                ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-md shadow-orange-600/30'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            } ${isBouncing ? 'scale-125 ring-4 ring-orange-300' : ''}`}
            title="Shopping Basket & Checkout"
            aria-label="Shopping Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-400 text-slate-950 text-[10px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center shadow-xs">
                {totalItemCount}
              </span>
            )}
          </Link>

          {/* User Profile ICON ONLY (No full name text, as requested) */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => {
                if (isAuthenticated) {
                  setIsUserMenuOpen(!isUserMenuOpen);
                } else {
                  openAuthModal();
                }
              }}
              className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 flex items-center justify-center transition shadow-xs hover:border-orange-300 relative group"
              title={isAuthenticated && user ? `Profile: ${user.name}` : 'Sign In / Register'}
              aria-label="User Profile"
            >
              <User className="w-5 h-5 text-slate-700 group-hover:text-orange-600 transition-colors" />

              {/* Online / Active status indicator */}
              {isAuthenticated && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
              )}
            </button>

            {/* Profile Dropdown Menu */}
            {isUserMenuOpen && isAuthenticated && user && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-3xl shadow-2xl border border-slate-200 p-3 z-50 animate-in fade-in zoom-in-95 space-y-2">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-black text-slate-900 truncate">
                        {user.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {user.phone}
                      </p>
                    </div>
                  </div>

                  {user.address && (
                    <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-start gap-1.5 text-[11px] text-slate-600">
                      <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-2 leading-tight">
                        {user.address}
                      </span>
                    </div>
                  )}
                </div>

                <div className="space-y-0.5 text-xs">
                  <Link
                    href="/track"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-orange-50 text-slate-800 hover:text-orange-600 flex items-center justify-between font-bold transition group"
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-orange-600" />
                      <span>My Orders & Deliveries</span>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </Link>

                  <a
                    href="/regasco-app.apk"
                    download="regasco-app.apk"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-orange-50 text-slate-800 hover:text-orange-600 flex items-center justify-between font-bold transition group"
                  >
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-orange-600" />
                      <span>Download Android App (.apk)</span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">4.6 MB</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      openAuthModal();
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-100 text-slate-700 flex items-center gap-2 font-bold transition cursor-pointer"
                  >
                    <MapPin className="w-4 h-4 text-orange-600" />
                    <span>Profile & Address Settings</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      logout();
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl hover:bg-red-50 text-red-600 flex items-center gap-2 font-bold transition pt-1 border-t border-slate-100 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
