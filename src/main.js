// Pure Vanilla JavaScript Application - STB Singapore (No React, No TypeScript)

// Global Application State
let currentCurrency = 'SGD';
let currentCurrencySymbol = 'S$';
let currentExchangeRate = 1.0;

let currentTripMode = 'one_way';
let selectedVehicleId = 'alphard';
let selectedService = 'airport_arrival';
let hourlyDuration = 4;

let mapInstance = null;
let pickupMarker = null;
let destMarker = null;
let routePolyline = null;

// Currency Exchange Rates (Base: SGD)
const CURRENCY_MAP = {
  SGD: { symbol: 'S$', rate: 1.0 },
  USD: { symbol: '$', rate: 0.74 },
  EUR: { symbol: '€', rate: 0.69 },
  GBP: { symbol: '£', rate: 0.58 },
  AUD: { symbol: 'A$', rate: 1.13 },
  MYR: { symbol: 'RM', rate: 3.52 },
  INR: { symbol: '₹', rate: 61.80 }
};

// Preset Singapore & Malaysia Coordinates
const LOCATION_COORDS = {
  'Changi Airport Terminal 1': { lat: 1.3644, lng: 103.9915 },
  'Changi Airport Terminal 2': { lat: 1.3572, lng: 103.9870 },
  'Changi Airport Terminal 3': { lat: 1.3540, lng: 103.9860 },
  'Jewel Changi Airport': { lat: 1.3602, lng: 103.9898 },
  'Marina Bay Sands Hotel Tower 1': { lat: 1.2834, lng: 103.8607 },
  'Gardens by the Bay': { lat: 1.2815, lng: 103.8636 },
  'Resorts World Sentosa': { lat: 1.2580, lng: 103.8180 },
  'Universal Studios Singapore': { lat: 1.2540, lng: 103.8238 },
  'Orchard Road Shopping Belt': { lat: 1.3048, lng: 103.8318 },
  'Singapore Cruise Centre (HarbourFront)': { lat: 1.2647, lng: 103.8203 },
  'Johor Bahru City Square (Malaysia)': { lat: 1.4623, lng: 103.7638 },
  'Legoland Malaysia (Johor)': { lat: 1.4273, lng: 103.6293 }
};

// Vehicles Dataset
const VEHICLES = [
  {
    id: 'alphard',
    name: 'Toyota Alphard / Vellfire Luxury MPV',
    category: 'mpv',
    tag: 'Most Popular for Families',
    pax: 6,
    luggage: 5,
    baseFareSGD: 85,
    hourlySGD: 65,
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80'
    ],
    description: 'First-class captain ottoman seats, dual sunroof, tri-zone automatic climate control, and whisper-quiet suspension.',
    features: ['Captain Ottoman Seats', 'Dual Sunroof & Ambient Lighting', 'Free High-Speed 5G WiFi', 'Complimentary Mineral Water', 'Child Safety Seat Available']
  },
  {
    id: 'eclass',
    name: 'Mercedes-Benz E-Class Executive Sedan',
    category: 'sedan',
    tag: 'Business Executive Choice',
    pax: 3,
    luggage: 2,
    baseFareSGD: 75,
    hourlySGD: 60,
    image: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80'
    ],
    description: 'Sleek executive sedan offering plush leather upholstery, smooth ride comfort, and professional chauffeur presentation.',
    features: ['Nappa Leather Interior', 'Burmester Sound System', 'Mobile Charging Cables', 'Newspaper & Refreshments', 'Flight Landing Tracking']
  },
  {
    id: 'sclass',
    name: 'Mercedes-Benz S-Class VIP Limousine',
    category: 'luxury',
    tag: 'Ultra-VIP Luxury',
    pax: 3,
    luggage: 3,
    baseFareSGD: 150,
    hourlySGD: 120,
    image: 'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80'
    ],
    description: 'The pinnacle of luxury motoring. Rear executive reclining seats with massage function, soft-close doors, and privacy blinds.',
    features: ['Reclining Rear Seats', 'Air Balance Fragrance System', 'Soft-Close Acoustic Glass', 'Dedicated VIP Concierge', 'Complimentary Champagne Option']
  },
  {
    id: 'hiace',
    name: 'VIP Toyota HiAce Super Long Van',
    category: 'mpv',
    tag: 'Best for Groups & Luggage',
    pax: 13,
    luggage: 10,
    baseFareSGD: 110,
    hourlySGD: 75,
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=800&q=80'
    ],
    description: 'Spacious 13-seater passenger transport ideal for large tour groups, golf excursions, and heavy luggage airport transfers.',
    features: ['High-Roof Spacious Interior', 'Individual Air Con Vents', 'Extra Large Luggage Trunk', 'Microphone System for Guides', 'Easy Slide Door Entrance']
  },
  {
    id: 'staria',
    name: 'Hyundai Staria Luxury MPV',
    category: 'mpv',
    tag: 'Modern Futuristic Comfort',
    pax: 7,
    luggage: 6,
    baseFareSGD: 80,
    hourlySGD: 60,
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=800&q=80'
    ],
    description: 'Futuristic spaceship-inspired luxury MPV with panoramic glass windows and relaxion seating for optimal touring visibility.',
    features: ['Panoramic Windows', 'Relaxion Reclining Seats', 'Type-C USB Fast Ports', 'Quiet Engine Technology', 'Spacious Legroom']
  },
  {
    id: 'bus',
    name: 'VIP Luxury Tour Coach Bus (23-45 Seater)',
    category: 'coach',
    tag: 'MICE & Large Tour Delegations',
    pax: 45,
    luggage: 40,
    baseFareSGD: 250,
    hourlySGD: 150,
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80',
    gallery: [
      'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80'
    ],
    description: 'Fully equipped air-conditioned tour bus with onboard PA system, experienced licensed tour driver, and luggage bay.',
    features: ['23 to 45 Reclining Seats', 'Under-Floor Luggage Compartment', 'PA Microphone for Tour Guide', 'Safety Belt Equipped Seats', 'Island-Wide Sightseeing']
  }
];

