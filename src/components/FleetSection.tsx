import React, { useState } from 'react';
import { VEHICLES, CURRENCY_RATES } from '../data/mockData';
import { Vehicle, Currency } from '../types';

interface FleetSectionProps {
  currentCurrency: Currency;
  onSelectVehicleForModal: (vehicle: Vehicle) => void;
  onBookVehicle: (vehicle: Vehicle) => void;
}

export const FleetSection: React.FC<FleetSectionProps> = ({
  currentCurrency,
  onSelectVehicleForModal,
  onBookVehicle
}) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'mpv' | 'sedan' | 'coach' | 'luxury'>('all');

  const currencyInfo = CURRENCY_RATES[currentCurrency];

  const filteredVehicles = activeCategory === 'all'
    ? VEHICLES
    : VEHICLES.filter((v) => v.category === activeCategory);

  return (
    <section className="py-24 bg-[#f6f3f2]" id="fleet">
      <div className="max-w-[1200px] mx-auto px-5 md:px-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="max-w-xl text-left">
            <h2 className="font-['Plus_Jakarta_Sans'] text-3xl md:text-4xl font-bold text-[#1b1c1c] mb-4">
              Our Elite Fleet
            </h2>
            <p className="text-gray-600 text-base leading-relaxed">
              From sleek sedans for business travel to spacious MPVs and luxury coaches for your family adventure.
            </p>
          </div>

          {/* Filter Categories */}
          <div className="flex flex-wrap gap-2 bg-white/80 p-1.5 rounded-2xl border border-gray-200/60 shadow-xs">
            {[
              { id: 'all', label: 'All Fleet' },
              { id: 'mpv', label: 'Luxury MPV' },
              { id: 'sedan', label: 'Sedan' },
              { id: 'luxury', label: 'VIP / Limo' },
              { id: 'coach', label: 'Coach' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveCategory(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === tab.id
                    ? 'bg-[#ae0011] text-white shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vehicles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVehicles.map((vehicle) => {
            const convertedPrice = Math.round(vehicle.pricePerTripSgd * currencyInfo.rate);
            return (
              <div
                key={vehicle.id}
                className="bg-white rounded-[2rem] overflow-hidden shadow-lg border border-gray-200/50 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between text-left group"
              >
                <div>
                  <div className="h-60 bg-gray-100 relative overflow-hidden">
                    <img
                      src={vehicle.image}
                      alt={vehicle.name}
                      className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                    />
                    {vehicle.tag && (
                      <span className="absolute top-4 right-4 bg-[#ae0011] text-white px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider shadow-md">
                        {vehicle.tag}
                      </span>
                    )}
                  </div>

                  <div className="p-8">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-2xl text-[#1b1c1c]">
                        {vehicle.name}
                      </h4>
                      <div className="text-right">
                        <span className="text-xl font-extrabold text-[#ae0011]">
                          {currencyInfo.symbol}{convertedPrice}
                        </span>
                        <div className="text-[10px] text-gray-500 font-semibold">per trip</div>
                      </div>
                    </div>

                    <p className="text-xs text-gray-500 mb-6 line-clamp-2 leading-relaxed">
                      {vehicle.description}
                    </p>

                    <div className="flex flex-wrap gap-4 text-gray-600 text-xs font-semibold mb-6 pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 bg-gray-100/80 px-3 py-1.5 rounded-lg">
                        <span className="material-symbols-outlined text-base text-[#ae0011]">
                          group
                        </span>
                        <span>{vehicle.pax} Pax</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-gray-100/80 px-3 py-1.5 rounded-lg">
                        <span className="material-symbols-outlined text-base text-[#ae0011]">
                          luggage
                        </span>
                        <span>{vehicle.bags} Bags</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1.5 rounded-lg text-[#795900]">
                        <span className="material-symbols-outlined text-base fill-1">
                          star
                        </span>
                        <span>{vehicle.specialFeature}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-8 pt-0 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => onSelectVehicleForModal(vehicle)}
                    className="w-full py-3.5 rounded-xl border-2 border-gray-200 text-gray-800 font-bold text-sm hover:border-[#ae0011] hover:text-[#ae0011] transition-all cursor-pointer text-center"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => onBookVehicle(vehicle)}
                    className="w-full py-3.5 rounded-xl bg-[#ae0011] text-white font-bold text-sm hover:bg-[#d71920] shadow-md transition-all cursor-pointer text-center"
                  >
                    Select Car
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
