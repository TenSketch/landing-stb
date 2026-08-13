// STB Singapore — Vanilla JavaScript App
// Pure JS, no framework. Handles booking widget, currency, map, modals, filters.

// ============================================
// STATE
// ============================================
const state = {
  currency: 'SGD',
  currencySymbol: 'S$',
  exchangeRate: 1.0,
  tripMode: 'one_way',
  selectedVehicleId: 'alphard',
  selectedService: 'airport_arrival',
  hourlyDuration: 4,
  dailyDuration: 2,
  faqCategory: 'all',
  fleetCategory: 'all',
  selectedStars: 5,
  // Clean Form State (Section 1 & 2)
  pickupText: '',
  pickupCoords: null,
  pickupTerminal: null,
  destText: '',
  destCoords: null,
  dropTerminal: null,
  travelDate: null,
  travelTime: null,
};

let mapInstance = null;
let pickupMarker = null;
let destMarker = null;
let routePolyline = null;

// ============================================
// CONSTANTS
// ============================================
const CURRENCY_MAP = {
  SGD: { symbol: 'S$', rate: 1.0 },
  USD: { symbol: '$', rate: 0.74 },
  EUR: { symbol: '€', rate: 0.69 },
  GBP: { symbol: '£', rate: 0.58 },
  AUD: { symbol: 'A$', rate: 1.13 },
  MYR: { symbol: 'RM', rate: 3.52 },
  INR: { symbol: '₹', rate: 61.80 },
};

const LOCATION_COORDS = {
  'Changi Airport': { lat: 1.3644, lng: 103.9915 },
  'Jewel Changi Airport': { lat: 1.3602, lng: 103.9898 },
  'Marina Bay Sands Hotel': { lat: 1.2834, lng: 103.8607 },
  'Gardens by the Bay': { lat: 1.2815, lng: 103.8636 },
  'Resorts World Sentosa': { lat: 1.2580, lng: 103.8180 },
  'Universal Studios Singapore': { lat: 1.2540, lng: 103.8238 },
  'Orchard Road Shopping Belt': { lat: 1.3048, lng: 103.8318 },
  'Singapore Cruise Centre (HarbourFront)': { lat: 1.2647, lng: 103.8203 },
  'Raffles Hotel Singapore': { lat: 1.2947, lng: 103.8543 },
  'Clarke Quay River Cruise': { lat: 1.2894, lng: 103.8465 },
  'Shangri-La Singapore': { lat: 1.3116, lng: 103.8267 },
  'The Ritz-Carlton Millenia Singapore': { lat: 1.2906, lng: 103.8596 },
  'Fullerton Hotel Singapore': { lat: 1.2863, lng: 103.8530 },
  'Sentosa Cove': { lat: 1.2449, lng: 103.8407 },
  'Woodlands Checkpoint': { lat: 1.4429, lng: 103.7690 },
  'Tuas Checkpoint': { lat: 1.3486, lng: 103.6366 },
  'Johor Bahru City Square (Malaysia)': { lat: 1.4623, lng: 103.7638 },
  'Legoland Malaysia (Johor)': { lat: 1.4273, lng: 103.6293 },
  'Desaru Coast Resort (Malaysia)': { lat: 1.5395, lng: 104.2662 },
};

// Vehicles with ACCURATE Unsplash images
const VEHICLES = [
  {
    id: 'alphard',
    name: 'Toyota Alphard MPV',
    fullName: 'Toyota Alphard / Vellfire Luxury MPV',
    category: 'mpv',
    tag: 'Most Popular',
    tagStyle: 'gold',
    pax: 6,
    luggage: 5,
    baseFareSGD: 45,
    perKmSGD: 2.5,
    minFareSGD: 65,
    hourlySGD: 65,
    image: 'https://images.unsplash.com/photo-1631295868223-63265b40d9e4?auto=format&fit=crop&w=1200&q=80',
    fallback: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80',
    description: 'First-class captain ottoman seats, dual sunroof, tri-zone climate control, and whisper-quiet suspension. The pinnacle of family luxury.',
    features: ['Captain Ottoman Seats', 'Dual Sunroof + Ambient Lights', 'Free 5G WiFi Onboard', 'Complimentary Mineral Water', 'Child Safety Seat Available'],
  },
  {
    id: 'eclass',
    name: 'Mercedes E-Class Sedan',
    fullName: 'Mercedes-Benz E-Class Executive Sedan',
    category: 'sedan',
    tag: 'Executive Choice',
    pax: 3,
    luggage: 2,
    baseFareSGD: 40,
    perKmSGD: 2.2,
    minFareSGD: 55,
    hourlySGD: 60,
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80',
    fallback: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=1200&q=80',
    description: 'Sleek executive sedan with plush Nappa leather, whisper-smooth ride, and professional chauffeur presentation.',
    features: ['Nappa Leather Interior', 'Burmester Sound System', 'Mobile Charging Ports', 'Newspapers & Refreshments', 'Flight Landing Tracking'],
  },
  {
    id: 'sclass',
    name: 'Mercedes S-Class VIP',
    fullName: 'Mercedes-Benz S-Class VIP Limousine',
    category: 'luxury',
    tag: 'Ultra Luxury',
    pax: 3,
    luggage: 3,
    baseFareSGD: 80,
    perKmSGD: 4.0,
    minFareSGD: 120,
    hourlySGD: 120,
    image: 'https://images.unsplash.com/photo-1616422285623-13ff0162193c?auto=format&fit=crop&w=1200&q=80',
    fallback: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=80',
    description: 'The pinnacle of luxury motoring. Rear executive reclining seats with massage function, soft-close doors, and privacy blinds.',
    features: ['Reclining Rear Seats', 'Air Balance Fragrance', 'Soft-Close Acoustic Glass', 'Dedicated VIP Concierge', 'Complimentary Champagne'],
  },
  {
    id: 'hiace',
    name: 'Toyota HiAce Van',
    fullName: 'VIP Toyota HiAce Super Long Van',
    category: 'mpv',
    tag: 'Best for Groups',
    pax: 13,
    luggage: 10,
    baseFareSGD: 60,
    perKmSGD: 3.0,
    minFareSGD: 90,
    hourlySGD: 75,
    image: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
    fallback: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1200&q=80',
    description: 'Spacious 13-seater passenger van ideal for large tour groups, golf excursions, and heavy luggage airport transfers.',
    features: ['High-Roof Spacious Interior', 'Individual A/C Vents', 'Extra-Large Luggage Trunk', 'PA Microphone for Guide', 'Wide Sliding Door'],
  },
  {
    id: 'staria',
    name: 'Hyundai Staria MPV',
    fullName: 'Hyundai Staria Premium MPV',
    category: 'mpv',
    tag: 'Modern Comfort',
    pax: 7,
    luggage: 6,
    baseFareSGD: 42,
    perKmSGD: 2.3,
    minFareSGD: 60,
    hourlySGD: 60,
    image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
    fallback: 'https://images.unsplash.com/photo-1631295868223-63265b40d9e4?auto=format&fit=crop&w=1200&q=80',
    description: 'Futuristic spaceship-inspired MPV with panoramic windows and relaxation seating — optimal for touring visibility.',
    features: ['Panoramic Windows', 'Relaxion Reclining Seats', 'Type-C USB Fast Ports', 'Quiet Engine Technology', 'Generous Legroom'],
  },
  {
    id: 'bus',
    name: 'Luxury Tour Coach',
    fullName: 'VIP Luxury Tour Coach Bus (23-45 Seater)',
    category: 'coach',
    tag: 'MICE · Tour Delegations',
    pax: 45,
    luggage: 40,
    baseFareSGD: 150,
    perKmSGD: 5.0,
    minFareSGD: 200,
    hourlySGD: 150,
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1200&q=80',
    fallback: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
    description: 'Fully equipped air-conditioned tour bus with onboard PA, licensed tour driver, and under-floor luggage bay.',
    features: ['23 to 45 Reclining Seats', 'Under-Floor Luggage Bay', 'PA Microphone for Guide', 'Safety Belt Equipped', 'Island-Wide Sightseeing'],
  },
];

const SERVICES = [
  { id: 'point_to_point', title: 'Point-to-Point Transport', icon: 'directions_car', tag: 'Direct Ride', priceSGD: 50, desc: 'Hotel to attraction, attraction to hotel, or any Singapore location to any destination with fixed rates.' },
  { id: 'hourly_disposal', title: 'Hourly Chauffeur', icon: 'schedule', tag: 'Flexible Hours', priceSGD: 65, desc: 'Dedicated luxury vehicle and driver for several hours — ideal for city sightseeing, MICE, and business meetings.' },
  { id: 'daily_booking', title: 'Daily Vehicle Booking', icon: 'calendar_today', tag: 'Full Day Charter', priceSGD: 450, desc: 'Private vehicle and driver for a full day or multiple days across Singapore & cross-border transfers.' },
];

const FAQS = [
  { id: 'faq-1', category: 'pricing', question: 'Do I need to pay in advance?', answer: 'No prepayment is required! You can submit your transport inquiry and reserve your ride with zero upfront cost. Payment is made after your trip is completed via cash or PayNow SG.' },
  { id: 'faq-2', category: 'airport', question: 'How do I book an airport transfer?', answer: 'Select Airport Transfer in the form, enter your pickup terminal or address, destination, date, time, and flight number. Tap Submit Transport Inquiry or WhatsApp Us — our team will confirm availability directly.' },
  { id: 'faq-3', category: 'airport', question: 'Can you pick me up from Changi Airport?', answer: 'Yes! Our chauffeur meets you inside Changi Airport arrival hall with a personalized name board. We automatically track flight landings and include 60 minutes of complimentary waiting time.' },
  { id: 'faq-4', category: 'airport', question: 'Can you take me from my hotel to Changi Airport?', answer: 'Yes, we provide punctual hotel-to-airport drop-off transfers directly to your terminal departure curb.' },
  { id: 'faq-5', category: 'booking', question: 'Can I book transport after arriving in Singapore?', answer: 'Yes! We accept last-minute and same-day transport inquiries. Contact our 24/7 WhatsApp dispatch team for rapid vehicle assignment.' },
  { id: 'faq-6', category: 'pricing', question: 'Do you provide hourly chauffeur service?', answer: 'Yes, our hourly disposal service provides a private vehicle and professional driver for 3 to 12+ hours with flexible stops.' },
  { id: 'faq-7', category: 'booking', question: 'Can I book a vehicle for a full day?', answer: 'Yes, our daily booking option provides full-day dedicated transport for family trips, MICE delegations, and island-wide sightseeing.' },
  { id: 'faq-8', category: 'contact', question: 'How do I contact STB?', answer: 'Reach our dispatch team 24/7 via WhatsApp at +65 9123 4567 or email admin@singaporetourbooking.com.' },
];

