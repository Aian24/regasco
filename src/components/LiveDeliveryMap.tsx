'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DeliveryLocation, OrderStatus } from '@/types';
import { Navigation, Flame, CheckCircle2, Truck } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { getPositionAlongPath } from '@/lib/routing';

interface LiveDeliveryMapProps {
  location: DeliveryLocation;
  orderStatus: OrderStatus;
  customerName?: string;
  riderCoordinates?: [number, number];
}

// Store Depot: REGASCO Central Distribution Hub (Mindanao Ave. North)
const STORE_COORDS: [number, number] = [14.6852, 121.0368];
// Realistic Default Customer Destination (Mindanao Ave. Bahay Toro, Project 8)
const DEST_COORDS: [number, number] = [14.6585, 121.0252];

export default function LiveDeliveryMap({
  location,
  orderStatus,
  customerName = 'Customer',
  riderCoordinates,
}: LiveDeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

  // Road geometry state from OSRM
  const [roadPath, setRoadPath] = useState<[number, number][]>([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(3.5);
  const [routeDurationMins, setRouteDurationMins] = useState<number>(14);

  // References to map layers to update without re-creating the map
  const markersRef = useRef<{
    store?: any;
    rider?: any;
    dest?: any;
  }>({});

  const polylinesRef = useRef<{
    casing?: any;
    traveled?: any;
    remaining?: any;
  }>({});

  // Resolve customer coordinates
  let custLat = location.latitude || DEST_COORDS[0];
  let custLng = location.longitude || DEST_COORDS[1];

  // Safeguard: Ensure destination is not stacked directly on top of depot
  if (Math.hypot(custLat - STORE_COORDS[0], custLng - STORE_COORDS[1]) < 0.005) {
    custLat = DEST_COORDS[0];
    custLng = DEST_COORDS[1];
  }
  const customerPoint: [number, number] = [custLat, custLng];

  // Fetch real road geometry from OSRM via /api/route
  useEffect(() => {
    let isCancelled = false;

    async function fetchRoute() {
      try {
        const res = await fetch(
          `/api/route?fromLat=${STORE_COORDS[0]}&fromLng=${STORE_COORDS[1]}&toLat=${custLat}&toLng=${custLng}`
        );
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data.coordinates && data.coordinates.length > 0) {
            setRoadPath(data.coordinates);
            if (data.distanceKm) setRouteDistanceKm(data.distanceKm);
            if (data.durationMins) setRouteDurationMins(data.durationMins);
          }
        }
      } catch (err) {
        console.warn('Could not fetch OSRM road geometry, using fallback corridor:', err);
      }
    }

    fetchRoute();

    return () => {
      isCancelled = true;
    };
  }, [custLat, custLng]);

  // Determine current active road path
  const activeRoutePoints: [number, number][] =
    roadPath.length > 0
      ? roadPath
      : [
          STORE_COORDS,
          [14.6788, 121.0342],
          [14.6730, 121.0315],
          [14.6672, 121.0288],
          [14.6620, 121.0265],
          customerPoint,
        ];

  // Calculate rider position along road
  let riderPoint: [number, number];
  let traveledPath: [number, number][] = [];
  let remainingPath: [number, number][] = [];

  if (riderCoordinates) {
    riderPoint = riderCoordinates;
    traveledPath = [STORE_COORDS, riderCoordinates];
    remainingPath = [riderCoordinates, customerPoint];
  } else if (orderStatus === 'DELIVERED') {
    riderPoint = customerPoint;
    traveledPath = activeRoutePoints;
    remainingPath = [];
  } else if (orderStatus === 'OUT_FOR_DELIVERY') {
    // Rider midway along actual road polyline
    riderPoint = getPositionAlongPath(activeRoutePoints, 0.55);
    const midIndex = Math.floor(activeRoutePoints.length * 0.55);
    traveledPath = activeRoutePoints.slice(0, midIndex + 1);
    remainingPath = activeRoutePoints.slice(midIndex);
  } else {
    // Preparing at store depot
    riderPoint = STORE_COORDS;
    traveledPath = [];
    remainingPath = activeRoutePoints;
  }

  // 1. Initial Leaflet Map Setup
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current || isInitializedRef.current) {
        return;
      }

      const leafletModule = await import('leaflet');
      const L = (leafletModule as any).default || leafletModule;
      if (!isMounted || !mapContainerRef.current) return;

      // Fix default icons
      try {
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
          iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
          shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
        });
      } catch (e) {}

      // Create Leaflet Map Instance
      const map = L.map(mapContainerRef.current, {
        center: [
          (STORE_COORDS[0] + customerPoint[0]) / 2,
          (STORE_COORDS[1] + customerPoint[1]) / 2,
        ],
        zoom: 13,
        zoomControl: false,
        fadeAnimation: true,
        markerZoomAnimation: true,
      });

      mapInstanceRef.current = map;
      isInitializedRef.current = true;

      // Add OpenStreetMap tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | Regasco Road Router',
        maxZoom: 19,
      }).addTo(map);

      // Add Zoom Control bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Outer Road Casing
      const casing = L.polyline(activeRoutePoints, {
        color: '#9A3412',
        weight: 9,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Traveled Path (Depot ➔ Rider) in Navigation Sky Blue
      const traveled = L.polyline(traveledPath, {
        color: '#0284C7',
        weight: 6,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // Remaining Active Route (Rider ➔ Customer) in Regasco Bright Orange
      const remainingColor = orderStatus === 'DELIVERED' ? '#10B981' : '#FF5A00';
      const remaining = L.polyline(remainingPath.length > 0 ? remainingPath : activeRoutePoints, {
        color: remainingColor,
        weight: 6,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      polylinesRef.current = { casing, traveled, remaining };

      // Store Depot Marker
      const storeIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        html: `
          <div style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <div style="width: 38px; height: 38px; background: #FF5A00; color: white; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(255,90,0,0.55); border: 2.5px solid white;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" stroke="none">
                <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
              </svg>
            </div>
          </div>
        `,
      });

      const storeMarker = L.marker(STORE_COORDS, { icon: storeIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: inherit; font-size: 12px;">
            <b style="color: #FF5A00; font-size: 13px;">REGASCO Mindanao Ave. Hub</b><br/>
            <span>Central LPG Depot & Distribution Hub</span>
          </div>
        `);

      // Customer Destination Pin
      const destIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        iconSize: [44, 52],
        iconAnchor: [22, 50],
        html: `
          <div style="width: 44px; height: 52px; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; pointer-events: none;">
            <div style="width: 36px; height: 36px; background: #004B93; color: white; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,75,147,0.5); border: 2.5px solid white;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid #004B93; margin-top: -2px;"></div>
          </div>
        `,
      });

      const destMarker = L.marker(customerPoint, { icon: destIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: inherit; font-size: 12px;">
            <b style="color: #004B93; font-size: 13px;">${customerName}</b><br/>
            <span>${location.address}</span>
          </div>
        `);

      // Rider Marker with Pulsing Sonar Ring
      const riderIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        iconSize: [52, 52],
        iconAnchor: [26, 26],
        html: `
          <div style="width: 52px; height: 52px; position: relative; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <div style="position: absolute; width: 48px; height: 48px; border-radius: 9999px; background: rgba(255, 90, 0, 0.28); animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
            <div style="width: 40px; height: 40px; background: #FF5A00; color: white; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 16px rgba(255,90,0,0.6); border: 3px solid white; position: relative; z-index: 10;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M10 17h4V5H2v12h3m15 0h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1"/>
                <circle cx="7.5" cy="17.5" r="2.5"/>
                <circle cx="17.5" cy="17.5" r="2.5"/>
              </svg>
            </div>
          </div>
        `,
      });

      const riderMarker = L.marker(riderPoint, { icon: riderIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: inherit; font-size: 12px;">
            <b style="color: #FF5A00; font-size: 13px;">Regasco Express Rider</b><br/>
            <span>Live Road GPS Navigation</span>
          </div>
        `);

      markersRef.current = { store: storeMarker, dest: destMarker, rider: riderMarker };

      // Fit bounds nicely with padding
      const bounds = L.latLngBounds([STORE_COORDS, customerPoint, riderPoint]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });

      setTimeout(() => {
        if (map) map.invalidateSize();
      }, 250);
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

  // Update Road Polylines and Rider Position dynamically
  useEffect(() => {
    if (!mapInstanceRef.current || !isInitializedRef.current) return;

    // Update Rider Marker position
    if (markersRef.current.rider) {
      markersRef.current.rider.setLatLng(riderPoint);
    }

    // Update Destination position
    if (markersRef.current.dest) {
      markersRef.current.dest.setLatLng(customerPoint);
    }

    // Update Polylines
    if (polylinesRef.current.casing) {
      polylinesRef.current.casing.setLatLngs(activeRoutePoints);
    }

    if (polylinesRef.current.traveled) {
      polylinesRef.current.traveled.setLatLngs(traveledPath);
    }

    if (polylinesRef.current.remaining) {
      const remainingColor = orderStatus === 'DELIVERED' ? '#10B981' : '#FF5A00';
      polylinesRef.current.remaining.setStyle({ color: remainingColor });
      polylinesRef.current.remaining.setLatLngs(
        orderStatus === 'DELIVERED'
          ? activeRoutePoints
          : remainingPath.length > 0
          ? remainingPath
          : activeRoutePoints
      );
    }
  }, [orderStatus, custLat, custLng, riderCoordinates, roadPath]);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${STORE_COORDS[0]},${STORE_COORDS[1]}&destination=${customerPoint[0]},${customerPoint[1]}&travelmode=driving`;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex flex-col">
      {/* Map Box */}
      <div className="relative w-full h-[360px] sm:h-[400px] bg-slate-200">
        <div
          ref={mapContainerRef}
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        />

        {/* Floating Grab/Foodpanda Status Banner */}
        <div className="absolute top-3 left-3 right-3 z-[500] flex items-center justify-between gap-2 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200 shadow-md flex items-center gap-2 pointer-events-auto">
            {orderStatus === 'OUT_FOR_DELIVERY' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-ping" />
                <span className="text-xs font-black text-slate-900">
                  Rider on the Way • Road ETA ~{routeDurationMins} mins
                </span>
              </>
            ) : orderStatus === 'DELIVERED' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-black text-slate-900">
                  Delivered & Installed at Doorstep
                </span>
              </>
            ) : (
              <>
                <Flame className="w-4 h-4 text-orange-600" />
                <span className="text-xs font-black text-slate-900">
                  Mindanao Ave. Hub preparing cylinder
                </span>
              </>
            )}
          </div>

          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/95 backdrop-blur-md hover:bg-orange-50 text-slate-800 hover:text-orange-600 px-3 py-1.5 rounded-full border border-slate-200 shadow-md text-xs font-bold transition flex items-center gap-1.5 pointer-events-auto cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">Google Maps Route</span>
          </a>
        </div>
      </div>

      {/* Bottom Route Summary Bar with Real Road Stats */}
      <div className="p-3.5 bg-white border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs z-10">
        <div className="flex flex-wrap items-center gap-2 text-slate-700">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-600 shrink-0" />
            <span>Mindanao Hub (Depot)</span>
          </div>
          <span className="text-slate-300">➔</span>
          <span className="text-slate-500 font-semibold truncate max-w-[220px] sm:max-w-xs">
            OSRM Street Trajectory ➔ {location.address.split(',')[0] || 'Customer'}
          </span>
          <span className="text-slate-300">➔</span>
          <div className="flex items-center gap-1.5 font-bold text-blue-900">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-700 shrink-0" />
            <span>Customer Doorstep</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
            {routeDistanceKm} km Road Route
          </span>
          <span className="font-bold text-slate-600">
            ~{routeDurationMins} mins
          </span>
        </div>
      </div>
    </div>
  );
}