// Initial FAQ List
const FAQS = [
  {
    id: 'faq-1',
    category: 'pricing',
    question: 'Are ERP toll fees and airport pick-up charges included in the fare?',
    answer: 'Yes! All quotes provided on STB Singapore are 100% all-inclusive. This covers ERP gantry tolls, peak hour surcharges, airport pick-up fees, fuel, and driver fees.'
  },
  {
    id: 'faq-2',
    category: 'airport',
    question: 'What happens if my flight landing at Changi Airport is delayed?',
    answer: 'We track all incoming flight numbers in real-time. If your flight is delayed or lands early, your chauffeur automatically adjusts their arrival. We provide 60 minutes of complimentary waiting time from actual touchdown.'
  },
  {
    id: 'faq-3',
    category: 'booking',
    question: 'Can I book a cross-border private transfer from Singapore to Malaysia?',
    answer: 'Yes! We specialize in seamless cross-border transfers to Johor Bahru, Legoland Malaysia, Desaru Coast, Melaka, and Kuala Lumpur. You remain comfortably inside the vehicle during customs clearance.'
  },
  {
    id: 'faq-4',
    category: 'vehicles',
    question: 'Are child safety seats available for young children?',
    answer: 'Yes, child booster and baby car seats are available upon request for a nominal SGD 10 fee to ensure compliance with Singapore LTA road safety guidelines.'
  },
  {
    id: 'faq-5',
    category: 'pricing',
    question: 'What payment methods do you accept?',
    answer: 'We accept major international Credit/Debit Cards (Visa, MasterCard, Amex), PayNow / PayLah SG bank transfer, and direct cash payment to the driver.'
  },
  {
    id: 'faq-6',
    category: 'booking',
    question: 'How far in advance should I reserve my ride?',
    answer: 'While we accept instant bookings up to 1 hour before pickup, we recommend reserving at least 24 hours in advance during peak holiday seasons.'
  }
];

// Initial Testimonials
const REVIEWS = [
  {
    id: 'rev-1',
    name: 'David & Family',
    role: 'Family Tourist',
    country: 'Australia',
    stars: 5,
    date: '2 Days ago',
    comment: 'Booked the Toyota Alphard for our family arrival at Changi. Chauffeur Ken was waiting with a clear name board. Flawless service and spotless car!'
  },
  {
    id: 'rev-2',
    name: 'Hiroshi Tanaka',
    role: 'Corporate Executive',
    country: 'Japan',
    stars: 5,
    date: '1 Week ago',
    comment: 'Exceptional Mercedes S-Class service for our executive meetings across Marina Bay. Very punctual, discreet, and smooth driving.'
  },
  {
    id: 'rev-3',
    name: 'Sarah Jenkins',
    role: 'Malaysia Tour Group',
    country: 'United Kingdom',
    stars: 5,
    date: '2 Weeks ago',
    comment: 'The cross-border transfer to Legoland Malaysia was a breeze. We did not even need to carry heavy luggage down at immigration. Highly recommended STB!'
  }
];

// Helper Functions
function formatCurrency(amountSGD) {
  const converted = amountSGD * currentExchangeRate;
  if (currentCurrency === 'INR' || currentCurrency === 'MYR') {
    return `${currentCurrencySymbol}${Math.round(converted).toLocaleString()}`;
  }
  return `${currentCurrencySymbol}${Math.round(converted)}`;
}

// Calculate Current Fare
function computeCalculatedFareSGD() {
  const vehicle = VEHICLES.find(v => v.id === selectedVehicleId) || VEHICLES[0];
  if (currentTripMode === 'hourly') {
    return vehicle.hourlySGD * hourlyDuration;
  } else if (currentTripMode === 'return') {
    return Math.round(vehicle.baseFareSGD * 1.85); // 15% discount on return leg
  }
  return vehicle.baseFareSGD;
}

// DOM Initialization
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initCurrencySelector();
  initLeafletMap();
  initTripModeSwitcher();
  initVehicleSelection();
  initFleetCards('all');
  initFAQAccordion();
  initTestimonials();
  initModalHandlers();
  initAutocompletePresets();
  initFormCalculators();
  initDateTimeDefault();
  updateAllPriceDisplays();
});

// Navbar & Mobile Drawer
function initNavbar() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const menuIcon = document.getElementById('menu-icon');

  toggleBtn?.addEventListener('click', () => {
    if (mobileMenu?.classList.contains('hidden')) {
      mobileMenu.classList.remove('hidden');
      if (menuIcon) menuIcon.textContent = 'close';
    } else {
      mobileMenu?.classList.add('hidden');
      if (menuIcon) menuIcon.textContent = 'menu';
    }
  });

  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu?.classList.add('hidden');
      if (menuIcon) menuIcon.textContent = 'menu';
    });
  });

  // Buttons
  document.getElementById('nav-btn-whatsapp')?.addEventListener('click', () => openWhatsAppModal());
  document.getElementById('mobile-btn-whatsapp')?.addEventListener('click', () => openWhatsAppModal());
  document.getElementById('mobile-drawer-whatsapp')?.addEventListener('click', () => openWhatsAppModal());
  document.getElementById('floating-whatsapp')?.addEventListener('click', () => openWhatsAppModal());

  document.getElementById('nav-btn-book')?.addEventListener('click', scrollToWidget);
  document.getElementById('mobile-drawer-book')?.addEventListener('click', () => {
    mobileMenu?.classList.add('hidden');
    scrollToWidget();
  });
  document.getElementById('hero-cta-quote')?.addEventListener('click', scrollToWidget);
}

