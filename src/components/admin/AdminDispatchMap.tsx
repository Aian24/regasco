'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Order, StoreSettings, DispatchRider } from '@/types';
import { MapPin, Navigation, Truck, Store, CheckCircle, RefreshCw, Compass, Users } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface AdminDispatchMapProps {
  orders: Order[];
  settings: StoreSettings | null;
  onStepRider?: (orderId: string, nextPointIndex: number) => void;
  onAssignRider?: (orderId: string, rider: DispatchRider) => void;
}

// Default Depot Coordinates: Mindanao Ave North Depot
const DEFAULT_DEPOT: [number, number] = [14.6852, 121.0368];

export default function AdminDispatchMap({
  orders,
  settings,
  onStepRider,
  onAssignRider,
}: AdminDispatchMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const routeLayerRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  // Selected order for focused road trajectory
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [roadPolyline, setRoadPolyline] = useState<[number, number][]>([]);
  const [routeStats, setRouteStats] = useState<{ distanceKm: number; durationMins: number } | null>(null);

  // Priority for dispatch map: Needs Verification (1), Preparing/Confirmed (2), Out for Delivery (3)
  const getDispatchPriority = (o: Order) => {
    if (o.orderStatus === 'PENDING_PAYMENT') return 1;
    if (o.orderStatus === 'ORDER_CONFIRMED' || o.orderStatus === 'PREPARING') return 2;
    if (o.orderStatus === 'OUT_FOR_DELIVERY') return 3;
    return 4;
  };

  // Active delivery orders - prioritized with needs verification first
  const activeOrders = orders
    .filter(
      (o) =>
        o.orderStatus === 'OUT_FOR_DELIVERY' ||
        o.orderStatus === 'PREPARING' ||
        o.orderStatus === 'ORDER_CONFIRMED' ||
        o.orderStatus === 'PENDING_PAYMENT'
    )
    .sort((a, b) => {
      const pA = getDispatchPriority(a);
      const pB = getDispatchPriority(b);
      if (pA !== pB) return pA - pB;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const selectedOrder = activeOrders.find((o) => o.id === selectedOrderId) || activeOrders[0] || null;

  const depotCoords: [number, number] = settings?.mapSettings
    ? [settings.mapSettings.depotLat, settings.mapSettings.depotLng]
    : DEFAULT_DEPOT;

  // Fetch real road route for selected order
  useEffect(() => {
    if (!selectedOrder) return;
    let isCancelled = false;

    async function fetchRoute() {
      const destLat = selectedOrder?.location?.latitude || DEFAULT_DEPOT[0] - 0.02;
      const destLng = selectedOrder?.location?.longitude || DEFAULT_DEPOT[1] - 0.01;

      try {
        const res = await fetch(
          `/api/route?fromLat=${depotCoords[0]}&fromLng=${depotCoords[1]}&toLat=${destLat}&toLng=${destLng}`
        );
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.coordinates) {
            setRoadPolyline(data.coordinates);
            setRouteStats({ distanceKm: data.distanceKm, durationMins: data.durationMins });
          }
        }
      } catch (err) {
        console.warn('Failed to fetch OSRM route for admin map:', err);
      }
    }

    fetchRoute();

    return () => {
      isCancelled = true;
    };
  }, [selectedOrder?.id, depotCoords[0], depotCoords[1]]);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;
      if (mapInstanceRef.current || isInitializedRef.current) return;

      try {
        const leafletModule = await import('leaflet');
        const L = (leafletModule as any).default || leafletModule;

        if (!isMounted || !mapContainerRef.current) return;

        // Fix default icons
        try {
          delete (L.Icon.Default.prototype as any)._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl:
              'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            shadowUrl:
              'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
          });
        } catch (e) {}

        const map = L.map(mapContainerRef.current, {
          center: depotCoords,
          zoom: settings?.mapSettings?.defaultZoom || 13,
          zoomControl: true,
          fadeAnimation: true,
          markerZoomAnimation: true,
        });

        // High quality standard OpenStreetMap tiles
        L.tileLayer(
          'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
          {
            attribution: '&copy; OpenStreetMap contributors | Regasco Mindanao Radar',
            maxZoom: 19,
          }
        ).addTo(map);

        // Layers for dynamic markers & routes
        const routeLayer = L.layerGroup().addTo(map);
        const markersLayer = L.layerGroup().addTo(map);

        routeLayerRef.current = routeLayer;
        markersLayerRef.current = markersLayer;
        mapInstanceRef.current = map;
        isInitializedRef.current = true;

        renderMapElements(L, map, markersLayer, routeLayer);

        setTimeout(() => {
          if (map) map.invalidateSize();
        }, 200);
      } catch (err) {
        console.error('Failed to initialize Leaflet Map in AdminDispatchMap:', err);
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (e) {}
        mapInstanceRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, []);

  // Re-render markers and route polyline when state updates
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current || !routeLayerRef.current) return;

    import('leaflet').then((leafletModule) => {
      const L = (leafletModule as any).default || leafletModule;
      renderMapElements(L, mapInstanceRef.current, markersLayerRef.current, routeLayerRef.current);
    });
  }, [orders, selectedOrderId, roadPolyline]);

  const renderMapElements = (L: any, map: any, markersLayer: any, routeLayer: any) => {
    if (!markersLayer || !routeLayer || !L) return;
    markersLayer.clearLayers();
    routeLayer.clearLayers();

    // 1. Depot Marker
    const depotIcon = L.divIcon({
      className: 'custom-depot-pin',
      html: `
        <div style="background: linear-gradient(135deg, #FF5A00, #DC2626); color: white; padding: 6px; border-radius: 12px; box-shadow: 0 4px 14px rgba(255,90,0,0.6); border: 2.5px solid white; display: flex; align-items: center; justify-content: center; width: 38px; height: 38px;">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="1.5"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
        </div>
      `,
      iconSize: [38, 38],
      iconAnchor: [19, 19],
    });

    const depotMarker = L.marker(depotCoords, { icon: depotIcon }).addTo(markersLayer);
    depotMarker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4;">
        <strong style="color: #FF5A00; font-size: 14px;">${settings?.storeName || 'REGASCO'} Central Depot</strong><br/>
        <span style="color: #334155; font-weight: 600;">${settings?.mapSettings?.depotAddress || 'Mindanao Ave. North Hub'}</span><br/>
        <span style="font-size: 11px; color: #16A34A; font-weight: 800;">● Active Dispatch Station</span>
      </div>
    `);

    // 2. Render OSRM Road Polyline if available
    if (roadPolyline.length > 0) {
      // Glow underlay
      L.polyline(roadPolyline, {
        color: '#FF5A00',
        weight: 6,
        opacity: 0.8,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(routeLayer);
    }

    // 3. Render Order Pins
    activeOrders.forEach((order) => {
      const lat = order.location?.latitude || DEFAULT_DEPOT[0] - 0.02;
      const lng = order.location?.longitude || DEFAULT_DEPOT[1] - 0.01;
      const isSelected = selectedOrder?.id === order.id;

      const isInTransit = order.orderStatus === 'OUT_FOR_DELIVERY';
      const pinBg = isInTransit ? '#FF5A00' : '#2563EB';

      const destIcon = L.divIcon({
        className: 'custom-dest-pin',
        html: `
          <div style="background: ${pinBg}; color: white; padding: 4px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(0,0,0,0.35); border: ${isSelected ? '3.5px solid #FEF08A' : '2.5px solid white'}; display: flex; align-items: center; justify-content: center; width: ${isSelected ? '36px' : '32px'}; height: ${isSelected ? '36px' : '32px'}; font-weight: 900; font-size: 11px;">
            ${order.orderCode.split('-')[1] || 'QC'}
          </div>
        `,
        iconSize: isSelected ? [36, 36] : [32, 32],
        iconAnchor: isSelected ? [18, 18] : [16, 16],
      });

      const destMarker = L.marker([lat, lng], { icon: destIcon }).addTo(markersLayer);
      destMarker.on('click', () => {
        setSelectedOrderId(order.id);
      });

      destMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; min-width: 190px;">
          <strong style="font-size: 13px; color: ${pinBg};">${order.orderCode}</strong> &bull; <b>${order.orderStatus}</b><br/>
          <strong>Customer:</strong> ${order.customerName}<br/>
          <strong>Phone:</strong> ${order.customerPhone}<br/>
          <strong>Address:</strong> ${order.location.address}<br/>
          <strong>Assigned Rider:</strong> ${order.assignedRider?.name || 'Unassigned'}<br/>
          <strong>Total:</strong> ₱${order.totalAmount.toLocaleString()}
        </div>
      `);

      // 4. Moving / Live Rider Marker for this order if active
      if (isInTransit) {
        const riderCoords: [number, number] = order.riderCoordinates || [
          (depotCoords[0] + lat) / 2,
          (depotCoords[1] + lng) / 2,
        ];

        const riderIcon = L.divIcon({
          className: 'custom-rider-pin',
          html: `
            <div style="background: #FFFFFF; color: #FF5A00; border: 3px solid #FF5A00; padding: 6px; border-radius: 50%; box-shadow: 0 4px 16px rgba(255,90,0,0.55); display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF5A00" stroke-width="2.5"><path d="M10 17h4V5H2v12h3m15 0h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
            </div>
          `,
          iconSize: [42, 42],
          iconAnchor: [21, 21],
        });

        const riderMarker = L.marker(riderCoords, { icon: riderIcon, zIndexOffset: 900 }).addTo(markersLayer);
        riderMarker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px;">
            <strong style="color: #FF5A00; font-size: 13px;">${order.assignedRider?.name || 'Regasco Express Rider'}</strong><br/>
            <span>Delivering ${order.orderCode} to ${order.customerName}</span><br/>
            <span style="color: #16A34A; font-weight: bold;">● Live Road GPS Stream Active</span>
          </div>
        `);
      }
    });
  };

  return (
    <div className="space-y-4 w-full">
      {/* Map Control Toolbar */}
      <div className="bg-white border border-slate-200 text-slate-900 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base font-black text-slate-950">
              Mindanao Avenue Real-Time Dispatch Radar
            </h3>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
              OSRM Powered
            </span>
          </div>
          <p className="text-xs font-bold text-slate-700 mt-1">
            Depot: <span className="text-orange-600">{settings?.mapSettings?.depotAddress || 'Mindanao Ave. Central Depot'}</span> &bull; {activeOrders.length} active deliveries
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Active order selector */}
          {activeOrders.length > 0 && (
            <select
              value={selectedOrder?.id || ''}
              onChange={(e) => setSelectedOrderId(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold bg-slate-50 text-slate-800 outline-none focus:border-orange-500 cursor-pointer"
            >
              {activeOrders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderStatus === 'PENDING_PAYMENT'
                    ? '⚠️ [VERIFY GCASH] '
                    : o.orderStatus === 'OUT_FOR_DELIVERY'
                    ? '🛵 [IN TRANSIT] '
                    : '📦 [READY DISPATCH] '}
                  {o.orderCode} &bull; {o.customerName}
                </option>
              ))}
            </select>
          )}

          {routeStats && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 text-xs font-black">
              <span>{routeStats.distanceKm} km</span>
              <span className="text-slate-400">&bull;</span>
              <span>~{routeStats.durationMins} mins ETA</span>
            </div>
          )}
        </div>
      </div>

      {/* Map Canvas Container */}
      <div className="relative w-full h-[450px] md:h-[520px] rounded-3xl overflow-hidden border border-slate-200 shadow-md bg-slate-100">
        <div
          ref={mapContainerRef}
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        />

        {/* Floating Quick Legend */}
        <div className="absolute bottom-4 left-4 z-[500] bg-white/95 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-lg text-xs space-y-1.5 pointer-events-auto">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-md bg-orange-600 shrink-0" />
            <span className="font-bold text-slate-800">Mindanao Central Depot</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-600 shrink-0" />
            <span className="font-bold text-slate-800">Customer Dropoffs</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500 border border-white shrink-0 animate-pulse" />
            <span className="font-bold text-slate-800">Live GPS Motorbike</span>
          </div>
        </div>
      </div>
    </div>
  );
}
