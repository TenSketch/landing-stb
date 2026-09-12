// Unit Test Suite for STB Dynamic Pricing Engine
import assert from 'assert';
import { 
  getSingaporeTime, isTimeInWindow, calculateSurcharges, calculateFareDetailed 
} from '../../lib/pricing.js';

console.log('🧪 Starting STB Dynamic Pricing Engine Test Suite...\n');

// Mock in-memory configuration matching DB structure
const mockConfig = {
  vehicles: [
    { id: 1, name: '4-Seater', description: 'Executive Sedan', pax_max: 4 },
    { id: 2, name: '6-Seater', description: 'Premium MPV', pax_max: 6 }
  ],
  rules: {
    '4-Seater': {
      vehicleId: 1,
      vehicleName: '4-Seater',
      baseFare: 40.0,
      perKmRate: 2.2,
      minimumFare: 40.0,
      hourlyRate: 60.0,
      dailyRate: 450.0
    },
    '6-Seater': {
      vehicleId: 2,
      vehicleName: '6-Seater',
      baseFare: 45.0,
      perKmRate: 2.5,
      minimumFare: 45.0,
      hourlyRate: 70.0,
      dailyRate: 550.0
    }
  },
  overrides: [
    {
      id: 1,
      vehicle_id: 1,
      vehicle_name: '4-Seater',
      origin_place_id: 'CHANGI_AIRPORT_PLACE_ID',
      destination_place_id: 'MBS_PLACE_ID',
      origin_display_name: 'Changi Airport',
      destination_display_name: 'Marina Bay Sands',
      fixed_price: 65.0
    },
    {
      id: 2,
      vehicle_id: 2,
      vehicle_name: '6-Seater',
      origin_place_id: 'CHANGI_AIRPORT_PLACE_ID',
      destination_place_id: 'MBS_PLACE_ID',
      origin_display_name: 'Changi Airport',
      destination_display_name: 'Marina Bay Sands',
      fixed_price: 75.0
    }
  ],
  surcharges: [
    {
      id: 1,
      name: 'Night Surcharge',
      type: 'flat',
      value: 15.0,
      start_time: '23:30:00',
      end_time: '06:00:00',
      applicable_mode: 'ALL'
    },
    {
      id: 2,
      name: 'Peak Surcharge',
      type: 'percentage',
      value: 10.0,
      start_time: '07:30:00',
      end_time: '09:30:00',
      applicable_mode: 'ONE_WAY'
    }
  ]
};

