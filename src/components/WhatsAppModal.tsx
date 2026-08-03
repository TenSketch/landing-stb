import React, { useState } from 'react';
import { BookingDetails } from '../types';
import { SERVICES, VEHICLES } from '../data/mockData';

interface WhatsAppModalProps {
  bookingDetails?: BookingDetails | null;
  onClose: () => void;
}

export const WhatsAppModal: React.FC<WhatsAppModalProps> = ({
  bookingDetails,
  onClose
}) => {
  const [customMsg, setCustomMsg] = useState('');

  const defaultPhone = '+6591234567'; // STB WhatsApp Hotline

  const service = SERVICES.find((s) => s.id === bookingDetails?.serviceType) || SERVICES[0];
  const vehicle = VEHICLES.find((v) => v.id === bookingDetails?.vehicleId) || VEHICLES[0];

  const constructedMessage = bookingDetails
    ? `Hello STB Singapore! I would like to inquire/book a private transfer:
- Service: ${service.title}
- Pickup: ${bookingDetails.pickupLocation}
- Destination: ${bookingDetails.destinationLocation || 'N/A'}
- Passengers: ${bookingDetails.passengers}
- Vehicle Class: ${vehicle.name}
- Pickup Time: ${new Date(bookingDetails.dateTime).toLocaleString()}
${bookingDetails.flightNumber ? `- Flight No: ${bookingDetails.flightNumber}\n` : ''}${
        customMsg ? `- Note: ${customMsg}` : ''
      }`
    : `Hello STB Singapore! I would like to inquire about private transport and tour booking options for Singapore/Malaysia.`;

  const encodedUrl = `https://wa.me/${defaultPhone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
    constructedMessage
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn text-left">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:text-black cursor-pointer"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-[#25D366] text-white flex items-center justify-center shadow-md">
            <span className="material-symbols-outlined text-2xl">chat</span>
          </div>
          <div>
            <h3 className="font-['Plus_Jakarta_Sans'] font-extrabold text-xl text-gray-900">
              STB VIP WhatsApp Hotline
            </h3>
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>24/7 Dispatch Concierge Online</span>
            </p>
          </div>
        </div>

        <p className="text-xs text-gray-600 mb-4 leading-relaxed">
          Send your booking itinerary directly to our 24/7 WhatsApp dispatch team for an instant human response and confirmation.
        </p>

        {/* Message preview box */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 text-xs font-mono text-emerald-950 mb-4 whitespace-pre-line max-h-48 overflow-y-auto">
          {constructedMessage}
        </div>

        <div className="mb-6">
          <label className="block text-[11px] font-bold text-gray-600 uppercase mb-1">
            Add Additional Notes (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Need 2 child seats, extra luggage space..."
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            className="w-full h-11 px-3 bg-gray-50 border border-gray-300 rounded-xl text-xs outline-none focus:border-[#25D366]"
          />
        </div>

        <a
          href={encodedUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onClose}
          className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all cursor-pointer"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.437 2.503 1.163 3.463l-.752 2.748 2.811-.737c.91.517 1.956.81 3.072.81 3.181 0 5.767-2.586 5.768-5.766 0-3.181-2.587-5.766-5.767-5.766zm3.366 8.291c-.144.405-.838.775-1.144.821-.307.045-.615.07-.903.07-2.023-.001-3.805-1.393-4.587-3.23-.27-.636-.407-1.332-.407-2.038 0-1.282.684-1.916 1.056-2.288.136-.136.291-.194.455-.194h.342c.105 0 .232.001.353.275.144.324.492 1.2.535 1.287.043.087.071.189.014.304-.057.116-.086.189-.174.29l-.261.304c-.087.101-.179.211-.077.386.101.174.45 1.115 1.157 1.742.548.486 1.011.637 1.214.738.174.086.275.072.376-.044l.289-.333c.115-.13.231-.101.383-.043l.87.411c.152.072.253.115.29.173.036.058.036.332-.108.737z" />
          </svg>
          <span>Open WhatsApp Chat Now</span>
        </a>
      </div>
    </div>
  );
};
