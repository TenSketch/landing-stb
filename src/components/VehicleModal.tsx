import React, { useState } from 'react';
import { Vehicle, Currency } from '../types';
import { CURRENCY_RATES } from '../data/mockData';

interface VehicleModalProps {
  vehicle: Vehicle | null;
  currentCurrency: Currency;
  onClose: () => void;
  onBookVehicle: (vehicle: Vehicle) => void;
}

export const VehicleModal: React.FC<VehicleModalProps> = ({
  vehicle,
  currentCurrency,
  onClose,
  onBookVehicle
}) => {
  if (!vehicle) return null;

  const [activeImage, setActiveImage] = useState(vehicle.image);
  const currencyInfo = CURRENCY_RATES[currentCurrency];
  const convertedTripPrice = Math.round(vehicle.pricePerTripSgd * currencyInfo.rate);
  const convertedHourlyPrice = Math.round(vehicle.pricePerHourSgd * currencyInfo.rate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 text-left relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-md shadow-md flex items-center justify-center text-gray-700 hover:text-red-600 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        {/* Hero image */}
        <div className="relative h-72 bg-gray-100">
          <img
            src={activeImage}
            alt={vehicle.name}
            className="w-full h-full object-cover"
          />
          {vehicle.tag && (
            <span className="absolute bottom-4 left-4 bg-[#ae0011] text-white px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-wider shadow-md">
              {vehicle.tag}
            </span>
          )}
        </div>

        {/* Image thumbnails */}
        {vehicle.gallery.length > 1 && (
          <div className="flex gap-3 px-6 py-3 bg-gray-50 border-b border-gray-100 overflow-x-auto">
            {vehicle.gallery.map((imgUrl, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(imgUrl)}
                className={`w-20 h-14 rounded-xl overflow-hidden border-2 transition-all ${
                  activeImage === imgUrl ? 'border-[#ae0011] scale-105 shadow-sm' : 'border-transparent opacity-70'
                }`}
              >
                <img src={imgUrl} alt={`Gallery ${idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="p-6 md:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-gray-100 pb-4">
            <div>
              <h3 className="font-['Plus_Jakarta_Sans'] font-extrabold text-2xl md:text-3xl text-gray-900">
                {vehicle.name}
              </h3>
              <p className="text-xs text-gray-500 font-semibold mt-1">
                Category: {vehicle.category.toUpperCase()} • {vehicle.specialFeature}
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-2xl font-extrabold text-[#ae0011]">
                {currencyInfo.symbol}{convertedTripPrice}
              </div>
              <div className="text-xs text-gray-500 font-medium">
                ({currencyInfo.symbol}{convertedHourlyPrice}/hr disposal)
              </div>
            </div>
          </div>

          <p className="text-gray-600 text-sm leading-relaxed">
            {vehicle.description}
          </p>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60">
              <div className="text-[11px] text-gray-400 font-bold uppercase">Passenger Capacity</div>
              <div className="text-sm font-bold text-gray-800 flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[#ae0011]">group</span>
                <span>Up to {vehicle.pax} Pax</span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60">
              <div className="text-[11px] text-gray-400 font-bold uppercase">Luggage Space</div>
              <div className="text-sm font-bold text-gray-800 flex items-center gap-1 mt-0.5">
                <span className="material-symbols-outlined text-[#ae0011]">luggage</span>
                <span>{vehicle.bags} Large Bags</span>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/60 col-span-2 sm:col-span-1">
              <div className="text-[11px] text-gray-400 font-bold uppercase">Powertrain</div>
              <div className="text-xs font-bold text-gray-800 truncate mt-0.5">
                {vehicle.specs.engine}
              </div>
            </div>
          </div>

          {/* Amenities & Included Perks */}
          <div>
            <h4 className="font-bold text-sm text-gray-900 uppercase tracking-wider mb-3">
              Included VIP Amenities
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-medium text-gray-700">
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50/60 text-emerald-900 rounded-lg">
                <span className="material-symbols-outlined text-emerald-600 text-lg">wifi</span>
                <span>5G Onboard WiFi</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50/60 text-emerald-900 rounded-lg">
                <span className="material-symbols-outlined text-emerald-600 text-lg">water_drop</span>
                <span>Bottled Water</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50/60 text-emerald-900 rounded-lg">
                <span className="material-symbols-outlined text-emerald-600 text-lg">flight</span>
                <span>Flight Tracking</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50/60 text-emerald-900 rounded-lg">
                <span className="material-symbols-outlined text-emerald-600 text-lg">person</span>
                <span>Chauffeur Meet & Greet</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50/60 text-emerald-900 rounded-lg">
                <span className="material-symbols-outlined text-emerald-600 text-lg">child_care</span>
                <span>Child Seat Available</span>
              </div>
              <div className="flex items-center gap-2 p-2.5 bg-emerald-50/60 text-emerald-900 rounded-lg">
                <span className="material-symbols-outlined text-emerald-600 text-lg">ac_unit</span>
                <span>Dual Climate Control</span>
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="pt-4 border-t border-gray-100 flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3.5 rounded-xl border border-gray-300 font-bold text-sm text-gray-700 hover:bg-gray-100 transition-all cursor-pointer"
            >
              Close
            </button>
            <button
              onClick={() => {
                onClose();
                onBookVehicle(vehicle);
              }}
              className="flex-1 bg-[#ae0011] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#d71920] shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Book {vehicle.name} Now</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
