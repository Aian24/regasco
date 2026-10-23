'use client';

import React, { useEffect, useRef, useState } from 'react';
import { DeliveryLocation, OrderStatus } from '@/types';
import { Navigation, Flame, CheckCircle2, Truck } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

interface LiveDeliveryMapProps {
  location: DeliveryLocation;
  orderStatus: OrderStatus;
  customerName?: string;
}

// 1. Store Depot: REGASCO Central Distribution Hub (Mindanao Ave. North)
const STORE_COORDS: [number, number] = [14.6852, 121.0368];

// 2. Realistic Far Customer Destination: 142 Mindanao Ave., Barangay Bahay Toro, Project 8 (~3.5 km away)
const DEST_COORDS: [number, number] = [14.6585, 121.0252];

// 3. Exact Centerline Road Waypoints directly along Mindanao Avenue (Novaliches ➔ Project 8)
const MINDANAO_AVE_WAYPOINTS: [number, number][] = [
  [14.6852, 121.0368], // Point 0: Mindanao Ave. North Hub (Depot)
  [14.6788, 121.0342], // Point 1: Mindanao Ave. Southbound near Tandang Sora
  [14.6730, 121.0315], // Point 2: Mindanao Ave. Tandang Sora Flyover
  [14.6672, 121.0288], // Point 3: Mindanao Ave. near Congressional Ext. (Midway Rider point)
  [14.6620, 121.0265], // Point 4: Mindanao Ave. / Congressional Ave. main
  [14.6585, 121.0252], // Point 5: 142 Mindanao Ave., Bahay Toro, Project 8 (Customer Doorstep)
];

