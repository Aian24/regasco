'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  User,
  Phone,
  MapPin,
  Lock,
  X,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Package,
  Clock,
  Truck,
  RotateCcw,
  LogOut,
  Settings,
  ChevronRight,
  Edit2,
  Save,
} from 'lucide-react';
import { Order } from '@/types';

export default function AuthModal() {
  const router = useRouter();
  const { isAuthModalOpen, closeAuthModal, login, signup, logout, user, isAuthenticated, updateAddress } = useAuth();
  const [tab, setTab] = useState<'signin' | 'signup'>('signup');

  // Form states
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [landmark, setLandmark] = useState(user?.landmark || '');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Orders summary count for Shopee-style section
  const [ordersSummary, setOrdersSummary] = useState({
    toPay: 0,
    toReceive: 0,
    completed: 0,
    total: 0,
  });

  useEffect(() => {
    if (user) {
      setName(user.name);
      setPhone(user.phone);
      setAddress(user.address);
      setLandmark(user.landmark || '');
    }
  }, [user]);

  useEffect(() => {
    try {
      const local = localStorage.getItem('regasco_user_orders');
      if (local) {
        const orders: Order[] = JSON.parse(local);
        const toPay = orders.filter((o) => o.orderStatus === 'PENDING_PAYMENT').length;
        const toReceive = orders.filter((o) =>
          ['PAYMENT_VERIFIED', 'ORDER_CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)
        ).length;
        const completed = orders.filter((o) => o.orderStatus === 'DELIVERED').length;
        setOrdersSummary({
          toPay,
          toReceive,
          completed,
          total: orders.length,
        });
      }
    } catch (e) {}
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone.trim() || phone.length < 10) {
      setError('Please enter a valid 11-digit Philippine mobile number.');
      return;
    }

    setIsLoading(true);

    try {
      if (tab === 'signup') {
        if (!name.trim()) {
          setError('Please provide your full name.');
          setIsLoading(false);
          return;
        }
        if (!address.trim()) {
          setError('Please provide your complete delivery address.');
          setIsLoading(false);
          return;
        }
        await signup({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          landmark: landmark.trim(),
          latitude: 14.6852,
          longitude: 121.0368,
        });
      } else {
        await login(phone.trim(), name.trim());
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAddress = () => {
    if (!address.trim()) return;
    updateAddress(address.trim(), landmark.trim(), 14.6852, 121.0368);
    setIsEditingAddress(false);
  };

  const goToOrders = (tabQuery?: string) => {
    closeAuthModal();
    router.push('/track');
  };

  // If user is already authenticated: Show Shopee-style Profile & Orders Dashboard
  if (isAuthenticated && user) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl max-w-md w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto no-scrollbar">
          {/* Close Button */}
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          {/* User Profile Header */}
          <div className="flex items-center gap-3.5 pr-8">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white flex items-center justify-center font-black text-xl shadow-md shadow-orange-500/25 shrink-0">
              <User className="w-7 h-7" />
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 truncate">{user.name}</h2>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800">
                  Verified
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500">{user.phone}</p>
            </div>
          </div>

          {/* Shopee-style "My Orders / Purchases" Card */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-orange-600" />
                <span>My Orders / Purchases</span>
              </h3>
              <button
                type="button"
                onClick={() => goToOrders()}
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-0.5 cursor-pointer"
              >
                <span>View All ({ordersSummary.total})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Shopee-style Order Status Grid */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <button
                type="button"
                onClick={() => goToOrders('TO_PAY')}
                className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 transition cursor-pointer flex flex-col items-center gap-1 active:scale-95"
              >
                <div className="relative">
                  <Clock className="w-5 h-5 text-amber-500" />
                  {ordersSummary.toPay > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-amber-500 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                      {ordersSummary.toPay}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-extrabold text-slate-700">To Pay / Verify</span>
              </button>

              <button
                type="button"
                onClick={() => goToOrders('TO_RECEIVE')}
                className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 transition cursor-pointer flex flex-col items-center gap-1 active:scale-95"
              >
                <div className="relative">
                  <Truck className="w-5 h-5 text-blue-500" />
                  {ordersSummary.toReceive > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-orange-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-pulse">
                      {ordersSummary.toReceive}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-extrabold text-slate-700">To Receive</span>
              </button>

              <button
                type="button"
                onClick={() => goToOrders('COMPLETED')}
                className="p-2.5 rounded-xl bg-white border border-slate-200 hover:border-orange-300 hover:bg-orange-50/50 transition cursor-pointer flex flex-col items-center gap-1 active:scale-95"
              >
                <div className="relative">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  {ordersSummary.completed > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-emerald-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center">
                      {ordersSummary.completed}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-extrabold text-slate-700">Completed</span>
              </button>
            </div>
          </div>

          {/* Confirmed Delivery Address Section */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-orange-600" />
                <span>Confirmed Delivery Address</span>
              </span>
              {!isEditingAddress ? (
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(true)}
                  className="text-xs text-orange-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveAddress}
                  className="text-xs text-emerald-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3 h-3" />
                  <span>Save</span>
                </button>
              )}
            </div>

            {!isEditingAddress ? (
              <div className="space-y-1 text-xs">
                <p className="font-bold text-slate-900 leading-snug">{user.address}</p>
                {user.landmark && (
                  <p className="text-[11px] text-slate-500">Note / Landmark: {user.landmark}</p>
                )}
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl border border-slate-300 focus:border-orange-500 text-xs text-slate-900 outline-none bg-white"
                  placeholder="Complete address (House #, Street, Barangay, City)"
                />
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-slate-300 focus:border-orange-500 text-xs text-slate-900 outline-none bg-white"
                  placeholder="Landmark (e.g. Near 7-Eleven)"
                />
              </div>
            )}
          </div>

          {/* Admin & Sign Out Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
            <Link
              href="/admin"
              onClick={closeAuthModal}
              className="px-3.5 py-2 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 font-bold transition flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Admin Portal</span>
            </Link>

            <button
              type="button"
              onClick={() => {
                logout();
                closeAuthModal();
              }}
              className="px-3.5 py-2 rounded-xl text-red-600 hover:bg-red-50 font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Not Logged In: Show Registration / Sign In Form
  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center mx-auto shadow-sm">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            {tab === 'signin' ? 'Sign In to Regasco' : 'Create Customer Account'}
          </h2>
          <p className="text-xs text-slate-500">
            Save your confirmed delivery address for instant fast checkout
          </p>
        </div>

        {/* Tab Toggle (Sign In vs Sign Up) */}
        <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setTab('signup');
              setError(null);
            }}
            className={`py-2 rounded-xl transition cursor-pointer ${
              tab === 'signup'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('signin');
              setError(null);
            }}
            className={`py-2 rounded-xl transition cursor-pointer ${
              tab === 'signin'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === 'signup' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Full Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Maria Santos"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-orange-500 text-xs text-slate-900 outline-none"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Mobile Phone Number
            </label>
            <div className="relative">
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0917-123-4567"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-orange-500 text-xs text-slate-900 outline-none font-mono"
              />
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {tab === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Default Delivery Address
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="House/Unit #, Street, Barangay, City"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 focus:border-orange-500 text-xs text-slate-900 outline-none"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Landmark / Special Notes
                </label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  placeholder="Near 7-Eleven, Green Gate"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:border-orange-500 text-xs text-slate-900 outline-none"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-extrabold text-xs shadow-md shadow-orange-600/30 transition flex items-center justify-center gap-2 mt-4 cursor-pointer"
          >
            <span>{isLoading ? 'Saving...' : tab === 'signup' ? 'Create Profile & Save Address' : 'Sign In Now'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={() => {
              setName('Juan Dela Cruz');
              setPhone('0917-882-4242');
              setAddress('142 Mindanao Avenue, Bahay Toro, Project 8, Quezon City');
              setLandmark('Near 7-Eleven, Green Gate');
              login('0917-882-4242', 'Juan Dela Cruz');
            }}
            className="text-[11px] text-slate-500 hover:text-orange-600 underline font-medium cursor-pointer"
          >
            Quick Auto-Fill Mindanao Ave. Customer Profile
          </button>
        </div>
      </div>
    </div>
  );
}
