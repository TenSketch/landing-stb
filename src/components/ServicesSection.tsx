import React from 'react';
import { SERVICES, CURRENCY_RATES } from '../data/mockData';
import { ServiceTypeId, Currency } from '../types';

interface ServicesSectionProps {
  currentCurrency: Currency;
  onSelectService: (serviceId: ServiceTypeId) => void;
}

export const ServicesSection: React.FC<ServicesSectionProps> = ({
  currentCurrency,
  onSelectService
}) => {
  const currencyInfo = CURRENCY_RATES[currentCurrency];

  return (
    <section className="py-24 bg-white" id="services">
      <div className="max-w-[1200px] mx-auto px-5 md:px-12">
        <div className="text-center mb-16">
          <h2 className="font-['Plus_Jakarta_Sans'] text-3xl md:text-4xl font-bold text-[#1b1c1c] mb-4">
            Majestic Travel Services
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-base leading-relaxed">
            Comprehensive transportation solutions tailored to your unique itinerary in the Lion City.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SERVICES.map((service) => {
            const convertedPrice = Math.round(service.basePriceSgd * currencyInfo.rate);
            return (
              <div
                key={service.id}
                className="p-8 rounded-3xl bg-[#F8F9FB] hover:bg-white hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group border border-gray-100 hover:border-red-100/60 flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center text-[#ae0011] group-hover:bg-[#ae0011] group-hover:text-white group-hover:scale-110 transition-all duration-300 shadow-xs">
                      <span className="material-symbols-outlined text-[32px]">
                        {service.icon}
                      </span>
                    </div>

                    {service.popularTag && (
                      <span className="bg-amber-100 text-[#795900] text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider">
                        {service.popularTag}
                      </span>
                    )}
                  </div>

                  <h3 className="font-['Plus_Jakarta_Sans'] font-bold text-xl text-[#1b1c1c] mb-3">
                    {service.title}
                  </h3>

                  <p className="text-gray-600 text-sm mb-6 leading-relaxed">
                    {service.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
                  <div className="text-xs text-gray-500 font-medium">
                    From <span className="text-base font-bold text-[#1b1c1c]">{currencyInfo.symbol}{convertedPrice}</span>
                  </div>

                  <button
                    onClick={() => onSelectService(service.id)}
                    className="text-[#ae0011] font-bold text-sm flex items-center gap-1 group/btn hover:underline cursor-pointer"
                  >
                    <span>Book Now</span>
                    <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-1 transition-transform">
                      chevron_right
                    </span>
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