function scrollToWidget() {
  const widget = document.getElementById('booking-widget-container');
  widget?.scrollIntoView({ behavior: 'smooth' });
}

// Currency Engine
function initCurrencySelector() {
  const desktopSelect = document.getElementById('currency-select');
  const mobileSelect = document.getElementById('mobile-currency-select');

  const handleCurrencyChange = (newCurr) => {
    if (!CURRENCY_MAP[newCurr]) return;
    currentCurrency = newCurr;
    currentCurrencySymbol = CURRENCY_MAP[newCurr].symbol;
    currentExchangeRate = CURRENCY_MAP[newCurr].rate;

    if (desktopSelect) desktopSelect.value = newCurr;
    if (mobileSelect) mobileSelect.value = newCurr;

    updateAllPriceDisplays();
  };

  desktopSelect?.addEventListener('change', (e) => handleCurrencyChange(e.target.value));
  mobileSelect?.addEventListener('change', (e) => handleCurrencyChange(e.target.value));
}

function updateAllPriceDisplays() {
  // Update Fare Box
  const fareDisplay = document.getElementById('calculated-fare-display');
  const currLabel = document.getElementById('calculated-currency-label');
  const fareSGD = computeCalculatedFareSGD();

  if (fareDisplay) fareDisplay.textContent = formatCurrency(fareSGD);
  if (currLabel) currLabel.textContent = currentCurrency;

  // Update Service Price Tags
  document.querySelectorAll('.service-price').forEach(el => {
    const sgd = parseFloat(el.getAttribute('data-sgd') || '0');
    el.textContent = formatCurrency(sgd);
  });

  // Re-render Fleet Cards
  const activeFilter = document.querySelector('.fleet-filter-btn.active')?.getAttribute('data-category') || 'all';
  initFleetCards(activeFilter);
}

// Leaflet Map Initialization
function initLeafletMap() {
  const mapElement = document.getElementById('route-map');
  if (!mapElement || typeof L === 'undefined') return;

  // Center on Singapore
  mapInstance = L.map('route-map', {
    zoomControl: false,
    scrollWheelZoom: false
  }).setView([1.3521, 103.8198], 11);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(mapInstance);

  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);

  updateMapMarkers('Changi Airport Terminal 1', 'Marina Bay Sands Hotel Tower 1');
}

function updateMapMarkers(pickupName, destName) {
  if (!mapInstance || typeof L === 'undefined') return;

  const pCoord = LOCATION_COORDS[pickupName] || { lat: 1.3644, lng: 103.9915 };
  const dCoord = LOCATION_COORDS[destName] || { lat: 1.2834, lng: 103.8607 };

  if (pickupMarker) mapInstance.removeLayer(pickupMarker);
  if (destMarker) mapInstance.removeLayer(destMarker);
  if (routePolyline) mapInstance.removeLayer(routePolyline);

  // Red Pickup Marker
  const redIcon = L.divIcon({
    className: 'custom-map-icon-pickup',
    html: `<div style="background-color:#ae0011; width:28px; height:28px; border-radius:50%; border:3px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white; font-size:12px; font-weight:bold;">A</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

  // Amber Destination Marker
  const amberIcon = L.divIcon({
    className: 'custom-map-icon-dest',
    html: `<div style="background-color:#795900; width:28px; height:28px; border-radius:50%; border:3px solid white; box-shadow:0 4px 10px rgba(0,0,0,0.3); display:flex; align-items:center; justify-content:center; color:white; font-size:12px; font-weight:bold;">B</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

  pickupMarker = L.marker([pCoord.lat, pCoord.lng], { icon: redIcon }).addTo(mapInstance).bindPopup(`<b>Pickup:</b> ${pickupName}`);
  destMarker = L.marker([dCoord.lat, dCoord.lng], { icon: amberIcon }).addTo(mapInstance).bindPopup(`<b>Destination:</b> ${destName}`);

  // Draw connecting dashed line
  routePolyline = L.polyline([
    [pCoord.lat, pCoord.lng],
    [dCoord.lat, dCoord.lng]
  ], {
    color: '#ae0011',
    weight: 4,
    opacity: 0.8,
    dashArray: '8, 8'
  }).addTo(mapInstance);

  const bounds = L.latLngBounds([
    [pCoord.lat, pCoord.lng],
    [dCoord.lat, dCoord.lng]
  ]);
  mapInstance.fitBounds(bounds, { padding: [40, 40] });
}

// Autocomplete Presets
function initAutocompletePresets() {
  const pickupInput = document.getElementById('pickup-input');
  const destInput = document.getElementById('dest-input');
  const pickupPresets = document.getElementById('pickup-presets');
  const destPresets = document.getElementById('dest-presets');

  const presetList = Object.keys(LOCATION_COORDS);

  const renderPresets = (container, input) => {
    if (!container) return;
    container.innerHTML = presetList.map(loc => `
      <div class="preset-item px-4 py-2.5 hover:bg-red-50 cursor-pointer text-xs font-semibold text-gray-800 flex items-center justify-between border-b border-gray-100">
        <span>${loc}</span>
        <span class="material-symbols-outlined text-sm text-gray-400">arrow_forward</span>
      </div>
    `).join('');

    container.querySelectorAll('.preset-item').forEach(item => {
      item.addEventListener('click', () => {
        const text = item.querySelector('span')?.textContent || '';
        input.value = text;
        container.classList.add('hidden');
        updateMapMarkers(pickupInput.value, destInput.value);
        updateAllPriceDisplays();
      });
    });
  };

  renderPresets(pickupPresets, pickupInput);
  renderPresets(destPresets, destInput);

  pickupInput?.addEventListener('focus', () => pickupPresets?.classList.remove('hidden'));
  destInput?.addEventListener('focus', () => destPresets?.classList.remove('hidden'));

  document.addEventListener('click', (e) => {
    if (!pickupInput?.contains(e.target) && !pickupPresets?.contains(e.target)) {
      pickupPresets?.classList.add('hidden');
    }
    if (!destInput?.contains(e.target) && !destPresets?.contains(e.target)) {
      destPresets?.classList.add('hidden');
    }
  });

  // Landmark Bento Cards Click to Populate Destination
  document.querySelectorAll('.dest-card').forEach(card => {
    card.addEventListener('click', () => {
      const location = card.getAttribute('data-location') || '';
      if (destInput && location) {
        destInput.value = location;
        scrollToWidget();
        updateMapMarkers(pickupInput.value, location);
        updateAllPriceDisplays();
      }
    });
  });
}

// Trip Mode Switcher
function initTripModeSwitcher() {
  const buttons = document.querySelectorAll('.trip-mode-btn');
  const destContainer = document.getElementById('dest-address-container');
  const hourlyContainer = document.getElementById('hourly-duration-container');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => {
        b.classList.remove('active', 'bg-[#ae0011]', 'text-white');
        b.classList.add('bg-gray-100', 'text-gray-600');
      });

      btn.classList.add('active', 'bg-[#ae0011]', 'text-white');
      btn.classList.remove('bg-gray-100', 'text-gray-600');

      const id = btn.id;
      if (id === 'trip-one-way') {
        currentTripMode = 'one_way';
        destContainer?.classList.remove('hidden');
        hourlyContainer?.classList.add('hidden');
      } else if (id === 'trip-return') {
        currentTripMode = 'return';
        destContainer?.classList.remove('hidden');
        hourlyContainer?.classList.add('hidden');
      } else if (id === 'trip-hourly') {
        currentTripMode = 'hourly';
        destContainer?.classList.add('hidden');
        hourlyContainer?.classList.remove('hidden');
      }

      updateAllPriceDisplays();
    });
  });

  // Hourly duration buttons
  document.querySelectorAll('.hourly-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.hourly-btn').forEach(b => {
        b.classList.remove('bg-[#795900]', 'text-white', 'border-[#795900]');
        b.classList.add('border-gray-300');
      });

      btn.classList.add('bg-[#795900]', 'text-white', 'border-[#795900]');
      btn.classList.remove('border-gray-300');

      hourlyDuration = parseInt(btn.getAttribute('data-hours') || '4', 10);
      updateAllPriceDisplays();
    });
  });
}