const REVIEWS = [
  { id: 'rev-1', name: 'David & Family', role: 'Family Tourist', country: 'Australia', stars: 5, date: '2 days ago', comment: 'Booked the Toyota Alphard for our family arrival at Changi. Chauffeur Ken was waiting with a clear name board. Flawless service and spotless car!' },
  { id: 'rev-2', name: 'Hiroshi Tanaka', role: 'Corporate Executive', country: 'Japan', stars: 5, date: '1 week ago', comment: 'Exceptional Mercedes S-Class service for our executive meetings across Marina Bay. Very punctual, discreet, and impossibly smooth driving.' },
  { id: 'rev-3', name: 'Sarah Jenkins', role: 'Malaysia Tour Group', country: 'United Kingdom', stars: 5, date: '2 weeks ago', comment: 'The cross-border transfer to Legoland Malaysia was a breeze. We did not even need to unload luggage at immigration. Highly recommended STB!' },
  { id: 'rev-4', name: 'Priya Sharma', role: 'Honeymoon Trip', country: 'India', stars: 5, date: '3 weeks ago', comment: 'From Changi to our Marina Bay Sands suite — the chauffeur even helped us with photos at the SkyPark drop-off. Truly majestic hospitality.' },
];

// ============================================
// HELPERS
// ============================================
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function formatCurrency(amountSGD) {
  const v = amountSGD * state.exchangeRate;
  if (state.currency === 'INR' || state.currency === 'MYR') {
    return `${state.currencySymbol}${Math.round(v).toLocaleString()}`;
  }
  return `${state.currencySymbol}${Math.round(v)}`;
}

function haversineKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const toRad = (v) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

// Adds 25% road-factor to straight-line distance (roads are never straight)
function estimatedRoadKm(pickupName, destName) {
  const p = LOCATION_COORDS[pickupName];
  const d = LOCATION_COORDS[destName];
  const straight = haversineKm(p, d);
  return straight == null ? null : straight * 1.25;
}

function computeFareSGD() {
  const v = VEHICLES.find(x => x.id === state.selectedVehicleId) || VEHICLES[0];
  if (state.tripMode === 'hourly') return v.hourlySGD * state.hourlyDuration;

  const pickup = document.getElementById('pickup-input')?.value || '';
  const dest = document.getElementById('dest-input')?.value || '';
  const km = estimatedRoadKm(pickup, dest);

  let fare;
  if (km == null || km < 0.5) {
    fare = v.minFareSGD || v.baseFareSGD;
  } else {
    fare = v.baseFareSGD + km * v.perKmSGD;
    fare = Math.max(fare, v.minFareSGD || 0);
  }

  if (state.tripMode === 'return') fare = fare * 1.85;
  return Math.round(fare);
}

function currentDistanceKm() {
  if (state.tripMode === 'hourly') return null;
  const pickup = document.getElementById('pickup-input')?.value || '';
  const dest = document.getElementById('dest-input')?.value || '';
  return estimatedRoadKm(pickup, dest);
}

// ============================================
// INIT
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initNavScroll();
  initMobileMenu();
  initCurrency();
  initMap();
  initTripMode();
  initServiceGrid();
  initVehicleChips();
  initFleet('all');
  initFAQ();
  initReviews();

  initModals();
  initPresets();
  initFormWiring();
  initReveal();
  initStickyWhatsAppScroll();
  updateAll();
  renderRouteSummary();
  autoDetectLocationOnLoad();
});

// ============================================
// NAV SCROLL
// ============================================
function initNavScroll() {
  const nav = $('#stb-nav');
  const onScroll = () => {
    if (window.scrollY > 20) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// ============================================
// MOBILE MENU
// ============================================
function initMobileMenu() {
  const toggle = $('#mobile-menu-toggle');
  const menu = $('#mobile-menu');
  const icon = $('#menu-icon');

  toggle?.addEventListener('click', () => {
    const open = !menu.classList.contains('hidden');
    if (open) {
      menu.classList.add('hidden');
      icon.textContent = 'menu';
    } else {
      menu.classList.remove('hidden');
      icon.textContent = 'close';
    }
  });

  $$('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      menu.classList.add('hidden');
      icon.textContent = 'menu';
    });
  });
}

// ============================================
// CURRENCY
// ============================================
function initCurrency() {
  const desk = $('#currency-select');
  const mob = $('#mobile-currency-select');

  const apply = (c) => {
    if (!CURRENCY_MAP[c]) return;
    state.currency = c;
    state.currencySymbol = CURRENCY_MAP[c].symbol;
    state.exchangeRate = CURRENCY_MAP[c].rate;
    if (desk) desk.value = c;
    if (mob) mob.value = c;
    if (window.STBAnalytics) STBAnalytics.currencyChange(c);
    updateAll();
  };

  desk?.addEventListener('change', e => apply(e.target.value));
  mob?.addEventListener('change', e => apply(e.target.value));
}

function updateAll() {
  initFleet(state.fleetCategory);
  renderServiceGrid();
  renderVehicleChips();
}

// ============================================
// MAP
// ============================================
function initMap() {
  const el = document.getElementById('route-map');
  if (!el || typeof L === 'undefined') return;

  mapInstance = L.map('route-map', { zoomControl: false, scrollWheelZoom: false }).setView([1.3521, 103.8198], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OSM',
  }).addTo(mapInstance);
  L.control.zoom({ position: 'bottomright' }).addTo(mapInstance);
}

function updateMapMarkers(pickupName, destName) {
  if (!mapInstance || typeof L === 'undefined') return;

  if (pickupMarker) { mapInstance.removeLayer(pickupMarker); pickupMarker = null; }
  if (destMarker) { mapInstance.removeLayer(destMarker); destMarker = null; }
  if (routePolyline) { mapInstance.removeLayer(routePolyline); routePolyline = null; }

  const p = pickupName ? LOCATION_COORDS[pickupName] : null;
  const d = destName ? LOCATION_COORDS[destName] : null;

  const iconA = L.divIcon({
    className: '',
    html: `<div style="background:#E31E24;width:32px;height:32px;border-radius:50%;border:3px solid #fff;box-shadow:0 6px 16px rgba(227,30,36,0.5);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;">A</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
  const iconB = L.divIcon({
    className: '',
    html: `<div style="background:#D4A24A;width:32px;height:32px;border-radius:50%;border:3px solid #fff;box-shadow:0 6px 16px rgba(212,162,74,0.5);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:13px;">B</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });

  const bounds = [];

  if (p) {
    pickupMarker = L.marker([p.lat, p.lng], { icon: iconA }).addTo(mapInstance).bindPopup(`<b>Pickup:</b> ${pickupName}`);
    bounds.push([p.lat, p.lng]);
  }
  if (d) {
    destMarker = L.marker([d.lat, d.lng], { icon: iconB }).addTo(mapInstance).bindPopup(`<b>Destination:</b> ${destName}`);
    bounds.push([d.lat, d.lng]);
  }

  if (p && d) {
    routePolyline = L.polyline([[p.lat, p.lng], [d.lat, d.lng]], {
      color: '#E31E24', weight: 4, opacity: 0.8, dashArray: '10, 10',
    }).addTo(mapInstance);
  }

  if (bounds.length > 0) {
    if (bounds.length === 1) {
      mapInstance.setView(bounds[0], 14);
    } else {
      mapInstance.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] });
    }
  }
}

// ============================================
// TRIP MODE & PRESETS FILTERING
// ============================================
function applyTripModeUI() {
  const destC = $('#dest-address-container');
  const hourlyC = $('#hourly-duration-container');

  if (state.tripMode === 'hourly') {
    destC?.classList.add('hidden');
    hourlyC?.classList.remove('hidden');
  } else {
    destC?.classList.remove('hidden');
    hourlyC?.classList.add('hidden');
  }
}

function initTripMode() {
  const tabs = $$('.trip-tab');

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.tripMode = btn.dataset.mode;
      if (window.STBAnalytics) STBAnalytics.tripModeSelect(state.tripMode);
      applyTripModeUI();
    });
  });

  $$('.hourly-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.hourly-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.hourlyDuration = parseInt(btn.dataset.hours || '4', 10);
      renderVehicleChips();
      renderRouteSummary();
    });
  });

  // Ensure initial UI state matches default tab
  applyTripModeUI();
}

