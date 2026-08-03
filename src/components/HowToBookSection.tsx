import React from 'react';

export const HowToBookSection: React.FC = () => {
  return (
    <section className="py-24 bg-[#e5e2e1]/60">
      <div className="max-w-[1200px] mx-auto px-5 md:px-12">
        <div className="text-center mb-20">
          <h2 className="font-['Plus_Jakarta_Sans'] text-3xl md:text-4xl font-bold text-[#1b1c1c] mb-4">
            How to Book
          </h2>
          <p className="text-gray-600 text-base max-w-lg mx-auto">
            Simple 4-step process to secure your premium ride.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 relative">
          {/* Connecting Line on desktop */}
          <div className="hidden md:block absolute top-10 left-[12%] right-[12%] h-0.5 bg-gray-300/80 -z-0" />

          {/* Step 1 */}
          <div className="relative z-10 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-[#ae0011] font-extrabold text-2xl shadow-lg mb-6 outline-8 outline-[#f0eded]">
              01
            </div>
            <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-gray-900 mb-2">
              Request Quote
            </h4>
            <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
              Submit your itinerary via our booking calculator or WhatsApp instant messenger.
            </p>
          </div>

          {/* Step 2 */}
          <div className="relative z-10 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-[#ae0011] font-extrabold text-2xl shadow-lg mb-6 outline-8 outline-[#f0eded]">
              02
            </div>
            <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-gray-900 mb-2">
              Instant Confirmation
            </h4>
            <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
              Receive a guaranteed all-inclusive fixed-price quote and confirm your reservation.
            </p>
          </div>

          {/* Step 3 */}
          <div className="relative z-10 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-[#ae0011] font-extrabold text-2xl shadow-lg mb-6 outline-8 outline-[#f0eded]">
              03
            </div>
            <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-gray-900 mb-2">
              Driver Assignment
            </h4>
            <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
              Receive full chauffeur contact details, photo, and vehicle registration 24h prior.
            </p>
          </div>

          {/* Step 4 */}
          <div className="relative z-10 text-center flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center text-[#ae0011] font-extrabold text-2xl shadow-lg mb-6 outline-8 outline-[#f0eded]">
              04
            </div>
            <h4 className="font-['Plus_Jakarta_Sans'] font-bold text-lg text-gray-900 mb-2">
              Enjoy Your Ride
            </h4>
            <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
              Sit back and relax with complimentary bottled water, WiFi, and professional hospitality.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