// Vehicle Grid in Booking Widget
function initVehicleSelection() {
  const grid = document.getElementById('vehicle-grid');
  if (!grid) return;

  grid.innerHTML = VEHICLES.map(v => `
    <div class="vehicle-select-card cursor-pointer border rounded-xl p-3 text-left transition-all ${v.id === selectedVehicleId ? 'border-[#ae0011] bg-red-50/80 shadow-xs' : 'border-gray-200 bg-white hover:border-gray-300'}" data-id="${v.id}">
      <div class="font-bold text-xs text-gray-900 truncate">${v.name.split('/')[0]}</div>
      <div class="text-[10px] text-gray-500 mt-0.5">${v.pax} Pax • ${v.luggage} Bags</div>
      <div class="text-xs font-extrabold text-[#ae0011] mt-1.5">${formatCurrency(v.baseFareSGD)}</div>
    </div>
  `).join('');

  grid.querySelectorAll('.vehicle-select-card').forEach(card => {
    card.addEventListener('click', () => {
      grid.querySelectorAll('.vehicle-select-card').forEach(c => {
        c.classList.remove('border-[#ae0011]', 'bg-red-50/80', 'shadow-xs');
        c.classList.add('border-gray-200', 'bg-white');
      });

      card.classList.add('border-[#ae0011]', 'bg-red-50/80', 'shadow-xs');
      card.classList.remove('border-gray-200', 'bg-white');

      selectedVehicleId = card.getAttribute('data-id') || 'alphard';
      updateAllPriceDisplays();
    });
  });
}