// ============================================
// SERVICE GRID
// ============================================
function initServiceGrid() {
  renderServiceGrid();
}
function renderServiceGrid() {
  const grid = $('#service-grid');
  if (!grid) return;

  grid.innerHTML = SERVICES.map((s, i) => `
    <article class="service-card reveal" data-delay="${i}" data-testid="service-card-${s.id}">
      <div class="flex items-start justify-between mb-1">
        <div class="service-card-icon">
          <span class="material-symbols-outlined fill-1">${s.icon}</span>
        </div>
        ${s.tag ? `<span class="service-card-tag">${s.tag}</span>` : ''}
      </div>
      <h3 class="service-card-title">${s.title}</h3>
      <p class="service-card-desc">${s.desc}</p>
      <div class="service-card-foot">
        <div>
          <div class="text-[0.6rem] font-bold text-stb-muted uppercase tracking-widest">From</div>
          <div class="service-card-price">${formatCurrency(s.priceSGD)}${s.id === 'hourly_disposal' ? '<span class="text-xs text-stb-muted">/hr</span>' : ''}</div>
        </div>
        <button class="service-card-cta srv-book-btn" data-service="${s.id}" data-testid="srv-book-${s.id}">
          Book <span class="material-symbols-outlined text-base">arrow_forward</span>
        </button>
      </div>
    </article>
  `).join('');

  grid.querySelectorAll('.srv-book-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const s = btn.dataset.service || 'point_to_point';
      let mode = 'point_to_point';
      if (s === 'hourly_disposal') mode = 'hourly';
      else if (s === 'daily_booking') mode = 'daily';

      state.tripMode = mode;
      $$('.trip-tab').forEach(b => {
        if (b.dataset.mode === mode) b.classList.add('active');
        else b.classList.remove('active');
      });

      if (window.STBAnalytics) STBAnalytics.ctaClick(`book_service_${s}`, 'services_grid');
      applyTripModeUI();
      scrollToWidget();
    });
  });

  initReveal();
}

// ============================================
// VEHICLE CHIPS (inside booking widget)
// ============================================
function initVehicleChips() { renderVehicleChips(); }
function renderVehicleChips() {
  const grid = $('#vehicle-grid');
  if (!grid) return;

  const pickup = document.getElementById('pickup-input')?.value || '';
  const dest = document.getElementById('dest-input')?.value || '';
  const km = state.tripMode === 'hourly' ? null : estimatedRoadKm(pickup, dest);

  grid.innerHTML = VEHICLES.map(v => {
    let priceSGD;
    if (state.tripMode === 'hourly') {
      priceSGD = v.hourlySGD * state.hourlyDuration;
    } else if (km != null) {
      priceSGD = Math.max(Math.round(v.baseFareSGD + km * v.perKmSGD), v.minFareSGD || 0);
      if (state.tripMode === 'return') priceSGD = Math.round(priceSGD * 1.85);
    } else {
      priceSGD = v.minFareSGD || v.baseFareSGD;
      if (state.tripMode === 'return') priceSGD = Math.round(priceSGD * 1.85);
    }
    return `
      <div class="vehicle-chip ${v.id === state.selectedVehicleId ? 'active' : ''}" data-id="${v.id}" data-testid="vchip-${v.id}">
        <div class="vname">${v.name}</div>
        <div class="vmeta">${v.pax} pax · ${v.luggage} bags</div>
        <div class="vprice">${formatCurrency(priceSGD)}</div>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('.vehicle-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      state.selectedVehicleId = chip.dataset.id;
      renderVehicleChips();
      renderRouteSummary();
    });
  });
}

function renderRouteSummary() {
  const el = document.getElementById('route-summary');
  if (!el) return;
  if (state.tripMode === 'hourly') {
    el.innerHTML = `
      <span class="material-symbols-outlined" style="color:var(--stb-gold-dark);font-size:1rem;">schedule</span>
      <span><strong>${state.hourlyDuration}h disposal</strong> · chauffeur at your service</span>
      <span style="margin-left:auto;font-weight:800;color:var(--stb-red);">${formatCurrency(computeFareSGD())}</span>
    `;
    el.style.display = 'flex';
    return;
  }
  const km = currentDistanceKm();
  if (km == null) {
    el.innerHTML = `
      <span class="material-symbols-outlined" style="color:var(--stb-muted);font-size:1rem;">info</span>
      <span style="color:var(--stb-muted);">Pick preset locations for live route pricing</span>
      <span style="margin-left:auto;font-weight:800;color:var(--stb-red);">from ${formatCurrency(computeFareSGD())}</span>
    `;
    el.style.display = 'flex';
    return;
  }
  const min = Math.round((km / 40) * 60);
  el.innerHTML = `
    <span class="material-symbols-outlined" style="color:var(--stb-red);font-size:1rem;">route</span>
    <span><strong>${km.toFixed(1)} km</strong> · ~${min} min drive${state.tripMode === 'return' ? ' · round trip' : ''}</span>
    <span style="margin-left:auto;font-weight:800;color:var(--stb-red);">${formatCurrency(computeFareSGD())}</span>
  `;
  el.style.display = 'flex';
}

// ============================================
// FLEET
// ============================================
function initFleet(cat) {
  state.fleetCategory = cat;
  const container = $('#fleet-card-container');
  const filters = $$('.fleet-filter-btn');

  filters.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.category === cat);
    if (!btn._wired) {
      btn.addEventListener('click', () => initFleet(btn.dataset.category));
      btn._wired = true;
    }
  });

  if (!container) return;
  let list = cat === 'all' ? VEHICLES : VEHICLES.filter(v => v.category === cat);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const toggleBtn = $('#btn-toggle-fleet');

  if (isMobile && cat === 'all' && !state.showAllFleetMobile) {
    list = list.slice(0, 3);
    if (toggleBtn) toggleBtn.classList.remove('hidden');
  } else {
    if (toggleBtn) toggleBtn.classList.add('hidden');
  }

  container.innerHTML = list.map((v, i) => `
    <article class="fleet-card reveal" data-delay="${i % 3}" data-testid="fleet-card-${v.id}">
      <div class="fleet-img-wrap">
        <img src="${v.image}" alt="${v.fullName}" onerror="this.onerror=null;this.src='${v.fallback}';" loading="lazy" />
        <span class="fleet-tag ${v.tagStyle === 'gold' ? 'gold' : ''}">${v.tag}</span>
      </div>
      <div class="fleet-body">
        <h3 class="fleet-title">${v.fullName}</h3>
        <p class="fleet-desc">${v.description}</p>
        <div class="fleet-stats">
          <span class="fleet-stat"><span class="material-symbols-outlined">group</span>${v.pax} pax</span>
          <span class="fleet-stat"><span class="material-symbols-outlined">luggage</span>${v.luggage} bags</span>
        </div>
        <ul class="mb-4">
          ${v.features.slice(0, 3).map(f => `<li class="fleet-feature"><span class="material-symbols-outlined">check_circle</span>${f}</li>`).join('')}
        </ul>
        <div class="fleet-foot">
          <div class="fleet-price-block">
            <div class="fleet-price-label">Fixed rate</div>
            <div class="fleet-price">${formatCurrency(v.baseFareSGD)}</div>
          </div>
          <div class="flex gap-2">
            <button class="btn-ghost btn-fleet-detail" data-id="${v.id}" style="padding: 0.5rem 0.85rem; font-size: 0.72rem;" data-testid="fleet-specs-${v.id}">Specs</button>
            <button class="btn-primary btn-fleet-select" data-id="${v.id}" style="padding: 0.5rem 1rem; font-size: 0.72rem; box-shadow: none;" data-testid="fleet-book-${v.id}">Book</button>
          </div>
        </div>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('.btn-fleet-detail').forEach(b => b.addEventListener('click', () => {
    const v = VEHICLES.find(x => x.id === b.dataset.id);
    if (window.STBAnalytics) STBAnalytics.fleetCardClick(b.dataset.id, v?.name || b.dataset.id);
    openVehicleModal(b.dataset.id);
  }));
  container.querySelectorAll('.btn-fleet-select').forEach(b => b.addEventListener('click', () => {
    const v = VEHICLES.find(x => x.id === b.dataset.id);
    if (window.STBAnalytics) STBAnalytics.fleetCardClick(b.dataset.id, v?.name || b.dataset.id);
    state.selectedVehicleId = b.dataset.id;
    renderVehicleChips();
    scrollToWidget();
  }));

  $('#btn-toggle-fleet')?.addEventListener('click', () => {
    state.showAllFleetMobile = true;
    initFleet(state.fleetCategory);
  });

  initReveal();
}

// ============================================
// FAQ
// ============================================
function initFAQ() {
  const search = $('#faq-search-input');
  const catBtns = $$('.faq-cat-btn');

  catBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      catBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.faqCategory = btn.dataset.cat;
      renderFAQ();
    });
  });

  search?.addEventListener('input', renderFAQ);
  renderFAQ();
}
function renderFAQ() {
  const container = $('#faq-accordion-list');
  const q = ($('#faq-search-input')?.value || '').toLowerCase().trim();
  const filtered = FAQS.filter(f => {
    const cat = state.faqCategory === 'all' || f.category === state.faqCategory;
    const match = !q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q);
    return cat && match;
  });

  if (!filtered.length) {
    container.innerHTML = `<div class="p-8 text-center text-stb-muted font-semibold">No matches. Ping our WhatsApp concierge for instant help!</div>`;
    return;
  }

  container.innerHTML = filtered.map(f => `
    <div class="faq-item" data-testid="faq-${f.id}">
      <button class="faq-trigger">
        <span>${f.question}</span>
        <span class="faq-icon material-symbols-outlined">expand_more</span>
      </button>
      <div class="faq-answer">${f.answer}</div>
    </div>
  `).join('');

  container.querySelectorAll('.faq-trigger').forEach(t => {
    t.addEventListener('click', () => {
      const item = t.closest('.faq-item');
      const open = item.classList.contains('open');
      container.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!open) {
        item.classList.add('open');
        const question = t.querySelector('span')?.textContent || '';
        if (window.STBAnalytics) STBAnalytics.faqOpen(question);
      }
    });
  });
}

