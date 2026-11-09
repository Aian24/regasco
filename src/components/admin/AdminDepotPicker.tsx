'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  MapPin,
  Search,
  Crosshair,
  Loader2,
  Navigation,
  Building2,
  AlertCircle,
  CheckCircle2,
  Sliders,
} from 'lucide-react';

interface AdminDepotPickerProps {
  depotLat: number;
  depotLng: number;
  depotAddress: string;
  maxRadiusKm?: number;
  onChange: (updates: {
    depotLat: number;
    depotLng: number;
    depotAddress: string;
  }) => void;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

export default function AdminDepotPicker({
  depotLat,
  depotLng,
  depotAddress,
  maxRadiusKm = 15,
  onChange,
}: AdminDepotPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const circleRef = useRef<any>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (typeof window === 'undefined' || !mapContainerRef.current) return;

      const L = (await import('leaflet')).default;

      // Fix custom store marker icon
      const storePinIcon = L.divIcon({
        className: 'custom-depot-pin',
        html: `
          <div style="position: relative; transform: translate(-50%, -100%);">
            <div style="background: #FF5A00; color: white; border-radius: 9999px; padding: 7px; box-shadow: 0 4px 14px rgba(255,90,0,0.55); border: 2.5px solid white; display: flex; align-items: center; justify-content: center; width: 42px; height: 42px;">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>
            <div style="width: 10px; height: 10px; background: #FF5A00; transform: rotate(45deg); margin: -5px auto 0 auto; border-right: 2.5px solid white; border-bottom: 2.5px solid white;"></div>
          </div>
        `,
        iconSize: [42, 50],
        iconAnchor: [21, 50],
      });

      if (!mapInstanceRef.current && isMounted) {
        const startLat = depotLat || 14.6852;
        const startLng = depotLng || 121.0368;

        const map = L.map(mapContainerRef.current, {
          center: [startLat, startLng],
          zoom: 14,
          zoomControl: false,
        });

        // Add OpenStreetMap tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        // Add coverage radius circle
        const radiusMeters = (maxRadiusKm || 15) * 1000;
        const circle = L.circle([startLat, startLng], {
          radius: radiusMeters,
          color: '#FF5A00',
          fillColor: '#FF5A00',
          fillOpacity: 0.1,
          weight: 2,
          dashArray: '6, 6',
        }).addTo(map);

        // Add draggable store marker
        const marker = L.marker([startLat, startLng], {
          icon: storePinIcon,
          draggable: true,
        }).addTo(map);

        marker.bindPopup(`
          <div style="font-family: inherit; font-size: 12px; padding: 2px;">
            <strong style="color: #FF5A00; font-size: 13px;">Central LPG Store & Depot</strong><br/>
            <span>Drag pin or click map to move store position</span>
          </div>
        `);

        // Drag handler
        marker.on('dragend', () => {
          const pos = marker.getLatLng();
          circle.setLatLng(pos);
          handleUpdatePosition(pos.lat, pos.lng);
        });

        // Click map handler
        map.on('click', (e: any) => {
          marker.setLatLng(e.latlng);
          circle.setLatLng(e.latlng);
          handleUpdatePosition(e.latlng.lat, e.latlng.lng);
        });

        mapInstanceRef.current = map;
        markerRef.current = marker;
        circleRef.current = circle;
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

  // Update radius circle when maxRadiusKm changes
  useEffect(() => {
    if (circleRef.current) {
      circleRef.current.setRadius((maxRadiusKm || 15) * 1000);
    }
  }, [maxRadiusKm]);

  // Handle position update & reverse geocode
  const handleUpdatePosition = async (lat: number, lng: number) => {
    setIsReverseGeocoding(true);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'RegascoAdminDepotPicker/1.0',
          },
        }
      );
      const data = await res.json();

      let formattedAddress = '';
      if (data && data.display_name) {
        const road = data.address?.road || '';
        const houseNumber = data.address?.house_number || '';
        const suburb = data.address?.suburb || data.address?.neighbourhood || '';
        const city = data.address?.city || data.address?.town || 'Quezon City';

        if (road) {
          formattedAddress = `${houseNumber ? houseNumber + ' ' : ''}${road}, ${
            suburb ? suburb + ', ' : ''
          }${city}`;
        } else {
          formattedAddress = data.display_name.split(',').slice(0, 3).join(',');
        }
      }

