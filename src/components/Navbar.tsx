import React, { useState, useEffect } from 'react';
import { LOGO_URL, CURRENCY_RATES } from '../data/mockData';
import { Currency } from '../types';

interface NavbarProps {
  currentCurrency: Currency;
  onCurrencyChange: (c: Currency) => void;
  onOpenWhatsApp: () => void;
  onOpenBooking: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentCurrency,
  onCurrencyChange,
  onOpenWhatsApp,
  onOpenBooking
}) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 40) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'h-16 bg-white/90 backdrop-blur-md shadow-sm border-b border-gray-200/50'
          : 'h-20 bg-glass-fill backdrop-blur-xl border-b border-white/30 shadow-sm'
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-12 h-full flex justify-between items-center">
        {/* Logo */}
        <a href="#" className="flex items-center gap-3 group">
          <img
            src={LOGO_URL}
            alt="Singapore Tour Booking (STB) Logo"
            className="h-11 md:h-12 w-auto object-contain transition-transform group-hover:scale-105"
          />
          <span className="font-['Plus_Jakarta_Sans'] font-bold text-xl md:text-2xl text-[#ae0011] tracking-tight hidden sm:inline-block">
            STB Singapore
          </span>
        </a>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-7">
          <a
            href="#services"
            className="text-[#1b1c1c] hover:text-[#ae0011] font-medium text-base transition-colors"
          >
            Services
          </a>
          <a
            href="#fleet"
            className="text-[#1b1c1c] hover:text-[#ae0011] font-medium text-base transition-colors"
          >
            Fleet
          </a>
          <a
            href="#destinations"
            className="text-[#1b1c1c] hover:text-[#ae0011] font-medium text-base transition-colors"
          >
            Destinations
          </a>
          <a
            href="#faq"
            className="text-[#1b1c1c] hover:text-[#ae0011] font-medium text-base transition-colors"
          >
            FAQ
          </a>

          {/* Currency Selector */}
          <div className="relative flex items-center bg-gray-100/80 rounded-full px-3 py-1 text-xs font-semibold text-gray-700">
            <span className="material-symbols-outlined text-sm mr-1 text-gray-500">payments</span>
            <select
              value={currentCurrency}
              onChange={(e) => onCurrencyChange(e.target.value as Currency)}
              className="bg-transparent border-none outline-none cursor-pointer font-bold text-gray-800 pr-1"
            >
              {(Object.keys(CURRENCY_RATES) as Currency[]).map((curr) => (
                <option key={curr} value={curr}>
                  {curr} ({CURRENCY_RATES[curr].symbol})
                </option>
              ))}
            </select>
          </div>

          {/* WhatsApp VIP Button */}
          <button
            onClick={onOpenWhatsApp}
            className="bg-[#25D366] hover:bg-[#20ba59] text-white px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">chat</span>
            <span>WhatsApp VIP</span>
          </button>

          {/* Instant Book Button */}
          <button
            onClick={onOpenBooking}
            className="bg-[#ae0011] hover:bg-[#d71920] text-white px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-1.5 shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
          >
            <span>Book Ride</span>
            <span className="material-symbols-outlined text-lg">arrow_forward</span>
          </button>
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={onOpenWhatsApp}
            className="bg-[#25D366] text-white p-2 rounded-full flex items-center justify-center shadow-sm"
            title="WhatsApp VIP"
          >
            <span className="material-symbols-outlined text-xl">chat</span>
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="text-[#ae0011] p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-3xl">
              {mobileMenuOpen ? 'close' : 'menu'}
            </span>
          </button>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 shadow-xl px-6 py-6 animate-fadeIn">
          <div className="flex flex-col gap-4 text-left">
            <a
              href="#services"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-semibold text-gray-800 py-2 border-b border-gray-100 flex items-center justify-between"
            >
              <span>Services</span>
              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </a>
            <a
              href="#fleet"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-semibold text-gray-800 py-2 border-b border-gray-100 flex items-center justify-between"
            >
              <span>Our Fleet</span>
              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </a>
            <a
              href="#destinations"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-semibold text-gray-800 py-2 border-b border-gray-100 flex items-center justify-between"
            >
              <span>Destinations</span>
              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </a>
            <a
              href="#faq"
              onClick={() => setMobileMenuOpen(false)}
              className="text-lg font-semibold text-gray-800 py-2 border-b border-gray-100 flex items-center justify-between"
            >
              <span>FAQ</span>
              <span className="material-symbols-outlined text-gray-400">chevron_right</span>
            </a>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Currency</span>
              <select
                value={currentCurrency}
                onChange={(e) => onCurrencyChange(e.target.value as Currency)}
                className="bg-gray-100 rounded-lg px-3 py-1.5 font-bold text-sm"
              >
                {(Object.keys(CURRENCY_RATES) as Currency[]).map((curr) => (
                  <option key={curr} value={curr}>
                    {curr} ({CURRENCY_RATES[curr].symbol})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenWhatsApp();
                }}
                className="w-full bg-[#25D366] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-lg">chat</span>
                <span>WhatsApp</span>
              </button>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenBooking();
                }}
                className="w-full bg-[#ae0011] text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-1"
              >
                <span>Book Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