// ============================================
// REVIEWS
// ============================================
function initReviews() {
  renderReviews();
}
function renderReviews() {
  const c = $('#reviews-container');
  if (!c) return;
  c.innerHTML = REVIEWS.map(r => `
    <article class="review-card">
      <div class="flex items-center justify-between">
        <div class="stars text-sm">${'★'.repeat(r.stars)}</div>
        <span class="text-[0.65rem] text-stb-muted font-bold">${r.date}</span>
      </div>
      <p class="comment">"${r.comment}"</p>
      <div class="flex items-center gap-3 pt-4 border-t border-stone-100 mt-auto">
        <div class="avatar">${r.name.charAt(0)}</div>
        <div>
          <div class="font-bold text-sm text-stb-charcoal">${r.name}</div>
          <div class="text-[0.7rem] text-stb-muted">${r.role} · ${r.country}</div>
        </div>
      </div>
    </article>
  `).join('');
}

// ============================================
// PRESETS (autocomplete & mode-based filtering)
// ============================================
async function requestCurrentLocation(isAutoLoad = false) {
  const pickup = $('#pickup-input');
  if (!pickup) return;

  if (window.STBAnalytics) STBAnalytics.useLocationClicked();
  console.log(`[GEO] Geolocation requested (${isAutoLoad ? 'auto-load' : 'user click'})...`);
  pickup.value = 'Detecting your location...';

  if (!navigator.geolocation) {
    console.warn('[GEO] Geolocation unsupported in this browser.');
    pickup.value = '';
    if (!isAutoLoad) {
      alert("Location detection isn't available in this browser.\nPlease enter your pickup location manually.");
    }
    if (window.STBAnalytics) STBAnalytics.geolocationFailed('unsupported');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      console.log(`[GEO] High-accuracy geolocation success (${isAutoLoad ? 'auto' : 'manual'}): lat=${lat}, lng=${lng}`);
      if (window.STBAnalytics) STBAnalytics.geolocationSuccess();

      let displayLoc = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
        if (res.ok) {
          const data = await res.json();
          if (data.display_name) {
            displayLoc = data.display_name;
          }
          console.log('[GEO] High-precision reverse geocoded address:', displayLoc);
        }
      } catch (e) {
        console.warn('[GEO] Reverse geocode failed, using lat/lng string:', e);
      }

      pickup.value = displayLoc;
      updatePickupState(displayLoc);
    },
    (err) => {
      console.warn(`[GEO] Geolocation error code ${err.code}: ${err.message}`);
      if (window.STBAnalytics) STBAnalytics.geolocationFailed(err.message);
      if (pickup.value === 'Detecting your location...') {
        pickup.value = '';
        updatePickupState('');
      }

      if (!isAutoLoad) {
        if (err.code === 1) {
          alert("Location access was denied.\nYou can enter your pickup location manually.");
        } else if (err.code === 2) {
          alert("We couldn't detect your location.\nPlease enter your pickup location manually.");
        } else if (err.code === 3) {
          alert("Location detection took too long.\nPlease try again or enter your pickup manually.");
        } else {
          alert("We couldn't detect your location.\nPlease enter your pickup location manually.");
        }
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
  );
}

function autoDetectLocationOnLoad() {
  if (navigator.geolocation) {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' }).then(res => {
        if (res.state === 'granted' || res.state === 'prompt') {
          requestCurrentLocation(true);
        }
      }).catch(() => {
        requestCurrentLocation(true);
      });
    } else {
      requestCurrentLocation(true);
    }
  }
}

function updatePickupState(val) {
  state.pickupText = (val || '').trim();
  state.pickupCoords = LOCATION_COORDS[state.pickupText] || null;

  const clearBtn = $('#btn-clear-pickup');
  if (clearBtn) {
    if (state.pickupText) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }

  checkAirportDetection();
  updateMapMarkers($('#pickup-input')?.value, $('#dest-input')?.value);
}

function updateDestState(val) {
  state.destText = (val || '').trim();
  state.destCoords = LOCATION_COORDS[state.destText] || null;

  const clearBtn = $('#btn-clear-dest');
  if (clearBtn) {
    if (state.destText) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }

  checkAirportDetection();
  updateMapMarkers($('#pickup-input')?.value, $('#dest-input')?.value);
}

function clearPickup() {
  const pickup = $('#pickup-input');
  if (pickup) pickup.value = '';
  state.pickupText = '';
  state.pickupCoords = null;
  state.pickupTerminal = null;

  const termSelect = $('#pickup-terminal-select');
  if (termSelect) termSelect.value = '';

  const termC = $('#pickup-terminal-container');
  if (termC) termC.classList.add('hidden');

  const clearBtn = $('#btn-clear-pickup');
  if (clearBtn) clearBtn.classList.add('hidden');

  checkAirportDetection();
  updateMapMarkers('', $('#dest-input')?.value);
}

function clearDest() {
  const dest = $('#dest-input');
  if (dest) dest.value = '';
  state.destText = '';
  state.destCoords = null;
  state.dropTerminal = null;

  const termSelect = $('#drop-terminal-select');
  if (termSelect) termSelect.value = '';

  const termC = $('#drop-terminal-container');
  if (termC) termC.classList.add('hidden');

  const clearBtn = $('#btn-clear-dest');
  if (clearBtn) clearBtn.classList.add('hidden');

  checkAirportDetection();
  updateMapMarkers($('#pickup-input')?.value, '');
}

// ─── MODERN DATE & TIME PICKERS (Section 12, 13, 14, 15, 16) ───
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();

function initCalendarModal() {
  const trigger = $('#trigger-date-modal');
  const dateInput = $('#date-display-input');
  const prevBtn = $('#btn-cal-prev');
  const nextBtn = $('#btn-cal-next');
  const todayBtn = $('#btn-cal-today');

  trigger?.addEventListener('click', () => {
    renderCalendarGrid();
    openModal('modal-calendar');
  });

  dateInput?.addEventListener('click', () => {
    renderCalendarGrid();
    openModal('modal-calendar');
  });

  prevBtn?.addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) {
      calMonth = 11;
      calYear--;
    }
    renderCalendarGrid();
  });

  nextBtn?.addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) {
      calMonth = 0;
      calYear++;
    }
    renderCalendarGrid();
  });

  todayBtn?.addEventListener('click', () => {
    const today = new Date();
    selectCalendarDate(today.getFullYear(), today.getMonth(), today.getDate());
  });
}

function renderCalendarGrid() {
  const title = $('#cal-month-title');
  const grid = $('#cal-days-grid');
  if (!title || !grid) return;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  title.textContent = `${monthNames[calMonth]} ${calYear}`;

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let html = '';
  for (let i = 0; i < firstDay; i++) {
    html += `<div></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(calYear, calMonth, day);
    cellDate.setHours(0, 0, 0, 0);

    const isPast = cellDate < today;
    const isToday = cellDate.getTime() === today.getTime();
    const isSelected = state.travelDate && new Date(state.travelDate).toDateString() === cellDate.toDateString();

    let classes = 'p-2 rounded-xl transition-all font-semibold font-mono text-center ';

    if (isPast) {
      classes += 'text-stone-300 pointer-events-none opacity-40';
    } else if (isSelected) {
      classes += 'bg-stb-red text-white shadow-md font-bold scale-105';
    } else if (isToday) {
      classes += 'border-2 border-stb-red text-stb-red font-bold hover:bg-red-50';
    } else {
      classes += 'hover:bg-stone-100 text-stb-charcoal cursor-pointer';
    }

    html += `<button type="button" class="${classes}" onclick="window.selectCalendarDate(${calYear}, ${calMonth}, ${day})">${day}</button>`;
  }

  grid.innerHTML = html;
}

window.selectCalendarDate = function(y, m, d) {
  const selected = new Date(y, m, d);
  state.travelDate = selected;

  const display = $('#date-display-input');
  if (display) {
    display.value = selected.toLocaleDateString('en-SG', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  }
  closeModal('modal-calendar');
};

function initTimePickerModal() {
  const trigger = $('#trigger-time-modal');
  const timeInput = $('#time-display-input');

  trigger?.addEventListener('click', () => {
    renderTimeSlots();
    openModal('modal-time-picker');
  });

  timeInput?.addEventListener('click', () => {
    renderTimeSlots();
    openModal('modal-time-picker');
  });
}

function renderTimeSlots() {
  const grid = $('#time-slots-grid');
  if (!grid) return;

  const slots = [
    '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM',
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
    '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
    '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
  ];

  grid.innerHTML = slots.map(s => {
    const isSelected = state.travelTime === s;
    const activeClass = isSelected ? 'bg-stb-red text-white font-bold shadow-md' : 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-red-50 hover:border-stb-red cursor-pointer';
    return `<button type="button" class="py-2 px-1 rounded-xl text-center transition-all ${activeClass}" onclick="window.selectTimeSlot('${s}')">${s}</button>`;
  }).join('');
}

window.selectTimeSlot = function(s) {
  state.travelTime = s;
  const display = $('#time-display-input');
  if (display) {
    display.value = s;
  }
  closeModal('modal-time-picker');
};

let pickupDebounceTimer = null;
let destDebounceTimer = null;

async function fetchNominatimSuggestions(query) {
  const q = (query || '').trim();
  if (q.length < 3) return [];
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=sg&limit=5&addressdetails=1`);
    if (res.ok) {
      const data = await res.json();
      return data.map(item => {
        const a = item.address || {};
        const title = a.building || a.hotel || a.amenity || a.tourism || a.road || item.display_name.split(',')[0];
        const sub = [a.road, a.suburb || a.city_district || 'Singapore'].filter(Boolean).join(', ');
        const fullName = title.toLowerCase().includes('singapore') ? title : `${title}, ${sub}`;
        return {
          title: title || 'Singapore Location',
          fullName: fullName,
          lat: parseFloat(item.lat),
          lng: parseFloat(item.lon),
        };
      });
    }
  } catch (e) {
    console.warn('[GEOCODE] Nominatim search error:', e);
  }
  return [];
}

