import React from 'react';
import { BookingWidget } from './BookingWidget';
import { BookingDetails, ServiceTypeId, Currency } from '../types';
import { HERO_BG_IMAGE } from '../data/mockData';

interface HeroSectionProps {
  currentCurrency: Currency;
  onProceedToCheckout: (details: BookingDetails) => void;
  onSendWhatsApp: (details: BookingDetails) => void;
  selectedServiceId?: ServiceTypeId;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  currentCurrency,
  onProceedToCheckout,
  onSendWhatsApp,
  selectedServiceId
}) => {
  const scrollToBooking = () => {
    const el = document.getElementById('booking-widget-container');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative min-h-[92vh] flex items-center overflow-hidden pt-24 pb-16">
      {/* Background with overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={HERO_BG_IMAGE}
          alt="Singapore Skyline Sunset"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#fcf9f8]/95 via-[#fcf9f8]/85 to-[#fcf9f8]/60" />
      </div>

      <div className="relative z-10 max-w-[1200px] mx-auto px-5 md:px-12 w-full grid md:grid-cols-2 gap-12 items-center">
        {/* Left Copy */}
        <div className="text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-100/80 border border-amber-300 text-[#795900] text-xs font-bold uppercase tracking-wider mb-6 shadow-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#795900] animate-pulse-slow"></span>
            <span>Premium Chauffeur Service</span>
          </div>

          <h1 className="font-['Plus_Jakarta_Sans'] font-extrabold text-4xl sm:text-5xl lg:text-6xl text-[#1b1c1c] tracking-tight leading-[1.1] mb-6">
            Singapore Private Transport &{' '}
            <span className="text-[#ae0011]">Tour Booking</span>
          </h1>

          <p className="font-['Manrope'] text-lg text-gray-700 mb-8 max-w-lg leading-relaxed">
            Experience Majestic Hospitality with Singapore’s premier private transport service. From airport transfers to bespoke city tours, we define luxury travel.
          </p>

          {/* Badges */}
          <div className="flex flex-wrap gap-3 mb-10">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-md rounded-2xl shadow-xs border border-white/60">
              <span className="material-symbols-outlined text-[#ae0011] text-xl fill-1">
                verified_user
              </span>
              <span className="font-semibold text-xs text-gray-800">Licensed Partners</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-md rounded-2xl shadow-xs border border-white/60">
              <span className="material-symbols-outlined text-[#ae0011] text-xl fill-1">
                support_agent
              </span>
              <span className="font-semibold text-xs text-gray-800">24/7 Service</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/80 backdrop-blur-md rounded-2xl shadow-xs border border-white/60">
              <span className="material-symbols-outlined text-[#ae0011] text-xl fill-1">
                payments
              </span>
              <span className="font-semibold text-xs text-gray-800">Fixed Pricing</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={scrollToBooking}
              className="bg-[#ae0011] text-white px-8 py-4 rounded-full font-bold text-base hover:bg-[#d71920] hover:shadow-xl hover:shadow-red-900/20 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Get Instant Quote</span>
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>

        {/* Right Widget */}
        <div id="booking-widget-container" className="w-full">
          <BookingWidget
            currentCurrency={currentCurrency}
            onProceedToCheckout={onProceedToCheckout}
            onSendWhatsApp={onSendWhatsApp}
            selectedServiceId={selectedServiceId}
          />
        </div>
      </div>
    </section>
  );
};