async function runTests() {
  let passed = 0;

  // ─── Test 1: SGT Timezone & Surcharge Window (Daytime) ───
  try {
    const morningDate = new Date('2026-09-15T08:00:00+08:00'); // 8:00 AM SGT
    const inPeak = isTimeInWindow(getSingaporeTime(morningDate), '07:30:00', '09:30:00');
    assert.strictEqual(inPeak, true, '8:00 AM SGT should be in Peak Window (07:30 - 09:30)');
    console.log('✅ Test 1 Passed: Daytime Surcharge Time Window check.');
    passed++;
  } catch (err) {
    console.error('❌ Test 1 Failed:', err.message);
  }

  // ─── Test 2: SGT Timezone & Overnight Surcharge Window (Midnight wrap) ───
  try {
    const nightDate = new Date('2026-09-15T01:30:00+08:00'); // 1:30 AM SGT
    const inNight = isTimeInWindow(getSingaporeTime(nightDate), '23:30:00', '06:00:00');
    assert.strictEqual(inNight, true, '1:30 AM SGT should be in Night Window (23:30 - 06:00)');
    console.log('✅ Test 2 Passed: Overnight Surcharge Time Window check (spanning midnight).');
    passed++;
  } catch (err) {
    console.error('❌ Test 2 Failed:', err.message);
  }

  // ─── Test 3: One-Way KM Fallback (No Surcharge) ───
  try {
    // 4-Seater: Base 40.0 + (10 km * 2.2) = 40 + 22 = 62.00
    const calc4 = await calculateFareDetailed({
      vehicleName: '4-Seater',
      bookingType: 'One Way',
      distanceKm: 10.0,
      dateTime: '2026-09-15T14:00:00+08:00', // 2 PM SGT (No surcharge)
      config: mockConfig
    });
    assert.strictEqual(calc4.totalFare, 62.00, '4-Seater 10km should be SGD 62.00');
    assert.strictEqual(calc4.isOverride, false);

    // 6-Seater: Base 45.0 + (10 km * 2.5) = 45 + 25 = 70.00
    const calc6 = await calculateFareDetailed({
      vehicleName: '6-Seater',
      bookingType: 'One Way',
      distanceKm: 10.0,
      dateTime: '2026-09-15T14:00:00+08:00',
      config: mockConfig
    });
    assert.strictEqual(calc6.totalFare, 70.00, '6-Seater 10km should be SGD 70.00');
    console.log('✅ Test 3 Passed: KM-based fallback calculation for 4-Seater & 6-Seater.');
    passed++;
  } catch (err) {
    console.error('❌ Test 3 Failed:', err.message);
  }

  // ─── Test 4: Minimum Fare Enforcement ───
  try {
    // 4-Seater 1km: 40 + (1 * 2.2) = 42.20 (above min 40.0)
    // If base was 30 and per km 2.0 with min 40.0:
    const customConfig = JSON.parse(JSON.stringify(mockConfig));
    customConfig.rules['4-Seater'].baseFare = 10.0;
    customConfig.rules['4-Seater'].perKmRate = 2.0;
    customConfig.rules['4-Seater'].minimumFare = 40.0;

    const calcMin = await calculateFareDetailed({
      vehicleName: '4-Seater',
      bookingType: 'One Way',
      distanceKm: 2.0, // 10 + 4 = 14, min 40
      dateTime: '2026-09-15T14:00:00+08:00',
      config: customConfig
    });
    assert.strictEqual(calcMin.totalFare, 40.00, 'Fare should be raised to Minimum Fare of 40.00');
    console.log('✅ Test 4 Passed: Minimum fare enforcement.');
    passed++;
  } catch (err) {
    console.error('❌ Test 4 Failed:', err.message);
  }

  // ─── Test 5: Route Override via Place IDs ───
  try {
    const calcOverride = await calculateFareDetailed({
      vehicleName: '4-Seater',
      bookingType: 'One Way',
      distanceKm: 25.0, // normally 40 + 25*2.2 = 95.00
      originPlaceId: 'CHANGI_AIRPORT_PLACE_ID',
      destPlaceId: 'MBS_PLACE_ID',
      dateTime: '2026-09-15T14:00:00+08:00',
      config: mockConfig
    });
    assert.strictEqual(calcOverride.isOverride, true);
    assert.strictEqual(calcOverride.totalFare, 65.00, 'Fixed price override should be 65.00');
    console.log('✅ Test 5 Passed: Place ID route override priority.');
    passed++;
  } catch (err) {
    console.error('❌ Test 5 Failed:', err.message);
  }

  // ─── Test 6: Surcharges (Flat Night Surcharge & Additive Stacking) ───
  try {
    // 4-Seater at Night: Base 62.00 + $15 Flat Night = 77.00
    const calcNight = await calculateFareDetailed({
      vehicleName: '4-Seater',
      bookingType: 'One Way',
      distanceKm: 10.0,
      dateTime: '2026-09-15T00:30:00+08:00', // 12:30 AM (Night Surcharge)
      config: mockConfig
    });
    assert.strictEqual(calcNight.totalFare, 77.00, 'Fare + Night Surcharge should be 77.00');
    assert.strictEqual(calcNight.surchargesApplied.length, 1);
    assert.strictEqual(calcNight.surchargesApplied[0].name, 'Night Surcharge');

    // 4-Seater at Peak: Base 62.00 + 10% Peak = 62 + 6.20 = 68.20
    const calcPeak = await calculateFareDetailed({
      vehicleName: '4-Seater',
      bookingType: 'One Way',
      distanceKm: 10.0,
      dateTime: '2026-09-15T08:30:00+08:00', // 8:30 AM (Peak Surcharge)
      config: mockConfig
    });
    assert.strictEqual(calcPeak.totalFare, 68.20, 'Fare + 10% Peak Surcharge should be 68.20');
    console.log('✅ Test 6 Passed: Flat & Percentage Surcharge calculations.');
    passed++;
  } catch (err) {
    console.error('❌ Test 6 Failed:', err.message);
  }

  // ─── Test 7: Hourly Charter Pricing ───
  try {
    // 4-Seater: 4 hours * 60.0 = 240.00
    const calcHourly4 = await calculateFareDetailed({
      vehicleName: '4-Seater',
      bookingType: 'Hourly',
      hours: 4,
      dateTime: '2026-09-15T14:00:00+08:00',
      config: mockConfig
    });
    assert.strictEqual(calcHourly4.totalFare, 240.00, '4-Seater 4 hours should be 240.00');

    // 6-Seater: 5 hours * 70.0 = 350.00
    const calcHourly6 = await calculateFareDetailed({
      vehicleName: '6-Seater',
      bookingType: 'Hourly',
      hours: 5,
      dateTime: '2026-09-15T14:00:00+08:00',
      config: mockConfig
    });
    assert.strictEqual(calcHourly6.totalFare, 350.00, '6-Seater 5 hours should be 350.00');
    console.log('✅ Test 7 Passed: Hourly Charter calculations.');
    passed++;
  } catch (err) {
    console.error('❌ Test 7 Failed:', err.message);
  }

  // ─── Test 8: Daily Charter Pricing ───
  try {
    // 4-Seater: 2 days * 450.0 = 900.00
    const calcDaily4 = await calculateFareDetailed({
      vehicleName: '4-Seater',
      bookingType: 'Daily',
      days: 2,
      dateTime: '2026-09-15T14:00:00+08:00',
      config: mockConfig
    });
    assert.strictEqual(calcDaily4.totalFare, 900.00, '4-Seater 2 days should be 900.00');

    // 6-Seater: 3 days * 550.0 = 1650.00
    const calcDaily6 = await calculateFareDetailed({
      vehicleName: '6-Seater',
      bookingType: 'Daily',
      days: 3,
      dateTime: '2026-09-15T14:00:00+08:00',
      config: mockConfig
    });
    assert.strictEqual(calcDaily6.totalFare, 1650.00, '6-Seater 3 days should be 1650.00');
    console.log('✅ Test 8 Passed: Daily Charter calculations.');
    passed++;
  } catch (err) {
    console.error('❌ Test 8 Failed:', err.message);
  }

  console.log(`\n🎉 Summary: ${passed}/8 Pricing Engine Tests Passed Successfully!`);
}

runTests();
