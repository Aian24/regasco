/**
 * Distance & Delivery Fee Calculation Utilities
 */

/**
 * Calculate straight-line Haversine distance in kilometers between two GPS coordinates
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export interface DeliveryCalculationResult {
  fee: number;
  isFree: boolean;
  isBeyondRadius: boolean;
  distanceKm: number;
  breakdown: string;
}

/**
 * Compute delivery fee based on store settings, distance, and order subtotal
 */
export function computeDeliveryFee(
  settings: {
    deliveryFee: number;
    freeDeliveryThreshold: number;
    mapSettings?: {
      deliveryPricingType?: 'FLAT' | 'DISTANCE_BASED';
      baseDeliveryFee?: number;
      baseDistanceKm?: number;
      ratePerKm?: number;
      maxDeliveryRadiusKm?: number;
    };
  },
  distanceKm: number,
  subtotal: number
): DeliveryCalculationResult {
  // Free delivery threshold check
  if (subtotal > 0 && subtotal >= (settings.freeDeliveryThreshold || 2000)) {
    return {
      fee: 0,
      isFree: true,
      isBeyondRadius: false,
      distanceKm,
      breakdown: `Free delivery promo (Orders ₱${(settings.freeDeliveryThreshold || 2000).toLocaleString()}+)`,
    };
  }

  const mapSettings = settings.mapSettings;
  const pricingType = mapSettings?.deliveryPricingType || 'DISTANCE_BASED';

  if (pricingType === 'DISTANCE_BASED') {
    const baseFee = mapSettings?.baseDeliveryFee ?? settings.deliveryFee ?? 50;
    const baseDistance = mapSettings?.baseDistanceKm ?? 3;
    const ratePerKm = mapSettings?.ratePerKm ?? 10;
    const maxRadius = mapSettings?.maxDeliveryRadiusKm ?? 15;

    const isBeyondRadius = distanceKm > maxRadius;
    const extraKm = Math.max(0, distanceKm - baseDistance);
    const extraFee = Math.round(extraKm * ratePerKm);
    const totalFee = Math.round(baseFee + extraFee);

    let breakdown = `Base: ₱${baseFee} (first ${baseDistance} km)`;
    if (extraKm > 0) {
      breakdown += ` + ₱${extraFee} (${extraKm.toFixed(1)} km × ₱${ratePerKm}/km)`;
    }

    return {
      fee: totalFee,
      isFree: false,
      isBeyondRadius,
      distanceKm,
      breakdown,
    };
  }

  // Flat fee fallback
  const fee = settings.deliveryFee || 50;
  return {
    fee,
    isFree: false,
    isBeyondRadius: false,
    distanceKm,
    breakdown: `Flat delivery fee: ₱${fee}`,
  };
}

