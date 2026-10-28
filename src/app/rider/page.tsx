'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import dynamic from 'next/dynamic';
import {
  Truck,
  Flame,
  Navigation,
  PhoneCall,
  MapPin,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Camera,
  Upload,
  AlertCircle,
  Radio,
  Power,
  RefreshCw,
  Compass,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Check,
  X,
  Play,
  Pause,
  LogOut,
  Lock,
  Bell,
  Volume2,
  Smartphone,
  ShieldAlert,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Order, DispatchRider } from '@/types';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

// Dynamically import RiderDeliveryMap to prevent SSR canvas issues
const RiderDeliveryMap = dynamic(() => import('@/components/rider/RiderDeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 rounded-2xl bg-slate-950 flex items-center justify-center border border-slate-800">
      <div className="text-center space-y-2">
        <div className="w-7 h-7 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs font-bold text-slate-400">Loading Street Navigation...</p>
      </div>
    </div>
  ),
});

// Synthesize loud dispatch chime using Web Audio API
function playDispatchChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    // 3-tone siren chime: C5 -> E5 -> G5 -> C6
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.12);

      gain.gain.setValueAtTime(0.4, ctx.currentTime + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.12 + 0.25);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + idx * 0.12);
      osc.stop(ctx.currentTime + idx * 0.12 + 0.25);
    });
  } catch (e) {
    console.warn('Audio chime could not be played', e);
  }
}

// Trigger device vibration
async function triggerDeviceBuzz() {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate([300, 150, 300, 150, 400]);
    }
    await Haptics.impact({ style: ImpactStyle.Heavy });
  } catch (e) {}
}

