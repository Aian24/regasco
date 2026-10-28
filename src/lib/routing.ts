// OSRM (Open Source Routing Machine) Real Road Routing Engine
// Generates turn-by-turn road geometries, real driving distance, and dynamic ETA

interface RouteResult {
  coordinates: [number, number][]; // [lat, lng][]
  distanceKm: number;
  durationMins: number;
  isRealRoad: boolean;
}

// In-memory route cache keyed by "fromLat,fromLng->toLat,toLng"
const routeCache = new Map<string, RouteResult>();

/**
 * Fetch real driving road geometry from OSRM
 * @param from [latitude, longitude]
 * @param to [latitude, longitude]
 */
export async function getRoadRoute(
  from: [number, number],
  to: [number, number]
): Promise<RouteResult> {
  const cacheKey = `${from[0].toFixed(5)},${from[1].toFixed(5)}->${to[0].toFixed(5)},${to[1].toFixed(5)}`;
  if (routeCache.has(cacheKey)) {
    return routeCache.get(cacheKey)!;
  }

  // OSRM uses [longitude, latitude] in its URL parameters
  const url = `https://router.project-osrm.org/route/v1/driving/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000); // 4-second timeout

    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
        const coordinates: [number, number][] = route.geometry.coordinates.map(
          ([lng, lat]: [number, number]) => [lat, lng]
        );

        const distanceKm = Number((route.distance / 1000).toFixed(1));
        const durationMins = Math.max(3, Math.round(route.duration / 60));

        const result: RouteResult = {
          coordinates,
          distanceKm,
          durationMins,
          isRealRoad: true,
        };

        routeCache.set(cacheKey, result);
        return result;
      }
    }
  } catch (err) {
    console.warn('OSRM routing request failed or timed out, falling back to smart road path:', err);
  }

  // Graceful Fallback: Smart interpolated corridor along Metro Manila / Mindanao Avenue
  const fallbackCoords = generateCorridorFallback(from, to);
  const directDistanceKm = Number((calculateHaversine(from, to) * 1.35).toFixed(1)); // road curvature factor
  const estMins = Math.max(5, Math.round((directDistanceKm / 25) * 60)); // ~25 km/h city motorbike speed

  const fallbackResult: RouteResult = {
    coordinates: fallbackCoords,
    distanceKm: directDistanceKm,
    durationMins: estMins,
    isRealRoad: false,
  };

  routeCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}

/**
 * Great-circle distance between two GPS coordinates in kilometers
 */
function calculateHaversine(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371; // Earth radius in km
  const dLat = ((coord2[0] - coord1[0]) * Math.PI) / 180;
  const dLng = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1[0] * Math.PI) / 180) *
      Math.cos((coord2[0] * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate intermediate road points when OSRM API is unreachable
 */
function generateCorridorFallback(
  start: [number, number],
  end: [number, number]
): [number, number][] {
  const steps = 6;
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    // Add subtle organic road curve so it doesn't look like an aerial straight line
    const lateralCurve = Math.sin(fraction * Math.PI) * 0.0018;
    const lat = start[0] + (end[0] - start[0]) * fraction + lateralCurve;
    const lng = start[1] + (end[1] - start[1]) * fraction;
    points.push([lat, lng]);
  }
  return points;
}

/**
 * Calculate rider coordinates given a progress percentage (0 to 1) along a road polyline
 */
export function getPositionAlongPath(
  path: [number, number][],
  progress: number
): [number, number] {
  if (!path || path.length === 0) return [14.6852, 121.0368];
  if (progress <= 0) return path[0];
  if (progress >= 1) return path[path.length - 1];

  const totalSegments = path.length - 1;
  const targetIndex = progress * totalSegments;
  const baseIndex = Math.floor(targetIndex);
  const remainder = targetIndex - baseIndex;

  if (baseIndex >= totalSegments) return path[path.length - 1];

  const p1 = path[baseIndex];
  const p2 = path[baseIndex + 1];

  const lat = p1[0] + (p2[0] - p1[0]) * remainder;
  const lng = p1[1] + (p2[1] - p1[1]) * remainder;

  return [lat, lng];
}