// Fleet Cards Rendering & Filter
function initFleetCards(category) {
  const container = document.getElementById('fleet-card-container');
  const filterBtns = document.querySelectorAll('.fleet-filter-btn');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('active', 'bg-[#ae0011]', 'text-white');
        b.classList.add('text-gray-600');
      });
      btn.classList.add('active', 'bg-[#ae0011]', 'text-white');
      btn.classList.remove('text-gray-600');

      const cat = btn.getAttribute('data-category') || 'all';
      initFleetCards(cat);
    });
  });

  if (!container) return;

  const filtered = category === 'all' ? VEHICLES : VEHICLES.filter(v => v.category === category);

  container.innerHTML = filtered.map(v => `
    <article class="bg-white rounded-3xl overflow-hidden border border-gray-200/80 shadow-sm hover:shadow-2xl transition-all duration-300 text-left flex flex-col justify-between group">
      <div>
        <div class="relative h-56 overflow-hidden bg-gray-100">
          <img src="${v.image}" alt="${v.name}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
          <span class="absolute top-4 left-4 bg-black/75 backdrop-blur-md text-white text-[10px] font-extrabold px-3 py-1.5 rounded-full uppercase tracking-wider">
            ${v.tag}
          </span>
        </div>

        <div class="p-6">
          <h3 class="font-['Plus_Jakarta_Sans'] font-bold text-xl text-gray-900 mb-2">${v.name}</h3>
          <p class="text-xs text-gray-600 leading-relaxed mb-4">${v.description}</p>

          <div class="flex items-center gap-4 text-xs font-bold text-gray-700 pb-4 border-b border-gray-100">
            <span class="flex items-center gap-1"><span class="material-symbols-outlined text-base text-[#ae0011]">group</span> ${v.pax} Passengers</span>
            <span class="flex items-center gap-1"><span class="material-symbols-outlined text-base text-[#ae0011]">luggage</span> ${v.luggage} Luggage</span>
          </div>

          <ul class="space-y-1.5 my-4">
            ${v.features.slice(0, 3).map(f => `
              <li class="text-xs text-gray-600 flex items-center gap-2">
                <span class="material-symbols-outlined text-emerald-600 text-sm">check_circle</span>
                <span>${f}</span>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>

      <div class="p-6 pt-0 flex items-center justify-between border-t border-gray-100/60 mt-auto">
        <div>
          <div class="text-[10px] text-gray-400 font-semibold uppercase">Fixed Rate</div>
          <div class="text-xl font-extrabold text-[#ae0011]">${formatCurrency(v.baseFareSGD)}</div>
        </div>

        <div class="flex gap-2">
          <button class="btn-fleet-detail px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs cursor-pointer" data-id="${v.id}">
            Specs
          </button>
          <button class="btn-fleet-select px-4 py-2 rounded-xl bg-[#ae0011] hover:bg-[#d71920] text-white font-bold text-xs shadow-xs cursor-pointer" data-id="${v.id}">
            Book Now
          </button>
        </div>
      </div>
    </article>
  `).join('');

  // Event Listeners
  container.querySelectorAll('.btn-fleet-detail').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id') || '';
      openVehicleModal(id);
    });
  });

  container.querySelectorAll('.btn-fleet-select').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id') || '';
      selectedVehicleId = id;
      initVehicleSelection();
      scrollToWidget();
      updateAllPriceDisplays();
    });
  });
}

// FAQ Accordion logic
function initFAQAccordion() {
  const container = document.getElementById('faq-accordion-list');
  const searchInput = document.getElementById('faq-search-input');
  const catBtns = document.querySelectorAll('.faq-cat-btn');

  let activeCat = 'all';

  const renderFaqs = () => {
    if (!container) return;
    const query = searchInput?.value.toLowerCase().trim() || '';

    const filtered = FAQS.filter(f => {
      const matchesCat = activeCat === 'all' || f.category === activeCat;
      const matchesQuery = !query || f.question.toLowerCase().includes(query) || f.answer.toLowerCase().includes(query);
      return matchesCat && matchesQuery;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="p-8 text-center text-gray-500 font-medium">No matching questions found. Contact our WhatsApp concierge for immediate support!</div>`;
      return;
    }

    container.innerHTML = filtered.map((faq) => `
      <div class="faq-item bg-white rounded-2xl border border-gray-200/80 overflow-hidden shadow-xs">
        <button class="faq-trigger w-full px-6 py-5 text-left font-['Plus_Jakarta_Sans'] font-bold text-base text-gray-900 flex justify-between items-center gap-4 cursor-pointer hover:bg-gray-50/80 transition-colors">
          <span>${faq.question}</span>
          <span class="material-symbols-outlined faq-icon text-gray-400 transition-transform duration-300">expand_more</span>
        </button>
        <div class="faq-answer hidden px-6 pb-6 text-sm text-gray-600 leading-relaxed border-t border-gray-100/60 pt-4 bg-gray-50/50">
          ${faq.answer}
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.faq-trigger').forEach(trigger => {
      trigger.addEventListener('click', () => {
        const item = trigger.closest('.faq-item');
        const answer = item?.querySelector('.faq-answer');
        const icon = item?.querySelector('.faq-icon');

        const isOpen = !answer?.classList.contains('hidden');

        // Close all
        container.querySelectorAll('.faq-answer').forEach(a => a.classList.add('hidden'));
        container.querySelectorAll('.faq-icon').forEach(i => i.classList.remove('rotate-180'));

        if (!isOpen) {
          answer?.classList.remove('hidden');
          icon?.classList.add('rotate-180');
        }
      });
    });
  };

  catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catBtns.forEach(b => {
        b.classList.remove('active', 'bg-[#ae0011]', 'text-white');
        b.classList.add('bg-white', 'text-gray-600');
      });
      btn.classList.add('active', 'bg-[#ae0011]', 'text-white');
      btn.classList.remove('bg-white', 'text-gray-600');

      activeCat = btn.getAttribute('data-cat') || 'all';
      renderFaqs();
    });
  });

  searchInput?.addEventListener('input', renderFaqs);
  renderFaqs();
}

// Testimonials
function initTestimonials() {
  const container = document.getElementById('reviews-container');
  if (!container) return;

  const renderReviews = () => {
    container.innerHTML = REVIEWS.map(r => `
      <article class="bg-[#F8F9FB] rounded-3xl p-8 border border-gray-100 flex-shrink-0 w-[300px] sm:w-[360px] text-left snap-start shadow-xs flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-4">
            <div class="text-amber-500 text-sm font-bold">${'★'.repeat(r.stars)}</div>
            <span class="text-[10px] text-gray-400 font-semibold">${r.date}</span>
          </div>
          <p class="text-xs sm:text-sm text-gray-700 leading-relaxed mb-6 italic">"${r.comment}"</p>
        </div>

        <div class="flex items-center gap-3 pt-4 border-t border-gray-200/60">
          <div class="w-10 h-10 rounded-full bg-[#ae0011] text-white font-extrabold text-sm flex items-center justify-center">
            ${r.name.charAt(0)}
          </div>
          <div>
            <h4 class="font-bold text-xs text-gray-900">${r.name}</h4>
            <p class="text-[10px] text-gray-500">${r.role} • ${r.country}</p>
          </div>
        </div>
      </article>
    `).join('');
  };

  renderReviews();

  // Star selector in add review modal
  let selectedStarCount = 5;
  const starBtns = document.querySelectorAll('.star-btn');
  starBtns.forEach(sb => {
    sb.addEventListener('click', () => {
      selectedStarCount = parseInt(sb.getAttribute('data-star') || '5', 10);
      starBtns.forEach((btn, idx) => {
        if (idx < selectedStarCount) {
          btn.classList.add('text-amber-500');
          btn.classList.remove('text-gray-300');
        } else {
          btn.classList.remove('text-amber-500');
          btn.classList.add('text-gray-300');
        }
      });
    });
  });

  // Submit Review Form
  document.getElementById('add-review-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('rev-name').value;
    const role = document.getElementById('rev-role').value || 'Tourist';
    const country = document.getElementById('rev-country').value || 'International';
    const comment = document.getElementById('rev-comment').value;

    REVIEWS.unshift({
      id: 'rev-' + Date.now(),
      name,
      role,
      country,
      stars: selectedStarCount,
      date: 'Just now',
      comment
    });

    renderReviews();
    closeModal('modal-review');
    alert('Thank you! Your VIP review has been published.');
  });
}

// Form Calculators
function initFormCalculators() {
  const serviceSelect = document.getElementById('service-select');
  const paxSelect = document.getElementById('pax-select');
  const flightContainer = document.getElementById('flight-no-container');

  serviceSelect?.addEventListener('change', () => {
    selectedService = serviceSelect.value;
    if (selectedService.includes('airport')) {
      flightContainer?.classList.remove('hidden');
    } else {
      flightContainer?.classList.add('hidden');
    }
    updateAllPriceDisplays();
  });

  paxSelect?.addEventListener('change', () => {
    const val = paxSelect.value;
    if (val.includes('8-13')) {
      selectedVehicleId = 'hiace';
    } else if (val.includes('4-7')) {
      selectedVehicleId = 'alphard';
    } else if (val.includes('Large Group')) {
      selectedVehicleId = 'bus';
    }
    initVehicleSelection();
    updateAllPriceDisplays();
  });

  // Buttons in Service Cards
  document.querySelectorAll('.srv-book-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const srv = btn.getAttribute('data-service') || 'airport_arrival';
      if (serviceSelect) serviceSelect.value = srv;
      selectedService = srv;
      scrollToWidget();
      updateAllPriceDisplays();
    });
  });

  // Main Confirm Booking Button
  document.getElementById('btn-calc-confirm')?.addEventListener('click', openBookingModal);
}

function initDateTimeDefault() {
  const dtInput = document.getElementById('datetime-input');
  if (dtInput) {
    const now = new Date();
    now.setHours(now.getHours() + 3);
    dtInput.value = now.toISOString().slice(0, 16);
  }
}

// Modal Engine
function initModalHandlers() {
  document.getElementById('close-modal-vehicle')?.addEventListener('click', () => closeModal('modal-vehicle'));
  document.getElementById('close-modal-booking')?.addEventListener('click', () => closeModal('modal-booking'));
  document.getElementById('close-modal-whatsapp')?.addEventListener('click', () => closeModal('modal-whatsapp'));
  document.getElementById('close-modal-review')?.addEventListener('click', () => closeModal('modal-review'));
  document.getElementById('btn-open-review-modal')?.addEventListener('click', () => openModal('modal-review'));

  // Close modal on backdrop click
  ['modal-vehicle', 'modal-booking', 'modal-whatsapp', 'modal-review'].forEach(id => {
    const modal = document.getElementById(id);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(id);
    });
  });
}

function openModal(id) {
  document.getElementById(id)?.classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id)?.classList.add('hidden');
}

// Vehicle Modal
function openVehicleModal(vehicleId) {
  const v = VEHICLES.find(item => item.id === vehicleId);
  if (!v) return;

  const content = document.getElementById('modal-vehicle-content');
  if (!content) return;

  content.innerHTML = `
    <div class="p-6 sm:p-8">
      <div class="h-64 sm:h-72 rounded-2xl overflow-hidden mb-6 relative">
        <img src="${v.image}" alt="${v.name}" class="w-full h-full object-cover" />
        <span class="absolute top-4 left-4 bg-black/80 text-white text-xs font-bold px-3 py-1.5 rounded-full uppercase">${v.tag}</span>
      </div>

      <h3 class="font-['Plus_Jakarta_Sans'] font-extrabold text-2xl text-gray-900 mb-3">${v.name}</h3>
      <p class="text-xs sm:text-sm text-gray-600 leading-relaxed mb-6">${v.description}</p>

      <div class="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-200/80 mb-6">
        <div>
          <span class="text-[10px] text-gray-500 font-bold uppercase">Max Capacity</span>
          <div class="text-sm font-extrabold text-gray-900 flex items-center gap-1 mt-0.5">
            <span class="material-symbols-outlined text-base text-[#ae0011]">group</span>
            <span>${v.pax} Passengers</span>
          </div>
        </div>
        <div>
          <span class="text-[10px] text-gray-500 font-bold uppercase">Luggage Limit</span>
          <div class="text-sm font-extrabold text-gray-900 flex items-center gap-1 mt-0.5">
            <span class="material-symbols-outlined text-base text-[#ae0011]">luggage</span>
            <span>${v.luggage} Suitcases</span>
          </div>
        </div>
      </div>

      <h4 class="font-bold text-sm text-gray-900 mb-3">Onboard Amenities & Specs</h4>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-8">
        ${v.features.map(f => `
          <div class="text-xs text-gray-700 flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl">
            <span class="material-symbols-outlined text-emerald-600 text-sm">verified</span>
            <span>${f}</span>
          </div>
        `).join('')}
      </div>

      <div class="flex items-center justify-between pt-4 border-t border-gray-100">
        <div>
          <div class="text-xs text-gray-500 font-semibold">Standard Fixed Fare</div>
          <div class="text-2xl font-extrabold text-[#ae0011]">${formatCurrency(v.baseFareSGD)}</div>
        </div>
        <button id="modal-select-car-btn" class="bg-[#ae0011] text-white px-6 py-3.5 rounded-2xl font-bold text-sm hover:bg-[#d71920] transition-all cursor-pointer shadow-md">
          Select Vehicle & Book
        </button>
      </div>
    </div>
  `;

  document.getElementById('modal-select-car-btn')?.addEventListener('click', () => {
    selectedVehicleId = v.id;
    initVehicleSelection();
    closeModal('modal-vehicle');
    scrollToWidget();
    updateAllPriceDisplays();
  });

  openModal('modal-vehicle');
}

// Booking Modal Checkout
function openBookingModal() {
  const pickup = document.getElementById('pickup-input').value;
  const dest = document.getElementById('dest-input').value;
  const dt = document.getElementById('datetime-input').value;
  const flight = document.getElementById('flight-input').value;
  const pax = document.getElementById('pax-select').value;
  const vehicle = VEHICLES.find(v => v.id === selectedVehicleId) || VEHICLES[0];
  const fareSGD = computeCalculatedFareSGD();

  const content = document.getElementById('modal-booking-content');
  if (!content) return;

  content.innerHTML = `
    <div class="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
      <div class="w-12 h-12 rounded-2xl bg-red-50 text-[#ae0011] flex items-center justify-center font-bold text-xl">
        <span class="material-symbols-outlined text-2xl">confirmation_number</span>
      </div>
      <div>
        <h3 class="font-['Plus_Jakarta_Sans'] font-extrabold text-xl text-gray-900">Confirm Reservation</h3>
        <p class="text-xs text-gray-500">Review your itinerary and secure driver assignment</p>
      </div>
    </div>

    <!-- Booking Voucher Summary Box -->
    <div class="bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-200/80 mb-6 space-y-3 text-xs">
      <div class="flex justify-between border-b border-gray-200/60 pb-2">
        <span class="text-gray-500 font-medium">Vehicle Class</span>
        <span class="font-bold text-gray-900">${vehicle.name}</span>
      </div>
      <div class="flex justify-between border-b border-gray-200/60 pb-2">
        <span class="text-gray-500 font-medium">Pickup Location</span>
        <span class="font-bold text-gray-900 text-right max-w-[200px] truncate">${pickup}</span>
      </div>
      ${currentTripMode !== 'hourly' ? `
      <div class="flex justify-between border-b border-gray-200/60 pb-2">
        <span class="text-gray-500 font-medium">Destination</span>
        <span class="font-bold text-gray-900 text-right max-w-[200px] truncate">${dest}</span>
      </div>
      ` : `
      <div class="flex justify-between border-b border-gray-200/60 pb-2">
        <span class="text-gray-500 font-medium">Chauffeur Duration</span>
        <span class="font-bold text-gray-900">${hourlyDuration} Hours Disposal</span>
      </div>
      `}
      <div class="flex justify-between border-b border-gray-200/60 pb-2">
        <span class="text-gray-500 font-medium">Date & Time</span>
        <span class="font-bold text-gray-900">${dt || 'As scheduled'}</span>
      </div>
      ${flight ? `
      <div class="flex justify-between border-b border-gray-200/60 pb-2">
        <span class="text-gray-500 font-medium">Flight No</span>
        <span class="font-bold text-[#ae0011]">${flight}</span>
      </div>
      ` : ''}
      <div class="flex justify-between items-center pt-1">
        <span class="text-gray-700 font-bold">Total Guaranteed Fare</span>
        <span class="text-xl font-extrabold text-[#ae0011]">${formatCurrency(fareSGD)} (${currentCurrency})</span>
      </div>
    </div>

    <!-- Contact Form -->
    <form id="checkout-form" class="space-y-4" onsubmit="return false;">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Passenger Name *</label>
          <input type="text" id="cust-name" required placeholder="Full Name" class="w-full h-11 px-3 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-[#ae0011]" />
        </div>
        <div>
          <label class="block text-xs font-bold text-gray-700 uppercase mb-1">WhatsApp / Phone *</label>
          <input type="tel" id="cust-phone" required placeholder="+65 9123 4567" class="w-full h-11 px-3 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-[#ae0011]" />
        </div>
      </div>

      <div>
        <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Email Address *</label>
        <input type="email" id="cust-email" required placeholder="name@domain.com" class="w-full h-11 px-3 bg-white border border-gray-300 rounded-xl text-xs outline-none focus:border-[#ae0011]" />
      </div>

      <div>
        <label class="block text-xs font-bold text-gray-700 uppercase mb-1">Payment Method</label>
        <select id="cust-payment" class="w-full h-11 px-3 bg-white border border-gray-300 rounded-xl text-xs outline-none font-bold text-gray-800">
          <option value="Cash to Driver">Cash Payment to Chauffeur</option>
          <option value="PayNow SG">PayNow SG (0% fee)</option>
          <option value="Credit Card">Credit / Debit Card (Visa/Master)</option>
        </select>
      </div>

      <button type="submit" id="btn-submit-booking" class="w-full bg-[#ae0011] text-white py-4 rounded-xl font-bold text-sm hover:bg-[#d71920] shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2">
        <span class="material-symbols-outlined text-xl">verified</span>
        <span>Confirm Booking & Send Emails</span>
      </button>
    </form>
  `;

  document.getElementById('checkout-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('cust-name').value;
    const phone = document.getElementById('cust-phone').value;
    const email = document.getElementById('cust-email').value;
    const payment = document.getElementById('cust-payment').value;
    const voucherCode = `STB-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const submitBtn = document.getElementById('btn-submit-booking');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `<span class="material-symbols-outlined animate-spin text-xl">sync</span><span>Processing & Sending Emails...</span>`;
    }

    try {
      // POST to backend API to dispatch emails to Customer and Admin
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherCode,
          passengerName: name,
          passengerEmail: email,
          passengerPhone: phone,
          vehicle: vehicle.name,
          pickup,
          destination: currentTripMode !== 'hourly' ? dest : `${hourlyDuration} Hours Disposal`,
          dateTime: dt,
          flightNo: flight,
          fare: formatCurrency(fareSGD),
          currency: currentCurrency,
          paymentMethod: payment,
          pax
        })
      });

      const resData = await response.json();
      const whatsappUrl = resData.whatsappUrl || `https://api.whatsapp.com/send?phone=6591234567&text=${encodeURIComponent('Booking ' + voucherCode + ' for ' + name)}`;

      // Automatically launch WhatsApp API connection in new window
      window.open(whatsappUrl, '_blank');

      content.innerHTML = `
        <div class="text-center py-6 space-y-4">
          <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl font-bold animate-bounce">
            ✓
          </div>
          <h3 class="font-['Plus_Jakarta_Sans'] font-extrabold text-2xl text-gray-900">Reservation Confirmed!</h3>
          
          <!-- Email Notification Banner -->
          <div class="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-semibold max-w-sm mx-auto flex items-center gap-2 text-left">
            <span class="material-symbols-outlined text-emerald-600 text-lg">mark_email_read</span>
            <div>
              <div>Confirmation email sent to <strong>${email}</strong></div>
              <div class="text-[10px] text-emerald-600 mt-0.5">Admin copy sent to dispatch@stbsingapore.com</div>
            </div>
          </div>

          <div class="bg-gradient-to-r from-red-50 to-amber-50 p-6 rounded-3xl border-2 border-dashed border-[#ae0011] max-w-sm mx-auto text-left relative overflow-hidden shadow-md">
            <div class="flex justify-between items-center mb-4 pb-3 border-b border-red-200">
              <span class="font-extrabold text-xs text-[#ae0011]">STB VIP PASS</span>
              <span class="font-mono text-xs bg-[#ae0011] text-white px-2 py-0.5 rounded-md font-bold">${voucherCode}</span>
            </div>

            <div class="space-y-2 text-xs">
              <div><span class="text-gray-500">Passenger:</span> <strong class="text-gray-900">${name}</strong></div>
              <div><span class="text-gray-500">Vehicle:</span> <strong class="text-gray-900">${vehicle.name}</strong></div>
              <div><span class="text-gray-500">Total Fare:</span> <strong class="text-[#ae0011] text-sm">${formatCurrency(fareSGD)}</strong></div>
              <div><span class="text-gray-500">Payment:</span> <strong class="text-gray-900">${payment}</strong></div>
              <div><span class="text-gray-500">Status:</span> <span class="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full text-[10px]">Driver Assigned • Emails Sent</span></div>
            </div>
          </div>

          <div class="pt-4 flex flex-col sm:flex-row gap-3">
            <button id="btn-copy-pass" class="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold text-xs hover:bg-black cursor-pointer flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-base">content_copy</span>
              <span>Copy Voucher Code</span>
            </button>
            <a href="${whatsappUrl}" target="_blank" id="btn-pass-wa" class="flex-1 bg-[#25D366] text-white py-3 rounded-xl font-bold text-xs hover:bg-[#20ba59] cursor-pointer flex items-center justify-center gap-1">
              <span class="material-symbols-outlined text-base">chat</span>
              <span>Connect WhatsApp API</span>
            </a>
          </div>
        </div>
      `;

      document.getElementById('btn-copy-pass')?.addEventListener('click', () => {
        navigator.clipboard.writeText(voucherCode);
        alert(`Copied voucher code ${voucherCode} to clipboard!`);
      });
    } catch (err) {
      console.error('Error submitting booking:', err);
      alert('Your booking pass was generated. Connecting to WhatsApp API...');
      window.open(`https://api.whatsapp.com/send?phone=6591234567&text=${encodeURIComponent('Booking ' + voucherCode + ' for ' + name)}`, '_blank');
    }
  });

  openModal('modal-booking');
}

