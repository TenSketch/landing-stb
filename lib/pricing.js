// STB Singapore — Dynamic PostgreSQL-Driven Pricing Engine
import { query } from './db.js';

/**
 * Parses time string (e.g. "23:30:00" or "06:00:00") into minutes from midnight
 */
function timeToMinutes(timeStr) {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  return (parts[0] || 0) * 60 + (parts[1] || 0);
}

/**
 * Gets Singapore Standard Time (SGT, UTC+8) for a given Date / ISO string
 */
export function getSingaporeTime(dateInput) {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (isNaN(date.getTime())) {
    return new Date();
  }
  // Convert to UTC+8
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 8));
}

/**
 * Checks if a Singapore time falls within a surcharge time range (handling midnight wrap)
 */
export function isTimeInWindow(sgtDate, startTimeStr, endTimeStr) {
  const currentMinutes = sgtDate.getHours() * 60 + sgtDate.getMinutes();
  const startMinutes = timeToMinutes(startTimeStr);
  const endMinutes = timeToMinutes(endTimeStr);

  if (startMinutes <= endMinutes) {
    // Standard daytime window, e.g. 07:30 to 09:30
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  } else {
    // Overnight window spanning midnight, e.g. 23:30 to 06:00
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  }
}

/**
 * Fetches all active vehicle types, pricing rules, route overrides, and surcharges from Postgres
 */
export async function getActivePricingConfig() {
  try {
    const [vehiclesRes, rulesRes, overridesRes, surchargesRes] = await Promise.all([
      query(`SELECT id, name, description, pax_max FROM vehicle_types WHERE is_active = TRUE ORDER BY id ASC`),
      query(`
        SELECT pr.id, pr.vehicle_id, vt.name as vehicle_name, 
               pr.base_fare, pr.per_km_rate, pr.minimum_fare, pr.hourly_rate, pr.daily_rate
        FROM pricing_rules pr
        JOIN vehicle_types vt ON pr.vehicle_id = vt.id
        WHERE pr.is_active = TRUE AND vt.is_active = TRUE
      `),
      query(`
        SELECT ro.id, ro.vehicle_id, vt.name as vehicle_name, 
               ro.origin_place_id, ro.destination_place_id, 
               ro.origin_display_name, ro.destination_display_name, ro.fixed_price
        FROM route_overrides ro
        JOIN vehicle_types vt ON ro.vehicle_id = vt.id
        WHERE ro.is_active = TRUE AND vt.is_active = TRUE
      `),
      query(`
        SELECT id, name, type, value, start_time, end_time, applicable_mode
        FROM surcharges
        WHERE is_active = TRUE
        ORDER BY id ASC
      `)
    ]);

    const rulesByVehicle = {};
    for (const r of rulesRes.rows) {
      rulesByVehicle[r.vehicle_name] = {
        vehicleId: r.vehicle_id,
        vehicleName: r.vehicle_name,
        baseFare: parseFloat(r.base_fare),
        perKmRate: parseFloat(r.per_km_rate),
        minimumFare: parseFloat(r.minimum_fare),
        hourlyRate: parseFloat(r.hourly_rate),
        dailyRate: parseFloat(r.daily_rate)
      };
    }

    return {
      vehicles: vehiclesRes.rows,
      rules: rulesByVehicle,
      overrides: overridesRes.rows.map(o => ({
        ...o,
        fixed_price: parseFloat(o.fixed_price)
      })),
      surcharges: surchargesRes.rows.map(s => ({
        ...s,
        value: parseFloat(s.value)
      }))
    };
  } catch (err) {
    console.error('[PRICING ENGINE] Failed to fetch pricing configuration from database:', err.message);
    throw new Error('Pricing configuration unavailable. Please contact dispatch or try again.');
  }
}

/**
 * Calculates surcharges for a base fare at a given timestamp
 */
export function calculateSurcharges(baseFare, bookingDate, surchargesList, mode = 'ONE_WAY') {
  const sgtDate = getSingaporeTime(bookingDate);
  const applied = [];
  let totalSurcharge = 0;

  for (const s of surchargesList) {
    if (s.applicable_mode !== 'ALL' && s.applicable_mode !== mode) {
      continue;
    }

    if (isTimeInWindow(sgtDate, s.start_time, s.end_time)) {
      let amount = 0;
      if (s.type === 'flat') {
        amount = s.value;
      } else if (s.type === 'percentage') {
        amount = baseFare * (s.value / 100);
      }
      amount = Math.round(amount * 100) / 100;
      applied.push({
        id: s.id,
        name: s.name,
        type: s.type,
        value: s.value,
        amount
      });
      totalSurcharge += amount;
    }
  }

  return { applied, totalSurcharge: Math.round(totalSurcharge * 100) / 100 };
}

