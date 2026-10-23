'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Package, ArrowRight, Clock } from 'lucide-react';

interface TrackOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentOrders?: { code: string; date: string; total: number }[];
}

export default function TrackOrderModal({
  isOpen,
  onClose,
  recentOrders = [],
}: TrackOrderModalProps) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  if (!isOpen) return null;

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const cleanCode = code.trim().toUpperCase();
      const res = await fetch(`/api/orders?code=${encodeURIComponent(cleanCode)}`);
      if (res.ok) {
        onClose();
        router.push(`/track/${cleanCode}`);
      } else {
        setError(`No order found matching "${cleanCode}". Please check your code.`);
      }
    } catch (err) {
      setError('Failed to check order. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative shadow-2xl animate-in fade-in zoom-in-95">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-base">
              Track Your LPG Delivery
            </h3>
            <p className="text-xs text-slate-500">
              Enter your 4-digit code (e.g. REG-8821)
            </p>
          </div>
        </div>

        <form onSubmit={handleTrack} className="space-y-3">
          <div className="relative">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. REG-8821"
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm font-mono tracking-wider font-bold outline-none uppercase"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 p-2 rounded-lg border border-red-200">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-bold text-sm shadow-md shadow-orange-600/30 transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>{isLoading ? 'Searching...' : 'Track My Order'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Recent orders from device storage */}
        {recentOrders.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Recent Orders on this device
            </span>
            <div className="space-y-1.5">
              {recentOrders.map((ro) => (
                <button
                  key={ro.code}
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(`/track/${ro.code}`);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 text-left text-xs transition border border-transparent hover:border-slate-200"
                >
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                    <span className="font-mono font-bold text-slate-900">
                      {ro.code}
                    </span>
                  </div>
                  <span className="font-semibold text-orange-600">
                    ₱{ro.total.toLocaleString()}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
