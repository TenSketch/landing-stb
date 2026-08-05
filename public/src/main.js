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
  faqCategory: 'all',
  fleetCategory: 'all',
  selectedStars: 5,
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
  'Raffles Hotel Singapore': { lat: 1.2947, lng: 103.8543 },
  'Clarke Quay River Cruise': { lat: 1.2894, lng: 103.8465 },
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
  { id: 'airport_arrival', title: 'Changi Arrival', icon: 'flight_land', tag: 'Most Popular', priceSGD: 65, desc: '60-min free waiting, live flight tracking, and personalized name-board greeting inside arrival hall.' },
  { id: 'airport_departure', title: 'Changi Departure', icon: 'flight_takeoff', tag: null, priceSGD: 60, desc: 'Punctual pickup from hotel or residence direct to Terminals 1, 2, 3, 4, or Jewel drop-off curb.' },
  { id: 'jb_malaysia', title: 'Malaysia Transfer', icon: 'directions_car', tag: 'Cross-Border', priceSGD: 180, desc: 'Seamless transfers to Johor Bahru, Legoland, Desaru Coast, Melaka, and Kuala Lumpur — stay in-vehicle at customs.' },
  { id: 'hourly_disposal', title: 'Hourly Chauffeur', icon: 'schedule', tag: 'Flexible', priceSGD: 65, desc: 'Dedicated luxury vehicle at your disposal for city sightseeing, roadshows, weddings, and photography tours.' },
];

const FAQS = [
  { id: 'faq-1', category: 'pricing', question: 'Are ERP tolls and pickup charges included?', answer: 'Yes! All quotes are 100% all-inclusive. This covers ERP gantry tolls, peak hour surcharges, airport pickup fees, fuel, and driver gratuity. No hidden charges — the price you see is the price you pay.' },
  { id: 'faq-2', category: 'airport', question: 'What if my Changi flight is delayed?', answer: 'We track all incoming flights in real time. If your flight is delayed or lands early, your chauffeur automatically adjusts arrival. We include 60 minutes of complimentary waiting time from actual touchdown.' },
  { id: 'faq-3', category: 'booking', question: 'Can I book cross-border transfers to Malaysia?', answer: 'Absolutely — this is our specialty. We handle seamless transfers to Johor Bahru, Legoland Malaysia, Desaru Coast, Melaka, and Kuala Lumpur. You remain comfortably inside the vehicle during customs clearance.' },
  { id: 'faq-4', category: 'vehicles', question: 'Are child safety seats available?', answer: 'Yes — booster and baby car seats are available on request for a nominal SGD 10 fee to ensure compliance with Singapore LTA road safety guidelines.' },
  { id: 'faq-5', category: 'pricing', question: 'What payment methods do you accept?', answer: 'Major international credit/debit cards (Visa, MasterCard, Amex), PayNow SG bank transfer, or direct cash to the driver. All payments are 100% secure.' },
  { id: 'faq-6', category: 'booking', question: 'How far in advance should I book?', answer: 'We accept instant bookings up to 1 hour before pickup. However, we recommend reserving at least 24 hours in advance during peak holiday seasons (CNY, Christmas, F1) to guarantee vehicle availability.' },
  { id: 'faq-7', category: 'airport', question: 'Where does my chauffeur meet me at Changi?', answer: 'Your chauffeur will be waiting inside the arrival hall with a personalized name board — no need to search. For premium bookings, we offer curb-side meet-and-greet direct from the aerobridge.' },
  { id: 'faq-8', category: 'vehicles', question: 'Can I request a specific vehicle model?', answer: 'Yes. When booking, select your preferred vehicle from our fleet. All vehicles are under 3 years old, professionally detailed, dashcam-equipped, and fully insured.' },
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
  initDateTime();
  initReveal();
  initMobileBottomBar();
  updateAll();
  renderRouteSummary();
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

  updateMapMarkers('Changi Airport Terminal 1', 'Marina Bay Sands Hotel Tower 1');
}