export default function RiderPortalPage() {
  // Authentication State
  const [activeRider, setActiveRider] = useState<DispatchRider | null>(null);
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Orders State
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [completedOrders, setCompletedOrders] = useState<Order[]>([]);
  const [availableForPickup, setAvailableForPickup] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Notification State
  const [incomingMissionAlert, setIncomingMissionAlert] = useState<Order | null>(null);
  const previousOrderIdsRef = useRef<Set<string>>(new Set());

  // GPS Telemetry State
  const [isTransmittingGps, setIsTransmittingGps] = useState(false);
  const [currentCoords, setCurrentCoords] = useState<[number, number] | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number>(0);
  const [lastGpsPing, setLastGpsPing] = useState<string | null>(null);
  const [isSimulatingDrive, setIsSimulatingDrive] = useState(false);
  const simulationStepRef = useRef(0);

  // Proof of Delivery State
  const [isPodModalOpen, setIsPodModalOpen] = useState(false);
  const [podTargetOrder, setPodTargetOrder] = useState<Order | null>(null);
  const [podPhotoPreview, setPodPhotoPreview] = useState<string | null>(null);
  const [podNotes, setPodNotes] = useState('');
  const [codCollected, setCodCollected] = useState(true);
  const [isSubmittingPod, setIsSubmittingPod] = useState(false);

  // 1. Check existing rider login session on mount
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('regasco_rider_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.id) {
          setActiveRider(parsed);
        }
      }
    } catch (e) {}
    setIsLoading(false);

    // Request Web Notification permission if available
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(() => {});
      }
    }
  }, []);

  // 2. Fetch orders assigned to the logged-in rider
  const fetchRiderOrders = async (isSilent = false) => {
    if (!activeRider) return;
    if (!isSilent) setIsRefreshing(true);

    try {
      const res = await fetch(`/api/rider/orders?riderId=${activeRider.id}`);
      if (res.ok) {
        const data = await res.json();
        const currentActive: Order[] = data.active || [];
        const currentDelivered: Order[] = data.delivered || [];
        const currentPickup: Order[] = data.availableForPickup || [];

        // Check if a NEW mission was assigned by Admin
        if (isSilent && currentActive.length > 0) {
          const newOrder = currentActive.find(
            (o) => !previousOrderIdsRef.current.has(o.id) && o.orderStatus !== 'DELIVERED'
          );

          if (newOrder && (!incomingMissionAlert || incomingMissionAlert.id !== newOrder.id)) {
            // Trigger Audio Chime, Device Vibration, and OS Push Notification
            playDispatchChime();
            triggerDeviceBuzz();
            setIncomingMissionAlert(newOrder);

            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('🔥 New Regasco Delivery Assigned!', {
                  body: `Order ${newOrder.orderCode}: 11kg tank to ${newOrder.location.address}`,
                  icon: '/images/regasco-11kg.jpg',
                });
              } catch (e) {}
            }
          }
        }

        // Update tracking ref
        previousOrderIdsRef.current = new Set(currentActive.map((o) => o.id));

        setActiveOrders(currentActive);
        setCompletedOrders(currentDelivered);
        setAvailableForPickup(currentPickup);
      }
    } catch (err) {
      console.warn('Failed to load rider orders:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (activeRider) {
      fetchRiderOrders();
      const interval = setInterval(() => {
        fetchRiderOrders(true);
      }, 4000); // 4-second reactive dispatch polling
      return () => clearInterval(interval);
    }
  }, [activeRider?.id]);

  // 3. Handle Rider Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPin.trim()) {
      setLoginError('Please enter your phone number / rider ID and 4-digit PIN');
      return;
    }

    setIsLoggingIn(true);
    setLoginError(null);

    try {
      const res = await fetch('/api/rider/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier,
          pin: loginPin,
        }),
      });

      const data = await res.json();
      if (res.ok && data.rider) {
        setActiveRider(data.rider);
        try {
          localStorage.setItem('regasco_rider_session', JSON.stringify(data.rider));
        } catch (e) {}
        setLoginIdentifier('');
        setLoginPin('');
      } else {
        setLoginError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setLoginError('Could not connect to authentication service');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 4. Handle Rider Logout
  const handleLogout = () => {
    try {
      localStorage.removeItem('regasco_rider_session');
    } catch (e) {}
    setActiveRider(null);
    setActiveOrders([]);
    setCompletedOrders([]);
    setIsSimulatingDrive(false);
    setIsTransmittingGps(false);
  };

  // 5. Toggle Duty Status
  const toggleDutyStatus = async () => {
    if (!activeRider) return;
    const nextStatus: 'AVAILABLE' | 'OFFLINE' =
      activeRider.status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
    const updated: DispatchRider = { ...activeRider, status: nextStatus };
    setActiveRider(updated);

    try {
      localStorage.setItem('regasco_rider_session', JSON.stringify(updated));
      await fetch('/api/rider/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ riderId: activeRider.id, status: nextStatus }),
      });
    } catch (e) {}
  };

  // 6. Transmit real GPS coordinates to server
  const sendLocationToServer = async (coords: [number, number], speed = 0, heading = 0) => {
    setCurrentCoords(coords);
    setCurrentSpeed(speed);
    setLastGpsPing(new Date().toLocaleTimeString());

    const activeOrderId = activeOrders.length > 0 ? activeOrders[0].id : undefined;

    try {
      await fetch('/api/rider/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          riderId: activeRider?.id,
          orderId: activeOrderId,
          latitude: coords[0],
          longitude: coords[1],
          speed,
          heading,
        }),
      });
    } catch (e) {}
  };

  // 7. Watch GPS Position (HTML5 Geolocation)
  useEffect(() => {
    let watchId: number | null = null;

    if (isTransmittingGps && !isSimulatingDrive) {
      if (typeof window !== 'undefined' && 'geolocation' in navigator) {
        watchId = navigator.geolocation.watchPosition(
          (pos) => {
            const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
            const speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
            const heading = pos.coords.heading || 0;
            sendLocationToServer(coords, speed, heading);
          },
          (err) => {
            console.warn('Geolocation sensor note:', err.message);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 3000 }
        );
      }
    }

    return () => {
      if (watchId !== null && typeof window !== 'undefined' && 'geolocation' in navigator) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [isTransmittingGps, isSimulatingDrive, activeRider?.id, activeOrders]);

  // 8. Drive Simulator along Mindanao Ave for Field & Desktop Testing
  useEffect(() => {
    let simInterval: NodeJS.Timeout | null = null;

    if (isSimulatingDrive) {
      const roadSteps: [number, number][] = [
        [14.6852, 121.0368], // Depot North Hub
        [14.6788, 121.0342], // Mindanao Ave Tandang Sora North
        [14.6730, 121.0315], // Mindanao Ave Flyover
        [14.6672, 121.0288], // Congressional Ave Ext
        [14.6620, 121.0265], // Project 8 Mindanao
        [14.6585, 121.0252], // Doorstep
      ];

      simInterval = setInterval(() => {
        simulationStepRef.current = (simulationStepRef.current + 1) % roadSteps.length;
        const pt = roadSteps[simulationStepRef.current];
        const fakeSpeed = Math.floor(25 + Math.random() * 15);
        sendLocationToServer(pt, fakeSpeed, 185);
      }, 4000);
    }

    return () => {
      if (simInterval) clearInterval(simInterval);
    };
  }, [isSimulatingDrive, activeRider?.id, activeOrders]);

  // 9. Action: Start Delivery
  const handleStartDelivery = async (order: Order) => {
    if (!activeRider) return;
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderStatus: 'OUT_FOR_DELIVERY',
          assignedRider: activeRider,
          riderCoordinates: currentCoords || [14.6852, 121.0368],
        }),
      });

      if (res.ok) {
        setIsTransmittingGps(true);
        setIsSimulatingDrive(true);
        fetchRiderOrders();
      }
    } catch (e) {
      alert('Failed to update delivery status');
    }
  };

  // 10. Action: Claim Order
  const handleClaimOrder = async (order: Order) => {
    if (!activeRider) return;
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedRider: activeRider,
          orderStatus: 'PREPARING',
        }),
      });
      if (res.ok) fetchRiderOrders();
    } catch (e) {}
  };

  // 11. Action: Spawn Example Demo Mission for instant testing
  const handleGenerateDemoOrder = async () => {
    if (!activeRider) return;
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: 'Juan Dela Cruz',
          customerPhone: '0917-882-4242',
          location: {
            address: '142 Mindanao Avenue, Barangay Bahay Toro, Project 8, Quezon City',
            landmark: 'Near 7-Eleven, Green Gate',
            latitude: 14.6585,
            longitude: 121.0252,
          },
          items: [
            {
              productId: 'regasco-11kg',
              productName: 'Regasco 11 KG',
              cylinderOption: 'REFILL',
              unitPrice: 990,
              quantity: 1,
              imageUrl: '/images/regasco-11kg.jpg',
              weightKg: 11,
            },
          ],
          paymentMethod: 'COD',
          notes: 'Deliver to gate & test stove burner',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.order) {
          await fetch(`/api/orders/${data.order.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              assignedRider: activeRider,
              orderStatus: 'OUT_FOR_DELIVERY',
              riderCoordinates: [14.6730, 121.0315],
            }),
          });
          fetchRiderOrders();
        }
      }
    } catch (e) {
      console.warn('Failed to generate test order', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // 12. Open Proof of Delivery Modal
  const openPodModal = (order: Order) => {
    setPodTargetOrder(order);
    setPodPhotoPreview(null);
    setPodNotes('');
    setCodCollected(order.paymentMethod === 'COD');
    setIsPodModalOpen(true);
  };

  // Handle Photo Capture / Upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setPodPhotoPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Submit Proof of Delivery
  const submitPod = async () => {
    if (!podTargetOrder) return;
    setIsSubmittingPod(true);

    try {
      const res = await fetch(`/api/orders/${podTargetOrder.id}/pod`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proofPhoto: podPhotoPreview || '/images/regasco-11kg.jpg',
          notes: podNotes,
          codCollected,
        }),
      });

      if (res.ok) {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });

        setIsPodModalOpen(false);
        setIsSimulatingDrive(false);
        setIsTransmittingGps(false);
        fetchRiderOrders();
      } else {
        alert('Failed to complete delivery submission.');
      }
    } catch (e) {
      alert('Network error while submitting Proof of Delivery');
    } finally {
      setIsSubmittingPod(false);
    }
  };

  // =========================================================================
  // VIEW A: RIDER LOGIN SCREEN (Shown if not logged in)
  // =========================================================================
  if (!activeRider) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center px-4 py-8 font-sans">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Brand Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center mx-auto shadow-lg shadow-orange-600/30">
              <Truck className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">REGASCO RIDER</h1>
              <p className="text-xs text-slate-400 mt-1">Mindanao Central Hub Delivery Cockpit</p>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            {loginError && (
              <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
                Phone Number or Rider Plate
              </label>
              <input
                type="text"
                placeholder="e.g. 0917-555-1201 or QC-8821"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
                4-Digit Security PIN
              </label>
              <div className="relative">
                <input
                  type="password"
                  maxLength={6}
                  placeholder="••••"
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white text-sm tracking-widest outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition"
                />
                <Lock className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 active:scale-[0.98] text-white font-black text-sm tracking-wide shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <Lock className="w-4 h-4" />
              <span>{isLoggingIn ? 'Verifying Account...' : 'LOG IN TO COCKPIT'}</span>
            </button>
          </form>

          {/* Quick Demo Credentials Assistant */}
          <div className="pt-4 border-t border-slate-800 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block text-center">
              Quick 1-Tap Fleet Accounts for Testing:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setLoginIdentifier('0917-555-1201');
                  setLoginPin('1234');
                }}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-left text-xs transition cursor-pointer"
              >
                <p className="font-bold text-orange-400">Kuya Jun Santos</p>
                <p className="text-[10px] text-slate-400">PIN: 1234</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginIdentifier('0922-111-6789');
                  setLoginPin('1234');
                }}
                className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-left text-xs transition cursor-pointer"
              >
                <p className="font-bold text-orange-400">Mark Reyes</p>
                <p className="text-[10px] text-slate-400">PIN: 1234</p>
              </button>
            </div>
          </div>

          <div className="text-center pt-2">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-slate-300 font-semibold transition"
            >
              &larr; Return to Customer Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW B: LOGGED-IN RIDER COCKPIT (Only shows active rider's missions & map)
  // =========================================================================
  const primaryActiveOrder = activeOrders[0];

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans pb-24">
      {/* Floating In-App Delivery Alert Banner */}
      {incomingMissionAlert && (
        <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-top duration-300">
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 text-white rounded-3xl p-4 shadow-2xl border-2 border-amber-300/40 flex flex-col gap-3 backdrop-blur-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 animate-bounce">
                  <Truck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-black tracking-wider bg-black/30 px-2 py-0.5 rounded-full text-amber-200">
                      New Mission Assigned!
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  </div>
                  <h4 className="text-sm font-black tracking-tight mt-0.5">
                    Order {incomingMissionAlert.orderCode}
                  </h4>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIncomingMissionAlert(null)}
                className="w-7 h-7 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white/80 hover:text-white transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-black/25 rounded-2xl p-2.5 text-xs space-y-1 text-slate-100">
              <p className="font-bold flex items-center gap-1.5 text-amber-200 truncate">
                <MapPin className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                <span>{incomingMissionAlert.location.address}</span>
              </p>
              <div className="flex items-center justify-between text-[11px] text-white/90 pt-1 border-t border-white/10">
                <span>Customer: <strong>{incomingMissionAlert.customerName}</strong></span>
                <span className="font-mono font-bold text-amber-300">₱{incomingMissionAlert.totalAmount.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setIncomingMissionAlert(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex-1 py-2.5 rounded-2xl bg-white hover:bg-amber-50 text-orange-700 font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md shadow-black/20 transition cursor-pointer active:scale-95"
              >
                <Navigation className="w-3.5 h-3.5 text-orange-600 fill-orange-600" />
                <span>View Route & Deliver</span>
              </button>
              <button
                type="button"
                onClick={() => setIncomingMissionAlert(null)}
                className="px-3 py-2.5 rounded-2xl bg-black/30 hover:bg-black/40 text-white text-xs font-bold transition cursor-pointer"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Rider Cockpit Header */}
      <header className="bg-slate-950/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-40 px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-orange-600 flex items-center justify-center shadow-lg shadow-orange-600/30 shrink-0">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h1 className="text-sm sm:text-base font-black tracking-tight text-white truncate max-w-[140px] sm:max-w-none">
                  {activeRider.name}
                </h1>
                <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700 whitespace-nowrap">
                  {activeRider.plateNumber}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium truncate">Mindanao Hub Rider</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Duty Status Switch */}
            <button
              onClick={toggleDutyStatus}
              className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                activeRider.status === 'AVAILABLE'
                  ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  activeRider.status === 'AVAILABLE' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                }`}
              />
              <span className="whitespace-nowrap">{activeRider.status === 'AVAILABLE' ? 'On Duty' : 'Off Duty'}</span>
            </button>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 flex items-center justify-center border border-slate-700 transition cursor-pointer shrink-0"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-2xl mx-auto w-full px-3 sm:px-4 pt-3 sm:pt-4 space-y-3 sm:space-y-4 flex-1">
        {/* GPS Telemetry Bar */}
        <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl sm:rounded-3xl p-3 sm:p-4 shadow-xl flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                isTransmittingGps || isSimulatingDrive
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse'
                  : 'bg-slate-700/50 text-slate-400'
              }`}
            >
              <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-black text-white whitespace-nowrap">GPS RADAR</span>
                <span
                  className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${
                    isTransmittingGps || isSimulatingDrive
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-slate-700 text-slate-400'
                  }`}
                >
                  {isTransmittingGps || isSimulatingDrive ? 'BROADCASTING' : 'STANDBY'}
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 font-mono truncate">
                {currentCoords
                  ? `${currentCoords[0].toFixed(4)}, ${currentCoords[1].toFixed(4)} • ${currentSpeed} km/h`
                  : 'Mindanao Hub &bull; Ready for GPS fix'}
              </p>
            </div>
          </div>

          <div className="shrink-0">
            <button
              onClick={() => {
                setIsSimulatingDrive(!isSimulatingDrive);
                setIsTransmittingGps(!isSimulatingDrive);
              }}
              className={`px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold transition flex items-center gap-1 border cursor-pointer whitespace-nowrap ${
                isSimulatingDrive
                  ? 'bg-orange-600 text-white border-orange-500 shadow-md shadow-orange-600/30'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200 border-slate-600'
              }`}
            >
              {isSimulatingDrive ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isSimulatingDrive ? 'Stop Sim' : 'Test Drive'}</span>
            </button>
          </div>
        </div>

        {/* =================================================================== */}
        {/* ACTIVE DISPATCH MISSION CARD WITH EMBEDDED MAP                      */}
        {/* =================================================================== */}
        {primaryActiveOrder ? (
          <div className="bg-gradient-to-b from-slate-800 to-slate-850 border-2 border-orange-500/60 rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 shadow-2xl space-y-3.5 sm:space-y-4">
            {/* Header info */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="min-w-0">
                <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-wider text-orange-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
                  Active Mission
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5 tracking-tight">
                  {primaryActiveOrder.orderCode}
                </h2>
                <p className="text-xs text-slate-400 truncate">
                  Customer: <b className="text-slate-200">{primaryActiveOrder.customerName}</b>
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[11px] font-semibold text-slate-400 block">Total to Collect</span>
                <span className="text-lg sm:text-xl font-black text-emerald-400 block whitespace-nowrap">
                  ₱{primaryActiveOrder.totalAmount.toLocaleString()}
                </span>
                <span
                  className={`text-[10px] font-bold inline-block mt-0.5 px-2 py-0.5 rounded-md whitespace-nowrap ${
                    primaryActiveOrder.paymentMethod === 'COD'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-blue-500/20 text-blue-300'
                  }`}
                >
                  {primaryActiveOrder.paymentMethod === 'COD' ? '💵 Collect Cash' : '✅ Paid via GCash'}
                </span>
              </div>
            </div>

            {/* EMBEDDED TURN-BY-TURN STREET NAVIGATION MAP */}
            <div className="space-y-1.5">
              <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-orange-400" />
                <span>Turn-by-Turn Delivery Route</span>
              </span>
              <RiderDeliveryMap
                customerLocation={primaryActiveOrder.location}
                currentRiderCoords={currentCoords}
                orderStatus={primaryActiveOrder.orderStatus}
                customerName={primaryActiveOrder.customerName}
                orderCode={primaryActiveOrder.orderCode}
              />
            </div>

            {/* Customer Details & Quick Phone Action */}
            <div className="bg-slate-900/80 rounded-2xl p-3 sm:p-3.5 border border-slate-700/70 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs sm:text-sm font-black text-white truncate">{primaryActiveOrder.customerName}</h3>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 uppercase">
                    Customer
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 font-mono mt-0.5">{primaryActiveOrder.customerPhone}</p>
              </div>
              <a
                href={`tel:${primaryActiveOrder.customerPhone}`}
                className="px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/30 transition active:scale-95 cursor-pointer shrink-0"
              >
                <PhoneCall className="w-4 h-4" />
                <span>Call Customer</span>
              </a>
            </div>

            {/* Cylinders to Deliver */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Cylinders on Bike Carrier ({primaryActiveOrder.items.length})
              </span>
              <div className="space-y-1.5">
                {primaryActiveOrder.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Flame className="w-4 h-4 text-orange-500 shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-white truncate">{item.productName}</span>
                        <span className="text-slate-400 text-[11px] ml-1.5">
                          ({item.cylinderOption === 'REFILL' ? 'Refill' : 'New Tank'})
                        </span>
                      </div>
                    </div>
                    <span className="font-black text-orange-400 bg-orange-950/60 px-2 py-0.5 rounded-md border border-orange-800/40 shrink-0 ml-2">
                      x{item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Stage Action Controls */}
            {primaryActiveOrder.orderStatus !== 'OUT_FOR_DELIVERY' ? (
              <button
                onClick={() => handleStartDelivery(primaryActiveOrder)}
                className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-orange-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
              >
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>START DELIVERY (Depart Mindanao Hub)</span>
              </button>
            ) : (
              <button
                onClick={() => openPodModal(primaryActiveOrder)}
                className="w-full py-3.5 sm:py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-[0.98] cursor-pointer"
              >
                <Camera className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span>ARRIVED &bull; SNAP PROOF OF DELIVERY</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bg-slate-800/60 border border-slate-700/60 rounded-3xl p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-slate-700/50 flex items-center justify-center mx-auto text-slate-400">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white">No Active Deliveries Right Now</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                You are currently on duty and available. When the Central Hub admin assigns an order to you, your phone will chime and alert you immediately.
              </p>
            </div>
            <button
              onClick={handleGenerateDemoOrder}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white text-xs font-black transition shadow-lg shadow-orange-600/30 flex items-center justify-center gap-2 mx-auto active:scale-95 cursor-pointer"
            >
              <Flame className="w-4 h-4 fill-white text-white" />
              <span>⚡ Spawn Example Delivery Mission for {activeRider.name}</span>
            </button>
          </div>
        )}

        {/* READY FOR PICKUP QUEUE */}
        {availableForPickup.length > 0 && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Ready at Mindanao Hub ({availableForPickup.length})
              </span>
              <span className="text-[11px] text-orange-400 font-bold">1-Tap Claim</span>
            </div>

            <div className="space-y-2">
              {availableForPickup.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-white">{order.orderCode}</span>
                      <span className="text-[10px] font-bold bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full">
                        {order.items.length} cylinder(s)
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 truncate max-w-xs">{order.location.address}</p>
                    <p className="text-[11px] font-bold text-emerald-400">
                      ₱{order.totalAmount.toLocaleString()} &bull; {order.customerName}
                    </p>
                  </div>

                  <button
                    onClick={() => handleClaimOrder(order)}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black shrink-0 transition shadow-md shadow-orange-600/30 cursor-pointer"
                  >
                    Claim & Load
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TODAY'S COMPLETED DELIVERIES */}
        <div id="completed-drops" className="space-y-2.5 pt-2 scroll-mt-20">
          <span className="text-xs font-black uppercase tracking-wider text-slate-400">
            Today&apos;s Completed Drops ({completedOrders.length})
          </span>

          {completedOrders.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-800/40 border border-slate-800 text-center text-xs text-slate-500">
              No completed deliveries yet today.
            </div>
          ) : (
            <div className="space-y-2">
              {completedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-slate-800/40 border border-slate-800 rounded-2xl p-3 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <div>
                      <span className="font-black text-white">{order.orderCode}</span>
                      <span className="text-slate-400 ml-2">{order.customerName}</span>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-slate-300">
                    ₱{order.totalAmount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* =================================================================== */}
      {/* INCOMING DISPATCH MODAL ALERT (Sound + Buzz + Acceptance Banner)    */}
      {/* =================================================================== */}
      {incomingMissionAlert && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in-95">
          <div className="bg-slate-900 border-2 border-orange-500 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/40 flex items-center justify-center mx-auto animate-bounce">
              <Bell className="w-8 h-8 animate-pulse" />
            </div>

            <div>
              <span className="text-xs font-black uppercase tracking-widest text-orange-400">
                Central Hub Dispatch
              </span>
              <h3 className="text-2xl font-black text-white mt-1">
                New Order Assigned!
              </h3>
              <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
                {incomingMissionAlert.orderCode} &bull; ₱{incomingMissionAlert.totalAmount.toLocaleString()}
              </p>
            </div>

            <div className="bg-slate-800/80 rounded-2xl p-3.5 text-left text-xs space-y-1 border border-slate-700">
              <p className="text-slate-200 font-bold">{incomingMissionAlert.customerName}</p>
              <p className="text-slate-400">{incomingMissionAlert.location.address}</p>
              <p className="text-orange-300 text-[11px] font-medium">
                {incomingMissionAlert.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => setIncomingMissionAlert(null)}
                className="py-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setIncomingMissionAlert(null);
                  handleStartDelivery(incomingMissionAlert);
                }}
                className="py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black transition shadow-lg shadow-orange-600/40 cursor-pointer"
              >
                Accept & Deliver
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PROOF OF DELIVERY (POD) MODAL */}
      {isPodModalOpen && podTargetOrder && (
        <div className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-3xl p-6 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-white">Proof of Delivery</h3>
                <p className="text-xs text-slate-400">Order {podTargetOrder.orderCode}</p>
              </div>
              <button
                onClick={() => setIsPodModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Camera / Photo preview */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">
                Doorstep Photo with Installed Cylinder
              </label>

              {podPhotoPreview ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-700 h-48 bg-slate-950">
                  <Image
                    src={podPhotoPreview}
                    alt="Proof of Delivery"
                    fill
                    className="object-cover"
                  />
                  <button
                    onClick={() => setPodPhotoPreview(null)}
                    className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-red-600/90 text-white text-[11px] font-bold"
                  >
                    Retake
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-700 hover:border-orange-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-slate-800/40">
                  <Camera className="w-8 h-8 text-orange-400" />
                  <span className="text-xs font-bold text-slate-300">Tap to Snap Photo with Camera</span>
                  <span className="text-[11px] text-slate-500">or upload from device gallery</span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* COD Cash Confirmation */}
            {podTargetOrder.paymentMethod === 'COD' && (
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-amber-300">Cash Collected from Customer</p>
                  <p className="text-sm font-black text-white">
                    ₱{podTargetOrder.totalAmount.toLocaleString()}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={codCollected}
                  onChange={(e) => setCodCollected(e.target.checked)}
                  className="w-5 h-5 accent-orange-600 rounded cursor-pointer"
                />
              </div>
            )}

            {/* Safety Valve Verification */}
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 flex items-center gap-2 text-xs text-emerald-300 font-semibold">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Regasco Safety Standard: Leak test completed at customer stove.</span>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                Delivery Notes (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Received by house owner, valve safety inspected"
                value={podNotes}
                onChange={(e) => setPodNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder:text-slate-500 outline-none focus:border-orange-500"
              />
            </div>

            {/* Submit Button */}
            <button
              onClick={submitPod}
              disabled={isSubmittingPod}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs tracking-wider uppercase transition shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmittingPod ? 'Confirming...' : 'Confirm Delivery Complete'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Sticky Mobile Navigation for Rider (3 Balanced Tabs) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-md border-t border-slate-800 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] px-3 shadow-2xl">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex flex-col items-center justify-center gap-1 py-1 text-orange-400 font-extrabold active:scale-95 transition cursor-pointer"
          >
            <Truck className="w-5 h-5" />
            <span className="text-[10px] sm:text-[11px] tracking-tight">Mission</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('completed-drops');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
            className="flex flex-col items-center justify-center gap-1 py-1 text-slate-400 hover:text-white active:scale-95 transition cursor-pointer relative"
          >
            <div className="relative">
              <CheckCircle2 className="w-5 h-5" />
              {completedOrders.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-emerald-600 text-white text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center shadow-xs">
                  {completedOrders.length}
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] tracking-tight">My Drops</span>
          </button>

          <Link
            href="/"
            className="flex flex-col items-center justify-center gap-1 py-1 text-slate-400 hover:text-white active:scale-95 transition cursor-pointer"
          >
            <Flame className="w-5 h-5" />
            <span className="text-[10px] sm:text-[11px] tracking-tight">Storefront</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}