export default function LiveDeliveryMap({
  location,
  orderStatus,
  customerName = 'Customer',
}: LiveDeliveryMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const isInitializedRef = useRef(false);

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

  // Safeguard: Ensure destination is realistically placed down Mindanao Ave if too close
  if (Math.hypot(custLat - STORE_COORDS[0], custLng - STORE_COORDS[1]) < 0.015) {
    custLat = DEST_COORDS[0];
    custLng = DEST_COORDS[1];
  }
  const customerPoint: [number, number] = [custLat, custLng];

  // Build the complete road trajectory
  const routePoints: [number, number][] = [
    MINDANAO_AVE_WAYPOINTS[0],
    MINDANAO_AVE_WAYPOINTS[1],
    MINDANAO_AVE_WAYPOINTS[2],
    MINDANAO_AVE_WAYPOINTS[3],
    MINDANAO_AVE_WAYPOINTS[4],
    customerPoint,
  ];

  // Calculate Rider coordinates and path splits
  let riderPoint: [number, number];
  let traveledPath: [number, number][] = [];
  let remainingPath: [number, number][] = [];

  if (orderStatus === 'DELIVERED') {
    riderPoint = customerPoint;
    traveledPath = routePoints;
    remainingPath = [];
  } else if (orderStatus === 'OUT_FOR_DELIVERY') {
    // Rider is at Point 3 (midway along Mindanao Ave, ~1.8 km from store)
    riderPoint = routePoints[3];
    traveledPath = routePoints.slice(0, 4);
    remainingPath = routePoints.slice(3);
  } else {
    // Preparing at store
    riderPoint = STORE_COORDS;
    traveledPath = [];
    remainingPath = routePoints;
  }

  // 1. Initial Leaflet Map Setup (Runs ONCE to prevent zoom flickering and canvas tearing)
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current || isInitializedRef.current) {
        return;
      }

      const L = (await import('leaflet')).default;
      if (!isMounted || !mapContainerRef.current) return;

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
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Add Zoom Control bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // ---- 1. Create Polylines (Solid, high-contrast, zero dash flicker) ----
      // A. Outer Road Casing
      const casing = L.polyline(routePoints, {
        color: '#9A3412',
        weight: 9,
        opacity: 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // B. Traveled Path (Depot ➔ Kuya Mark) in Navigation Sky Blue
      const traveled = L.polyline(traveledPath, {
        color: '#0284C7',
        weight: 6,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      // C. Remaining Active Route (Kuya Mark ➔ Customer) in Regasco Bright Orange
      const remainingColor = orderStatus === 'DELIVERED' ? '#10B981' : '#FF5A00';
      const remaining = L.polyline(remainingPath.length > 0 ? remainingPath : routePoints, {
        color: remainingColor,
        weight: 6,
        opacity: 1.0,
        lineCap: 'round',
        lineJoin: 'round',
      }).addTo(map);

      polylinesRef.current = { casing, traveled, remaining };

      // ---- 2. Create Markers with Exact Anchors (NO shifting on zoom) ----
      // A. Store Depot Marker (Center anchor: [20, 20])
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

      // B. Customer Destination Pin (Bottom tip anchor: [22, 50])
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
            <b style="color: #004B93; font-size: 13px;">Delivery Destination</b><br/>
            <span>${customerName}</span><br/>
            <span style="color: #64748B;">${location.address}</span>
          </div>
        `);

      // C. Rider Marker (Kuya Mark, Center anchor: [23, 23])
      const riderIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        iconSize: [46, 46],
        iconAnchor: [23, 23],
        html: `
          <div style="width: 46px; height: 46px; position: relative; display: flex; align-items: center; justify-content: center; pointer-events: none;">
            <div style="position: absolute; inset: -8px; border-radius: 9999px; background: rgba(255,90,0,0.35); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="position: relative; width: 42px; height: 42px; background: #0F172A; color: white; border-radius: 9999px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 14px rgba(0,0,0,0.45); border: 2.5px solid #FF5A00;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FF5A00" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/>
                <path d="M15 18H9"/>
                <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/>
                <circle cx="17" cy="18" r="2"/>
                <circle cx="7" cy="18" r="2"/>
              </svg>
            </div>
          </div>
        `,
      });

      const riderMarker = L.marker(riderPoint, { icon: riderIcon })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: inherit; font-size: 12px;">
            <b style="color: #FF5A00; font-size: 13px;">Kuya Mark (Express Rider)</b><br/>
            <span>${orderStatus === 'DELIVERED' ? 'Delivered at customer doorstep' : 'Traveling south along Mindanao Ave. • ~15 mins away'}</span>
          </div>
        `);

      markersRef.current = {
        store: storeMarker,
        dest: destMarker,
        rider: riderMarker,
      };

      // Fit bounds to show entire Mindanao Ave route
      const bounds = L.latLngBounds([STORE_COORDS, customerPoint, riderPoint]);
      map.fitBounds(bounds, {
        paddingTopLeft: [50, 50],
        paddingBottomRight: [50, 50],
        maxZoom: 14,
      });

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 200);
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, []);

  // 2. Incremental Update on Status / Location changes (Without resetting or flickering the map!)
  useEffect(() => {
    if (!isInitializedRef.current || !mapInstanceRef.current) return;

    // Update Rider Marker position smoothly
    if (markersRef.current.rider) {
      markersRef.current.rider.setLatLng(riderPoint);
      if (orderStatus === 'DELIVERED') {
        markersRef.current.rider.setPopupContent(`
          <div style="font-family: inherit; font-size: 12px;">
            <b style="color: #10B981; font-size: 13px;">Kuya Mark (Rider)</b><br/>
            <span>Delivered & installed at customer doorstep!</span>
          </div>
        `);
      }
    }

    // Update Customer Destination Marker position
    if (markersRef.current.dest) {
      markersRef.current.dest.setLatLng(customerPoint);
    }

    // Update Polylines
    if (polylinesRef.current.casing) {
      polylinesRef.current.casing.setLatLngs(routePoints);
    }

    if (polylinesRef.current.traveled) {
      polylinesRef.current.traveled.setLatLngs(traveledPath);
    }

    if (polylinesRef.current.remaining) {
      const remainingColor = orderStatus === 'DELIVERED' ? '#10B981' : '#FF5A00';
      polylinesRef.current.remaining.setStyle({ color: remainingColor });
      polylinesRef.current.remaining.setLatLngs(
        orderStatus === 'DELIVERED'
          ? routePoints
          : remainingPath.length > 0
          ? remainingPath
          : routePoints
      );
    }
  }, [orderStatus, custLat, custLng]);

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${STORE_COORDS[0]},${STORE_COORDS[1]}&destination=${customerPoint[0]},${customerPoint[1]}&travelmode=driving`;

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100 flex flex-col">
      {/* Map Box */}
      <div className="relative w-full h-[360px] sm:h-[400px] bg-slate-200">
        <div
          ref={mapContainerRef}
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        />

        {/* Floating Grab/Foodpanda Status Banner (z-[500] above Leaflet tiles) */}
        <div className="absolute top-3 left-3 right-3 z-[500] flex items-center justify-between gap-2 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-200 shadow-md flex items-center gap-2 pointer-events-auto">
            {orderStatus === 'OUT_FOR_DELIVERY' ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-ping" />
                <span className="text-xs font-black text-slate-900">
                  Kuya Mark is 1.7 km away • ETA ~12-18 mins
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

      {/* Bottom Route Summary Bar with Grab-style legend */}
      <div className="p-3.5 bg-white border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs z-10">
        <div className="flex flex-wrap items-center gap-2 text-slate-700">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-600 shrink-0" />
            <span>Mindanao Hub (Depot)</span>
          </div>
          <span className="text-slate-300">➔</span>
          <span className="text-slate-500 font-semibold truncate max-w-[220px] sm:max-w-xs">
            Via Mindanao Ave. & Congressional ➔ Bahay Toro
          </span>
          <span className="text-slate-300">➔</span>
          <div className="flex items-center gap-1.5 font-bold text-blue-900">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-700 shrink-0" />
            <span>Customer Doorstep</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {orderStatus === 'OUT_FOR_DELIVERY' && (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mr-1">
              <span className="w-2 h-2 rounded-full bg-sky-500" />
              <span>Covered: 1.8 km</span>
            </div>
          )}
          <span className="font-mono font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
            3.5 km Express Route
          </span>
          <span className="font-bold text-slate-500">
            ~12-18 mins
          </span>
        </div>
      </div>
    </div>
  );
}
