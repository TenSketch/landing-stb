import React, { useState, useMemo } from 'react';
import { TripMode, ServiceTypeId, BookingDetails, Currency } from '../types';
import { SERVICES, VEHICLES, LOCATION_PRESETS, CURRENCY_RATES } from '../data/mockData';
import { LeafletRouteMap } from './LeafletRouteMap';

interface BookingWidgetProps {
  currentCurrency: Currency;
  onProceedToCheckout: (details: BookingDetails) => void;
  onSendWhatsApp: (details: BookingDetails) => void;
  selectedServiceId?: ServiceTypeId;
}

export const BookingWidget: React.FC<BookingWidgetProps> = ({
  currentCurrency,
  onProceedToCheckout,
  onSendWhatsApp,
  selectedServiceId
}) => {
  const [tripMode, setTripMode] = useState<TripMode>('one_way');
  const [serviceType, setServiceType] = useState<ServiceTypeId>(selectedServiceId || 'airport_arrival');
  
  const [pickupInput, setPickupInput] = useState('Changi Airport Terminal 1');
  const [pickupCoords, setPickupCoords] = useState<[number, number] | undefined>([1.3644, 103.9915]);
  const [showPickupPresets, setShowPickupPresets] = useState(false);

  const [destInput, setDestInput] = useState('Marina Bay Sands Hotel Tower 1');
  const [destCoords, setDestCoords] = useState<[number, number] | undefined>([1.2838, 103.8591]);
  const [showDestPresets, setShowDestPresets] = useState(false);

  const [passengers, setPassengers] = useState('1-3 Pax');
  const [dateTime, setDateTime] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    return tomorrow.toISOString().slice(0, 16);
  });
  const [selectedVehicleId, setSelectedVehicleId] = useState('luxury_mpv');
  const [hourlyHours, setHourlyHours] = useState(3);
  const [flightNo, setFlightNo] = useState('');

  // Auto-switch recommended vehicle based on pax count
  const handlePassengersChange = (val: string) => {
    setPassengers(val);
    if (val === '4-7 Pax' || val === '8-13 Pax') {
      setSelectedVehicleId('luxury_mpv');
    } else if (val === 'Large Group') {
      setSelectedVehicleId('large_coach');
    }
  };

  // Estimated Fare Calculation
  const estimatedFareSgd = useMemo(() => {
    const vehicle = VEHICLES.find((v) => v.id === selectedVehicleId) || VEHICLES[0];
    const service = SERVICES.find((s) => s.id === serviceType) || SERVICES[0];

    let base = Math.max(vehicle.pricePerTripSgd, service.basePriceSgd);

    if (tripMode === 'hourly') {
      base = vehicle.pricePerHourSgd * Math.max(2, hourlyHours);
    } else if (tripMode === 'return') {
      base = base * 1.85; // 15% discount on round trip
    }

    if (serviceType === 'jb_malaysia') {
      base += 40; // Cross-border surcharge
    }

    return Math.round(base);
  }, [selectedVehicleId, serviceType, tripMode, hourlyHours]);

  const currencyInfo = CURRENCY_RATES[currentCurrency];
  const convertedFare = Math.round(estimatedFareSgd * currencyInfo.rate);

  const bookingSummary: BookingDetails = {
    tripMode,
    serviceType,
    pickupLocation: pickupInput,
    pickupCoords,
    destinationLocation: destInput,
    destinationCoords: destCoords,
    passengers,
    dateTime,
    vehicleId: selectedVehicleId,
    hourlyDuration: tripMode === 'hourly' ? hourlyHours : undefined,
    flightNumber: flightNo
  };

  return (
    <div className="glass-card p-6 md:p-8 rounded-[2rem] shadow-2xl border border-white/50 text-left relative z-20">
      {/* Trip Mode Tabs */}
      <div className="flex gap-2 md:gap-3 mb-6 border-b border-gray-200/60 pb-4 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setTripMode('one_way')}
          className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            tripMode === 'one_way'
              ? 'bg-[#ae0011] text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          One Way
        </button>
        <button
          onClick={() => setTripMode('return')}
          className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            tripMode === 'return'
              ? 'bg-[#ae0011] text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Return Trip (-15%)
        </button>
        <button
          onClick={() => setTripMode('hourly')}
          className={`whitespace-nowrap px-4 py-2 rounded-xl text-sm font-bold transition-all cursor-pointer ${
            tripMode === 'hourly'
              ? 'bg-[#ae0011] text-white shadow-md'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Hourly / Disposal
        </button>
      </div>

      <div className="space-y-4">
        {/* Service Type */}
        <div>
          <label className="block font-semibold text-xs text-gray-600 uppercase tracking-wider mb-1.5">
            Service Type
          </label>
          <select
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value as ServiceTypeId)}
            className="w-full h-13 px-4 bg-white border border-gray-300 rounded-xl focus:border-[#795900] focus:ring-1 focus:ring-[#795900] transition-all outline-none font-medium text-gray-800 text-sm cursor-pointer shadow-xs"
          >
            {SERVICES.map((srv) => (
              <option key={srv.id} value={srv.id}>
                {srv.title} — {srv.description}
              </option>
            ))}
          </select>
        </div>

        {/* Airport Flight Number (if airport service) */}
        {(serviceType === 'airport_arrival' || serviceType === 'airport_departure') && (
          <div>
            <label className="block font-semibold text-xs text-gray-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Flight Number (Optional)</span>
              <span className="text-[10px] text-gray-500 font-normal">Real-time Flight Tracking</span>
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xl">
                flight
              </span>
              <input
                type="text"
                placeholder="e.g. SQ 321 or EK 404"
                value={flightNo}
                onChange={(e) => setFlightNo(e.target.value)}
                className="w-full h-12 pl-11 pr-4 bg-white border border-gray-300 rounded-xl focus:border-[#795900] outline-none text-sm text-gray-800"
              />
            </div>
          </div>
        )}

        {/* Pickup Location */}
        <div className="relative">
          <label className="block font-semibold text-xs text-gray-600 uppercase tracking-wider mb-1.5">
            Pickup Address
          </label>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#ae0011] text-xl">
              location_on
            </span>
            <input
              type="text"
              value={pickupInput}
              onChange={(e) => {
                setPickupInput(e.target.value);
                setShowPickupPresets(true);
              }}
              onFocus={() => setShowPickupPresets(true)}
              placeholder="Enter hotel, airport, or address"
              className="w-full h-13 pl-11 pr-4 bg-white border border-gray-300 rounded-xl focus:border-[#795900] outline-none text-sm text-gray-800 font-medium"
            />
          </div>

          {/* Autocomplete dropdown */}
          {showPickupPresets && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-48 overflow-y-auto">
              <div className="p-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                Popular Locations
              </div>
              {LOCATION_PRESETS.map((loc) => (
                <button
                  key={`pick-${loc.id}`}
                  type="button"
                  onClick={() => {
                    setPickupInput(loc.name);
                    setPickupCoords(loc.coords);
                    setShowPickupPresets(false);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between border-b border-gray-50 last:border-none"
                >
                  <span className="font-semibold text-gray-800">{loc.name}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                    {loc.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Destination Address (if not hourly) */}
        {tripMode !== 'hourly' && (
          <div className="relative">
            <label className="block font-semibold text-xs text-gray-600 uppercase tracking-wider mb-1.5">
              Destination Address
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-[#795900] text-xl">
                flag
              </span>
              <input
                type="text"
                value={destInput}
                onChange={(e) => {
                  setDestInput(e.target.value);
                  setShowDestPresets(true);
                }}
                onFocus={() => setShowDestPresets(true)}
                placeholder="Enter destination, attraction, or address"
                className="w-full h-13 pl-11 pr-4 bg-white border border-gray-300 rounded-xl focus:border-[#795900] outline-none text-sm text-gray-800 font-medium"
              />
            </div>

            {/* Autocomplete dropdown */}
            {showDestPresets && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 max-h-48 overflow-y-auto">
                <div className="p-2 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Popular Destinations
                </div>
                {LOCATION_PRESETS.map((loc) => (
                  <button
                    key={`dest-${loc.id}`}
                    type="button"
                    onClick={() => {
                      setDestInput(loc.name);
                      setDestCoords(loc.coords);
                      setShowDestPresets(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 flex items-center justify-between border-b border-gray-50 last:border-none"
                  >
                    <span className="font-semibold text-gray-800">{loc.name}</span>
                    <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                      {loc.category}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leaflet Map Preview */}
        <LeafletRouteMap
          pickupCoords={pickupCoords}
          pickupName={pickupInput}
          destCoords={tripMode !== 'hourly' ? destCoords : undefined}
          destName={destInput}
          className="h-[220px] w-full rounded-2xl overflow-hidden shadow-inner my-2"
        />

        {/* Passengers & DateTime Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold text-xs text-gray-600 uppercase tracking-wider mb-1.5">
              Passengers
            </label>
            <select
              value={passengers}
              onChange={(e) => handlePassengersChange(e.target.value)}
              className="w-full h-13 px-4 bg-white border border-gray-300 rounded-xl focus:border-[#795900] outline-none text-sm text-gray-800 font-medium cursor-pointer shadow-xs"
            >
              <option value="1-3 Pax">1-3 Pax (Sedan / MPV)</option>
              <option value="4-7 Pax">4-7 Pax (Luxury MPV)</option>
              <option value="8-13 Pax">8-13 Pax (VIP Van / Mini Bus)</option>
              <option value="Large Group">Large Group (23-45 Seater Coach)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-xs text-gray-600 uppercase tracking-wider mb-1.5">
              Pickup Date & Time
            </label>
            <input
              type="datetime-local"
              value={dateTime}
              onChange={(e) => setDateTime(e.target.value)}
              className="w-full h-13 px-4 bg-white border border-gray-300 rounded-xl focus:border-[#795900] outline-none text-sm text-gray-800 font-medium cursor-pointer shadow-xs"
            />
          </div>
        </div>

        {/* Hourly Selector */}
        {tripMode === 'hourly' && (
          <div>
            <label className="block font-semibold text-xs text-gray-600 uppercase tracking-wider mb-1.5">
              Chauffeur Duration (Hours)
            </label>
            <div className="flex items-center gap-3">
              {[3, 4, 6, 8, 12].map((hr) => (
                <button
                  key={hr}
                  type="button"
                  onClick={() => setHourlyHours(hr)}
                  className={`flex-1 py-2 rounded-lg font-bold text-xs border transition-all ${
                    hourlyHours === hr
                      ? 'bg-[#795900] text-white border-[#795900]'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {hr} Hrs
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preferred Vehicle Selection */}
        <div>
          <label className="block font-semibold text-xs text-gray-600 uppercase tracking-wider mb-1.5">
            Select Vehicle Class
          </label>
          <div className="grid grid-cols-3 gap-2">
            {VEHICLES.slice(0, 3).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVehicleId(v.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedVehicleId === v.id
                    ? 'border-[#ae0011] bg-red-50/60 ring-1 ring-[#ae0011]'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div className="font-bold text-xs text-gray-900 truncate">{v.name}</div>
                <div className="text-[11px] text-gray-500">{v.pax} Pax</div>
              </button>
            ))}
          </div>
        </div>

        {/* Fare Summary Bar */}
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80 flex items-center justify-between mt-2">
          <div>
            <div className="text-xs text-gray-500 font-medium">Estimated All-Inclusive Fare</div>
            <div className="text-xs text-green-700 font-semibold flex items-center gap-1 mt-0.5">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>Tolls, Fuel & Waiting Time Included</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold text-[#ae0011]">
              {currencyInfo.symbol}{convertedFare}
            </span>
            <span className="text-xs text-gray-500 ml-1 font-semibold">{currentCurrency}</span>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => onSendWhatsApp(bookingSummary)}
            className="w-full bg-[#25D366] text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:brightness-105 active:scale-[0.98] transition-all shadow-md cursor-pointer"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.437 2.503 1.163 3.463l-.752 2.748 2.811-.737c.91.517 1.956.81 3.072.81 3.181 0 5.767-2.586 5.768-5.766 0-3.181-2.587-5.766-5.767-5.766zm3.366 8.291c-.144.405-.838.775-1.144.821-.307.045-.615.07-.903.07-2.023-.001-3.805-1.393-4.587-3.23-.27-.636-.407-1.332-.407-2.038 0-1.282.684-1.916 1.056-2.288.136-.136.291-.194.455-.194h.342c.105 0 .232.001.353.275.144.324.492 1.2.535 1.287.043.087.071.189.014.304-.057.116-.086.189-.174.29l-.261.304c-.087.101-.179.211-.077.386.101.174.45 1.115 1.157 1.742.548.486 1.011.637 1.214.738.174.086.275.072.376-.044l.289-.333c.115-.13.231-.101.383-.043l.87.411c.152.072.253.115.29.173.036.058.036.332-.108.737z" />
            </svg>
            <span>Quote on WhatsApp</span>
          </button>

          <button
            type="button"
            onClick={() => onProceedToCheckout(bookingSummary)}
            className="w-full bg-[#ae0011] text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5 hover:bg-[#d71920] active:scale-[0.98] transition-all shadow-md cursor-pointer"
          >
            <span>Confirm Booking</span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
