import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { ServicesSection } from './components/ServicesSection';
import { FleetSection } from './components/FleetSection';
import { DestinationsSection } from './components/DestinationsSection';
import { HowToBookSection } from './components/HowToBookSection';
import { TestimonialsSection } from './components/TestimonialsSection';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';
import { VehicleModal } from './components/VehicleModal';
import { BookingConfirmationModal } from './components/BookingConfirmationModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { Currency, ServiceTypeId, Vehicle, BookingDetails, Destination } from './types';

export function App() {
  const [currentCurrency, setCurrentCurrency] = useState<Currency>('SGD');
  const [selectedServiceId, setSelectedServiceId] = useState<ServiceTypeId | undefined>(undefined);

  // Modal states
  const [modalVehicle, setModalVehicle] = useState<Vehicle | null>(null);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsAppBooking, setWhatsAppBooking] = useState<BookingDetails | null>(null);

  // Handlers
  const handleSelectService = (srvId: ServiceTypeId) => {
    setSelectedServiceId(srvId);
    const el = document.getElementById('booking-widget-container');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSelectDestination = (dest: Destination) => {
    const el = document.getElementById('booking-widget-container');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleBookVehicleDirect = (v: Vehicle) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);

    const initialDetails: BookingDetails = {
      tripMode: 'one_way',
      serviceType: 'airport_arrival',
      pickupLocation: 'Changi Airport Terminal 1',
      destinationLocation: 'Marina Bay Sands Hotel Tower 1',
      passengers: v.pax > 4 ? '4-7 Pax' : '1-3 Pax',
      dateTime: tomorrow.toISOString().slice(0, 16),
      vehicleId: v.id
    };

    setBookingDetails(initialDetails);
  };

  const handleOpenWhatsAppWithDetails = (details: BookingDetails) => {
    setWhatsAppBooking(details);
    setShowWhatsAppModal(true);
  };

  return (
    <div className="min-h-screen bg-[#fcf9f8] text-[#1b1c1c] font-['Manrope'] selection:bg-[#ae0011] selection:text-white antialiased relative">
      {/* Navbar */}
      <Navbar
        currentCurrency={currentCurrency}
        onCurrencyChange={(c) => setCurrentCurrency(c)}
        onOpenWhatsApp={() => {
          setWhatsAppBooking(null);
          setShowWhatsAppModal(true);
        }}
        onOpenBooking={() => {
          const el = document.getElementById('booking-widget-container');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      {/* Hero Section */}
      <HeroSection
        currentCurrency={currentCurrency}
        onProceedToCheckout={(details) => setBookingDetails(details)}
        onSendWhatsApp={handleOpenWhatsAppWithDetails}
        selectedServiceId={selectedServiceId}
      />

      {/* Services Section */}
      <ServicesSection
        currentCurrency={currentCurrency}
        onSelectService={handleSelectService}
      />

      {/* Fleet Section */}
      <FleetSection
        currentCurrency={currentCurrency}
        onSelectVehicleForModal={(vehicle) => setModalVehicle(vehicle)}
        onBookVehicle={handleBookVehicleDirect}
      />

      {/* Destinations Section */}
      <DestinationsSection
        onSelectDestination={handleSelectDestination}
      />

      {/* How To Book Section */}
      <HowToBookSection />

      {/* VIP Testimonials Section */}
      <TestimonialsSection />

      {/* FAQ Section */}
      <FAQSection />

      {/* Footer */}
      <Footer />

      {/* Vehicle Detail Modal */}
      <VehicleModal
        vehicle={modalVehicle}
        currentCurrency={currentCurrency}
        onClose={() => setModalVehicle(null)}
        onBookVehicle={handleBookVehicleDirect}
      />

      {/* Booking Checkout Confirmation Modal */}
      <BookingConfirmationModal
        booking={bookingDetails}
        currentCurrency={currentCurrency}
        onClose={() => setBookingDetails(null)}
        onConfirmSuccess={() => setBookingDetails(null)}
      />

      {/* WhatsApp Modal */}
      {showWhatsAppModal && (
        <WhatsAppModal
          bookingDetails={whatsAppBooking}
          onClose={() => setShowWhatsAppModal(false)}
        />
      )}

      {/* Floating Action Button (WhatsApp) */}
      <button
        onClick={() => {
          setWhatsAppBooking(null);
          setShowWhatsAppModal(true);
        }}
        className="fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#20ba59] text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center justify-center group cursor-pointer"
        title="Instant WhatsApp Support"
      >
        <span className="material-symbols-outlined text-3xl">chat</span>
        <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 font-bold text-xs pl-0 group-hover:pl-2">
          WhatsApp Concierge
        </span>
      </button>
    </div>
  );
}

export default App;
