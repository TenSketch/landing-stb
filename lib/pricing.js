// STB Singapore — Pricing Configuration & Fare Calculation Module
// Configured rates can be easily updated here.

export const VEHICLE_RATES = {
  "4-Seater": {
    name: "4-Seater",
    description: "Toyota / Honda / similar",
    baseFare: 40.0,
    perKmRate: 2.2,
    paxMax: 4,
  },
  "6-Seater": {
    name: "6-Seater",
    description: "Toyota / Hyundai / similar",
    baseFare: 45.0,
    perKmRate: 2.5,
    paxMax: 6,
  }
};

// Surcharges and Fees Configuration (Single Source of Truth)
export const SURCHARGES_CONFIG = {
  peakSurcharge: 0.0,
  nightSurcharge: 0.0,
  tollsIncluded: true
};

/**
 * Calculates the dynamic fare based on driving distance.
 * Formula: Base Fare + (Distance in KM * Per-KM Rate)
 *
 * @param {string} categoryName - "4-Seater" or "6-Seater"
 * @param {number} distanceKm - Driving distance in kilometers
 * @returns {number|null} Calculated fare in SGD, rounded to 2 decimal places, or null if category is invalid
 */
export function calculateFare(categoryName, distanceKm) {
  const rateInfo = VEHICLE_RATES[categoryName];
  if (!rateInfo) return null;
  const rawFare = rateInfo.baseFare + (distanceKm * rateInfo.perKmRate);
  // Return rounded to 2 decimal places
  return Math.round(rawFare * 100) / 100;
}