function renderPickupPresets(query = '') {
  const pPresets = $('#pickup-presets');
  const pickup = $('#pickup-input');
  if (!pPresets) return;

  const allLocations = Object.keys(LOCATION_COORDS);
  const q = (query || '').trim().toLowerCase();
  const filtered = q
    ? allLocations.filter(loc => loc.toLowerCase().includes(q))
    : allLocations;

  const geoItemHtml = !q ? `
    <div id="preset-item-geo" class="preset-item text-stb-red font-bold flex items-center gap-1.5 border-b border-stone-100 pb-2 mb-1 cursor-pointer hover:bg-stone-100 p-2 rounded-lg">
      <span class="material-symbols-outlined text-sm">my_location</span>
      <span>Use My Current Location</span>
    </div>
  ` : '';

  let html = geoItemHtml;
  html += filtered.map(loc => `
    <div class="preset-item cursor-pointer hover:bg-stone-100 p-2 rounded-lg flex items-center justify-between" data-loc="${loc}">
      <span class="font-medium text-stb-charcoal">${loc}</span>
      <span class="material-symbols-outlined text-sm text-stone-400">north_east</span>
    </div>
  `).join('');

  pPresets.innerHTML = html;
  pPresets.classList.remove('hidden');

  $('#preset-item-geo')?.addEventListener('click', () => {
    pPresets.classList.add('hidden');
    requestCurrentLocation();
  });

  pPresets.querySelectorAll('.preset-item[data-loc]').forEach(item => {
    item.addEventListener('click', () => {
      const locText = item.dataset.loc;
      if (pickup) pickup.value = locText;
      pPresets.classList.add('hidden');
      updatePickupState(locText);
    });
  });

  // Debounced Forward Geocoding for queries >= 3 chars
  if (q.length >= 3) {
    clearTimeout(pickupDebounceTimer);
    pickupDebounceTimer = setTimeout(async () => {
      const remoteResults = await fetchNominatimSuggestions(q);
      if (remoteResults.length > 0 && $('#pickup-input')?.value.trim().toLowerCase() === q) {
        let remoteHtml = `<div class="text-[0.65rem] font-bold uppercase tracking-wider text-stone-400 px-2 pt-2 pb-1 border-t border-stone-100 mt-1">Live Location Search Results</div>`;
        remoteHtml += remoteResults.map((r, i) => `
          <div class="preset-item remote-geo-item cursor-pointer hover:bg-red-50 p-2 rounded-lg flex items-center justify-between" data-remote-idx="${i}">
            <div class="truncate pr-2">
              <div class="font-bold text-stb-charcoal text-xs">${r.title}</div>
              <div class="text-[0.68rem] text-stone-400 truncate">${r.fullName}</div>
            </div>
            <span class="material-symbols-outlined text-sm text-stb-red">location_on</span>
          </div>
        `).join('');

        const existingGeo = pPresets.querySelector('.remote-geo-container');
        if (existingGeo) existingGeo.remove();

        const container = document.createElement('div');
        container.className = 'remote-geo-container';
        container.innerHTML = remoteHtml;
        pPresets.appendChild(container);

        container.querySelectorAll('.remote-geo-item').forEach(item => {
          item.addEventListener('click', () => {
            const idx = parseInt(item.dataset.remoteIdx, 10);
            const res = remoteResults[idx];
            if (res) {
              LOCATION_COORDS[res.fullName] = { lat: res.lat, lng: res.lng };
              if (pickup) pickup.value = res.fullName;
              pPresets.classList.add('hidden');
              updatePickupState(res.fullName);
            }
          });
        });
      }
    }, 300);
  }
}

function renderDestPresets(query = '') {
  const dPresets = $('#dest-presets');
  const dest = $('#dest-input');
  if (!dPresets) return;

  const allLocations = Object.keys(LOCATION_COORDS);
  const q = (query || '').trim().toLowerCase();
  const filtered = q
    ? allLocations.filter(loc => loc.toLowerCase().includes(q))
    : allLocations;

  let html = filtered.map(loc => `
    <div class="preset-item cursor-pointer hover:bg-stone-100 p-2 rounded-lg flex items-center justify-between" data-loc="${loc}">
      <span class="font-medium text-stb-charcoal">${loc}</span>
      <span class="material-symbols-outlined text-sm text-stone-400">north_east</span>
    </div>
  `).join('');

  dPresets.innerHTML = html;
  dPresets.classList.remove('hidden');

  dPresets.querySelectorAll('.preset-item[data-loc]').forEach(item => {
    item.addEventListener('click', () => {
      const locText = item.dataset.loc;
      if (dest) dest.value = locText;
      dPresets.classList.add('hidden');
      updateDestState(locText);
    });
  });

  // Debounced Forward Geocoding for queries >= 3 chars
  if (q.length >= 3) {
    clearTimeout(destDebounceTimer);
    destDebounceTimer = setTimeout(async () => {
      const remoteResults = await fetchNominatimSuggestions(q);
      if (remoteResults.length > 0 && $('#dest-input')?.value.trim().toLowerCase() === q) {
        let remoteHtml = `<div class="text-[0.65rem] font-bold uppercase tracking-wider text-stone-400 px-2 pt-2 pb-1 border-t border-stone-100 mt-1">Live Location Search Results</div>`;
        remoteHtml += remoteResults.map((r, i) => `
          <div class="preset-item remote-geo-item cursor-pointer hover:bg-red-50 p-2 rounded-lg flex items-center justify-between" data-remote-idx="${i}">
            <div class="truncate pr-2">
              <div class="font-bold text-stb-charcoal text-xs">${r.title}</div>
              <div class="text-[0.68rem] text-stone-400 truncate">${r.fullName}</div>
            </div>
            <span class="material-symbols-outlined text-sm text-stb-red">location_on</span>
          </div>
        `).join('');

        const existingGeo = dPresets.querySelector('.remote-geo-container');
        if (existingGeo) existingGeo.remove();

        const container = document.createElement('div');
        container.className = 'remote-geo-container';
        container.innerHTML = remoteHtml;
        dPresets.appendChild(container);

        container.querySelectorAll('.remote-geo-item').forEach(item => {
          item.addEventListener('click', () => {
            const idx = parseInt(item.dataset.remoteIdx, 10);
            const res = remoteResults[idx];
            if (res) {
              LOCATION_COORDS[res.fullName] = { lat: res.lat, lng: res.lng };
              if (dest) dest.value = res.fullName;
              dPresets.classList.add('hidden');
              updateDestState(res.fullName);
            }
          });
        });
      }
    }, 300);
  }
}

function initPresets() {
  const pickup = $('#pickup-input');
  const dest = $('#dest-input');
  const pPresets = $('#pickup-presets');
  const dPresets = $('#dest-presets');
  const pHelp = $('#pickup-help-msg');
  const dHelp = $('#dest-help-msg');

  renderPickupPresets();
  renderDestPresets();

  pickup?.addEventListener('focus', () => {
    pHelp?.classList.remove('hidden');
    renderPickupPresets(pickup.value);
    pPresets?.classList.remove('hidden');
  });

  pickup?.addEventListener('blur', () => {
    setTimeout(() => { pHelp?.classList.add('hidden'); }, 250);
  });

  dest?.addEventListener('focus', () => {
    dHelp?.classList.remove('hidden');
    renderDestPresets(dest.value);
    dPresets?.classList.remove('hidden');
  });

  dest?.addEventListener('blur', () => {
    setTimeout(() => { dHelp?.classList.add('hidden'); }, 250);
  });

  pickup?.addEventListener('input', () => {
    updatePickupState(pickup.value);
    renderPickupPresets(pickup.value);
    pPresets?.classList.remove('hidden');
  });

  dest?.addEventListener('input', () => {
    updateDestState(dest.value);
    renderDestPresets(dest.value);
    dPresets?.classList.remove('hidden');
  });

  document.addEventListener('click', e => {
    if (!pickup?.contains(e.target) && !pPresets?.contains(e.target)) pPresets?.classList.add('hidden');
    if (!dest?.contains(e.target) && !dPresets?.contains(e.target)) dPresets?.classList.add('hidden');
  });

  $$('.dest-card').forEach(card => {
    card.addEventListener('click', () => {
      const loc = card.dataset.location;
      if (window.STBAnalytics) STBAnalytics.destinationCardClick(loc);
      if (dest && loc) {
        dest.value = loc;
        updateDestState(loc);
        scrollToWidget();
      }
    });
  });
}

function checkAirportDetection() {
  const pickup = ($('#pickup-input')?.value || '').toLowerCase();
  const dest = ($('#dest-input')?.value || '').toLowerCase();

  const isPickupAirport = pickup.includes('changi') || pickup.includes('airport');
  const isDestAirport = dest.includes('changi') || dest.includes('airport');

  const pTermC = $('#pickup-terminal-container');
  const dTermC = $('#drop-terminal-container');
  const flightWrap = $('#flight-toggle-wrap');

  if (pTermC) {
    if (isPickupAirport) {
      pTermC.classList.remove('hidden');
      if (window.STBAnalytics) STBAnalytics.airportDetected('pickup');
    } else {
      pTermC.classList.add('hidden');
      state.pickupTerminal = null;
      const select = $('#pickup-terminal-select');
      if (select) select.value = '';
    }
  }

  if (dTermC) {
    if (isDestAirport && state.tripMode !== 'hourly' && state.tripMode !== 'daily') {
      dTermC.classList.remove('hidden');
      if (window.STBAnalytics) STBAnalytics.airportDetected('destination');
    } else {
      dTermC.classList.add('hidden');
      state.dropTerminal = null;
      const select = $('#drop-terminal-select');
      if (select) select.value = '';
    }
  }

  if (flightWrap) {
    if (isPickupAirport || isDestAirport) {
      flightWrap.classList.remove('hidden');
    } else {
      flightWrap.classList.add('hidden');
    }
  }
}

