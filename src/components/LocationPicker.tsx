'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Compass, AlertCircle, CheckCircle2 } from 'lucide-react';
import { DeliveryLocation } from '@/types';

interface LocationPickerProps {
  location: DeliveryLocation;
  onChange: (location: DeliveryLocation) => void;
}

export default function LocationPicker({
  location,
  onChange,
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  // Initialize Leaflet map on client
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      const L = (await import('leaflet')).default;

      // Fix default marker icon paths in Next.js
      const customPinIcon = L.divIcon({
        className: 'custom-pin-marker',
        html: `
          <div style="position: relative; transform: translate(-50%, -100%);">
            <div style="background: #FF5A00; color: white; border-radius: 9999px; padding: 6px; box-shadow: 0 4px 12px rgba(255,90,0,0.5); border: 2px solid white; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
            </div>
            <div style="width: 8px; height: 8px; background: #FF5A00; transform: rotate(45deg); margin: -4px auto 0 auto; border-right: 2px solid white; border-bottom: 2px solid white;"></div>
          </div>
        `,
        iconSize: [36, 42],
        iconAnchor: [18, 42],
      });

      if (!mapInstanceRef.current && isMounted) {
        const defaultLat = location.latitude || 14.6852;
        const defaultLng = location.longitude || 121.0368;

        const map = L.map(mapContainerRef.current, {
          center: [defaultLat, defaultLng],
          zoom: 15,
          zoomControl: false,
        });

        // Add OpenStreetMap tiles
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        // Add zoom control to bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Add draggable marker
        const marker = L.marker([defaultLat, defaultLng], {
          icon: customPinIcon,
          draggable: true,
        }).addTo(map);

        // Marker drag handler
        marker.on('dragend', async () => {
          const pos = marker.getLatLng();
          handlePositionUpdate(pos.lat, pos.lng);
        });

        // Map click handler to move pin
        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          handlePositionUpdate(e.latlng.lat, e.latlng.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
      }
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Handle position update & reverse geocode
  const handlePositionUpdate = async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    setGeoError(null);

    try {
      // Free reverse geocoding via OpenStreetMap Nominatim
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'RegascoOrderingApp/1.0',
          },
        }
      );
      const data = await res.json();

      let detectedAddress = '';
      if (data && data.display_name) {
        // Construct clean address
        const road = data.address?.road || '';
        const houseNumber = data.address?.house_number || '';
        const suburb = data.address?.suburb || data.address?.neighbourhood || '';
        const city = data.address?.city || data.address?.town || 'Quezon City';

        if (road) {
          detectedAddress = `${houseNumber ? houseNumber + ' ' : ''}${road}, ${suburb ? suburb + ', ' : ''}${city}`;
        } else {
          detectedAddress = data.display_name.split(',').slice(0, 3).join(',');
        }
      }

      onChange({
        ...location,
        latitude: lat,
        longitude: lng,
        address: detectedAddress || location.address,
      });
    } catch (err) {
      console.warn('Reverse geocoding error', err);
      onChange({
        ...location,
        latitude: lat,
        longitude: lng,
      });
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // One-click GPS locate me
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGeoError('GPS Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;

        if (mapInstanceRef.current && markerRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 17, {
            duration: 1.2,
          });
          markerRef.current.setLatLng([latitude, longitude]);
        }

        handlePositionUpdate(latitude, longitude);
      },
      (error) => {
        setIsLocating(false);
        setGeoError(
          'Could not get your location. Please check browser GPS permissions or drag the pin manually.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Delivery Address & Pin
            </h3>
            <p className="text-[11px] text-slate-500">
              Drag the pin or click on map for exact doorstep delivery
            </p>
          </div>
        </div>

        {/* Locate Me Button */}
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition border border-blue-200 disabled:opacity-50"
        >
          <Navigation
            className={`w-3.5 h-3.5 text-blue-600 ${
              isLocating ? 'animate-spin' : ''
            }`}
          />
          <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
        </button>
      </div>

      {geoError && (
        <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{geoError}</span>
        </div>
      )}

      {/* Map Container */}
      <div className="relative w-full h-56 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Grab/Foodpanda style overlay indicator */}
        <div className="absolute top-2 left-2 z-20 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-700 shadow-xs flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {isReverseGeocoding ? 'Detecting street...' : 'Pin Set to Mindanao Ave. Area'}
          </span>
        </div>
      </div>

      {/* Address Form Inputs */}
      <div className="mt-3.5 space-y-3">
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Delivery Address <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={location.address}
            onChange={(e) =>
              onChange({ ...location, address: e.target.value })
            }
            placeholder="House/Unit #, Street, Barangay, City (e.g., 42 Mindanao Ave.)"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Landmark & Delivery Notes <span className="text-slate-400 font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            value={location.landmark || ''}
            onChange={(e) =>
              onChange({ ...location, landmark: e.target.value })
            }
            placeholder="e.g. Beside 7-Eleven, Black gate, 3rd floor"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition"
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
          <span>
            GPS Coordinates: {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
          </span>
          <span className="text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Pin Verified
          </span>
        </div>
      </div>
    </div>
  );
}