      onChange({
        depotLat: Number(lat.toFixed(5)),
        depotLng: Number(lng.toFixed(5)),
        depotAddress: formattedAddress || depotAddress,
      });
    } catch (e) {
      onChange({
        depotLat: Number(lat.toFixed(5)),
        depotLng: Number(lng.toFixed(5)),
        depotAddress,
      });
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  // Search Address / Landmark in Philippines
  const handleSearchLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setErrorMessage(null);

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchQuery.trim()
        )}&countrycodes=ph&limit=5`,
        {
          headers: {
            'User-Agent': 'RegascoAdminDepotPicker/1.0',
          },
        }
      );
      const results = await res.json();

      if (results && results.length > 0) {
        setSearchResults(results);
      } else {
        setErrorMessage('No places found matching your search. Try adding city or street name.');
      }
    } catch (err) {
      setErrorMessage('Search service temporary unavailable. You can drag the pin manually.');
    } finally {
      setIsSearching(false);
    }
  };

  // Select Search Result
  const handleSelectSearchResult = (result: SearchResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (mapInstanceRef.current && markerRef.current && circleRef.current) {
      mapInstanceRef.current.flyTo([lat, lng], 15, { duration: 1.2 });
      markerRef.current.setLatLng([lat, lng]);
      circleRef.current.setLatLng([lat, lng]);
    }

    setSearchResults([]);
    setSearchQuery('');
    handleUpdatePosition(lat, lng);
  };

  // Locate Current Device (GPS)
  const handleLocateAdmin = () => {
    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const { latitude, longitude } = pos.coords;

        if (mapInstanceRef.current && markerRef.current && circleRef.current) {
          mapInstanceRef.current.flyTo([latitude, longitude], 16, { duration: 1.2 });
          markerRef.current.setLatLng([latitude, longitude]);
          circleRef.current.setLatLng([latitude, longitude]);
        }

        handleUpdatePosition(latitude, longitude);
      },
      (err) => {
        setIsLocating(false);
        setErrorMessage('Could not acquire GPS position. Please check location permissions.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="space-y-3">
      {/* Search & GPS Tool Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <form onSubmit={handleSearchLocation} className="flex-1 relative flex items-center">
          <input
            type="text"
            placeholder="Search store address (e.g. Mindanao Ave, Commonwealth, Pasig)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-24 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-900 outline-none focus:bg-white focus:border-orange-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="absolute right-1 px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs disabled:opacity-50 transition cursor-pointer flex items-center gap-1"
          >
            {isSearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Search'}
          </button>
        </form>

        <button
          type="button"
          onClick={handleLocateAdmin}
          disabled={isLocating}
          className="px-3.5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-200 transition cursor-pointer shrink-0"
        >
          {isLocating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-600" />
          ) : (
            <Crosshair className="w-3.5 h-3.5 text-orange-600" />
          )}
          <span>Use My GPS</span>
        </button>
      </div>

      {/* Search Results Dropdown List */}
      {searchResults.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-2 divide-y divide-slate-100 z-20">
          <p className="text-[11px] font-bold text-slate-400 px-3 py-1">
            Matching Locations in the Philippines:
          </p>
          {searchResults.map((res) => (
            <button
              key={res.place_id}
              type="button"
              onClick={() => handleSelectSearchResult(res)}
              className="w-full text-left p-2.5 hover:bg-orange-50 rounded-xl transition text-xs flex items-start gap-2 cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">{res.display_name.split(',')[0]}</p>
                <p className="text-[11px] text-slate-500 truncate">{res.display_name}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {errorMessage && (
        <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Interactive Map Box */}
      <div className="relative w-full h-72 sm:h-80 rounded-2xl overflow-hidden border border-slate-200 shadow-inner bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Map Tip Banner Overlay */}
        <div className="absolute top-3 left-3 right-3 sm:right-auto sm:max-w-xs z-[1000] bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-200/90 shadow-sm text-[11px] text-slate-700 flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shrink-0" />
          <span>Click anywhere or drag the pin to position your central depot.</span>
        </div>

        {/* Reverse geocoding loading badge */}
        {isReverseGeocoding && (
          <div className="absolute bottom-3 left-3 z-[1000] bg-slate-900/85 backdrop-blur-md text-white px-3 py-1.5 rounded-xl text-xs flex items-center gap-2 shadow-md">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-orange-400" />
            <span>Detecting street address...</span>
          </div>
        )}
      </div>

      {/* Coordinate & Physical Address Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase">Latitude</label>
          <input
            type="number"
            step="0.0001"
            value={depotLat}
            onChange={(e) =>
              onChange({
                depotLat: Number(e.target.value),
                depotLng,
                depotAddress,
              })
            }
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-800 outline-none focus:bg-white focus:border-orange-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase">Longitude</label>
          <input
            type="number"
            step="0.0001"
            value={depotLng}
            onChange={(e) =>
              onChange({
                depotLat,
                depotLng: Number(e.target.value),
                depotAddress,
              })
            }
            className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-slate-800 outline-none focus:bg-white focus:border-orange-500"
          />
        </div>

        <div className="space-y-1 sm:col-span-1">
          <label className="text-[11px] font-bold text-slate-500 uppercase">Coverage Radius</label>
          <div className="px-3 py-2 rounded-xl bg-orange-50 border border-orange-200 text-xs font-bold text-orange-700 flex items-center justify-between">
            <span>Dashed Circle Area:</span>
            <span>{maxRadiusKm} km</span>
          </div>
        </div>
      </div>
    </div>
  );
}