function initBookingTypeSelector() {
  const typeBtns = $$('.type-btn');
  const destC = $('#dest-address-container');
  const hourlyC = $('#hourly-duration-container');
  const dailyC = $('#daily-duration-container');

  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      typeBtns.forEach(b => {
        b.classList.remove('active', 'bg-white', 'text-stb-red', 'shadow-sm');
        b.classList.add('text-stone-600');
      });
      btn.classList.add('active', 'bg-white', 'text-stb-red', 'shadow-sm');
      btn.classList.remove('text-stone-600');

      const type = btn.dataset.type || 'one_way';
      state.tripMode = type;
      const hiddenType = $('#booking-type-hidden');
      if (hiddenType) hiddenType.value = type;

      if (window.STBAnalytics) STBAnalytics.bookingTypeSelected(type);

      if (type === 'hourly') {
        destC?.classList.add('hidden');
        dailyC?.classList.add('hidden');
        hourlyC?.classList.remove('hidden');
        if (window.STBAnalytics) STBAnalytics.hourlySelected();
      } else if (type === 'daily') {
        destC?.classList.add('hidden');
        hourlyC?.classList.add('hidden');
        dailyC?.classList.remove('hidden');
        if (window.STBAnalytics) STBAnalytics.dailySelected();
      } else {
        destC?.classList.remove('hidden');
        hourlyC?.classList.add('hidden');
        dailyC?.classList.add('hidden');
      }
      checkAirportDetection();
    });
  });

  $$('.hourly-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.hourly-btn').forEach(b => b.classList.remove('active', 'bg-stb-red', 'text-white'));
      btn.classList.add('active');
      state.hourlyDuration = Number(btn.dataset.hours || 4);
    });
  });

  $$('.daily-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.daily-btn').forEach(b => b.classList.remove('active', 'bg-stb-red', 'text-white'));
      btn.classList.add('active');
      state.dailyDuration = Number(btn.dataset.days || 2);
    });
  });
}

async function submitBookingInquiry() {
  if (window.STBAnalytics) STBAnalytics.bookingSubmitAttempt();

  let pickup = ($('#pickup-input')?.value || '').trim();
  let dest = ($('#dest-input')?.value || '').trim();
  const dateVal = $('#date-display-input')?.value || '';
  const timeVal = $('#time-display-input')?.value || '';
  const flight = $('#flight-input')?.value || '';
  const pax = $('#pax-select')?.value || '1-3 Passengers';
  const pickupTerm = $('#pickup-terminal-select')?.value || '';
  const dropTerm = $('#drop-terminal-select')?.value || '';

  // Section 23 Contextual Validation
  if (!pickup) {
    alert('Please enter your pickup location.');
    $('#pickup-input')?.focus();
    return;
  }

  const isPickupAirport = pickup.toLowerCase().includes('changi') || pickup.toLowerCase().includes('airport');
  if (isPickupAirport && !pickupTerm) {
    alert('Please select your pickup terminal.');
    $('#pickup-terminal-select')?.focus();
    return;
  }

  if (state.tripMode === 'one_way') {
    if (!dest) {
      alert('Please enter your destination.');
      $('#dest-input')?.focus();
      return;
    }
    const isDestAirport = dest.toLowerCase().includes('changi') || dest.toLowerCase().includes('airport');
    if (isDestAirport && !dropTerm) {
      alert('Please select your drop-off terminal.');
      $('#drop-terminal-select')?.focus();
      return;
    }
  }

  if (!dateVal) {
    alert('Please select your travel date.');
    openModal('modal-calendar');
    return;
  }

  if (!timeVal) {
    alert('Please select your travel time.');
    openModal('modal-time-picker');
    return;
  }

  if (isPickupAirport && pickupTerm) pickup += ` (${pickupTerm})`;
  if (dest && dropTerm) dest += ` (${dropTerm})`;

  const formattedDate = `${dateVal} at ${timeVal}`;
  const voucherCode = `STB-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  let modeName = 'One Way Transport';
  if (isPickupAirport || (dest && dest.toLowerCase().includes('changi'))) modeName = 'Airport Transfer';
  if (state.tripMode === 'hourly') modeName = 'Hourly Chauffeur';
  if (state.tripMode === 'daily') modeName = 'Daily Booking';

  // Construct WhatsApp inquiry message (Section 21)
  let waMsg = `Hello STB,\n\n`;
  waMsg += `I have submitted a transport booking request.\n\n`;
  waMsg += `Booking Reference: ${voucherCode}\n`;
  waMsg += `Booking Type: ${modeName}\n\n`;
  waMsg += `Pickup:\n${pickup}\n\n`;
  if (state.tripMode !== 'hourly' && state.tripMode !== 'daily') {
    waMsg += `Destination:\n${dest}\n\n`;
  }
  waMsg += `Date:\n${dateVal}\n\n`;
  waMsg += `Time:\n${timeVal}\n\n`;
  waMsg += `Passengers:\n${pax}\n\n`;
  if (state.tripMode === 'hourly') waMsg += `Hours Required: ${state.hourlyDuration || 4} hours\n\n`;
  if (state.tripMode === 'daily') waMsg += `Days Required: ${state.dailyDuration || 2} days\n\n`;
  if (flight) waMsg += `Flight:\n${flight}\n\n`;
  waMsg += `Please confirm availability and booking details.\n\nThank you.`;

  const whatsappUrl = `https://wa.me/6590629107?text=${encodeURIComponent(waMsg)}`;

  if (window.STBAnalytics) {
    STBAnalytics.bookingSubmitted();
    STBAnalytics.whatsappOpenAttempt();
  }

  // Submit inquiry to backend API (dispatches Admin & Customer emails)
  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        voucherCode,
        passengerName: 'Singapore Visitor',
        passengerEmail: 'bala@tensketch.com',
        passengerPhone: '+65 9062 9107',
        vehicle: 'Recommended Chauffeur',
        pickup,
        destination: (state.tripMode === 'hourly' ? `${state.hourlyDuration || 4}h disposal` : (state.tripMode === 'daily' ? `${state.dailyDuration || 2} days charter` : dest)),
        dateTime: formattedDate,
        flightNo: flight,
        fare: 'Quotation Pending',
        currency: 'SGD',
        paymentMethod: 'Pay After Service',
        pax,
      }),
    });
    if (res.ok && window.STBAnalytics) {
      STBAnalytics.adminEmailSent();
      STBAnalytics.customerEmailSent();
    }
  } catch (e) {
    console.warn('API submission background error:', e);
  }

  // Attempt to open WhatsApp directly
  try {
    const w = window.open(whatsappUrl, '_blank');
    if (w && window.STBAnalytics) STBAnalytics.whatsappOpened();
  } catch (e) {}

  if (window.STBAnalytics) STBAnalytics.bookingSuccess();

  // Display Minimal Success Overlay (Section 20)
  $('#modal-booking-content').innerHTML = `
    <div class="text-center space-y-4 py-2">
      <div class="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl font-bold">✓</div>
      <div>
        <h3 class="font-display font-medium text-2xl text-stb-charcoal">BOOKING REQUEST RECEIVED</h3>
        <p class="text-xs text-stb-gold-dark font-bold font-mono mt-1">Ref: ${voucherCode}</p>
      </div>

      <p class="text-xs text-stb-muted max-w-xs mx-auto leading-relaxed">
        We've received your transport request. Your booking details have been sent to your email.
      </p>

      <div class="bg-emerald-50 border border-emerald-200/90 rounded-2xl p-3 text-xs text-emerald-800 font-semibold max-w-xs mx-auto text-left">
        <div>✓ No prepayment required</div>
        <div class="text-[0.7rem] text-emerald-700 font-normal mt-0.5">Pay after your trip / service is completed.</div>
      </div>

      <div class="pt-2">
        <a href="${whatsappUrl}" target="_blank" class="w-full py-3.5 px-4 rounded-2xl font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98" style="background: #25D366; box-shadow: 0 8px 24px rgba(37, 211, 102, 0.35);" data-testid="success-whatsapp-btn">
          <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.012 0C5.388 0 0 5.388 0 12.012c0 2.115.547 4.177 1.587 5.992L.057 24l6.197-1.625A11.968 11.968 0 0 0 12.012 24c6.624 0 12.012-5.388 12.012-12.012C24.024 5.388 18.636 0 12.012 0zm0 21.996c-1.805 0-3.571-.479-5.118-1.385l-.367-.218-3.682.965.982-3.59-.239-.38A9.972 9.972 0 0 1 2.016 12.01c0-5.511 4.484-9.995 9.996-9.995 5.511 0 9.995 4.484 9.995 9.995 0 5.512-4.484 9.996-9.995 9.996zm5.485-7.5c-.301-.151-1.782-.88-2.059-.98-.277-.1-.478-.151-.68.151-.201.302-.78.98-.956 1.18-.176.202-.352.227-.654.076-.301-.151-1.272-.469-2.423-1.496-.896-.799-1.501-1.786-1.677-2.088-.176-.302-.019-.465.132-.615.136-.135.301-.352.452-.528.151-.176.201-.302.302-.503.101-.201.05-.378-.025-.529-.075-.151-.68-1.636-.931-2.24-.245-.589-.494-.51-.68-.519l-.58-.007c-.201 0-.527.075-.804.377s-1.055 1.031-1.055 2.515 1.08 2.916 1.231 3.117c.151.201 2.126 3.247 5.15 4.552.719.31 1.281.496 1.719.635.722.23 1.38.197 1.9.12.58-.086 1.782-.729 2.033-1.433.251-.704.251-1.307.176-1.433-.075-.126-.277-.201-.578-.352z"/></svg>
          <span>CONTINUE ON WHATSAPP</span>
        </a>
      </div>
    </div>
  `;
  openModal('modal-booking');
}

