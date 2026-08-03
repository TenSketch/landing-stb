import React, { useState } from 'react';
import { BookingDetails, Currency } from '../types';
import { VEHICLES, SERVICES, CURRENCY_RATES } from '../data/mockData';

interface BookingConfirmationModalProps {
  booking: BookingDetails | null;
  currentCurrency: Currency;
  onClose: () => void;
  onConfirmSuccess: () => void;
}

export const BookingConfirmationModal: React.FC<BookingConfirmationModalProps> = ({
  booking,
  currentCurrency,
  onClose
}) => {
  if (!booking) return null;

  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [flightNo, setFlightNo] = useState(booking.flightNumber || '');
  const [specialRequests, setSpecialRequests] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'paynow' | 'card' | 'cash' | 'whatsapp'>('paynow');

  const [confirmedPass, setConfirmedPass] = useState<{
    bookingRef: string;
    createdAt: string;
  } | null>(null);

  const vehicle = VEHICLES.find((v) => v.id === booking.vehicleId) || VEHICLES[0];
  const service = SERVICES.find((s) => s.id === booking.serviceType) || SERVICES[0];

  const currencyInfo = CURRENCY_RATES[currentCurrency];
  let baseSgd = vehicle.pricePerTripSgd;
  if (booking.tripMode === 'hourly' && booking.hourlyDuration) {
    baseSgd = vehicle.pricePerHourSgd * booking.hourlyDuration;
  } else if (booking.tripMode === 'return') {
    baseSgd = baseSgd * 1.85;
  }
  if (booking.serviceType === 'jb_malaysia') {
    baseSgd += 40;
  }

  const fareInCurrency = Math.round(baseSgd * currencyInfo.rate);

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestEmail || !guestPhone) return;

    const ref = `STB-${Math.floor(100000 + Math.random() * 900000)}`;
    setConfirmedPass({
      bookingRef: ref,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 text-left relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:text-black cursor-pointer"
        >
          <span className="material-symbols-outlined text-xl">close</span>
        </button>

        {!confirmedPass ? (
          <div className="p-6 md:p-8 space-y-6">
            {/* Header */}
            <div className="border-b border-gray-100 pb-4">
              <span className="bg-red-100 text-[#ae0011] text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                Instant Confirmation
              </span>
              <h3 className="font-['Plus_Jakarta_Sans'] font-extrabold text-2xl md:text-3xl text-gray-900 mt-2">
                Complete Your Booking
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Guaranteed fixed price. No hidden ERP tolls or night surcharges.
              </p>
            </div>

            {/* Ride summary card */}
            <div className="bg-gray-50 rounded-2xl p-4 md:p-5 border border-gray-200/70 space-y-3">
              <div className="flex items-center justify-between border-b border-gray-200/60 pb-3">
                <div className="flex items-center gap-3">
                  <img
                    src={vehicle.image}
                    alt={vehicle.name}
                    className="w-16 h-12 rounded-xl object-cover shadow-xs"
                  />
                  <div>
                    <div className="font-bold text-sm text-gray-900">{vehicle.name}</div>
                    <div className="text-xs text-gray-500 font-medium">
                      {service.title} • {booking.passengers}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-extrabold text-[#ae0011]">
                    {currencyInfo.symbol}{fareInCurrency}
                  </div>
                  <div className="text-[10px] text-gray-500 font-semibold">{currentCurrency} Total</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700 font-medium pt-1">
                <div className="flex items-start gap-1.5">
                  <span className="material-symbols-outlined text-[#ae0011] text-base">location_on</span>
                  <div>
                    <span className="text-gray-400 font-bold block text-[10px] uppercase">From</span>
                    <span className="font-semibold text-gray-900">{booking.pickupLocation}</span>
                  </div>
                </div>

                {booking.tripMode !== 'hourly' && (
                  <div className="flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[#795900] text-base">flag</span>
                    <div>
                      <span className="text-gray-400 font-bold block text-[10px] uppercase">To</span>
                      <span className="font-semibold text-gray-900">{booking.destinationLocation}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-1.5">
                  <span className="material-symbols-outlined text-gray-500 text-base">calendar_clock</span>
                  <div>
                    <span className="text-gray-400 font-bold block text-[10px] uppercase">Date & Time</span>
                    <span className="font-semibold text-gray-900">
                      {new Date(booking.dateTime).toLocaleString([], {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-1.5">
                  <span className="material-symbols-outlined text-emerald-600 text-base">verified</span>
                  <div>
                    <span className="text-gray-400 font-bold block text-[10px] uppercase">Service Perks</span>
                    <span className="font-semibold text-gray-900">
                      Free Flight Tracking & 60m Wait
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Guest Form */}
            <form onSubmit={handleSubmitBooking} className="space-y-4">
              <h4 className="font-bold text-sm text-gray-900 uppercase tracking-wider">
                Passenger Contact Details
              </h4>

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Lead Passenger Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alexander Hamilton"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full h-12 px-3.5 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ae0011]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="alexander@example.com"
                    value={guestEmail}
                    onChange={(e) => setGuestEmail(e.target.value)}
                    className="w-full h-12 px-3.5 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ae0011]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Mobile / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+65 9123 4567"
                    value={guestPhone}
                    onChange={(e) => setGuestPhone(e.target.value)}
                    className="w-full h-12 px-3.5 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ae0011]"
                  />
                </div>
              </div>

              {(booking.serviceType === 'airport_arrival' || booking.serviceType === 'airport_departure') && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                    Flight Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SQ 321 or EK 404"
                    value={flightNo}
                    onChange={(e) => setFlightNo(e.target.value)}
                    className="w-full h-12 px-3.5 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ae0011]"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                  Special Instructions / Requests
                </label>
                <input
                  type="text"
                  placeholder="Child booster seat, luggage help, wheelchair access, etc."
                  value={specialRequests}
                  onChange={(e) => setSpecialRequests(e.target.value)}
                  className="w-full h-12 px-3.5 bg-gray-50 border border-gray-300 rounded-xl text-sm outline-none focus:border-[#ae0011]"
                />
              </div>

              {/* Payment Option */}
              <div className="pt-2">
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                  Select Payment Option
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'paynow', label: 'PayNow SG', icon: 'qr_code_2' },
                    { id: 'card', label: 'Credit Card', icon: 'credit_card' },
                    { id: 'cash', label: 'Cash to Driver', icon: 'payments' },
                    { id: 'whatsapp', label: 'WhatsApp', icon: 'chat' }
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPaymentMethod(p.id as any)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        paymentMethod === p.id
                          ? 'border-[#ae0011] bg-red-50/60 ring-1 ring-[#ae0011] text-[#ae0011]'
                          : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xl block mx-auto mb-1">
                        {p.icon}
                      </span>
                      <span className="font-bold text-xs">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-[#ae0011] text-white py-4 rounded-xl font-bold text-base hover:bg-[#d71920] shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 mt-4"
              >
                <span>Confirm Reservation ({currencyInfo.symbol}{fareInCurrency})</span>
                <span className="material-symbols-outlined text-xl">arrow_forward</span>
              </button>
            </form>
          </div>
        ) : (
          /* Confirmation Voucher Pass */
          <div className="p-6 md:p-8 space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mx-auto">
              <span className="material-symbols-outlined text-3xl">verified</span>
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full uppercase tracking-wider">
                Booking Confirmed
              </span>
              <h3 className="font-['Plus_Jakarta_Sans'] font-extrabold text-2xl md:text-3xl text-gray-900 mt-3">
                Your VIP Ride is Secured!
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                A confirmation email & SMS has been dispatched to {guestEmail}.
              </p>
            </div>

            {/* Voucher Card */}
            <div className="bg-[#1b1c1c] text-white rounded-3xl p-6 shadow-2xl relative overflow-hidden text-left border border-amber-500/30">
              <div className="flex justify-between items-start border-b border-gray-700 pb-4 mb-4">
                <div>
                  <div className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest">
                    STB SINGAPORE VIP PASS
                  </div>
                  <div className="text-2xl font-mono font-extrabold text-white mt-0.5">
                    {confirmedPass.bookingRef}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-400 uppercase">Confirmed At</div>
                  <div className="text-xs font-bold text-gray-200">{confirmedPass.createdAt} Today</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Passenger</span>
                  <span className="font-bold text-white text-sm">{guestName}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Vehicle Class</span>
                  <span className="font-bold text-amber-300 text-sm">{vehicle.name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Pickup Location</span>
                  <span className="font-semibold text-gray-200 truncate block">{booking.pickupLocation}</span>
                </div>
                {booking.tripMode !== 'hourly' && (
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Destination</span>
                    <span className="font-semibold text-gray-200 truncate block">{booking.destinationLocation}</span>
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase">Total Fare Paid/Due</div>
                  <div className="text-xl font-extrabold text-amber-400">
                    {currencyInfo.symbol}{fareInCurrency} {currentCurrency}
                  </div>
                </div>

                <div className="bg-white p-2 rounded-xl">
                  {/* Visual QR Code simulation */}
                  <div className="w-12 h-12 bg-gray-900 rounded flex items-center justify-center text-white text-[9px] font-mono font-bold text-center p-1 leading-none">
                    STB-PASS-QR
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  alert(`Booking pass ${confirmedPass.bookingRef} copied to clipboard!`);
                }}
                className="flex-1 py-3.5 rounded-xl border border-gray-300 font-bold text-sm text-gray-800 hover:bg-gray-100 transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-lg">content_copy</span>
                <span>Copy Summary</span>
              </button>

              <button
                onClick={onClose}
                className="flex-1 bg-[#ae0011] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#d71920] transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
