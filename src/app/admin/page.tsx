'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
  Search,
  CheckCircle2,
  Clock,
  Truck,
  DollarSign,
  Package,
  Eye,
  EyeOff,
  Check,
  X,
  Upload,
  PhoneCall,
  RefreshCw,
  Printer,
  AlertTriangle,
  Menu,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Edit,
  Save,
  Lock,
  ExternalLink,
  Shield,
  Smartphone,
  ChevronDown,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import {
  Order,
  OrderStatus,
  StoreSettings,
  Product,
  CustomerSummary,
  DispatchRider,
  PromoBanner,
} from '@/types';
import AdminSidebar, { AdminTab } from '@/components/admin/AdminSidebar';
import TablePagination, { ShowEntriesSelect } from '@/components/admin/TablePagination';
import AdminSalesAnalytics from '@/components/admin/AdminSalesAnalytics';
import dynamic from 'next/dynamic';

// Dynamically import AdminDispatchMap to prevent SSR canvas issues with Leaflet
const AdminDispatchMap = dynamic(
  () => import('@/components/admin/AdminDispatchMap'),
  { ssr: false }
);

// Synthesize audio chime using Web Audio API
function playOrderChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'triangle';

    osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
    osc2.frequency.setValueAtTime(440, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.15);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.5);
    osc2.stop(ctx.currentTime + 0.5);
  } catch (e) {
    console.warn('Audio chime could not be played', e);
  }
}