// ============================================
// FORM WIRING
// ============================================
function initFormWiring() {
  const paxSel = $('#pax-select');
  const flightC = $('#flight-no-container');
  const pickupInput = $('#pickup-input');
  const destInput = $('#dest-input');

  initBookingTypeSelector();
  initCalendarModal();
  initTimePickerModal();

  $('#btn-clear-pickup')?.addEventListener('click', clearPickup);
  $('#btn-clear-dest')?.addEventListener('click', clearDest);

  $('#btn-geo-pickup')?.addEventListener('click', () => {
    requestCurrentLocation();
  });

  $('#btn-geo-icon')?.addEventListener('click', () => {
    requestCurrentLocation();
  });

  pickupInput?.addEventListener('input', () => {
    updatePickupState(pickupInput.value);
    if (window.STBAnalytics) STBAnalytics.pickupSelected(pickupInput.value);
  });

  destInput?.addEventListener('input', () => {
    updateDestState(destInput.value);
    if (window.STBAnalytics) STBAnalytics.destinationSelected(destInput.value);
  });

  $('#pickup-terminal-select')?.addEventListener('change', (e) => {
    state.pickupTerminal = e.target.value;
    if (window.STBAnalytics) STBAnalytics.airportTerminalSelected(e.target.value);
  });

  $('#drop-terminal-select')?.addEventListener('change', (e) => {
    state.dropTerminal = e.target.value;
    if (window.STBAnalytics) STBAnalytics.airportTerminalSelected(e.target.value);
  });

  $('#btn-toggle-flight')?.addEventListener('click', () => {
    if (flightC) {
      const isHidden = flightC.classList.contains('hidden');
      if (isHidden) {
        flightC.classList.remove('hidden');
        $('#btn-toggle-flight span:first-child').textContent = '- Remove flight number';
      } else {
        flightC.classList.add('hidden');
        $('#btn-toggle-flight span:first-child').textContent = '+ Add flight number';
      }
    }
  });

  paxSel?.addEventListener('change', () => {
    const v = paxSel.value;
    if (window.STBAnalytics) STBAnalytics.pickupSelect(`passengers_${v}`);
  });

  $('#btn-calc-confirm')?.addEventListener('click', () => {
    submitBookingInquiry();
  });
  $('#nav-btn-book')?.addEventListener('click', () => {
    if (window.STBAnalytics) STBAnalytics.ctaClick('book_now', 'nav');
    scrollToWidget();
  });
  $('#cta-book')?.addEventListener('click', () => {
    if (window.STBAnalytics) STBAnalytics.ctaClick('book_now', 'final_cta');
    scrollToWidget();
  });
  $('#cta-whatsapp')?.addEventListener('click', () => {
    if (window.STBAnalytics) STBAnalytics.whatsAppClick('cta');
    submitBookingInquiry();
  });
  $('#mbb-whatsapp-btn')?.addEventListener('click', () => {
    if (window.STBAnalytics) STBAnalytics.whatsAppClick('mobile_bottom_bar');
    submitBookingInquiry();
  });
}

function initDateTime() {
  const dt = $('#datetime-input');
  if (dt) {
    const now = new Date();
    now.setHours(now.getHours() + 3);
    dt.value = now.toISOString().slice(0, 16);
  }
}