function updateMapMarkers(pickupName, destName) {
  if (!mapInstance || typeof L === 'undefined') return;

  const p = LOCATION_COORDS[pickupName] || { lat: 1.3644, lng: 103.9915 };
  const d = LOCATION_COORDS[destName] || { lat: 1.2834, lng: 103.8607 };

  if (pickupMarker) mapInstance.removeLayer(pickupMarker);
  if (destMarker) mapInstance.removeLayer(destMarker);
  if (routePolyline) mapInstance.removeLayer(routePolyline);

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

  pickupMarker = L.marker([p.lat, p.lng], { icon: iconA }).addTo(mapInstance).bindPopup(`<b>Pickup:</b> ${pickupName}`);
  destMarker = L.marker([d.lat, d.lng], { icon: iconB }).addTo(mapInstance).bindPopup(`<b>Destination:</b> ${destName}`);

  routePolyline = L.polyline([[p.lat, p.lng], [d.lat, d.lng]], {
    color: '#E31E24', weight: 4, opacity: 0.8, dashArray: '10, 10',
  }).addTo(mapInstance);

  mapInstance.fitBounds(L.latLngBounds([[p.lat, p.lng], [d.lat, d.lng]]), { padding: [50, 50] });
}

// ============================================
// TRIP MODE
// ============================================
function initTripMode() {
  const tabs = $$('.trip-tab');
  const destC = $('#dest-address-container');
  const hourlyC = $('#hourly-duration-container');

  tabs.forEach(btn => {
    btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.tripMode = btn.dataset.mode;

      if (state.tripMode === 'hourly') {
        destC.classList.add('hidden');
        hourlyC.classList.remove('hidden');
      } else {
        destC.classList.remove('hidden');
        hourlyC.classList.add('hidden');
      }
      renderVehicleChips();
      renderRouteSummary();
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
      const s = btn.dataset.service || 'airport_arrival';
      state.selectedService = s;
      const sel = $('#service-select');
      if (sel) sel.value = s;
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
  const list = cat === 'all' ? VEHICLES : VEHICLES.filter(v => v.category === cat);

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

  container.querySelectorAll('.btn-fleet-detail').forEach(b => b.addEventListener('click', () => openVehicleModal(b.dataset.id)));
  container.querySelectorAll('.btn-fleet-select').forEach(b => b.addEventListener('click', () => {
    state.selectedVehicleId = b.dataset.id;
    renderVehicleChips();
    scrollToWidget();
  }));

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
      if (!open) item.classList.add('open');
    });
  });
}

// ============================================
// REVIEWS
// ============================================
function initReviews() {
  renderReviews();

  $$('.star-btn').forEach(sb => {
    sb.addEventListener('click', () => {
      const n = parseInt(sb.dataset.star || '5', 10);
      state.selectedStars = n;
      $$('.star-btn').forEach((btn, i) => {
        btn.style.color = i < n ? 'var(--stb-gold-dark)' : '#D1D5DB';
      });
    });
  });

  $('#btn-open-review-modal')?.addEventListener('click', () => openModal('modal-review'));

  $('#add-review-form')?.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#rev-name').value;
    const role = $('#rev-role').value || 'Tourist';
    const country = $('#rev-country').value || 'International';
    const comment = $('#rev-comment').value;
    REVIEWS.unshift({ id: 'rev-' + Date.now(), name, role, country, stars: state.selectedStars, date: 'Just now', comment });
    renderReviews();
    closeModal('modal-review');
  });
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
// PRESETS (autocomplete)
// ============================================
function initPresets() {
  const pickup = $('#pickup-input');
  const dest = $('#dest-input');
  const pPresets = $('#pickup-presets');
  const dPresets = $('#dest-presets');
  const list = Object.keys(LOCATION_COORDS);

  const render = (container, input) => {
    if (!container) return;
    container.innerHTML = list.map(loc => `
      <div class="preset-item">
        <span>${loc}</span>
        <span class="material-symbols-outlined text-sm">north_east</span>
      </div>
    `).join('');
    container.querySelectorAll('.preset-item').forEach(item => {
      item.addEventListener('click', () => {
        input.value = item.querySelector('span').textContent;
        container.classList.add('hidden');
        updateMapMarkers(pickup.value, dest.value);
        renderVehicleChips();
        renderRouteSummary();
      });
    });
  };

  render(pPresets, pickup);
  render(dPresets, dest);

  pickup?.addEventListener('focus', () => pPresets?.classList.remove('hidden'));
  dest?.addEventListener('focus', () => dPresets?.classList.remove('hidden'));
  pickup?.addEventListener('input', () => { renderVehicleChips(); renderRouteSummary(); });
  dest?.addEventListener('input', () => { renderVehicleChips(); renderRouteSummary(); });

  document.addEventListener('click', e => {
    if (!pickup?.contains(e.target) && !pPresets?.contains(e.target)) pPresets?.classList.add('hidden');
    if (!dest?.contains(e.target) && !dPresets?.contains(e.target)) dPresets?.classList.add('hidden');
  });

  $$('.dest-card').forEach(card => {
    card.addEventListener('click', () => {
      const loc = card.dataset.location;
      if (dest && loc) {
        dest.value = loc;
        updateMapMarkers(pickup.value, loc);
        renderVehicleChips();
        renderRouteSummary();
        scrollToWidget();
      }
    });
  });
}

