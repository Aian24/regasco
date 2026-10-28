'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DeliveryLocation, OrderStatus } from '@/types';
import { Navigation, Compass, Crosshair, MapPin, ExternalLink } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { getPositionAlongPath } from '@/lib/routing';

interface RiderDeliveryMapProps {
  customerLocation: DeliveryLocation;
  depotCoords?: [number, number];
  currentRiderCoords: [number, number] | null;
  orderStatus: OrderStatus;
  customerName?: string;
  orderCode?: string;
}

const DEFAULT_DEPOT: [number, number] = [14.6852, 121.0368];

export default function RiderDeliveryMap({
  customerLocation,
  depotCoords = DEFAULT_DEPOT,
  currentRiderCoords,
  orderStatus,
  customerName = 'Customer',
  orderCode = 'ORDER',
}: RiderDeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<{ depot?: any; rider?: any; customer?: any; dest?: any }>({});
  const polylineRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  const [roadCoordinates, setRoadCoordinates] = useState<[number, number][]>([]);
  const [distanceKm, setDistanceKm] = useState<number>(3.5);
  const [etaMins, setEtaMins] = useState<number>(12);

  const custLat = customerLocation.latitude || 14.6585;
  const custLng = customerLocation.longitude || 121.0252;
  const customerPoint: [number, number] = [custLat, custLng];

  // Fetch real road route from OSRM
  useEffect(() => {
    let isCancelled = false;

    async function fetchRoute() {
      try {
        const fromPoint = currentRiderCoords || depotCoords;
        const res = await fetch(
          `/api/route?fromLat=${fromPoint[0]}&fromLng=${fromPoint[1]}&toLat=${custLat}&toLng=${custLng}`
        );
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.coordinates && data.coordinates.length > 0) {
            setRoadCoordinates(data.coordinates);
            if (data.distanceKm) setDistanceKm(data.distanceKm);
            if (data.durationMins) setEtaMins(data.durationMins);
          }
        }
      } catch (e) {
        console.warn('Failed to load OSRM road geometry for rider map:', e);
      }
    }

    fetchRoute();

    return () => {
      isCancelled = true;
    };
  }, [custLat, custLng, depotCoords[0], depotCoords[1]]);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current || isInitializedRef.current) {
        return;
      }

      const leafletModule = await import('leaflet');
      const L = (leafletModule as any).default || leafletModule;
      if (!isMounted || !mapContainerRef.current) return;

      try {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
      } catch (e) {}

      const startCenter: [number, number] = [
        (depotCoords[0] + customerPoint[0]) / 2,
        (depotCoords[1] + customerPoint[1]) / 2,
      ];

      const map = L.map(mapContainerRef.current, {
        center: startCenter,
        zoom: 14,
        zoomControl: false,
        fadeAnimation: true,
      });

      mapInstanceRef.current = map;
      isInitializedRef.current = true;

      // CartoDB / OSM High-Contrast Tile Layer for easy viewing in sunlight
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | Regasco Road Nav',
        maxZoom: 19,
      }).addTo(map);

      // Add Zoom Control at bottom right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // 1. Depot Marker
      const depotIcon = L.divIcon({
        className: 'custom-depot-pin',
        html: `
          <div style="background: #EA580C; color: white; padding: 4px; border-radius: 10px; box-shadow: 0 4px 12px rgba(234,88,12,0.5); border: 2px solid white; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const depotMarker = L.marker(depotCoords, { icon: depotIcon })
        .addTo(map)
        .bindPopup('<b>Mindanao Central Hub</b><br>LPG Pickup Station');

      // 2. Customer Doorstep Marker
      const destIcon = L.divIcon({
        className: 'custom-dest-pin',
        html: `
          <div style="background: #2563EB; color: white; padding: 4px; border-radius: 9999px; box-shadow: 0 4px 14px rgba(37,99,235,0.6); border: 2.5px solid white; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const destMarker = L.marker(customerPoint, { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b>${customerName} (${orderCode})</b><br>${customerLocation.address}`);

      // 3. Rider Motorbike Marker
      const initialRiderPos = currentRiderCoords || depotCoords;
      const riderIcon = L.divIcon({
        className: 'custom-rider-pin',
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(234, 88, 12, 0.35); animation: pulse 2s infinite;"></div>
            <div style="background: #FFFFFF; color: #EA580C; border: 3px solid #EA580C; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.3); position: relative; z-index: 10;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EA580C" stroke-width="2.5"><path d="M10 17h4V5H2v12h3m15 0h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>
            </div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
      });

      const riderMarker = L.marker(initialRiderPos, { icon: riderIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup('<b>Your Motorcycle (GPS)</b><br>Live Telemetry Active');

      markersRef.current = { depot: depotMarker, dest: destMarker, rider: riderMarker };

      // Initial Fit Bounds
      const bounds = L.latLngBounds([depotCoords, customerPoint, initialRiderPos]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });

      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 200);
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

  // Update Road Polyline and Moving Rider Marker
  useEffect(() => {
    if (!mapInstanceRef.current || !isInitializedRef.current) return;
    const map = mapInstanceRef.current;

    import('leaflet').then((leafletModule) => {
      const L = (leafletModule as any).default || leafletModule;

      // Update Rider Position
      const riderPos = currentRiderCoords || depotCoords;
      if (markersRef.current.rider) {
        markersRef.current.rider.setLatLng(riderPos);
      }

      // Update or Draw Polyline
      if (roadCoordinates.length > 0) {
        if (polylineRef.current) {
          polylineRef.current.setLatLngs(roadCoordinates);
        } else {
          polylineRef.current = L.polyline(roadCoordinates, {
            color: '#EA580C',
            weight: 6,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round',
          }).addTo(map);
        }
      }
    });
  }, [currentRiderCoords, roadCoordinates]);

  // Center on Rider action
  const centerOnRider = () => {
    if (!mapInstanceRef.current) return;
    const target = currentRiderCoords || depotCoords;
    mapInstanceRef.current.setView(target, 16, { animate: true });
  };

  // Fit Entire Route action
  const fitEntireRoute = () => {
    if (!mapInstanceRef.current) return;
    const leafletModule = (window as any).L;
    const riderPos = currentRiderCoords || depotCoords;
    if (leafletModule) {
      const bounds = leafletModule.latLngBounds([depotCoords, customerPoint, riderPos]);
      mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40] });
    }
  };

  return (
    <div className="w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl flex flex-col">
      {/* Top Street Navigation HUD - Mobile First & Zero Ugly Wrap */}
      <div className="bg-slate-950 px-3 py-2 sm:px-4 sm:py-2.5 border-b border-slate-800 flex items-center justify-between gap-1.5 text-xs">
        {/* Left: Route Telemetry Status Badges */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-extrabold text-emerald-400 text-[10px] sm:text-[11px] whitespace-nowrap uppercase tracking-wider">
              Route
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <span className="text-orange-400 font-mono font-black text-[11px] sm:text-xs bg-slate-900 px-2 py-1 rounded-lg border border-slate-800 whitespace-nowrap">
              {distanceKm} km
            </span>
            <span className="text-amber-400 font-black text-[11px] sm:text-xs bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 whitespace-nowrap">
              ~{etaMins}m ETA
            </span>
          </div>
        </div>

        {/* Right: Map Controls (Bike Center & Route Fit) */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={centerOnRider}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-[11px] font-bold border border-slate-700 transition active:scale-95 cursor-pointer flex items-center gap-1 shrink-0"
            title="Recenter on My Motorbike"
          >
            <Crosshair className="w-3.5 h-3.5 text-orange-400 shrink-0" />
            <span className="hidden sm:inline">My Bike</span>
          </button>

          <button
            type="button"
            onClick={fitEntireRoute}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 text-[11px] font-bold border border-slate-700 transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
            title="Fit Entire Road Route"
          >
            Fit Route
          </button>
        </div>
      </div>

      {/* Map Canvas (Unobscured & Clean) */}
      <div className="relative w-full h-56 sm:h-72 bg-slate-950">
        <div
          ref={mapContainerRef}
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        />
      </div>

      {/* Dedicated Clean Navigation Action Buttons (Big & Touch-Friendly for Riders) */}
      <div className="p-2.5 sm:p-3 bg-slate-950/90 border-t border-slate-800 grid grid-cols-2 gap-2">
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${custLat},${custLng}&travelmode=driving`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-3 px-2 sm:px-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg shadow-blue-600/25 active:scale-[0.98] transition cursor-pointer whitespace-nowrap"
        >
          <Navigation className="w-4 h-4 shrink-0" />
          <span>Google Maps</span>
        </a>

        <a
          href={`https://waze.com/ul?ll=${custLat},${custLng}&navigate=yes`}
          target="_blank"
          rel="noopener noreferrer"
          className="py-3 px-2 sm:px-3 rounded-2xl bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white text-xs font-black flex items-center justify-center gap-1.5 sm:gap-2 shadow-lg shadow-sky-600/25 active:scale-[0.98] transition cursor-pointer whitespace-nowrap"
        >
          <Compass className="w-4 h-4 shrink-0" />
          <span>Waze GPS</span>
        </a>
      </div>

      {/* Destination Drop Address Strip - Complete & Untruncated */}
      <div className="bg-slate-950 px-3 py-2.5 border-t border-slate-850 text-xs">
        <div className="flex items-start gap-2">
          <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white text-xs leading-snug break-words">
              {customerLocation.address}
            </p>
            {customerLocation.landmark && (
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500 font-medium">Landmark:</span>
                <span className="text-orange-300 font-semibold bg-orange-950/50 px-1.5 py-0.5 rounded border border-orange-800/40">
                  {customerLocation.landmark}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