function scrollToWidget() {
  $('#booking-widget-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ============================================
// MODALS
// ============================================
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
window.openModal = openModal;
window.closeModal = closeModal;

function initModals() {
  ['modal-vehicle', 'modal-booking', 'modal-whatsapp'].forEach(id => {
    const modal = document.getElementById(id);
    modal?.addEventListener('click', e => {
      if (e.target === modal) closeModal(id);
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      ['modal-vehicle', 'modal-booking', 'modal-whatsapp'].forEach(id => closeModal(id));
    }
  });
}

function openVehicleModal(vid) {
  const v = VEHICLES.find(x => x.id === vid);
  if (!v) return;
  $('#modal-vehicle-content').innerHTML = `
    <div class="relative h-64 sm:h-72 overflow-hidden">
      <img src="${v.image}" alt="${v.fullName}" onerror="this.onerror=null;this.src='${v.fallback}';" class="w-full h-full object-cover" />
      <div class="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
      <span class="fleet-tag ${v.tagStyle === 'gold' ? 'gold' : ''}" style="position: absolute; bottom: 1rem; left: 1rem;">${v.tag}</span>
    </div>
    <div class="p-7">
      <h3 class="font-display font-medium text-3xl text-stb-charcoal mb-2" style="letter-spacing: -0.02em;">${v.fullName}</h3>
      <p class="text-sm text-stb-muted leading-relaxed mb-5">${v.description}</p>
      <div class="grid grid-cols-2 gap-3 mb-5">
        <div class="bg-stb-cream rounded-2xl p-4">
          <div class="text-[0.65rem] font-bold text-stb-muted uppercase tracking-wider mb-1">Max capacity</div>
          <div class="flex items-center gap-2"><span class="material-symbols-outlined text-stb-red">group</span><span class="font-display text-xl font-medium">${v.pax} pax</span></div>
        </div>
        <div class="bg-stb-cream rounded-2xl p-4">
          <div class="text-[0.65rem] font-bold text-stb-muted uppercase tracking-wider mb-1">Luggage</div>
          <div class="flex items-center gap-2"><span class="material-symbols-outlined text-stb-red">luggage</span><span class="font-display text-xl font-medium">${v.luggage} bags</span></div>
        </div>
      </div>
      <h4 class="font-bold text-sm text-stb-charcoal mb-3">Onboard amenities</h4>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-6">
        ${v.features.map(f => `<div class="flex items-center gap-2 bg-stb-cream rounded-xl p-2.5 text-xs"><span class="material-symbols-outlined text-emerald-600 text-sm">verified</span>${f}</div>`).join('')}
      </div>
      <div class="flex items-center justify-between pt-4 border-t border-stone-200">
        <div>
          <div class="text-[0.65rem] font-bold text-stb-muted uppercase tracking-wider">Fixed rate</div>
          <div class="font-display text-3xl text-stb-red font-medium">${formatCurrency(v.baseFareSGD)}</div>
        </div>
        <button id="modal-select-car-btn" class="btn-primary" style="padding: 0.95rem 1.5rem;" data-testid="modal-select-car">Select &amp; Book</button>
      </div>
    </div>
  `;
  $('#modal-select-car-btn')?.addEventListener('click', () => {
    state.selectedVehicleId = v.id;
    renderVehicleChips();
    closeModal('modal-vehicle');
    scrollToWidget();
  });
  openModal('modal-vehicle');
}

// ============================================
// BOOKING CHECKOUT MODAL
// ============================================
// ============================================
// BOOKING CHECKOUT MODAL
// ============================================
function openBookingModal() {
  const pickup = $('#pickup-input').value;
  const dest = $('#dest-input').value;
  const dt = $('#datetime-input').value;
  const flight = $('#flight-input').value;
  const pax = $('#pax-select').value;
  const v = VEHICLES.find(x => x.id === state.selectedVehicleId) || VEHICLES[0];
  const fareSGD = computeFareSGD();

  $('#modal-booking-content').innerHTML = `
    <div class="flex items-center gap-3 mb-5 pb-4 border-b border-stone-200">
      <div class="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
        <span class="material-symbols-outlined text-2xl">send</span>
      </div>
      <div>
        <h3 class="font-display font-medium text-2xl text-stb-charcoal">Submit Transport Inquiry</h3>
        <p class="text-xs text-emerald-700 font-bold">No prepayment required · Pay after trip is completed</p>
      </div>
    </div>

    <div class="bg-stb-cream rounded-2xl p-5 mb-5 space-y-3 text-xs">
      <div class="flex justify-between border-b border-stone-200/60 pb-2"><span class="text-stb-muted font-medium">Vehicle</span><span class="font-bold">${v.fullName}</span></div>
      <div class="flex justify-between border-b border-stone-200/60 pb-2"><span class="text-stb-muted font-medium">Pickup</span><span class="font-bold text-right max-w-[220px] truncate">${pickup}</span></div>
      ${state.tripMode !== 'hourly'
        ? `<div class="flex justify-between border-b border-stone-200/60 pb-2"><span class="text-stb-muted font-medium">Destination</span><span class="font-bold text-right max-w-[220px] truncate">${dest}</span></div>`
        : `<div class="flex justify-between border-b border-stone-200/60 pb-2"><span class="text-stb-muted font-medium">Duration</span><span class="font-bold">${state.hourlyDuration}h disposal</span></div>`
      }
      <div class="flex justify-between border-b border-stone-200/60 pb-2"><span class="text-stb-muted font-medium">Date &amp; time</span><span class="font-bold">${dt || 'Flexible'}</span></div>
      ${flight ? `<div class="flex justify-between border-b border-stone-200/60 pb-2"><span class="text-stb-muted font-medium">Flight</span><span class="font-bold text-stb-red">${flight}</span></div>` : ''}
      <div class="flex justify-between items-center pt-1">
        <span class="font-bold">Estimated fare</span>
        <span class="font-display text-2xl font-medium text-stb-red">${formatCurrency(fareSGD)} <span class="text-xs text-stb-muted">${state.currency}</span></span>
      </div>
    </div>

    <form id="checkout-form" onsubmit="return false;" class="space-y-3">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="field-label">Passenger name</label>
          <input type="text" id="cust-name" required placeholder="Full name" class="field-input" style="padding-left: 1rem;" data-testid="cust-name" />
        </div>
        <div>
          <label class="field-label">WhatsApp / phone</label>
          <input type="tel" id="cust-phone" required placeholder="+65 9123 4567" class="field-input" style="padding-left: 1rem;" data-testid="cust-phone" />
        </div>
      </div>
      <div>
        <label class="field-label">Email</label>
        <input type="email" id="cust-email" required placeholder="name@domain.com" class="field-input" style="padding-left: 1rem;" data-testid="cust-email" />
      </div>
      <div>
        <label class="field-label">Payment option (Pay after service)</label>
        <select id="cust-payment" class="field-select" data-testid="cust-payment">
          <option value="Pay After Service - Cash">Pay after trip · Cash to Chauffeur</option>
          <option value="Pay After Service - PayNow">Pay after trip · PayNow SG</option>
        </select>
      </div>
      <button type="submit" id="btn-submit-booking" class="confirm-btn" data-testid="btn-submit-booking">
        <span class="material-symbols-outlined">send</span>
        Submit Inquiry &amp; Confirm via WhatsApp
      </button>
    </form>
  `;

  $('#checkout-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    if (window.STBAnalytics) STBAnalytics.formSubmit('booking_inquiry', true);
    const name = $('#cust-name').value;
    const phone = $('#cust-phone').value;
    const email = $('#cust-email').value;
    const payment = $('#cust-payment').value;
    const voucherCode = `STB-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const btn = $('#btn-submit-booking');
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span> Sending Inquiry...`;

    let waMsg = `*STB Singapore — Transport Inquiry*\n\n`;
    waMsg += `🎟 *Inquiry Ref:* ${voucherCode}\n`;
    waMsg += `👤 *Passenger:* ${name}\n`;
    waMsg += `📱 *Phone:* ${phone}\n`;
    waMsg += `🚘 *Vehicle:* ${v.fullName}\n`;
    waMsg += `📍 *Pickup:* ${pickup}\n`;
    if (state.tripMode !== 'hourly') waMsg += `🏁 *Destination:* ${dest}\n`;
    else waMsg += `⏱ *Duration:* ${state.hourlyDuration}h disposal\n`;
    waMsg += `📅 *Date & Time:* ${dt || 'Flexible'}\n`;
    if (flight) waMsg += `✈️ *Flight:* ${flight}\n`;
    waMsg += `💰 *Est. Fare:* ${formatCurrency(fareSGD)} (${state.currency})\n`;
    waMsg += `💳 *Payment:* ${payment}\n\n`;
    waMsg += `Please confirm vehicle availability for my inquiry. Thank you!`;

    let whatsappUrl = `https://wa.me/6590629107?text=${encodeURIComponent(waMsg)}`;

    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voucherCode, passengerName: name, passengerEmail: email, passengerPhone: phone,
          vehicle: v.fullName, pickup, destination: state.tripMode !== 'hourly' ? dest : `${state.hourlyDuration}h disposal`,
          dateTime: dt, flightNo: flight, fare: formatCurrency(fareSGD), currency: state.currency, paymentMethod: payment, pax
        }),
      });
      const data = await res.json();
      if (data.whatsappUrl) whatsappUrl = data.whatsappUrl;
    } catch (err) {
      console.warn('Booking POST failed, proceeding to WhatsApp:', err);
    }

    window.open(whatsappUrl, '_blank');

    $('#modal-booking-content').innerHTML = `
      <div class="text-center space-y-4">
        <div class="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-4xl font-bold" style="animation: pulse 1.5s ease-in-out infinite;">✓</div>
        <h3 class="font-display font-medium text-3xl text-stb-charcoal">Inquiry Submitted!</h3>
        <p class="text-sm text-stb-muted max-w-sm mx-auto">Our dispatch team will verify chauffeur availability and confirm your booking shortly.</p>

        <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs font-bold max-w-sm mx-auto flex items-center gap-2 text-left" style="color: #047857;">
          <span class="material-symbols-outlined text-lg">mark_email_read</span>
          <div>
            <div>Inquiry copy sent to <strong>${email}</strong></div>
            <div class="text-[0.65rem] mt-0.5">Admin notification · bala@tensketch.com</div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-stb-red-soft to-stb-gold-soft p-5 rounded-3xl border-2 border-dashed border-stb-red max-w-sm mx-auto text-left">
          <div class="flex justify-between items-center mb-3 pb-3 border-b border-stb-red/20">
            <span class="font-black text-xs text-stb-red tracking-widest">INQUIRY REF</span>
            <span class="font-mono text-xs bg-stb-red text-white px-2 py-1 rounded-md font-bold">${voucherCode}</span>
          </div>
          <div class="space-y-1.5 text-xs">
            <div><span class="text-stb-muted">Passenger:</span> <strong>${name}</strong></div>
            <div><span class="text-stb-muted">Vehicle:</span> <strong>${v.fullName}</strong></div>
            <div><span class="text-stb-muted">Est. Fare:</span> <strong class="text-stb-red">${formatCurrency(fareSGD)}</strong></div>
            <div><span class="text-stb-muted">Payment:</span> <strong>No prepayment required</strong></div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-2 pt-2">
          <button id="btn-copy-pass" class="btn-ghost flex-1" data-testid="copy-voucher-btn">
            <span class="material-symbols-outlined text-base">content_copy</span>
            Copy Ref Code
          </button>
          <a href="${whatsappUrl}" target="_blank" class="btn-primary flex-1 flex items-center justify-center gap-2" style="background: #25D366; box-shadow: 0 6px 16px rgba(37, 211, 102, 0.35);" data-testid="voucher-whatsapp-btn">
            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M12.012 0C5.388 0 0 5.388 0 12.012c0 2.115.547 4.177 1.587 5.992L.057 24l6.197-1.625A11.968 11.968 0 0 0 12.012 24c6.624 0 12.012-5.388 12.012-12.012C24.024 5.388 18.636 0 12.012 0zm0 21.996c-1.805 0-3.571-.479-5.118-1.385l-.367-.218-3.682.965.982-3.59-.239-.38A9.972 9.972 0 0 1 2.016 12.01c0-5.511 4.484-9.995 9.996-9.995 5.511 0 9.995 4.484 9.995 9.995 0 5.512-4.484 9.996-9.995 9.996zm5.485-7.5c-.301-.151-1.782-.88-2.059-.98-.277-.1-.478-.151-.68.151-.201.302-.78.98-.956 1.18-.176.202-.352.227-.654.076-.301-.151-1.272-.469-2.423-1.496-.896-.799-1.501-1.786-1.677-2.088-.176-.302-.019-.465.132-.615.136-.135.301-.352.452-.528.151-.176.201-.302.302-.503.101-.201.05-.378-.025-.529-.075-.151-.68-1.636-.931-2.24-.245-.589-.494-.51-.68-.519l-.58-.007c-.201 0-.527.075-.804.377s-1.055 1.031-1.055 2.515 1.08 2.916 1.231 3.117c.151.201 2.126 3.247 5.15 4.552.719.31 1.281.496 1.719.635.722.23 1.38.197 1.9.12.58-.086 1.782-.729 2.033-1.433.251-.704.251-1.307.176-1.433-.075-.126-.277-.201-.578-.352z"/></svg>
            WhatsApp Confirmation
          </a>
        </div>
      </div>
    `;

    $('#btn-copy-pass')?.addEventListener('click', () => {
      navigator.clipboard.writeText(voucherCode);
      const b = $('#btn-copy-pass');
      const orig = b.innerHTML;
      b.innerHTML = `<span class="material-symbols-outlined text-base">check</span> Copied!`;
      setTimeout(() => { b.innerHTML = orig; }, 1500);
    });
  });

  openModal('modal-booking');
}

// ============================================
// WHATSAPP MODAL
// ============================================
function openWhatsAppModal() {
  const pickup = $('#pickup-input').value;
  const dest = $('#dest-input').value;
  const dt = $('#datetime-input').value;
  const flight = $('#flight-input').value;
  const pax = $('#pax-select').value;
  const v = VEHICLES.find(x => x.id === state.selectedVehicleId) || VEHICLES[0];
  const fareSGD = computeFareSGD();

  const box = $('#wa-preview-box');
  const notesInput = $('#wa-custom-notes');
  const link = $('#wa-final-link');

  const build = (notes) => {
    let m = `*STB Singapore — Transport Inquiry*\n\n`;
    m += `🚘 *Vehicle:* ${v.fullName}\n`;
    m += `📍 *Pickup:* ${pickup}\n`;
    if (state.tripMode !== 'hourly') m += `🏁 *Destination:* ${dest}\n`;
    else m += `⏱ *Duration:* ${state.hourlyDuration}h disposal\n`;
    m += `📅 *Date:* ${dt || 'Flexible'}\n`;
    m += `👥 *Pax:* ${pax}\n`;
    if (flight) m += `✈️ *Flight:* ${flight}\n`;
    m += `💰 *Est. Fare:* ${formatCurrency(fareSGD)} (${state.currency})\n`;
    m += `💳 *Payment:* No prepayment required (Pay after trip)\n`;
    if (notes) m += `📝 *Notes:* ${notes}\n`;
    m += `\nPlease confirm availability for my transport inquiry. Thank you!`;
    return m;
  };

  const update = () => {
    const raw = build(notesInput?.value || '');
    if (box) box.textContent = raw;
    if (link) link.href = `https://wa.me/6590629107?text=${encodeURIComponent(raw)}`;
  };

  notesInput?.addEventListener('input', update);
  update();
  openModal('modal-whatsapp');
}

// ============================================
// STICKY MOBILE WHATSAPP SCROLL OBSERVER
// ============================================
function initStickyWhatsAppScroll() {
  const stickyBar = $('#mobile-sticky-whatsapp');
  const heroWidget = $('#booking-widget-container');
  if (!stickyBar || !heroWidget) return;

  if (typeof IntersectionObserver !== 'undefined') {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        stickyBar.classList.add('translate-y-full', 'opacity-0');
        stickyBar.classList.remove('translate-y-0', 'opacity-100');
      } else {
        stickyBar.classList.remove('translate-y-full', 'opacity-0');
        stickyBar.classList.add('translate-y-0', 'opacity-100');
      }
    }, { threshold: 0.1 });
    observer.observe(heroWidget);
  }
}

// ============================================
// REVEAL ANIMATION
// ============================================
function initReveal() {
  const els = document.querySelectorAll('.reveal:not(.in)');
  if (!('IntersectionObserver' in window)) {
    els.forEach(e => e.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px 100px 0px' });
  els.forEach(el => io.observe(el));
}