export default function AdminPage() {
  // Authentication states (Username & Password login, default: admin / admin123)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // App / Data states
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Filters & Search
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>('ALL');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');

  // Pagination & Show Entries states
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPerPage, setOrdersPerPage] = useState(10);
  const [customersPage, setCustomersPage] = useState(1);
  const [customersPerPage, setCustomersPerPage] = useState(10);
  const [productsPage, setProductsPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(8);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPerPage, setHistoryPerPage] = useState(5);

  // Modals & Drawers
  const [inspectScreenshotOrder, setInspectScreenshotOrder] = useState<Order | null>(null);
  const [printableOrder, setPrintableOrder] = useState<Order | null>(null);
  const [rejectOrderModal, setRejectOrderModal] = useState<Order | null>(null);
  const [rejectReasonInput, setRejectReasonInput] = useState('');
  const [dispatchOrderModal, setDispatchOrderModal] = useState<Order | null>(null);
  const [selectedRiderName, setSelectedRiderName] = useState('');
  const [selectedPlateNumber, setSelectedPlateNumber] = useState('');
  const [viewCustomerHistory, setViewCustomerHistory] = useState<CustomerSummary | null>(null);

  // Product CRUD states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState<Partial<Product>>({
    name: '',
    category: 'household',
    weightKg: 11,
    priceRefill: 900,
    priceNewTank: 2400,
    imageUrl: '/images/regasco-11kg.jpg',
    description: '',
    badge: '',
    isAvailable: true,
  });

  // Security Credentials form
  const [newUsername, setNewUsername] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [securityError, setSecurityError] = useState<string | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const prevOrderCountRef = useRef(0);

  // Check saved session on mount
  useEffect(() => {
    const savedToken = sessionStorage.getItem('regasco_admin_token');
    if (savedToken === 'valid') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch admin data
  const fetchData = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const [ordersRes, settingsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/settings'),
      ]);

      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        const newOrders: Order[] = oData.orders || [];

        // Check if new order arrived and play chime
        if (
          prevOrderCountRef.current > 0 &&
          newOrders.length > prevOrderCountRef.current &&
          soundEnabled
        ) {
          playOrderChime();
          showToast('🔔 New customer order received!');
        }
        prevOrderCountRef.current = newOrders.length;
        setOrders(newOrders);
      }

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setSettings(sData.settings || null);
        setProducts(sData.products || []);
        setCustomers(sData.customers || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin data', err);
    } finally {
      setIsLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      const interval = setInterval(() => {
        fetchData();
      }, 8000); // Poll every 8s
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, soundEnabled]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Login handler
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    const validUser = settings?.adminCredentials?.username || 'admin';
    const validPass = settings?.adminCredentials?.passwordHash || 'admin123';

    if (usernameInput.trim() === validUser && passwordInput === validPass) {
      setIsAuthenticated(true);
      sessionStorage.setItem('regasco_admin_token', 'valid');
      setAuthError(null);
      showToast('Welcome to Regasco Store Management');
    } else {
      setAuthError('Invalid credentials. Default: admin / admin123');
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to lock and sign out?')) {
      sessionStorage.removeItem('regasco_admin_token');
      setIsAuthenticated(false);
      setUsernameInput('');
      setPasswordInput('');
    }
  };

  // Order status actions
  const handleUpdateOrderStatus = async (
    orderId: string,
    updates: Partial<Order>
  ) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        const data = await res.json();
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? data.order : o))
        );
        if (inspectScreenshotOrder?.id === orderId) {
          setInspectScreenshotOrder(data.order);
        }
        showToast(`Order ${data.order.orderCode} updated!`);
      } else {
        alert('Failed to update order');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating order');
    }
  };

  // Dispatch driver submit
  const handleConfirmDispatch = async () => {
    if (!dispatchOrderModal) return;
    const riderName = selectedRiderName.trim() || 'Kuya Jun (Express)';
    const plateNumber = selectedPlateNumber.trim() || 'QC-8821';

    const rider: DispatchRider = {
      id: `rider_${Date.now()}`,
      name: riderName,
      phone: '0917-882-4242',
      plateNumber: plateNumber,
      status: 'ON_DELIVERY',
    };

    await handleUpdateOrderStatus(dispatchOrderModal.id, {
      orderStatus: 'OUT_FOR_DELIVERY',
      assignedRider: rider,
      safetyCheckVerified: true,
    });

    setDispatchOrderModal(null);
    setSelectedRiderName('');
    setSelectedPlateNumber('');
  };

  // Reject order submit
  const handleConfirmReject = async () => {
    if (!rejectOrderModal) return;
    const reason = rejectReasonInput.trim() || 'Unable to fulfill at this time';

    await handleUpdateOrderStatus(rejectOrderModal.id, {
      orderStatus: 'CANCELLED',
      rejectReason: reason,
    });

    setRejectOrderModal(null);
    setRejectReasonInput('');
  };

  // Product CRUD
  const handleSaveProduct = async (productToSave: Product) => {
    let updatedProducts: Product[];
    if (products.some((p) => p.id === productToSave.id)) {
      updatedProducts = products.map((p) =>
        p.id === productToSave.id ? productToSave : p
      );
    } else {
      updatedProducts = [...products, productToSave];
    }

    setProducts(updatedProducts);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: updatedProducts }),
    });

    setEditingProduct(null);
    setIsNewProductModalOpen(false);
    showToast(`Product "${productToSave.name}" saved!`);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const updated = products.filter((p) => p.id !== productId);
    setProducts(updated);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: updated }),
    });
    showToast('Product removed');
  };

  // Save Settings
  const handleSaveSettings = async (updatedSettings: StoreSettings) => {
    setSettings(updatedSettings);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: updatedSettings }),
      });
      if (res.ok) {
        showToast('Settings saved successfully!');
      }
    } catch (e) {
      alert('Failed to save settings');
    }
  };

  // Update Security Credentials
  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(null);

    const currentActualPass = settings?.adminCredentials?.passwordHash || 'admin123';
    if (currentPassword !== currentActualPass) {
      setSecurityError('Current password does not match.');
      return;
    }

    if (newPassword.length < 5) {
      setSecurityError('New password must be at least 5 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityError('New passwords do not match.');
      return;
    }

    if (!settings) return;

    const updatedSettings: StoreSettings = {
      ...settings,
      adminCredentials: {
        username: newUsername.trim() || settings.adminCredentials?.username || 'admin',
        passwordHash: newPassword,
      },
    };

    await handleSaveSettings(updatedSettings);
    setSecuritySuccess('Admin username and password updated successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  // Image upload generic helper
  const handleUploadImage = async (
    file: File,
    onSuccess: (url: string) => void
  ) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        onSuccess(data.url);
        showToast('Image uploaded successfully');
      }
    } catch (e) {
      alert('Failed to upload image');
    }
  };

  // KPI calculations
  const totalRevenue = orders
    .filter((o) => o.orderStatus === 'DELIVERED' || o.paymentStatus === 'PAID')
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  const pendingPaymentCount = orders.filter(
    (o) => o.orderStatus === 'PENDING_PAYMENT'
  ).length;

  const inTransitCount = orders.filter(
    (o) => o.orderStatus === 'OUT_FOR_DELIVERY'
  ).length;

  const preparingCount = orders.filter(
    (o) => o.orderStatus === 'PREPARING' || o.orderStatus === 'ORDER_CONFIRMED'
  ).length;

  // Filtered orders
  const filteredOrders = orders.filter((o) => {
    const matchesFilter =
      orderStatusFilter === 'ALL' ||
      (orderStatusFilter === 'NEEDS_VERIFICATION' &&
        o.orderStatus === 'PENDING_PAYMENT') ||
      (orderStatusFilter === 'PREPARING' &&
        (o.orderStatus === 'PREPARING' || o.orderStatus === 'ORDER_CONFIRMED')) ||
      (orderStatusFilter === 'OUT_FOR_DELIVERY' &&
        o.orderStatus === 'OUT_FOR_DELIVERY') ||
      (orderStatusFilter === 'DELIVERED' && o.orderStatus === 'DELIVERED') ||
      (orderStatusFilter === 'CANCELLED' && o.orderStatus === 'CANCELLED') ||
      (orderStatusFilter === 'COD' && o.paymentMethod === 'COD');

    const matchesSearch =
      o.orderCode.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.customerPhone.includes(orderSearchQuery);

    return matchesFilter && matchesSearch;
  });

  // Paginated orders
  const paginatedOrders = filteredOrders.slice(
    (ordersPage - 1) * ordersPerPage,
    ordersPage * ordersPerPage
  );

  // Filtered customers
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
      c.phone.includes(customerSearchQuery) ||
      c.address.toLowerCase().includes(customerSearchQuery.toLowerCase())
  );

  // Paginated customers
  const paginatedCustomers = filteredCustomers.slice(
    (customersPage - 1) * customersPerPage,
    customersPage * customersPerPage
  );

  // Paginated products
  const paginatedProducts = products.slice(
    (productsPage - 1) * productsPerPage,
    productsPage * productsPerPage
  );

  // -----------------------------------------------------------------
  // 1. LOGIN GATE VIEW (White & Orange Theme)
  // -----------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        {/* Soft Ambient Warm Orange Glow */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-200/50 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-orange-100/60 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-md w-full bg-white border border-slate-200/90 rounded-3xl p-8 shadow-xl relative z-10 space-y-6">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 via-orange-600 to-red-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-orange-500/25">
              <Flame className="w-9 h-9 fill-white stroke-orange-200" />
            </div>

            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                REGASCO <span className="text-orange-600">Portal</span>
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Mindanao Avenue Dispatch & Store Administration
              </p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            {authError && (
              <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Username</label>
              <input
                type="text"
                required
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter admin username"
                className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:bg-white focus:border-orange-500 focus:ring-3 focus:ring-orange-500/15 transition"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:bg-white focus:border-orange-500 focus:ring-3 focus:ring-orange-500/15 transition pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 bg-orange-50/70 rounded-2xl border border-orange-100 text-[11px] text-slate-600 flex items-center justify-between">
              <span>Default Credentials:</span>
              <span className="font-mono text-orange-600 font-bold">admin / admin123</span>
            </div>

            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-bold text-sm shadow-md shadow-orange-500/25 transition active:scale-[0.99] cursor-pointer"
            >
              Sign In to Management
            </button>
          </form>

          <div className="text-center pt-2">
            <Link
              href="/"
              className="text-xs text-slate-500 hover:text-orange-600 transition underline font-medium"
            >
              Back to Customer Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------
  // 2. MAIN ADMIN PORTAL (WHITE & ORANGE THEME, 100% FULL WIDTH)
  // -----------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col md:pl-72">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-orange-600 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation: White & Orange Theme */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingPaymentCount={pendingPaymentCount}
        inTransitCount={inTransitCount}
        totalCustomersCount={customers.length}
        storeName={settings?.storeName || 'REGASCO'}
        branchName={settings?.branchName || 'Mindanao Ave. Hub'}
        isStoreOpen={settings?.isStoreOpen ?? true}
        onLogout={handleLogout}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Top Header Bar: Clean White with Subtle Shadow */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileSidebarOpen(true)}
            className="p-2 rounded-xl bg-slate-100 text-slate-700 hover:text-orange-600 md:hidden cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-sm sm:text-base font-black text-slate-900 capitalize flex items-center gap-2">
              {activeTab === 'dashboard' && 'Operations Dashboard'}
              {activeTab === 'orders' && 'Orders & Delivery Dispatch'}
              {activeTab === 'customers' && 'Customer Directory & LTV'}
              {activeTab === 'map' && 'Live GPS Delivery Radar'}
              {activeTab === 'products' && 'Product Catalog & Pricing'}
              {activeTab === 'branding' && 'Branding, Banners & CMS'}
              {activeTab === 'security' && 'Security & Admin Credentials'}
              {activeTab === 'settings' && 'Store, Fees & Map APIs'}
            </h2>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              {settings?.storeName || 'REGASCO'} &bull; {settings?.address || 'Mindanao Avenue, QC'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Audio Chime Toggle */}
          <button
            type="button"
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playOrderChime();
            }}
            className={`px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
              soundEnabled
                ? 'bg-orange-50 text-orange-600 border-orange-200 shadow-xs'
                : 'bg-slate-100 text-slate-500 border-slate-200'
            }`}
            title={soundEnabled ? 'Order Sound Alert: ON' : 'Order Sound Alert: OFF'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-orange-600" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="p-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Refresh Orders & Data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
          </button>
        </div>
      </header>

      {/* Main Tab Content: 100% Full Width (Removed max-w-7xl) */}
      <main className="flex-1 p-4 sm:p-8 w-full space-y-6">
        {/* ============================================================== */}
        {/* TAB 1: DASHBOARD & MONITORING                                  */}
        {/* ============================================================== */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-200 w-full">
            {/* KPI Cards: White & Orange Theme */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              <div
                onClick={() => setActiveTab('sales')}
                className="bg-white border border-slate-200/90 hover:border-orange-300 p-5 rounded-3xl shadow-xs cursor-pointer transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Total Sales Revenue
                  </span>
                  <span className="text-[10px] font-black text-orange-600 group-hover:underline flex items-center gap-0.5">
                    Analytics →
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                    ₱{totalRevenue.toLocaleString()}
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 group-hover:bg-emerald-100 transition">
                    <DollarSign className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-[11px] text-emerald-600 mt-2 font-bold">
                  ● Verified & completed payments
                </p>
              </div>

              <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Orders
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900">
                    {orders.length}
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                    <Package className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-[11px] text-slate-500 mt-2">
                  {orders.filter((o) => o.orderStatus === 'DELIVERED').length} delivered successfully
                </p>
              </div>

              <div className="bg-white border border-amber-200 bg-amber-50/20 p-5 rounded-3xl shadow-xs">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                  Needs Verification
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl sm:text-3xl font-black text-amber-600">
                    {pendingPaymentCount}
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
                    <Clock className="w-5 h-5 animate-pulse" />
                  </div>
                </div>
                <p className="text-[11px] text-amber-700 mt-2 font-medium">
                  GCash screenshot approval pending
                </p>
              </div>

              <div className="bg-white border border-blue-200 bg-blue-50/20 p-5 rounded-3xl shadow-xs">
                <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
                  Active in Transit
                </span>
                <div className="flex items-baseline justify-between mt-2">
                  <span className="text-2xl sm:text-3xl font-black text-blue-600">
                    {inTransitCount}
                  </span>
                  <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
                    <Truck className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-[11px] text-blue-700 mt-2 font-medium">
                  Riders en route along Mindanao Ave
                </p>
              </div>
            </div>

            {/* Quick Actions & Live Stream: Full Width */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full">
              {/* Recent Orders List */}
              <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-orange-600" />
                    <span>Recent Customer Orders</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('orders')}
                    className="text-xs text-orange-600 hover:text-orange-700 font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <span>View All Orders</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {orders.slice(0, 6).map((order) => (
                    <div
                      key={order.id}
                      className="bg-slate-50/80 hover:bg-white p-4 rounded-2xl border border-slate-200/70 hover:border-orange-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition shadow-2xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-orange-600 font-mono">
                            {order.orderCode}
                          </span>
                          <span className="text-xs text-slate-900 font-bold">
                            {order.customerName}
                          </span>
                          <span
                            className={`px-2 py-0.5 text-[10px] font-black rounded-full ${
                              order.orderStatus === 'DELIVERED'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : order.orderStatus === 'OUT_FOR_DELIVERY'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : order.orderStatus === 'PENDING_PAYMENT'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}
                          >
                            {order.orderStatus.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                          {order.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <span className="font-black text-sm text-slate-900 font-mono">
                          ₱{order.totalAmount.toLocaleString()}
                        </span>
                        <button
                          onClick={() => {
                            setActiveTab('orders');
                            setOrderSearchQuery(order.orderCode);
                          }}
                          className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-orange-600 hover:text-white text-xs font-bold text-slate-700 border border-slate-200 transition cursor-pointer"
                        >
                          Manage
                        </button>
                      </div>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6">No orders yet.</p>
                  )}
                </div>
              </div>

              {/* Store Summary & Quick Links */}
              <div className="bg-white border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Flame className="w-4 h-4 text-orange-600" />
                    <span>Store Operating Status</span>
                  </h3>

                  <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Store Ordering:</span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          settings?.isStoreOpen
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {settings?.isStoreOpen ? 'Accepting Orders' : 'Store Paused'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Total Products:</span>
                      <span className="text-xs font-bold text-slate-900">{products.length} Items</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Registered Customers:</span>
                      <span className="text-xs font-bold text-slate-900">{customers.length} Profiles</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">Depot Hub:</span>
                      <span className="text-xs font-bold text-orange-600">Mindanao Ave. North</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-4">
                  <button
                    onClick={() => setActiveTab('sales')}
                    className="w-full py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs hover:border-orange-300"
                  >
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                    <span>View Financial & Sales Analytics</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('map')}
                    className="w-full py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-orange-500/25 cursor-pointer"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>Open Live Dispatch Radar</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('products');
                      setIsNewProductModalOpen(true);
                    }}
                    className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-orange-600" />
                    <span>Add New LPG Product</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: ORDERS MANAGEMENT & DISPATCH                            */}
        {/* ============================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4 animate-in fade-in duration-200 w-full">
            {/* Search & Filter Bar: White & Orange Theme */}
            <div className="bg-white border border-slate-200/90 p-4 sm:p-5 rounded-3xl shadow-xs space-y-3">
              <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <ShowEntriesSelect
                    value={ordersPerPage}
                    onChange={(val) => {
                      setOrdersPerPage(val);
                      setOrdersPage(1);
                    }}
                    options={[5, 10, 25, 50, 100]}
                  />
                  <div className="relative w-full sm:w-80">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={orderSearchQuery}
                      onChange={(e) => {
                        setOrderSearchQuery(e.target.value);
                        setOrdersPage(1);
                      }}
                      placeholder="Search Order Code, customer, or phone..."
                      className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/15"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
                  {[
                    { key: 'ALL', label: `All (${orders.length})` },
                    { key: 'NEEDS_VERIFICATION', label: `Needs Verification (${pendingPaymentCount})` },
                    { key: 'PREPARING', label: `Preparing (${preparingCount})` },
                    { key: 'OUT_FOR_DELIVERY', label: `In Transit (${inTransitCount})` },
                    { key: 'DELIVERED', label: 'Delivered' },
                    { key: 'COD', label: 'COD' },
                    { key: 'CANCELLED', label: 'Rejected' },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => {
                        setOrderStatusFilter(f.key);
                        setOrdersPage(1);
                      }}
                      className={`px-3.5 py-2 rounded-2xl text-xs font-bold shrink-0 transition cursor-pointer whitespace-nowrap ${
                        orderStatusFilter === f.key
                          ? 'bg-orange-600 text-white shadow-md shadow-orange-500/25'
                          : 'bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-orange-600'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-3.5 w-full">
              {paginatedOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-white border border-slate-200/90 hover:border-orange-300 rounded-3xl p-5 sm:p-6 shadow-xs transition space-y-4"
                >
                  {/* Top Bar of Card */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3.5">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-orange-600 font-mono tracking-wide">
                          {order.orderCode}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-black rounded-full uppercase tracking-wider ${
                            order.orderStatus === 'DELIVERED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : order.orderStatus === 'OUT_FOR_DELIVERY'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : order.orderStatus === 'PENDING_PAYMENT'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200 animate-pulse'
                              : order.orderStatus === 'CANCELLED'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}
                        >
                          {order.orderStatus.replace(/_/g, ' ')}
                        </span>
                        {order.safetyCheckVerified && (
                          <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Safety Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Ordered: {new Date(order.createdAt).toLocaleString()} &bull; Payment:{' '}
                        <span className="font-bold text-slate-800">{order.paymentMethod}</span> (
                        <span
                          className={
                            order.paymentStatus === 'PAID'
                              ? 'text-emerald-600 font-bold'
                              : order.paymentStatus === 'REJECTED'
                              ? 'text-red-600'
                              : 'text-amber-600'
                          }
                        >
                          {order.paymentStatus}
                        </span>
                        )
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-xl font-black text-slate-900 font-mono">
                        ₱{order.totalAmount.toLocaleString()}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        Subtotal: ₱{order.subtotal} + Delivery: ₱{order.deliveryFee}
                      </p>
                    </div>
                  </div>

                  {/* Customer & Items Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1.5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 text-sm">{order.customerName}</span>
                        <a
                          href={`tel:${order.customerPhone}`}
                          className="text-orange-600 hover:underline flex items-center gap-1 font-bold"
                        >
                          <PhoneCall className="w-3 h-3" /> {order.customerPhone}
                        </a>
                      </div>
                      <p className="text-slate-600 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0 mt-0.5" />
                        <span>{order.location.address}</span>
                      </p>
                      {order.location.landmark && (
                        <p className="text-slate-500 text-[11px]">
                          <strong>Landmark:</strong> {order.location.landmark}
                        </p>
                      )}
                      {order.notes && (
                        <p className="text-amber-700 text-[11px] italic">
                          <strong>Note:</strong> &ldquo;{order.notes}&rdquo;
                        </p>
                      )}
                      {order.rejectReason && (
                        <p className="text-red-600 text-[11px]">
                          <strong>Rejection Reason:</strong> {order.rejectReason}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
                      <span className="font-bold text-slate-700 block">Ordered Cylinders:</span>
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-slate-800">
                            <span>
                              {item.quantity}x {item.productName}{' '}
                              <span className="text-[10px] text-orange-600 font-bold">
                                ({item.cylinderOption})
                              </span>
                            </span>
                            <span className="font-mono font-bold">₱{item.unitPrice * item.quantity}</span>
                          </div>
                        ))}
                      </div>

                      {order.assignedRider && (
                        <div className="mt-2 pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-blue-700">
                          <span>
                            <strong>Rider:</strong> {order.assignedRider.name}
                          </span>
                          <span>
                            <strong>Plate:</strong> {order.assignedRider.plateNumber}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Controls Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Verify Payment Screenshot Button */}
                      {order.paymentScreenshot && (
                        <button
                          type="button"
                          onClick={() => setInspectScreenshotOrder(order)}
                          className="px-3.5 py-1.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View GCash Receipt</span>
                        </button>
                      )}

                      {/* Print Delivery Slip Button */}
                      <button
                        type="button"
                        onClick={() => setPrintableOrder(order)}
                        className="px-3.5 py-1.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-orange-600" />
                        <span>Print Delivery Slip</span>
                      </button>
                    </div>

                    {/* Status Workflow Action Triggers */}
                    <div className="flex flex-wrap items-center gap-2">
                      {order.orderStatus === 'PENDING_PAYMENT' && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateOrderStatus(order.id, {
                                orderStatus: 'PAYMENT_VERIFIED',
                                paymentStatus: 'PAID',
                              })
                            }
                            className="px-4 py-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Verify & Approve Payment</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectOrderModal(order)}
                            className="px-3.5 py-1.5 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold border border-red-200 transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {(order.orderStatus === 'PAYMENT_VERIFIED' ||
                        order.orderStatus === 'ORDER_CONFIRMED') && (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateOrderStatus(order.id, {
                              orderStatus: 'PREPARING',
                              safetyCheckVerified: true,
                            })
                          }
                          className="px-4 py-1.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/25 transition cursor-pointer"
                        >
                          <Package className="w-3.5 h-3.5" />
                          <span>Proceed to Tank Inspection & Loading</span>
                        </button>
                      )}

                      {order.orderStatus === 'PREPARING' && (
                        <button
                          type="button"
                          onClick={() => {
                            setDispatchOrderModal(order);
                            setSelectedRiderName(settings?.riders?.[0]?.name || 'Kuya Jun Santos');
                            setSelectedPlateNumber(settings?.riders?.[0]?.plateNumber || 'QC-8821');
                          }}
                          className="px-4 py-1.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Assign Driver & Dispatch</span>
                        </button>
                      )}

                      {order.orderStatus === 'OUT_FOR_DELIVERY' && (
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateOrderStatus(order.id, {
                              orderStatus: 'DELIVERED',
                              paymentStatus: 'PAID',
                            })
                          }
                          className="px-4 py-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-500/25 transition cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Mark Delivered (Complete)</span>
                        </button>
                      )}

                      {order.orderStatus !== 'CANCELLED' && order.orderStatus !== 'DELIVERED' && (
                        <button
                          type="button"
                          onClick={() => setRejectOrderModal(order)}
                          className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 text-xs transition cursor-pointer"
                          title="Cancel or reject this order"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {filteredOrders.length === 0 && (
                <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center text-slate-400 text-xs space-y-2">
                  <Package className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>No orders match your filter criteria.</p>
                </div>
              )}
            </div>

            {/* Orders Pagination Controls */}
            {filteredOrders.length > 0 && (
              <TablePagination
                totalItems={filteredOrders.length}
                itemsPerPage={ordersPerPage}
                currentPage={ordersPage}
                onPageChange={setOrdersPage}
                onItemsPerPageChange={setOrdersPerPage}
                perPageOptions={[5, 10, 25, 50, 100]}
                itemLabel="orders"
              />
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB: SALES PERFORMANCE & FINANCIAL ANALYTICS                   */}
        {/* ============================================================== */}
        {activeTab === 'sales' && (
          <AdminSalesAnalytics
            orders={orders}
            products={products}
            onViewOrder={(orderCode) => {
              setActiveTab('orders');
              setOrderSearchQuery(orderCode);
            }}
          />
        )}

        {/* ============================================================== */}
        {/* TAB 3: CUSTOMERS & USERS MONITORING                            */}
        {/* ============================================================== */}
        {activeTab === 'customers' && (
          <div className="space-y-6 animate-in fade-in duration-200 w-full">
            {/* Top Customer KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Active Customers
                </span>
                <span className="text-2xl font-black text-slate-900 mt-1 block">
                  {customers.length}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">Verified ordering accounts</p>
              </div>

              <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Average Customer Spend
                </span>
                <span className="text-2xl font-black text-orange-600 mt-1 block font-mono">
                  ₱
                  {customers.length > 0
                    ? Math.round(
                        customers.reduce((s, c) => s + c.totalSpent, 0) / customers.length
                      ).toLocaleString()
                    : 0}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">Average customer lifetime value</p>
              </div>

              <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Total Customer Orders
                </span>
                <span className="text-2xl font-black text-emerald-600 mt-1 block font-mono">
                  {customers.reduce((s, c) => s + c.totalOrders, 0)}
                </span>
                <p className="text-[11px] text-slate-500 mt-1">Across Quezon City</p>
              </div>
            </div>

            {/* Customers Search & Show entries */}
            <div className="bg-white border border-slate-200/90 p-4 sm:p-5 rounded-3xl shadow-xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <ShowEntriesSelect
                value={customersPerPage}
                onChange={(val) => {
                  setCustomersPerPage(val);
                  setCustomersPage(1);
                }}
                options={[5, 10, 25, 50, 100]}
              />
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setCustomersPage(1);
                  }}
                  placeholder="Search customer name, phone, or address..."
                  className="w-full pl-10 pr-3 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:bg-white focus:border-orange-500"
                />
              </div>
            </div>

            {/* Customer Directory Table */}
            <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-500 text-[11px] uppercase border-b border-slate-200 font-bold">
                    <tr>
                      <th className="px-5 py-3.5">Customer</th>
                      <th className="px-5 py-3.5">Contact & Address</th>
                      <th className="px-5 py-3.5">Lifetime Orders</th>
                      <th className="px-5 py-3.5">Total Spent</th>
                      <th className="px-5 py-3.5">Last Active</th>
                      <th className="px-5 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {paginatedCustomers.map((cust) => (
                      <tr key={cust.id} className="hover:bg-orange-50/40 transition">
                        <td className="px-5 py-4 font-bold text-slate-900">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black text-xs">
                              {cust.name.charAt(0)}
                            </div>
                            <div>
                              <span className="block font-bold">{cust.name}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {cust.id}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <a
                            href={`tel:${cust.phone}`}
                            className="text-orange-600 hover:underline font-mono font-bold block"
                          >
                            {cust.phone}
                          </a>
                          <span className="text-slate-500 line-clamp-1 max-w-sm text-[11px]">
                            {cust.address}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-bold text-slate-900">
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 font-mono text-xs">
                            {cust.totalOrders} {cust.totalOrders === 1 ? 'order' : 'orders'}
                          </span>
                        </td>
                        <td className="px-5 py-4 font-black text-emerald-600 font-mono text-sm">
                          ₱{cust.totalSpent.toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-slate-500 text-[11px]">
                          {new Date(cust.lastOrderDate).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setViewCustomerHistory(cust);
                              setHistoryPage(1);
                            }}
                            className="px-3.5 py-1.5 rounded-2xl bg-slate-100 hover:bg-orange-600 hover:text-white text-xs font-bold text-slate-700 transition cursor-pointer"
                          >
                            Order History
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-slate-400 text-xs">
                          No customers found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer Pagination Controls */}
            {filteredCustomers.length > 0 && (
              <TablePagination
                totalItems={filteredCustomers.length}
                itemsPerPage={customersPerPage}
                currentPage={customersPage}
                onPageChange={setCustomersPage}
                onItemsPerPageChange={setCustomersPerPage}
                perPageOptions={[5, 10, 25, 50, 100]}
                itemLabel="customers"
              />
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 4: LIVE DISPATCH MAP & RIDER RADAR                         */}
        {/* ============================================================== */}
        {activeTab === 'map' && (
          <div className="space-y-4 animate-in fade-in duration-200 w-full">
            <AdminDispatchMap orders={orders} settings={settings} />
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 5: PRODUCTS & PRICES (CRUD)                                */}
        {/* ============================================================== */}
        {activeTab === 'products' && (
          <div className="space-y-4 animate-in fade-in duration-200 w-full">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-slate-200/90 p-5 rounded-3xl shadow-xs">
              <div>
                <h3 className="font-bold text-sm text-slate-900">LPG Products & Cylinder Catalog</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update refill and new tank prices, stock availability, and specs
                </p>
              </div>

              <div className="flex items-center gap-3">
                <ShowEntriesSelect
                  value={productsPerPage}
                  onChange={(val) => {
                    setProductsPerPage(val);
                    setProductsPage(1);
                  }}
                  options={[4, 8, 12, 24, 48]}
                />
                <button
                  type="button"
                  onClick={() => {
                    setProductForm({
                      id: `prod_${Date.now()}`,
                      name: '',
                      category: 'household',
                      weightKg: 11,
                      priceRefill: 990,
                      priceNewTank: 2450,
                      imageUrl: '/images/regasco-11kg.jpg',
                      description: '',
                      badge: '',
                      isAvailable: true,
                    });
                    setIsNewProductModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/25 transition cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add New Product</span>
                </button>
              </div>
            </div>

            {/* Products Grid: Responsive across full width */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 w-full">
              {paginatedProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="bg-white border border-slate-200/90 rounded-3xl p-4 sm:p-5 space-y-3 relative hover:border-orange-300 transition shadow-xs"
                >
                  <div className="flex gap-3">
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-200 relative overflow-hidden shrink-0">
                      <Image
                        src={prod.imageUrl || '/images/regasco-11kg.jpg'}
                        alt={prod.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase text-orange-600">
                          {prod.category} &bull; {prod.weightKg} kg
                        </span>
                        {prod.badge && (
                          <span className="text-[9px] font-bold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full border border-orange-200">
                            {prod.badge}
                          </span>
                        )}
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mt-0.5">{prod.name}</h4>
                      <p className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                        {prod.description}
                      </p>
                    </div>
                  </div>

                  {/* Pricing Box */}
                  <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/70 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 block text-[10px]">Refill Price:</span>
                      <span className="font-black text-orange-600 font-mono text-sm">
                        ₱{prod.priceRefill.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 block text-[10px]">New Tank Price:</span>
                      <span className="font-black text-slate-900 font-mono text-sm">
                        ₱{prod.priceNewTank.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Stock Toggle & Edit Actions */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        handleSaveProduct({
                          ...prod,
                          isAvailable: !prod.isAvailable,
                        })
                      }
                      className={`text-xs font-bold px-3 py-1 rounded-full border transition cursor-pointer ${
                        prod.isAvailable
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-red-50 text-red-700 border-red-200'
                      }`}
                    >
                      {prod.isAvailable ? '● In Stock' : '✕ Out of Stock'}
                    </button>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingProduct(prod);
                          setProductForm(prod);
                        }}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                        title="Edit product specs and price"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteProduct(prod.id)}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 transition cursor-pointer"
                        title="Delete product"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Products Pagination Controls */}
            {products.length > 0 && (
              <TablePagination
                totalItems={products.length}
                itemsPerPage={productsPerPage}
                currentPage={productsPage}
                onPageChange={setProductsPage}
                onItemsPerPageChange={setProductsPerPage}
                perPageOptions={[4, 8, 12, 24, 48]}
                itemLabel="products"
              />
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 6: BRANDING & CMS (LOGOS, BANNERS, COMPANY NAME)           */}
        {/* ============================================================== */}
        {activeTab === 'branding' && settings && (
          <div className="space-y-6 animate-in fade-in duration-200 w-full">
            {/* Identity & Store Name */}
            <div className="bg-white border border-slate-200/90 p-5 sm:p-6 rounded-3xl space-y-4 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Palette className="w-4 h-4 text-orange-600" />
                <span>Store Identity & Logos</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Company / Brand Name</label>
                  <input
                    type="text"
                    value={settings.storeName}
                    onChange={(e) =>
                      setSettings({ ...settings, storeName: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Branch Subtitle</label>
                  <input
                    type="text"
                    value={settings.branchName}
                    onChange={(e) =>
                      setSettings({ ...settings, branchName: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Logo Upload */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white font-black text-xl shadow-md">
                    <Flame className="w-7 h-7 fill-white stroke-orange-200" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Official Brand Logo Emblem</h4>
                    <p className="text-[11px] text-slate-500">
                      Standard vector flame used across navbar, APK icons, and splash
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="brand-logo-file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadImage(file, (url) => {
                          setSettings({ ...settings, logoUrl: url });
                        });
                      }
                    }}
                  />
                  <label
                    htmlFor="brand-logo-file"
                    className="px-4 py-2 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-orange-600" />
                    <span>Upload Custom Logo</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveSettings(settings)}
                  className="px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/25 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Brand Identity</span>
                </button>
              </div>
            </div>

            {/* Homepage Hero Promo Banners Manager */}
            <div className="bg-white border border-slate-200/90 p-5 sm:p-6 rounded-3xl space-y-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Homepage Promo Banners</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage marketing announcements shown to customers
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newBanner: PromoBanner = {
                      id: `banner_${Date.now()}`,
                      title: 'FLASH SALE ₱50 OFF',
                      subtitle: 'Get ₱50 discount on your 11kg tank refill today!',
                      badge: 'SPECIAL PROMO',
                      imageUrl: '/images/regasco-11kg.jpg',
                      isActive: true,
                    };
                    const updated = [...(settings.banners || []), newBanner];
                    setSettings({ ...settings, banners: updated });
                    handleSaveSettings({ ...settings, banners: updated });
                  }}
                  className="px-3.5 py-2 rounded-2xl bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-bold flex items-center gap-1 border border-orange-200 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Banner</span>
                </button>
              </div>

              <div className="space-y-3">
                {(settings.banners || []).map((banner, index) => (
                  <div
                    key={banner.id}
                    className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex-1 space-y-2 w-full">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase bg-orange-100 text-orange-700 px-2 py-0.5 rounded border border-orange-200">
                          {banner.badge || 'PROMO'}
                        </span>
                        <input
                          type="text"
                          value={banner.title}
                          onChange={(e) => {
                            const updated = [...(settings.banners || [])];
                            updated[index].title = e.target.value;
                            setSettings({ ...settings, banners: updated });
                          }}
                          className="bg-transparent font-bold text-xs text-slate-900 outline-none border-b border-transparent focus:border-orange-500 w-full"
                          placeholder="Banner Headline"
                        />
                      </div>
                      <input
                        type="text"
                        value={banner.subtitle}
                        onChange={(e) => {
                          const updated = [...(settings.banners || [])];
                          updated[index].subtitle = e.target.value;
                          setSettings({ ...settings, banners: updated });
                        }}
                        className="bg-transparent text-xs text-slate-500 outline-none border-b border-transparent focus:border-orange-500 w-full"
                        placeholder="Subtitle description"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = [...(settings.banners || [])];
                          updated[index].isActive = !updated[index].isActive;
                          setSettings({ ...settings, banners: updated });
                          handleSaveSettings({ ...settings, banners: updated });
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-bold border transition cursor-pointer ${
                          banner.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-200 text-slate-600 border-slate-300'
                        }`}
                      >
                        {banner.isActive ? 'Active' : 'Hidden'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const updated = (settings.banners || []).filter(
                            (b) => b.id !== banner.id
                          );
                          setSettings({ ...settings, banners: updated });
                          handleSaveSettings({ ...settings, banners: updated });
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* GCash QR & Payment Details */}
            <div className="bg-white border border-slate-200/90 p-5 sm:p-6 rounded-3xl space-y-4 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-orange-600" />
                <span>GCash & Maya Payment Settings</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">GCash Account Name</label>
                  <input
                    type="text"
                    value={settings.gcash.accountName}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        gcash: { ...settings.gcash, accountName: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">GCash Mobile Number</label>
                  <input
                    type="text"
                    value={settings.gcash.accountNumber}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        gcash: { ...settings.gcash, accountNumber: e.target.value },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>
              </div>

              {/* QR Image Upload */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white p-1 relative overflow-hidden border border-slate-200 shadow-2xs">
                    <Image
                      src={settings.gcash.qrImageUrl || '/images/regasco-qr-gcash.jpg'}
                      alt="GCash QR"
                      fill
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Store QR Code Image</h4>
                    <p className="text-[11px] text-slate-500">Displayed at customer checkout</p>
                  </div>
                </div>

                <div>
                  <input
                    type="file"
                    accept="image/*"
                    id="gcash-qr-file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadImage(file, (url) => {
                          const updated = {
                            ...settings,
                            gcash: { ...settings.gcash, qrImageUrl: url },
                          };
                          setSettings(updated);
                          handleSaveSettings(updated);
                        });
                      }
                    }}
                  />
                  <label
                    htmlFor="gcash-qr-file"
                    className="px-4 py-2 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition shadow-2xs"
                  >
                    <Upload className="w-3.5 h-3.5 text-orange-600" />
                    <span>Upload New QR</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveSettings(settings)}
                  className="px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/25 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Payment Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 7: SECURITY & CREDENTIALS (USERNAME & PASSWORD)            */}
        {/* ============================================================== */}
        {activeTab === 'security' && (
          <div className="max-w-xl mx-auto space-y-6 animate-in fade-in duration-200 w-full">
            <div className="bg-white border border-slate-200/90 p-6 sm:p-8 rounded-3xl shadow-xs space-y-5">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Admin Security Credentials</h3>
                  <p className="text-xs text-slate-500">
                    Change administrative login username and password
                  </p>
                </div>
              </div>

              {securitySuccess && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{securitySuccess}</span>
                </div>
              )}

              {securityError && (
                <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{securityError}</span>
                </div>
              )}

              <form onSubmit={handleUpdateCredentials} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Admin Username (Current: &ldquo;{settings?.adminCredentials?.username || 'admin'}&rdquo;)
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    placeholder="Enter new username"
                    onChange={(e) => setNewUsername(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Current Password</label>
                  <input
                    type="password"
                    required
                    value={currentPassword}
                    placeholder="Enter current password (default: admin123)"
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    placeholder="Enter new password (at least 5 characters)"
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    placeholder="Confirm new password"
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 text-sm outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs shadow-md shadow-orange-500/25 transition cursor-pointer"
                >
                  Update Admin Credentials
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 8: STORE & MAP APIS                                        */}
        {/* ============================================================== */}
        {activeTab === 'settings' && settings && (
          <div className="space-y-6 animate-in fade-in duration-200 w-full">
            {/* Store & Delivery Fees */}
            <div className="bg-white border border-slate-200/90 p-5 sm:p-6 rounded-3xl space-y-4 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-orange-600" />
                <span>Store Operations & Delivery Rules</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Mindanao Ave Hotline</label>
                  <input
                    type="text"
                    value={settings.phoneHotline}
                    onChange={(e) =>
                      setSettings({ ...settings, phoneHotline: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Operating Hours</label>
                  <input
                    type="text"
                    value={settings.operatingHours}
                    onChange={(e) =>
                      setSettings({ ...settings, operatingHours: e.target.value })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Base Delivery Fee (₱)</label>
                  <input
                    type="number"
                    value={settings.deliveryFee}
                    onChange={(e) =>
                      setSettings({ ...settings, deliveryFee: Number(e.target.value) })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Free Delivery Threshold (₱)</label>
                  <input
                    type="number"
                    value={settings.freeDeliveryThreshold}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        freeDeliveryThreshold: Number(e.target.value),
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Store Open/Close Toggle */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/70 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Accept Customer Orders</h4>
                  <p className="text-[11px] text-slate-500">
                    Switch off during night hours or maintenance to pause checkout
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettings({ ...settings, isStoreOpen: !settings.isStoreOpen })
                  }
                  className={`px-4 py-2 rounded-2xl text-xs font-bold transition cursor-pointer shadow-xs ${
                    settings.isStoreOpen
                      ? 'bg-emerald-600 text-white'
                      : 'bg-red-600 text-white'
                  }`}
                >
                  {settings.isStoreOpen ? 'Store is OPEN' : 'Store is CLOSED'}
                </button>
              </div>
            </div>

            {/* Map APIs & Depot GPS */}
            <div className="bg-white border border-slate-200/90 p-5 sm:p-6 rounded-3xl space-y-4 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-600" />
                <span>Depot GPS & Map Radar API</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Depot Latitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={settings.mapSettings?.depotLat || 14.6852}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mapSettings: {
                          ...settings.mapSettings!,
                          depotLat: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Depot Longitude</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={settings.mapSettings?.depotLng || 121.0368}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mapSettings: {
                          ...settings.mapSettings!,
                          depotLng: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Default Radar Zoom</label>
                  <input
                    type="number"
                    value={settings.mapSettings?.defaultZoom || 14}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mapSettings: {
                          ...settings.mapSettings!,
                          defaultZoom: Number(e.target.value),
                        },
                      })
                    }
                    className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 outline-none focus:bg-white focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Depot Physical Address</label>
                <input
                  type="text"
                  value={settings.mapSettings?.depotAddress || 'Mindanao Ave. Central Depot'}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      mapSettings: {
                        ...settings.mapSettings!,
                        depotAddress: e.target.value,
                      },
                    })
                  }
                  className="w-full px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-sm text-slate-900 outline-none focus:bg-white focus:border-orange-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveSettings(settings)}
                  className="px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/25 transition cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save All Settings</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ============================================================== */}
      {/* MODAL 1: INSPECT GCASH / MAYA PAYMENT SCREENSHOT               */}
      {/* ============================================================== */}
      {inspectScreenshotOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">Payment Verification</h3>
              <button
                onClick={() => setInspectScreenshotOrder(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1 text-slate-700">
              <p>
                <strong>Order:</strong> {inspectScreenshotOrder.orderCode} &bull;{' '}
                <strong>Amount:</strong> ₱{inspectScreenshotOrder.totalAmount.toLocaleString()}
              </p>
              <p>
                <strong>Customer:</strong> {inspectScreenshotOrder.customerName} ({inspectScreenshotOrder.customerPhone})
              </p>
              {inspectScreenshotOrder.paymentRefNumber && (
                <p className="text-orange-600 font-mono font-bold">
                  Ref #: {inspectScreenshotOrder.paymentRefNumber}
                </p>
              )}
            </div>

            {/* High-res Image Preview */}
            <div className="w-full h-72 relative rounded-2xl overflow-hidden bg-slate-50 border border-slate-200">
              <Image
                src={inspectScreenshotOrder.paymentScreenshot!}
                alt="Payment proof screenshot"
                fill
                className="object-contain"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={async () => {
                  await handleUpdateOrderStatus(inspectScreenshotOrder.id, {
                    orderStatus: 'PAYMENT_VERIFIED',
                    paymentStatus: 'PAID',
                  });
                  setInspectScreenshotOrder(null);
                }}
                className="flex-1 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Approve & Verify</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = inspectScreenshotOrder;
                  setInspectScreenshotOrder(null);
                  setRejectOrderModal(target);
                }}
                className="px-4 py-2.5 rounded-2xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition cursor-pointer border border-red-200"
              >
                Reject Proof
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: ASSIGN DRIVER & DISPATCH                              */}
      {/* ============================================================== */}
      {dispatchOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-orange-600" />
                <span>Assign Driver & Dispatch Order</span>
              </h3>
              <button
                onClick={() => setDispatchOrderModal(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1 text-slate-700">
              <p>
                <strong>Order:</strong> {dispatchOrderModal.orderCode} &bull;{' '}
                {dispatchOrderModal.customerName}
              </p>
              <p className="text-slate-500 line-clamp-1">{dispatchOrderModal.location.address}</p>
            </div>

            {/* Safety Seal Verification Box */}
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                <strong>Regasco Safety Standard:</strong> Tare weight verified and leak detector test passed.
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Select Dispatch Rider</label>
                <select
                  value={selectedRiderName}
                  onChange={(e) => {
                    setSelectedRiderName(e.target.value);
                    const r = settings?.riders?.find((rd) => rd.name === e.target.value);
                    if (r) setSelectedPlateNumber(r.plateNumber);
                  }}
                  className="w-full px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:border-orange-500"
                >
                  {(settings?.riders || []).map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name} ({r.plateNumber})
                    </option>
                  ))}
                  <option value="Custom Rider">Enter Custom Rider...</option>
                </select>
              </div>

              {selectedRiderName === 'Custom Rider' && (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Rider Full Name"
                    onChange={(e) => setSelectedRiderName(e.target.value)}
                    className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Vehicle Plate #"
                    value={selectedPlateNumber}
                    onChange={(e) => setSelectedPlateNumber(e.target.value)}
                    className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none"
                  />
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleConfirmDispatch}
              className="w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition cursor-pointer"
            >
              Confirm Dispatch & Move to Delivery
            </button>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: REJECT / CANCEL ORDER                                 */}
      {/* ============================================================== */}
      {rejectOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-red-600">Cancel / Reject Order</h3>
              <button
                onClick={() => setRejectOrderModal(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-700">
              Are you sure you want to cancel order <strong>{rejectOrderModal.orderCode}</strong> for{' '}
              {rejectOrderModal.customerName}?
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Rejection Reason</label>
              <textarea
                rows={3}
                value={rejectReasonInput}
                onChange={(e) => setRejectReasonInput(e.target.value)}
                placeholder="e.g. Phone unreachable, Out of coverage zone, Invalid GCash payment proof..."
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleConfirmReject}
                className="flex-1 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition cursor-pointer"
              >
                Confirm Cancellation
              </button>
              <button
                type="button"
                onClick={() => setRejectOrderModal(null)}
                className="px-4 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: PRINTABLE DELIVERY SLIP (OR/DR)                       */}
      {/* ============================================================== */}
      {printableOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white text-slate-900 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-6 h-6 text-orange-600 fill-orange-600" />
                <h3 className="font-black text-base tracking-tight text-blue-900">
                  REGASCO OFFICIAL DELIVERY RECEIPT
                </h3>
              </div>
              <button
                onClick={() => setPrintableOrder(null)}
                className="text-slate-500 hover:text-black print:hidden cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-1">
              <p>
                <strong>Branch:</strong> Mindanao Ave. Central Hub, Quezon City
              </p>
              <p>
                <strong>Hotline:</strong> 0917-882-4242 &bull; <strong>Date:</strong>{' '}
                {new Date(printableOrder.createdAt).toLocaleString()}
              </p>
              <p className="font-mono font-bold text-sm text-orange-600">
                DR/OR #: {printableOrder.orderCode}
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1 border border-slate-200">
              <p>
                <strong>Customer:</strong> {printableOrder.customerName}
              </p>
              <p>
                <strong>Contact:</strong> {printableOrder.customerPhone}
              </p>
              <p>
                <strong>Address:</strong> {printableOrder.location.address}
              </p>
              {printableOrder.location.landmark && (
                <p>
                  <strong>Landmark:</strong> {printableOrder.location.landmark}
                </p>
              )}
            </div>

            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b text-slate-500 uppercase text-[10px]">
                  <th className="py-1.5">Item Description</th>
                  <th className="py-1.5 text-center">Qty</th>
                  <th className="py-1.5 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {printableOrder.items.map((i, idx) => (
                  <tr key={idx}>
                    <td className="py-2 font-medium">
                      {i.productName} ({i.cylinderOption})
                    </td>
                    <td className="py-2 text-center">{i.quantity}</td>
                    <td className="py-2 text-right font-mono font-bold">
                      ₱{(i.unitPrice * i.quantity).toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={2} className="py-1.5 text-right text-slate-500">
                    Delivery Fee:
                  </td>
                  <td className="py-1.5 text-right font-mono font-bold">
                    ₱{printableOrder.deliveryFee}
                  </td>
                </tr>
                <tr className="font-black text-sm border-t-2">
                  <td colSpan={2} className="py-2 text-right">
                    TOTAL DUE:
                  </td>
                  <td className="py-2 text-right font-mono text-orange-600">
                    ₱{printableOrder.totalAmount.toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="pt-2 border-t text-[11px] text-slate-600 space-y-1">
              <p>
                <strong>Payment Method:</strong> {printableOrder.paymentMethod} (
                {printableOrder.paymentStatus})
              </p>
              <p className="text-[10px] text-emerald-700 font-bold">
                ✓ SAFETY SEAL VERIFIED: Leak-tested upon departure.
              </p>
            </div>

            <div className="pt-4 border-t flex justify-between text-[11px] text-slate-500">
              <div>
                <p className="border-b border-slate-400 w-32 pb-4"></p>
                <p className="pt-1">Rider Signature</p>
              </div>
              <div>
                <p className="border-b border-slate-400 w-32 pb-4"></p>
                <p className="pt-1">Customer Received By</p>
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-2 print:hidden">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-orange-500/25"
              >
                <Printer className="w-4 h-4" />
                <span>Print Document</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: CUSTOMER ORDER HISTORY DRILL-DOWN                     */}
      {/* ============================================================== */}
      {viewCustomerHistory && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-600" />
                <span>{viewCustomerHistory.name} &bull; Order History</span>
              </h3>
              <button
                onClick={() => setViewCustomerHistory(null)}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <p>
                <strong>Phone:</strong> {viewCustomerHistory.phone} &bull;{' '}
                <strong>Total Orders:</strong> {viewCustomerHistory.totalOrders}
              </p>
              <p className="text-emerald-700 font-bold">
                Total Lifetime Spend: ₱{viewCustomerHistory.totalSpent.toLocaleString()}
              </p>
              <p className="text-slate-500 text-[11px]">{viewCustomerHistory.address}</p>
            </div>

            {(() => {
              const customerHistoryOrders = orders.filter(
                (o) =>
                  o.customerPhone === viewCustomerHistory.phone ||
                  o.customerName.toLowerCase() === viewCustomerHistory.name.toLowerCase()
              );
              const paginatedHistoryOrders = customerHistoryOrders.slice(
                (historyPage - 1) * historyPerPage,
                historyPage * historyPerPage
              );

              return (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700">
                      Past Orders ({customerHistoryOrders.length})
                    </h4>
                    {customerHistoryOrders.length > 5 && (
                      <ShowEntriesSelect
                        value={historyPerPage}
                        onChange={(val) => {
                          setHistoryPerPage(val);
                          setHistoryPage(1);
                        }}
                        options={[5, 10, 20]}
                      />
                    )}
                  </div>

                  <div className="space-y-2">
                    {paginatedHistoryOrders.map((o) => (
                      <div
                        key={o.id}
                        className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between"
                      >
                        <div>
                          <span className="font-mono font-bold text-orange-600">{o.orderCode}</span>
                          <span className="text-slate-500 text-[11px] block">
                            {new Date(o.createdAt).toLocaleDateString()} &bull; {o.orderStatus}
                          </span>
                        </div>
                        <span className="font-bold text-slate-900 font-mono">
                          ₱{o.totalAmount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    {customerHistoryOrders.length === 0 && (
                      <p className="text-xs text-slate-400 text-center py-4">No past orders found.</p>
                    )}
                  </div>

                  {customerHistoryOrders.length > historyPerPage && (
                    <TablePagination
                      totalItems={customerHistoryOrders.length}
                      itemsPerPage={historyPerPage}
                      currentPage={historyPage}
                      onPageChange={setHistoryPage}
                      onItemsPerPageChange={setHistoryPerPage}
                      perPageOptions={[5, 10, 20]}
                      itemLabel="orders"
                    />
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: ADD / EDIT PRODUCT                                    */}
      {/* ============================================================== */}
      {(isNewProductModalOpen || editingProduct) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm text-slate-900">
                {editingProduct ? 'Edit LPG Product' : 'Add New LPG Cylinder'}
              </h3>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsNewProductModalOpen(false);
                }}
                className="text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const prod: Product = {
                  id: productForm.id || `prod_${Date.now()}`,
                  name: productForm.name || 'Regasco LPG',
                  category: productForm.category || 'household',
                  weightKg: Number(productForm.weightKg || 11),
                  priceRefill: Number(productForm.priceRefill || 0),
                  priceNewTank: Number(productForm.priceNewTank || 0),
                  imageUrl: productForm.imageUrl || '/images/regasco-11kg.jpg',
                  description: productForm.description || '',
                  badge: productForm.badge,
                  isAvailable: productForm.isAvailable ?? true,
                };
                handleSaveProduct(prod);
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Product Name</label>
                <input
                  type="text"
                  required
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="e.g. Regasco 11 KG"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 outline-none focus:bg-white focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Category</label>
                  <select
                    value={productForm.category}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        category: e.target.value as any,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                  >
                    <option value="household">Household</option>
                    <option value="portable">Portable (SK)</option>
                    <option value="commercial">Commercial</option>
                    <option value="industrial">Industrial</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Weight (KG)</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={productForm.weightKg}
                    onChange={(e) =>
                      setProductForm({ ...productForm, weightKg: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Refill Price (₱)</label>
                  <input
                    type="number"
                    required
                    value={productForm.priceRefill}
                    onChange={(e) =>
                      setProductForm({ ...productForm, priceRefill: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">New Tank Price (₱)</label>
                  <input
                    type="number"
                    required
                    value={productForm.priceNewTank}
                    onChange={(e) =>
                      setProductForm({ ...productForm, priceNewTank: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Image URL / Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={productForm.imageUrl}
                    onChange={(e) => setProductForm({ ...productForm, imageUrl: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                  />
                  <input
                    type="file"
                    accept="image/*"
                    id="prod-upload-file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleUploadImage(file, (url) => {
                          setProductForm({ ...productForm, imageUrl: url });
                        });
                      }
                    }}
                  />
                  <label
                    htmlFor="prod-upload-file"
                    className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer shrink-0 flex items-center justify-center border border-slate-200"
                  >
                    <Upload className="w-4 h-4" />
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Badge (Optional)</label>
                <input
                  type="text"
                  value={productForm.badge || ''}
                  onChange={(e) => setProductForm({ ...productForm, badge: e.target.value })}
                  placeholder="e.g. Best Seller, Popular"
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Description</label>
                <textarea
                  rows={2}
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm({ ...productForm, description: e.target.value })
                  }
                  className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 outline-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs transition cursor-pointer shadow-md shadow-orange-500/25"
                >
                  Save Product
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingProduct(null);
                    setIsNewProductModalOpen(false);
                  }}
                  className="px-4 py-2.5 rounded-2xl bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