// ============================================
// FORM WIRING
// ============================================
function initFormWiring() {
  const serviceSel = $('#service-select');
  const paxSel = $('#pax-select');
  const flightC = $('#flight-no-container');

  serviceSel?.addEventListener('change', () => {
    state.selectedService = serviceSel.value;
    if (state.selectedService.includes('airport')) flightC?.classList.remove('hidden');
    else flightC?.classList.add('hidden');
  });

  paxSel?.addEventListener('change', () => {
    const v = paxSel.value;
    if (v.includes('8-13')) state.selectedVehicleId = 'hiace';
    else if (v.includes('4-7')) state.selectedVehicleId = 'alphard';
    else if (v.includes('Large Group')) state.selectedVehicleId = 'bus';
    renderVehicleChips();
  });

  $('#btn-calc-confirm')?.addEventListener('click', openBookingModal);
  $('#nav-btn-book')?.addEventListener('click', scrollToWidget);
  $('#cta-book')?.addEventListener('click', scrollToWidget);
  $('#cta-whatsapp')?.addEventListener('click', openWhatsAppModal);
  $('#mbb-book-btn')?.addEventListener('click', scrollToWidget);
  $('#mbb-whatsapp-btn')?.addEventListener('click', openWhatsAppModal);
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
  ['modal-vehicle', 'modal-booking', 'modal-whatsapp', 'modal-review'].forEach(id => {
    const modal = document.getElementById(id);
    modal?.addEventListener('click', e => {
      if (e.target === modal) closeModal(id);
    });
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      ['modal-vehicle', 'modal-booking', 'modal-whatsapp', 'modal-review'].forEach(id => closeModal(id));
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
      <div class="w-12 h-12 rounded-2xl bg-stb-red-soft text-stb-red flex items-center justify-center">
        <span class="material-symbols-outlined text-2xl">confirmation_number</span>
      </div>
      <div>
        <h3 class="font-display font-medium text-2xl text-stb-charcoal">Confirm reservation</h3>
        <p class="text-xs text-stb-muted">Review itinerary and secure driver assignment</p>
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
        <span class="font-bold">Guaranteed fare</span>
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
        <label class="field-label">Payment method</label>
        <select id="cust-payment" class="field-select" data-testid="cust-payment">
          <option value="Cash to Driver">Cash to chauffeur</option>
          <option value="PayNow SG">PayNow SG · 0% fee</option>
          <option value="Credit Card">Credit / debit card</option>
        </select>
      </div>
      <button type="submit" id="btn-submit-booking" class="confirm-btn" data-testid="btn-submit-booking">
        <span class="material-symbols-outlined">verified</span>
        Confirm booking
      </button>
    </form>
  `;

  $('#checkout-form')?.addEventListener('submit', async e => {
    e.preventDefault();
    const name = $('#cust-name').value;
    const phone = $('#cust-phone').value;
    const email = $('#cust-email').value;
    const payment = $('#cust-payment').value;
    const voucherCode = `STB-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    const btn = $('#btn-submit-booking');
    btn.disabled = true;
    btn.innerHTML = `<span class="material-symbols-outlined animate-spin">sync</span> Processing...`;

    let whatsappUrl = `https://api.whatsapp.com/send?phone=6591234567&text=${encodeURIComponent('Booking ' + voucherCode + ' for ' + name)}`;

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
        <h3 class="font-display font-medium text-3xl text-stb-charcoal">Reservation confirmed!</h3>

        <div class="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs font-bold max-w-sm mx-auto flex items-center gap-2 text-left" style="color: #047857;">
          <span class="material-symbols-outlined text-lg">mark_email_read</span>
          <div>
            <div>Confirmation sent to <strong>${email}</strong></div>
            <div class="text-[0.65rem] mt-0.5">Admin copy · dispatch@stbsingapore.com</div>
          </div>
        </div>

        <div class="bg-gradient-to-br from-stb-red-soft to-stb-gold-soft p-5 rounded-3xl border-2 border-dashed border-stb-red max-w-sm mx-auto text-left">
          <div class="flex justify-between items-center mb-3 pb-3 border-b border-stb-red/20">
            <span class="font-black text-xs text-stb-red tracking-widest">STB VIP PASS</span>
            <span class="font-mono text-xs bg-stb-red text-white px-2 py-1 rounded-md font-bold">${voucherCode}</span>
          </div>
          <div class="space-y-1.5 text-xs">
            <div><span class="text-stb-muted">Passenger:</span> <strong>${name}</strong></div>
            <div><span class="text-stb-muted">Vehicle:</span> <strong>${v.fullName}</strong></div>
            <div><span class="text-stb-muted">Fare:</span> <strong class="text-stb-red">${formatCurrency(fareSGD)}</strong></div>
            <div><span class="text-stb-muted">Payment:</span> <strong>${payment}</strong></div>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row gap-2 pt-2">
          <button id="btn-copy-pass" class="btn-ghost flex-1" data-testid="copy-voucher-btn">
            <span class="material-symbols-outlined text-base">content_copy</span>
            Copy voucher
          </button>
          <a href="${whatsappUrl}" target="_blank" class="btn-primary flex-1" style="background: #25D366; box-shadow: 0 6px 16px rgba(37, 211, 102, 0.35);" data-testid="voucher-whatsapp-btn">
            <span class="material-symbols-outlined text-base">chat</span>
            WhatsApp confirm
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
    let m = `*STB Singapore — VIP Chauffeur Booking*\n\n`;
    m += `🚘 *Vehicle:* ${v.fullName}\n`;
    m += `📍 *Pickup:* ${pickup}\n`;
    if (state.tripMode !== 'hourly') m += `🏁 *Destination:* ${dest}\n`;
    else m += `⏱ *Duration:* ${state.hourlyDuration}h disposal\n`;
    m += `📅 *Date:* ${dt || 'Flexible'}\n`;
    m += `👥 *Pax:* ${pax}\n`;
    if (flight) m += `✈️ *Flight:* ${flight}\n`;
    m += `💰 *Fare:* ${formatCurrency(fareSGD)} (${state.currency})\n`;
    if (notes) m += `📝 *Notes:* ${notes}\n`;
    m += `\nPlease confirm availability and driver. Thank you!`;
    return m;
  };

  const update = () => {
    const raw = build(notesInput?.value || '');
    if (box) box.textContent = raw;
    if (link) link.href = `https://wa.me/6591234567?text=${encodeURIComponent(raw)}`;
  };

  notesInput?.addEventListener('input', update);
  update();
  openModal('modal-whatsapp');
}

// ============================================
// MOBILE BOTTOM BAR
// ============================================
function initMobileBottomBar() {
  const items = $$('.mbb-item[href]');
  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
    });
  });
  // Set Home as default
  items[0]?.classList.add('active');
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