// WhatsApp Modal
function openWhatsAppModal() {
  const pickup = document.getElementById('pickup-input').value;
  const dest = document.getElementById('dest-input').value;
  const dt = document.getElementById('datetime-input').value;
  const flight = document.getElementById('flight-input').value;
  const pax = document.getElementById('pax-select').value;
  const vehicle = VEHICLES.find(v => v.id === selectedVehicleId) || VEHICLES[0];
  const fareSGD = computeCalculatedFareSGD();

  const previewBox = document.getElementById('wa-preview-box');
  const customNotesInput = document.getElementById('wa-custom-notes');
  const finalLink = document.getElementById('wa-final-link');

  const buildMsg = (notes) => {
    let msg = `*STB Singapore - VIP Chauffeur Booking Request*\n\n`;
    msg += `🚘 *Vehicle Class:* ${vehicle.name}\n`;
    msg += `📍 *Pickup Location:* ${pickup}\n`;
    if (currentTripMode !== 'hourly') {
      msg += `🏁 *Destination:* ${dest}\n`;
    } else {
      msg += `⏱ *Duration:* ${hourlyDuration} Hours Disposal\n`;
    }
    msg += `📅 *Date & Time:* ${dt || 'Flexible'}\n`;
    msg += `👥 *Pax:* ${pax}\n`;
    if (flight) msg += `✈️ *Flight No:* ${flight}\n`;
    msg += `💰 *Guaranteed Fare:* ${formatCurrency(fareSGD)} (${currentCurrency})\n`;
    if (notes) msg += `📝 *Notes:* ${notes}\n`;
    msg += `\nPlease confirm availability and driver assignment. Thank you!`;
    return msg;
  };

  const updateLink = () => {
    const notes = customNotesInput?.value || '';
    const rawMsg = buildMsg(notes);
    if (previewBox) previewBox.textContent = rawMsg;
    if (finalLink) {
      finalLink.href = `https://wa.me/6591234567?text=${encodeURIComponent(rawMsg)}`;
    }
  };

  customNotesInput?.addEventListener('input', updateLink);
  updateLink();
  openModal('modal-whatsapp');
}
