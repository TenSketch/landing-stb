import React, { useState } from 'react';
import { FOOTER_LOGO_URL } from '../data/mockData';

export const Footer: React.FC = () => {
  const [emailInput, setEmailInput] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim()) {
      setSubscribed(true);
      setEmailInput('');
      setTimeout(() => setSubscribed(false), 5000);
    }
  };

  return (
    <footer className="bg-[#e5e2e1] pt-16 pb-8 border-t border-gray-300/50 text-left text-gray-800">
      <div className="max-w-[1200px] mx-auto px-5 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-16">
          {/* Brand Info */}
          <div className="col-span-1 md:col-span-1">
            <img
              src={FOOTER_LOGO_URL}
              alt="STB Logo"
              className="h-14 w-auto mb-6 object-contain"
            />
            <p className="text-gray-600 text-xs md:text-sm mb-6 leading-relaxed">
              Premium private transport and tour booking service in Singapore, committed to majestic hospitality, fixed pricing, and professional excellence.
            </p>
            <div className="flex gap-3">
              <a
                href="#booking-widget-container"
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#ae0011] shadow-xs hover:scale-110 transition-transform"
                title="Book Online"
              >
                <span className="material-symbols-outlined text-lg">directions_car</span>
              </a>
              <a
                href="#fleet"
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#ae0011] shadow-xs hover:scale-110 transition-transform"
                title="Fleet"
              >
                <span className="material-symbols-outlined text-lg">time_to_leave</span>
              </a>
              <a
                href="#faq"
                className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-[#ae0011] shadow-xs hover:scale-110 transition-transform"
                title="Support"
              >
                <span className="material-symbols-outlined text-lg">support_agent</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="font-['Plus_Jakarta_Sans'] font-bold text-gray-900 mb-6 text-base">
              Quick Links
            </h5>
            <ul className="space-y-3 text-sm text-gray-600 font-medium">
              <li>
                <a href="#services" className="hover:text-[#ae0011] transition-colors">
                  Services
                </a>
              </li>
              <li>
                <a href="#fleet" className="hover:text-[#ae0011] transition-colors">
                  Fleet Showcase
                </a>
              </li>
              <li>
                <a href="#destinations" className="hover:text-[#ae0011] transition-colors">
                  Singapore Destinations
                </a>
              </li>
              <li>
                <a href="#booking-widget-container" className="hover:text-[#ae0011] transition-colors">
                  Fare Calculator
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h5 className="font-['Plus_Jakarta_Sans'] font-bold text-gray-900 mb-6 text-base">
              Support & Info
            </h5>
            <ul className="space-y-3 text-sm text-gray-600 font-medium">
              <li>
                <a href="#faq" className="hover:text-[#ae0011] transition-colors">
                  Contact Us
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#ae0011] transition-colors">
                  Privacy Policy
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#ae0011] transition-colors">
                  Terms of Service
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-[#ae0011] transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h5 className="font-['Plus_Jakarta_Sans'] font-bold text-gray-900 mb-6 text-base">
              VIP Newsletter
            </h5>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Subscribe for Singapore travel tips, seasonal chauffeur discounts, and exclusive VIP offers.
            </p>

            <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="Your email address"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="bg-white border-none rounded-xl px-4 py-3 flex-1 outline-none text-xs text-gray-800 shadow-xs"
                />
                <button
                  type="submit"
                  className="bg-[#ae0011] text-white px-4 py-3 rounded-xl hover:bg-[#d71920] transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-lg">send</span>
                </button>
              </div>
              {subscribed && (
                <div className="text-[11px] font-bold text-emerald-700 bg-emerald-100 p-2 rounded-lg text-center">
                  ✓ Thank you! You're subscribed to STB VIP news.
                </div>
              )}
            </form>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-300/60 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-600 font-medium">
          <p>© 2026 Singapore Tour Booking (STB). All rights reserved. Majestic Hospitality Group.</p>
          <div className="flex gap-6">
            <a href="#faq" className="hover:underline">Privacy Policy</a>
            <a href="#faq" className="hover:underline">Terms of Service</a>
            <a href="#faq" className="hover:underline">Travel Insurance</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