export function getNormalizedBookingMode(bookingType) {
  const lower = (bookingType || '').toLowerCase();
  if (lower.includes('hour')) return 'HOURLY';
  if (lower.includes('dai') || lower.includes('day') || lower.includes('tour') || lower.includes('charter')) return 'DAILY';
  return 'ONE_WAY';
}

/**
 * Core Fare Calculation for a single vehicle & booking request
 */
export async function calculateFareDetailed({
  vehicleName,
  bookingType = 'One Way',
  distanceKm = 0,
  originPlaceId = null,
  destPlaceId = null,
  hours = 1,
  days = 1,
  dateTime = null,
  config = null
}) {
  const cfg = config || (await getActivePricingConfig());
  const rule = cfg.rules[vehicleName];

  if (!rule) {
    throw new Error(`No active pricing rule found for vehicle category: ${vehicleName}`);
  }

  let baseTransitFare = 0;
  let isOverride = false;
  let matchedOverride = null;
  const normMode = getNormalizedBookingMode(bookingType);

  if (normMode === 'ONE_WAY') {
    // 1. Check for route override
    if (originPlaceId && destPlaceId) {
      matchedOverride = cfg.overrides.find(o => 
        o.vehicle_id === rule.vehicleId &&
        o.origin_place_id === originPlaceId &&
        o.destination_place_id === destPlaceId
      );
    }

    if (matchedOverride) {
      baseTransitFare = matchedOverride.fixed_price;
      isOverride = true;
    } else {
      // KM fallback: Base + (KM * Per-KM Rate)
      baseTransitFare = rule.baseFare + (Number(distanceKm) * rule.perKmRate);
    }

    // Apply minimum fare
    baseTransitFare = Math.max(baseTransitFare, rule.minimumFare);
  } else if (normMode === 'HOURLY') {
    const validHours = Math.max(1, Number(hours) || 1);
    baseTransitFare = validHours * rule.hourlyRate;
  } else if (normMode === 'DAILY') {
    const validDays = Math.max(1, Number(days) || 1);
    baseTransitFare = validDays * rule.dailyRate;
  }

  baseTransitFare = Math.round(baseTransitFare * 100) / 100;

  // 2. Apply Surcharges (additive against base transit fare)
  const { applied: surchargesApplied, totalSurcharge } = calculateSurcharges(
    baseTransitFare,
    dateTime,
    cfg.surcharges,
    normMode
  );

  const totalFare = Math.round((baseTransitFare + totalSurcharge) * 100) / 100;

  return {
    vehicleName,
    bookingType,
    baseTransitFare,
    isOverride,
    overrideInfo: matchedOverride ? {
      originName: matchedOverride.origin_display_name,
      destName: matchedOverride.destination_display_name,
      fixedPrice: matchedOverride.fixed_price
    } : null,
    distanceKm: Number(distanceKm) || 0,
    surchargesApplied,
    totalSurcharge,
    totalFare,
    currency: 'SGD',
    rateDetails: {
      baseFare: rule.baseFare,
      perKmRate: rule.perKmRate,
      minimumFare: rule.minimumFare,
      hourlyRate: rule.hourlyRate,
      dailyRate: rule.dailyRate
    }
  };
}

/**
 * Batch estimation for all active vehicles (used by /api/estimate)
 */
export async function estimateFaresForAllVehicles({
  bookingType = 'One Way',
  distanceKm = 0,
  durationSeconds = 0,
  originPlaceId = null,
  destPlaceId = null,
  hours = 1,
  days = 1,
  dateTime = null
}) {
  const config = await getActivePricingConfig();
  const fares = {};
  const rates = {};
  const surchargesAppliedMap = {};

  for (const v of config.vehicles) {
    const name = v.name;
    if (config.rules[name]) {
      const calc = await calculateFareDetailed({
        vehicleName: name,
        bookingType,
        distanceKm,
        originPlaceId,
        destPlaceId,
        hours,
        days,
        dateTime,
        config
      });

      fares[name] = calc.totalFare;
      rates[name] = {
        baseFare: calc.rateDetails.baseFare,
        perKmRate: calc.rateDetails.perKmRate,
        minimumFare: calc.rateDetails.minimumFare,
        hourlyRate: calc.rateDetails.hourlyRate,
        dailyRate: calc.rateDetails.dailyRate,
        isOverride: calc.isOverride
      };
      surchargesAppliedMap[name] = calc.surchargesApplied;
    }
  }

  return {
    success: true,
    distanceKm: Math.round(distanceKm * 100) / 100,
    durationSeconds: Math.round(durationSeconds),
    fares,
    rates,
    surchargesApplied: surchargesAppliedMap,
    tollsExcluded: true // Tolls are always excluded
  };
}
