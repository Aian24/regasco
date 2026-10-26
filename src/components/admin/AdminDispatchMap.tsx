'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Order, StoreSettings } from '@/types';
import { MapPin, Navigation, Truck, Store, CheckCircle, RefreshCw } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface AdminDispatchMapProps {
  orders: Order[];
  settings: StoreSettings | null;
  onStepRider?: (orderId: string, nextPointIndex: number) => void;
}

// Default Depot Coordinates: Mindanao Ave North Depot
const DEFAULT_DEPOT: [number, number] = [14.6852, 121.0368];

// Real Road Waypoints along Mindanao Avenue
const ROAD_WAYPOINTS: [number, number][] = [
  [14.6852, 121.0368], // Point 0: Depot North Hub
  [14.6788, 121.0342], // Point 1: Tandang Sora North
  [14.6730, 121.0315], // Point 2: Tandang Sora Flyover
  [14.6672, 121.0288], // Point 3: Congressional Ext.
  [14.6620, 121.0265], // Point 4: Mindanao Ave / Congressional Ave
  [14.6585, 121.0252], // Point 5: Customer Doorstep (Project 8 / Bahay Toro)
];

export default function AdminDispatchMap({
  orders,
  settings,
  onStepRider,
}: AdminDispatchMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  const [activeWaypointIndex, setActiveWaypointIndex] = useState(2);

  // Active delivery orders
  const activeOrders = orders.filter(
    (o) => o.orderStatus === 'OUT_FOR_DELIVERY' || o.orderStatus === 'PREPARING'
  );

  const depotCoords: [number, number] = settings?.mapSettings
    ? [settings.mapSettings.depotLat, settings.mapSettings.depotLng]
    : DEFAULT_DEPOT;

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
            attribution: '&copy; OpenStreetMap contributors | Regasco Mindanao',
            maxZoom: 19,
          }
        ).addTo(map);

        // Layer group for dynamic markers
        const markersLayer = L.layerGroup().addTo(map);
        markersLayerRef.current = markersLayer;
        mapInstanceRef.current = map;
        isInitializedRef.current = true;

        renderMarkers(L, map, markersLayer);

        // Force Leaflet to recalculate container size
        setTimeout(() => {
          if (map) {
            map.invalidateSize();
          }
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

  // Update markers when orders or waypoint changes
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;

    import('leaflet').then((leafletModule) => {
      const L = (leafletModule as any).default || leafletModule;
      renderMarkers(L, mapInstanceRef.current, markersLayerRef.current);
    });
  }, [orders, activeWaypointIndex]);

  const renderMarkers = (L: any, map: any, layer: any) => {
    if (!layer || !L) return;
    layer.clearLayers();

    // 1. Depot Marker (Mindanao Ave North Hub)
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

    const depotMarker = L.marker(depotCoords, { icon: depotIcon }).addTo(layer);
    depotMarker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4;">
        <strong style="color: #FF5A00; font-size: 14px;">${settings?.storeName || 'REGASCO'} Central Depot</strong><br/>
        <span style="color: #334155; font-weight: 600;">${settings?.mapSettings?.depotAddress || 'Mindanao Ave. North Hub'}</span><br/>
        <span style="font-size: 11px; color: #16A34A; font-weight: 800;">● Active Dispatch Station</span>
      </div>
    `);

    // 2. Road Trajectory Line for Mindanao Ave
    L.polyline(ROAD_WAYPOINTS, {
      color: '#FF5A00',
      weight: 5,
      opacity: 0.85,
      dashArray: '8, 8',
    }).addTo(layer);

    // 3. Active Delivery Order Destinations
    orders.forEach((order) => {
      const lat = order.location?.latitude || DEFAULT_DEPOT[0] - 0.02;
      const lng = order.location?.longitude || DEFAULT_DEPOT[1] - 0.01;

      const isDelivered = order.orderStatus === 'DELIVERED';
      const isInTransit = order.orderStatus === 'OUT_FOR_DELIVERY';

      const pinBg = isDelivered ? '#16A34A' : isInTransit ? '#FF5A00' : '#2563EB';

      const destIcon = L.divIcon({
        className: 'custom-dest-pin',
        html: `
          <div style="background: ${pinBg}; color: white; padding: 4px; border-radius: 9999px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); border: 2.5px solid white; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; font-weight: 900; font-size: 11px;">
            ${order.orderCode.split('-')[1] || 'QC'}
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const destMarker = L.marker([lat, lng], { icon: destIcon }).addTo(layer);
      destMarker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4; min-width: 180px;">
          <strong style="font-size: 13px;">${order.orderCode}</strong> &bull; <span style="color: ${pinBg}; font-weight: 800;">${order.orderStatus}</span><br/>
          <strong>Customer:</strong> ${order.customerName}<br/>
          <strong>Phone:</strong> ${order.customerPhone}<br/>
          <strong>Address:</strong> ${order.location.address}<br/>
          <strong>Total:</strong> ₱${order.totalAmount.toLocaleString()}
        </div>
      `);
    });

    // 4. Moving Rider Marker
    const riderCoords = ROAD_WAYPOINTS[activeWaypointIndex] || ROAD_WAYPOINTS[2];
    const riderIcon = L.divIcon({
      className: 'custom-rider-pin',
      html: `
        <div style="background: #FFFFFF; color: #FF5A00; border: 3px solid #FF5A00; padding: 6px; border-radius: 50%; box-shadow: 0 4px 16px rgba(255,90,0,0.5); display: flex; align-items: center; justify-content: center; width: 40px; height: 40px;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF5A00" stroke-width="2.5"><path d="M10 17h4V5H2v12h3m15 0h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    const riderMarker = L.marker(riderCoords, { icon: riderIcon }).addTo(layer);
    riderMarker.bindPopup(`
      <div style="font-family: sans-serif; font-size: 12px;">
        <strong style="color: #FF5A00; font-size: 13px;">Regasco Express Rider</strong><br/>
        <span>Rider: Kuya Jun Santos &bull; Plate # QC-8821</span><br/>
        <span style="color: #16A34A; font-weight: bold;">● Active Delivery on Mindanao Ave</span>
      </div>
    `);
  };

  const handleStepForward = () => {
    setActiveWaypointIndex((prev) => {
      const next = prev + 1 >= ROAD_WAYPOINTS.length ? 0 : prev + 1;
      return next;
    });
  };

  return (
    <div className="space-y-4 w-full">
      {/* Map Control Toolbar: High Contrast White & Orange */}
      <div className="bg-white border border-slate-200 text-slate-900 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-base font-black text-slate-950">
              Mindanao Avenue Real-Time Dispatch Radar
            </h3>
          </div>
          <p className="text-xs font-bold text-slate-700 mt-1">
            Depot: <span className="text-orange-600">{settings?.mapSettings?.depotAddress || 'Mindanao Ave. Central Depot'}</span> &bull; {activeOrders.length} active deliveries
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Rider Step / Simulator button */}
          <button
            onClick={handleStepForward}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black transition shadow-md shadow-orange-500/25 cursor-pointer active:scale-95"
          >
            <Navigation className="w-4 h-4 fill-white" />
            <span>Step Rider Forward (Waypoint {activeWaypointIndex + 1}/{ROAD_WAYPOINTS.length})</span>
          </button>

          <button
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setView(depotCoords, 14);
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 text-xs font-black transition cursor-pointer shadow-xs active:scale-95"
          >
            <Store className="w-4 h-4 text-orange-600" />
            <span>Reset to Depot</span>
          </button>
        </div>
      </div>

      {/* Embedded Map Canvas: Guaranteed Visible Height and Border */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-slate-200 shadow-md bg-slate-100 w-full">
        <div
          ref={mapContainerRef}
          className="w-full z-10"
          style={{ height: '620px', minHeight: '620px' }}
        />

        {/* Legend Overlay: High Contrast Card */}
        <div className="absolute bottom-5 left-5 z-20 bg-white/95 backdrop-blur-md border border-slate-200 p-4 rounded-2xl text-xs text-slate-800 space-y-2 shadow-xl">
          <div className="font-black text-slate-950 flex items-center gap-1.5 pb-1 border-b border-slate-100">
            <MapPin className="w-4 h-4 text-orange-600" />
            <span>Delivery Radar Legend</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-orange-600 shadow-xs" />
            <span className="font-bold">Store Depot (Mindanao Ave Hub)</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-white border-2 border-orange-600 shadow-xs" />
            <span className="font-bold">Delivery Rider in Transit</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-blue-600 shadow-xs" />
            <span className="font-bold">Preparing Orders</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 shadow-xs" />
            <span className="font-bold">Completed Deliveries</span>
          </div>
        </div>
      </div>
    </div>
  );
}
