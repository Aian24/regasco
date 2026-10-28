'use client';

import React from 'react';
import Link from 'next/link';
import {
  Flame,
  LayoutDashboard,
  ShoppingBag,
  Users,
  MapPin,
  Tag,
  Palette,
  ShieldCheck,
  Sliders,
  LogOut,
  ExternalLink,
  ChevronRight,
  X,
  Radio,
  TrendingUp,
  Bike,
} from 'lucide-react';

export type AdminTab =
  | 'dashboard'
  | 'orders'
  | 'sales'
  | 'customers'
  | 'map'
  | 'riders'
  | 'products'
  | 'branding'
  | 'security'
  | 'settings';

interface AdminSidebarProps {
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  pendingPaymentCount: number;
  inTransitCount: number;
  totalCustomersCount: number;
  totalRidersCount?: number;
  storeName?: string;
  branchName?: string;
  isStoreOpen?: boolean;
  onLogout: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  pendingPaymentCount,
  inTransitCount,
  totalCustomersCount,
  totalRidersCount = 0,
  storeName = 'REGASCO',
  branchName = 'Mindanao Ave. Hub',
  isStoreOpen = true,
  onLogout,
  isOpenMobile,
  onCloseMobile,
}: AdminSidebarProps) {
  const navItems = [
    {
      id: 'dashboard' as AdminTab,
      label: 'Overview',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'orders' as AdminTab,
      label: 'Orders & Dispatch',
      icon: ShoppingBag,
      renderBadge: (isActive: boolean) =>
        pendingPaymentCount > 0 ? (
          <span
            className={`px-2 py-0.5 text-[10px] font-black rounded-full shadow-xs ${
              isActive
                ? 'bg-white text-orange-600'
                : 'bg-amber-500 text-white animate-pulse'
            }`}
          >
            {pendingPaymentCount}
          </span>
        ) : inTransitCount > 0 ? (
          <span
            className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
              isActive
                ? 'bg-white text-blue-600'
                : 'bg-blue-600 text-white'
            }`}
          >
            {inTransitCount}
          </span>
        ) : null,
    },
    {
      id: 'sales' as AdminTab,
      label: 'Sales & Analytics',
      icon: TrendingUp,
      renderBadge: () => null,
    },
    {
      id: 'customers' as AdminTab,
      label: 'Customers',
      icon: Users,
      renderBadge: (isActive: boolean) =>
        totalCustomersCount > 0 ? (
          <span
            className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
              isActive
                ? 'bg-white/25 text-white'
                : 'bg-slate-200 text-slate-800'
            }`}
          >
            {totalCustomersCount}
          </span>
        ) : null,
    },
    {
      id: 'map' as AdminTab,
      label: 'Live Dispatch Map',
      icon: MapPin,
      renderBadge: (isActive: boolean) =>
        inTransitCount > 0 ? (
          <span
            className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-black rounded-full ${
              isActive
                ? 'bg-white text-orange-600 shadow-xs'
                : 'bg-orange-100 text-orange-700 border border-orange-300'
            }`}
          >
            <Radio className={`w-3 h-3 ${isActive ? 'text-orange-600 animate-pulse' : 'text-orange-600 animate-ping'}`} />
            <span>Live</span>
          </span>
        ) : null,
    },
    {
      id: 'riders' as AdminTab,
      label: 'Fleet & Riders',
      icon: Bike,
      renderBadge: (isActive: boolean) =>
        totalRidersCount > 0 ? (
          <span
            className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
              isActive
                ? 'bg-white text-orange-600 shadow-xs'
                : 'bg-orange-100 text-orange-700 border border-orange-200'
            }`}
          >
            {totalRidersCount}
          </span>
        ) : null,
    },
    {
      id: 'products' as AdminTab,
      label: 'Products & Prices',
      icon: Tag,
      renderBadge: () => null,
    },
    {
      id: 'branding' as AdminTab,
      label: 'Branding & CMS',
      icon: Palette,
      renderBadge: () => null,
    },
    {
      id: 'security' as AdminTab,
      label: 'Security & Access',
      icon: ShieldCheck,
      renderBadge: () => null,
    },
    {
      id: 'settings' as AdminTab,
      label: 'Store & Map APIs',
      icon: Sliders,
      renderBadge: () => null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Container: Crisp White with Clear Contrast */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 shadow-md flex flex-col transition-transform duration-300 ease-in-out md:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 border-b border-slate-200/90 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 flex items-center justify-center text-white shadow-md shadow-orange-500/30 shrink-0">
              <Flame className="w-6 h-6 fill-white stroke-orange-200" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base tracking-tight text-slate-950 truncate">
                  {storeName}
                </span>
                <span className="px-1.5 py-0.2 text-[9px] font-black uppercase rounded-md bg-orange-100 text-orange-700 border border-orange-300 shrink-0">
                  Admin
                </span>
              </div>
              <p className="text-xs text-slate-600 font-semibold truncate">
                {branchName}
              </p>
            </div>
          </div>

          <button
            onClick={onCloseMobile}
            className="p-1 rounded-lg text-slate-500 hover:text-slate-900 md:hidden cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Operating Indicator */}
        <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isStoreOpen ? 'bg-emerald-500 shadow-xs animate-pulse' : 'bg-red-500'
              }`}
            />
            <span className="text-xs font-black text-slate-800 whitespace-nowrap">
              {isStoreOpen ? 'Accepting Orders' : 'Store Closed'}
            </span>
          </div>
          <Link
            href="/"
            target="_blank"
            className="text-xs text-orange-600 hover:text-orange-700 flex items-center gap-1 hover:underline font-black whitespace-nowrap shrink-0"
            title="Preview Customer Storefront in New Tab"
          >
            <span>Live Store</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 custom-scrollbar">
          <div className="px-3 pb-2 text-[11px] font-black tracking-wider uppercase text-slate-500">
            Operations & Control
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const badgeContent = item.renderBadge ? item.renderBadge(isActive) : null;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-black transition group cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-md shadow-orange-500/30 ring-1 ring-orange-500/40'
                    : 'text-slate-800 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 transition ${
                      isActive
                        ? 'text-white'
                        : 'text-slate-600 group-hover:text-orange-600'
                    }`}
                  />
                  <span className="tracking-tight whitespace-nowrap">{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  {badgeContent}
                  <ChevronRight
                    className={`w-3.5 h-3.5 shrink-0 transition ${
                      isActive
                        ? 'text-white opacity-90'
                        : 'text-slate-400 group-hover:text-orange-600 opacity-0 group-hover:opacity-100'
                    }`}
                  />
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer & Logout */}
        <div className="p-3 border-t border-slate-200 bg-slate-50/80">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl bg-white hover:bg-red-50 text-slate-800 hover:text-red-600 border border-slate-300 hover:border-red-300 text-xs font-black transition shadow-xs cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Lock & Sign Out</span>
          </button>
          <p className="text-[10px] text-center text-slate-500 mt-2 font-bold">
            Regasco Enterprise v2.4 &bull; Official Dispatch
          </p>
        </div>
      </aside>
    </>
  );
}
