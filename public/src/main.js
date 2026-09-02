// STB Singapore — Production JavaScript App
// Advance Transport Booking & Inquiry Platform

// ============================================
// STATE
// ============================================
const state = {
  language: 'en',
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
  // Location & Place State (Initially completely empty)
  pickupText: '',
  pickupPlaceId: null,
  pickupCoords: null,
  pickupTerminal: null,
  pickupFormattedAddress: null,
  destText: '',
  destPlaceId: null,
  destCoords: null,
  dropTerminal: null,
  destFormattedAddress: null,
  travelDate: null,
  travelTime: null,
  // Google Maps State
  googleMapsLoaded: false,
  googleMap: null,
  googlePickupMarker: null,
  googleDestMarker: null,
  googleRoutePolyline: null,
  // Simple vehicle & pricing state
  selectedSimpleVehicle: '4-Seater',
  calculatedFares: null,
  distanceKm: null,
  isFareEstimating: false,
};

// Quick DOM helpers
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ============================================
// CONSTANTS & DICTIONARIES
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

const DEFAULT_SINGAPORE_LOCATIONS = {
  'Changi Airport Terminal 1': { lat: 1.3644, lng: 103.9915 },
  'Changi Airport Terminal 2': { lat: 1.3575, lng: 103.9886 },
  'Changi Airport Terminal 3': { lat: 1.3556, lng: 103.9864 },
  'Changi Airport Terminal 4': { lat: 1.3397, lng: 103.9832 },
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
};

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
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=1200&q=80',
    fallback: 'https://images.unsplash.com/photo-1631295868223-63265b40d9e4?auto=format&fit=crop&w=1200&q=80',
    description: 'Futuristic wide-cabin MPV with panoramic windows, generous legroom, and effortless electric sliding doors.',
    features: ['Panoramic Windows', 'Electronic Sliding Doors', 'Fold-Flat Third Row', 'USB Fast Charging Ports', 'Dual Air Conditioning'],
  },
  {
    id: 'coach45',
    name: '45-Seater Luxury Coach',
    fullName: 'Scania / Mercedes 45-Seater Tour Coach',
    category: 'coach',
    tag: 'Corporate & Tour',
    pax: 45,
    luggage: 40,
    baseFareSGD: 120,
    perKmSGD: 5.0,
    minFareSGD: 180,
    hourlySGD: 140,
    image: 'https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=1200&q=80',
    fallback: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
    description: 'Full-size tour coach with air suspension, reclining plush seats, individual reading lamps, and huge undercarriage luggage bays.',
    features: ['Air Suspension Ride', 'Overhead PA System & Mic', 'Reclining Tour Seats', 'Huge Luggage Bays', 'Tour Guide Seat'],
  },
];

let SERVICES = [];

const REVIEWS = [
  {
    name: 'Marcus & Sarah Vance',
    country: 'Melbourne, Australia',
    role: 'Family Vacation',
    date: 'August 2026',
    stars: 5,
    comment: 'Our Alphard was pristine and waiting at Terminal 3 even though our Singapore Airlines flight was delayed by 45 minutes. Driver greeted us with a smile and cold water. Booking inquiry was confirmed via WhatsApp in minutes.',
  },
  {
    name: 'David Chen',
    country: 'Hong Kong SAR',
    role: 'Managing Director, Horizon VC',
    date: 'July 2026',
    stars: 5,
    comment: 'Booked the Mercedes S-Class for full-day corporate meetings at Marina Bay Financial Centre. Extremely punctual chauffeur, zero prepayment hassle, paid smoothly after service.',
  },
  {
    name: 'Elena Rostova',
    country: 'London, UK',
    role: 'Couple Holiday',
    date: 'August 2026',
    stars: 5,
    comment: 'Outstanding transfer service from Changi Airport to Sentosa. The WhatsApp communication was fast and responsive. No hidden surcharges whatsoever.',
  },
  {
    name: 'Rajesh & Priya Patel',
    country: 'Mumbai, India',
    role: 'Family Group (8 Pax)',
    date: 'July 2026',
    stars: 5,
    comment: 'We booked the Toyota HiAce for 8 adults with lots of luggage. The vehicle was spotless and spacious. Will definitely book again on our next trip to Singapore.',
  },
];

const FAQS = [
  {
    cat: 'booking',
    question: 'How do advance transport inquiries work?',
    answer: 'Simply enter your pickup location, destination, travel date, time, passenger count, and your WhatsApp contact. Our Singapore dispatch team checks vehicle allocation and confirms availability directly with you via WhatsApp.',
  },
  {
    cat: 'pricing',
    question: 'Do I need to make any payment in advance?',
    answer: 'No prepayment is required. You submit your booking inquiry first with zero advance charge. Payment takes place after your trip is completed directly in cash to the driver or via PayNow SG.',
  },
  {
    cat: 'booking',
    question: 'What is the minimum advance booking time?',
    answer: 'All bookings must be made at least 24 hours in advance of the pickup time. Please note that we operate on a strict advance-booking-only basis and do not support urgent or immediate/on-demand bookings.',
  },
  {
    cat: 'airport',
    question: 'What if my flight into Changi Airport is delayed?',
    answer: 'We monitor live flight arrival times in real time. Your assigned chauffeur automatically tracks the flight and provides 60 minutes of complimentary waiting time from actual touchdown.',
  },
  {
    cat: 'pricing',
    question: 'Are ERP tolls and parking fees included in the quote?',
    answer: 'No, ERP road tolls and parking charges are excluded and will be billed separately based on actual travel usage.',
  },
  {
    cat: 'vehicles',
    question: 'Are child safety seats available upon request?',
    answer: 'Yes! We provide certified baby/child safety seats upon request. Simply mention your child seat requirement in the optional notes or over WhatsApp.',
  },
  {
    cat: 'airport',
    question: 'Where will the chauffeur meet me at Changi Airport?',
    answer: 'For arrival pickups, your chauffeur will wait inside the arrival hall just after the baggage claim exit holding a professional STB name board with your name.',
  },
];

// Currency formatting
function formatCurrency(amountSGD) {
  const converted = (amountSGD || 0) * state.exchangeRate;
  if (state.currency === 'JPY' || state.currency === 'INR') {
    return `${state.currencySymbol}${Math.round(converted).toLocaleString()}`;
  }
  return `${state.currencySymbol}${Math.round(converted)}`;
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initNavScroll();
  initMobileMenu();
  initLanguageAndCurrency();
  initGoogleMapsAndPlaces();
  initFormControls();
  initDateAndTimePickers();
  initFleetSection();
  initServiceGrid();
  initDestinations();
  initFAQSection();
  initReviewsSection();
  initModals();
  initStickyWhatsAppScroll();
  initReveal();
  initErrorHandling();
});

// ============================================
// NAVIGATION & HEADER
// ============================================
function initNavScroll() {
  const nav = $('#stb-nav');
  if (!nav) return;
  const onScroll = () => {
    if (window.scrollY > 20) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initMobileMenu() {
  const toggle = $('#mobile-menu-toggle');
  const menu = $('#mobile-menu');
  const icon = $('#menu-icon');

  toggle?.addEventListener('click', () => {
    const isHidden = menu.classList.contains('hidden');
    if (isHidden) {
      menu.classList.remove('hidden');
      if (icon) icon.textContent = 'close';
    } else {
      menu.classList.add('hidden');
      if (icon) icon.textContent = 'menu';
    }
  });

  $$('.mobile-nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      menu?.classList.add('hidden');
      if (icon) icon.textContent = 'menu';
    });
  });
}

function initLanguageAndCurrency() {
  const langDesk = $('#lang-select');
  const langMob = $('#mobile-lang-select');
  const currDesk = $('#currency-select');
  const currMob = $('#mobile-currency-select');

  const applyLang = (l) => {
    state.language = l;
    if (langDesk) langDesk.value = l;
    if (langMob) langMob.value = l;
  };

  langDesk?.addEventListener('change', (e) => applyLang(e.target.value));
  langMob?.addEventListener('change', (e) => applyLang(e.target.value));

  const applyCurrency = (c) => {
    if (!CURRENCY_MAP[c]) return;
    state.currency = c;
    state.currencySymbol = CURRENCY_MAP[c].symbol;
    state.exchangeRate = CURRENCY_MAP[c].rate;
    if (currDesk) currDesk.value = c;
    if (currMob) currMob.value = c;
    if (window.STBAnalytics) STBAnalytics.currencyChange(c);
    renderServiceGrid();
    renderFleetCards(state.fleetCategory);
  };

  currDesk?.addEventListener('change', (e) => applyCurrency(e.target.value));
  currMob?.addEventListener('change', (e) => applyCurrency(e.target.value));
}

// ============================================
// GOOGLE MAPS & PLACES AUTOCOMPLETE
// ============================================
async function initGoogleMapsAndPlaces() {
  let apiKey = '';
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      apiKey = data.googleMapsApiKey || '';
    }
  } catch (e) {
    console.warn('[CONFIG] Failed to load config:', e);
  }

  // Always initialize local presets fallback to show presets when inputs are focused/empty
  setupLocalPresetsFallback();

  if (apiKey) {
    loadGoogleMapsScript(apiKey, () => {
      setupGooglePlacesAutocomplete();
    });
  } else {
    console.log('[PLACES] Google Maps API key not yet configured. Local landmark search enabled.');
  }
}

function loadGoogleMapsScript(apiKey, callback) {
  if (window.google && window.google.maps) {
    state.googleMapsLoaded = true;
    callback();
    return;
  }
  // Use a global callback for loading=async reliability
  window.__onGoogleMapsLoaded = () => {
    state.googleMapsLoaded = true;
    callback();
  };
  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&loading=async&callback=__onGoogleMapsLoaded`;
  script.async = true;
  script.onerror = () => {
    console.warn('[GOOGLE MAPS] Script failed to load. Falling back to local landmarks.');
    setupLocalPresetsFallback();
  };
  document.head.appendChild(script);
}

function setupGooglePlacesAutocomplete() {
  const pickupInput = $('#pickup-input');
  const destInput = $('#dest-input');

  if (!window.google || !window.google.maps || !window.google.maps.places) {
    setupLocalPresetsFallback();
    return;
  }

  const options = {
    componentRestrictions: { country: 'sg' },
    fields: ['place_id', 'formatted_address', 'name', 'geometry'],
  };

  if (pickupInput) {
    const pickupAutocomplete = new google.maps.places.Autocomplete(pickupInput, options);
    
    pickupAutocomplete.addListener('place_changed', () => {
      const place = pickupAutocomplete.getPlace();
      if (!place || !place.geometry) {
        updatePickupState(pickupInput.value, null, null, null);
        return;
      }
      
      const name = place.name || place.formatted_address;
      const coords = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
      pickupInput.value = name;
      updatePickupState(name, place.place_id, coords, place.formatted_address);
    });
  }

  if (destInput) {
    const destAutocomplete = new google.maps.places.Autocomplete(destInput, options);

    destAutocomplete.addListener('place_changed', () => {
      const place = destAutocomplete.getPlace();
      if (!place || !place.geometry) {
        updateDestState(destInput.value, null, null, null);
        return;
      }
      
      const name = place.name || place.formatted_address;
      const coords = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
      destInput.value = name;
      updateDestState(name, place.place_id, coords, place.formatted_address);
    });
  }
}

function setupLocalPresetsFallback() {
  const pickup = $('#pickup-input');
  const dest = $('#dest-input');
  const pPresets = $('#pickup-presets');
  const dPresets = $('#dest-presets');

  const renderDropdown = (container, input, isPickup) => {
    if (!container || !input) return;
    const query = (input.value || '').trim().toLowerCase();
    const list = Object.keys(DEFAULT_SINGAPORE_LOCATIONS);
    const filtered = query
      ? list.filter((loc) => loc.toLowerCase().includes(query))
      : list.slice(0, 7);

    if (!filtered.length) {
      container.classList.add('hidden');
      return;
    }

    container.innerHTML = filtered.map((loc) => `
      <div class="preset-item cursor-pointer hover:bg-stone-100 p-2.5 rounded-lg flex items-center justify-between text-xs font-semibold" data-loc="${loc}">
        <span class="text-stb-charcoal">${loc}</span>
        <span class="material-symbols-outlined text-sm text-stone-400">north_east</span>
      </div>
    `).join('');

    container.classList.remove('hidden');

    container.querySelectorAll('.preset-item[data-loc]').forEach((item) => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const loc = item.dataset.loc;
        input.value = loc;
        container.classList.add('hidden');
        if (isPickup) {
          updatePickupState(loc, null, DEFAULT_SINGAPORE_LOCATIONS[loc]);
        } else {
          updateDestState(loc, null, DEFAULT_SINGAPORE_LOCATIONS[loc]);
        }
      });
    });
  };

  pickup?.addEventListener('input', () => {
    if (state.googleMapsLoaded) {
      pPresets?.classList.add('hidden');
    } else {
      renderDropdown(pPresets, pickup, true);
    }
    updatePickupState(pickup.value, null, null);
  });
  pickup?.addEventListener('focus', () => {
    if (!pickup.value) renderDropdown(pPresets, pickup, true);
  });
  pickup?.addEventListener('blur', () => {
    setTimeout(() => pPresets?.classList.add('hidden'), 200);
  });

  dest?.addEventListener('input', () => {
    if (state.googleMapsLoaded) {
      dPresets?.classList.add('hidden');
    } else {
      renderDropdown(dPresets, dest, false);
    }
    updateDestState(dest.value, null, null);
  });
  dest?.addEventListener('focus', () => {
    if (!dest.value) renderDropdown(dPresets, dest, false);
  });
  dest?.addEventListener('blur', () => {
    setTimeout(() => dPresets?.classList.add('hidden'), 200);
  });
}

function updatePickupState(text, placeId, coords, formattedAddress) {
  state.pickupText = (text || '').trim();
  state.pickupPlaceId = placeId || null;
  state.pickupCoords = coords || (DEFAULT_SINGAPORE_LOCATIONS[state.pickupText] || null);
  state.pickupFormattedAddress = formattedAddress || null;

  const clearBtn = $('#btn-clear-pickup');
  if (clearBtn) {
    if (state.pickupText) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }

  checkAirportConditionalSelector();
  updateGoogleMapPreview();
  triggerFareEstimation();
}

function updateDestState(text, placeId, coords, formattedAddress) {
  state.destText = (text || '').trim();
  state.destPlaceId = placeId || null;
  state.destCoords = coords || (DEFAULT_SINGAPORE_LOCATIONS[state.destText] || null);
  state.destFormattedAddress = formattedAddress || null;

  const clearBtn = $('#btn-clear-dest');
  if (clearBtn) {
    if (state.destText) clearBtn.classList.remove('hidden');
    else clearBtn.classList.add('hidden');
  }

  checkAirportConditionalSelector();
  updateGoogleMapPreview();
  triggerFareEstimation();
}

function clearPickupField() {
  const pickup = $('#pickup-input');
  if (pickup) pickup.value = '';
  state.pickupText = '';
  state.pickupPlaceId = null;
  state.pickupCoords = null;
  state.pickupTerminal = null;
  state.pickupFormattedAddress = null;

  const clearBtn = $('#btn-clear-pickup');
  if (clearBtn) clearBtn.classList.add('hidden');

  const termC = $('#pickup-terminal-container');
  if (termC) termC.classList.add('hidden');

  const termSelect = $('#pickup-terminal-select');
  if (termSelect) termSelect.selectedIndex = 0;

  const btnLabel = $('#pickup-terminal-btn-label');
  if (btnLabel) btnLabel.textContent = 'Select Terminal...';

  checkAirportConditionalSelector();
  updateGoogleMapPreview();
  triggerFareEstimation();
}

function clearDestField() {
  const dest = $('#dest-input');
  if (dest) dest.value = '';
  state.destText = '';
  state.destPlaceId = null;
  state.destCoords = null;
  state.dropTerminal = null;
  state.destFormattedAddress = null;

  const clearBtn = $('#btn-clear-dest');
  if (clearBtn) clearBtn.classList.add('hidden');

  const termC = $('#drop-terminal-container');
  if (termC) termC.classList.add('hidden');

  const termSelect = $('#drop-terminal-select');
  if (termSelect) termSelect.selectedIndex = 0;

  const btnLabel = $('#drop-terminal-btn-label');
  if (btnLabel) btnLabel.textContent = 'Select Terminal...';

  checkAirportConditionalSelector();
  updateGoogleMapPreview();
  triggerFareEstimation();
}

function checkAirportConditionalSelector() {
  const p = (state.pickupText || '').toLowerCase();
  const d = (state.destText || '').toLowerCase();

  const pIsGenericAirport = p.includes('changi') && !p.includes('terminal') && !p.includes('jewel');
  const dIsGenericAirport = d.includes('changi') && !d.includes('terminal') && !d.includes('jewel');

  const pTermC = $('#pickup-terminal-container');
  const dTermC = $('#drop-terminal-container');

  if (pTermC) {
    if (pIsGenericAirport) pTermC.classList.remove('hidden');
    else pTermC.classList.add('hidden');
  }
  if (dTermC) {
    if (dIsGenericAirport && state.tripMode !== 'hourly' && state.tripMode !== 'daily') dTermC.classList.remove('hidden');
    else dTermC.classList.add('hidden');
  }
}

function updateGoogleMapPreview() {
  const mapWrap = $('#google-map-preview-wrap');
  const mapEl = $('#google-map-preview');
  if (!mapWrap || !mapEl) return;

  const hasPickup = Boolean(state.pickupCoords);
  const hasDest = Boolean(state.destCoords);

  if (!hasPickup && !hasDest) {
    mapWrap.classList.add('hidden');
    return;
  }

  mapWrap.classList.remove('hidden');

  if (window.google && window.google.maps) {
    if (!state.googleMap) {
      state.googleMap = new google.maps.Map(mapEl, {
        zoom: 12,
        center: { lat: 1.3521, lng: 103.8198 },
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
          { featureType: 'poi', stylers: [{ visibility: 'simplified' }] },
          { featureType: 'transit', stylers: [{ visibility: 'off' }] },
        ],
      });
    }

    // Ensure map resizes if container was previously hidden
    if (typeof google !== 'undefined' && google.maps && google.maps.event) {
      google.maps.event.trigger(state.googleMap, 'resize');
    }

    if (state.googlePickupMarker) state.googlePickupMarker.setMap(null);
    if (state.googleDestMarker) state.googleDestMarker.setMap(null);
    if (state.googleRoutePolyline) state.googleRoutePolyline.setMap(null);

    const bounds = new google.maps.LatLngBounds();

    if (state.pickupCoords) {
      state.googlePickupMarker = new google.maps.Marker({
        position: state.pickupCoords,
        map: state.googleMap,
        title: state.pickupText || 'Pickup',
        label: { text: 'A', color: '#FFFFFF', fontWeight: 'bold' },
      });
      bounds.extend(state.pickupCoords);
    }

    if (state.destCoords && state.tripMode !== 'hourly' && state.tripMode !== 'daily') {
      state.googleDestMarker = new google.maps.Marker({
        position: state.destCoords,
        map: state.googleMap,
        title: state.destText || 'Destination',
        label: { text: 'B', color: '#FFFFFF', fontWeight: 'bold' },
      });
      bounds.extend(state.destCoords);
    }

    if (state.pickupCoords && state.destCoords && state.tripMode !== 'hourly' && state.tripMode !== 'daily') {
      state.googleRoutePolyline = new google.maps.Polyline({
        path: [state.pickupCoords, state.destCoords],
        geodesic: true,
        strokeColor: '#E31E24',
        strokeOpacity: 0.85,
        strokeWeight: 4,
        map: state.googleMap,
      });
    }

    if (state.pickupCoords && state.destCoords && state.tripMode !== 'hourly' && state.tripMode !== 'daily') {
      state.googleMap.fitBounds(bounds, { top: 25, right: 25, bottom: 25, left: 25 });
    } else if (state.pickupCoords) {
      state.googleMap.setCenter(state.pickupCoords);
      state.googleMap.setZoom(14);
    } else if (state.destCoords) {
      state.googleMap.setCenter(state.destCoords);
      state.googleMap.setZoom(14);
    }
  }
}

// ============================================
// FORM CONTROLS & SUBMISSION
// ============================================
function initFormControls() {
  $('#btn-clear-pickup')?.addEventListener('click', clearPickupField);
  $('#btn-clear-dest')?.addEventListener('click', clearDestField);

  // Booking Type Selector (One Way, Hourly, Daily)
  const typeBtns = $$('.type-btn');
  const destC = $('#dest-address-container');
  const hourlyC = $('#hourly-duration-container');
  const dailyC = $('#daily-duration-container');

  typeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      typeBtns.forEach((b) => {
        b.classList.remove('active', 'bg-white', 'text-stb-red', 'shadow-sm');
        b.classList.add('text-stone-600');
      });
      btn.classList.add('active', 'bg-white', 'text-stb-red', 'shadow-sm');
      btn.classList.remove('text-stone-600');

      const type = btn.dataset.type || 'one_way';
      state.tripMode = type;
      const hiddenType = $('#booking-type-hidden');
      if (hiddenType) hiddenType.value = type;

      if (type === 'hourly') {
        destC?.classList.add('hidden');
        dailyC?.classList.add('hidden');
        hourlyC?.classList.remove('hidden');
      } else if (type === 'daily') {
        destC?.classList.add('hidden');
        hourlyC?.classList.add('hidden');
        dailyC?.classList.remove('hidden');
      } else {
        destC?.classList.remove('hidden');
        hourlyC?.classList.add('hidden');
        dailyC?.classList.add('hidden');
      }
      checkAirportConditionalSelector();
      updateGoogleMapPreview();
      triggerFareEstimation();
    });
  });

  $$('.hourly-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.hourly-btn').forEach((b) => {
        b.classList.remove('active', 'bg-stb-red', 'text-white', 'border-stb-red', 'shadow-sm');
        b.classList.add('bg-white', 'text-stone-700', 'border-stone-200');
      });
      btn.classList.add('active', 'bg-stb-red', 'text-white', 'border-stb-red', 'shadow-sm');
      btn.classList.remove('bg-white', 'text-stone-700', 'border-stone-200');
      state.hourlyDuration = Number(btn.dataset.hours || 4);
      triggerFareEstimation();
    });
  });

  $$('.daily-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.daily-btn').forEach((b) => {
        b.classList.remove('active', 'bg-stb-red', 'text-white', 'border-stb-red', 'shadow-sm');
        b.classList.add('bg-white', 'text-stone-700', 'border-stone-200');
      });
      btn.classList.add('active', 'bg-stb-red', 'text-white', 'border-stb-red', 'shadow-sm');
      btn.classList.remove('bg-white', 'text-stone-700', 'border-stone-200');
      state.dailyDuration = Number(btn.dataset.days || 1);
      triggerFareEstimation();
    });
  });

  // Flight & Notes Collapsible
  $('#btn-toggle-flight')?.addEventListener('click', () => {
    const flightC = $('#flight-no-container');
    if (!flightC) return;
    const isHidden = flightC.classList.contains('hidden');
    if (isHidden) {
      flightC.classList.remove('hidden');
      $('#btn-toggle-flight span:first-child').textContent = '- Remove flight number / notes';
    } else {
      flightC.classList.add('hidden');
      $('#btn-toggle-flight span:first-child').textContent = '+ Add flight number / notes';
    }
  });

  // Terminal selector change listeners
  $('#pickup-terminal-select')?.addEventListener('change', (e) => {
    state.pickupTerminal = e.target.value;
  });
  $('#drop-terminal-select')?.addEventListener('change', (e) => {
    state.dropTerminal = e.target.value;
  });

  // Flow navigation & submit CTA
  $('#btn-continue-booking')?.addEventListener('click', handleContinueToReview);
  $('#btn-back-to-edit')?.addEventListener('click', hideReviewView);
  $('#btn-calc-confirm')?.addEventListener('click', handleBookingSubmit);

  $('#nav-btn-book')?.addEventListener('click', scrollToHeroBooking);
  $('#cta-book')?.addEventListener('click', scrollToHeroBooking);

  // Book Another Transport button on confirmation view
  $('#btn-book-another')?.addEventListener('click', () => {
    $('#confirmation-view')?.classList.add('hidden');
    
    const reviewView = $('#review-booking-view');
    if (reviewView) {
      reviewView.classList.remove('flex');
      reviewView.classList.add('hidden');
    }
    
    $('#hero-booking-section')?.classList.remove('hidden');
    
    const nameInput = $('#cust-name');
    if (nameInput) nameInput.value = '';
    const phoneInput = $('#cust-phone');
    if (phoneInput) phoneInput.value = '';
    const emailInput = $('#cust-email');
    if (emailInput) emailInput.value = '';
    const flightInput = $('#flight-input');
    if (flightInput) flightInput.value = '';
    const notesInput = $('#notes-input');
    if (notesInput) notesInput.value = '';

    clearPickupField();
    clearDestField();
    window.location.hash = '';
    scrollToHeroBooking();
  });

  // Custom Styled Terminal Dropdowns
  const pBtn = $('#pickup-terminal-btn');
  const pDropdown = $('#pickup-terminal-dropdown');
  const pArrow = $('#pickup-terminal-arrow');
  pBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = pDropdown.classList.contains('hidden');
    $('#drop-terminal-dropdown')?.classList.add('hidden');
    $('#drop-terminal-arrow')?.classList.remove('rotate-180');
    
    if (isHidden) {
      pDropdown.classList.remove('hidden');
      pArrow?.classList.add('rotate-180');
    } else {
      pDropdown.classList.add('hidden');
      pArrow?.classList.remove('rotate-180');
    }
  });

  $$('.terminal-opt-item').forEach((item) => {
    item.addEventListener('click', () => {
      const val = item.dataset.val;
      const text = item.textContent.trim();
      const backingSelect = $('#pickup-terminal-select');
      if (backingSelect) {
        backingSelect.value = val;
        backingSelect.dispatchEvent(new Event('change'));
      }
      const label = $('#pickup-terminal-btn-label');
      if (label) label.textContent = text;
      
      pDropdown?.classList.add('hidden');
      pArrow?.classList.remove('rotate-180');
    });
  });

  const dBtn = $('#drop-terminal-btn');
  const dDropdown = $('#drop-terminal-dropdown');
  const dArrow = $('#drop-terminal-arrow');
  dBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = dDropdown.classList.contains('hidden');
    $('#pickup-terminal-dropdown')?.classList.add('hidden');
    $('#pickup-terminal-arrow')?.classList.remove('rotate-180');
    
    if (isHidden) {
      dDropdown.classList.remove('hidden');
      dArrow?.classList.add('rotate-180');
    } else {
      dDropdown.classList.add('hidden');
      dArrow?.classList.remove('rotate-180');
    }
  });

  $$('.drop-terminal-opt-item').forEach((item) => {
    item.addEventListener('click', () => {
      const val = item.dataset.val;
      const text = item.textContent.trim();
      const backingSelect = $('#drop-terminal-select');
      if (backingSelect) {
        backingSelect.value = val;
        backingSelect.dispatchEvent(new Event('change'));
      }
      const label = $('#drop-terminal-btn-label');
      if (label) label.textContent = text;
      
      dDropdown?.classList.add('hidden');
      dArrow?.classList.remove('rotate-180');
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#pickup-terminal-container')) {
      pDropdown?.classList.add('hidden');
      pArrow?.classList.remove('rotate-180');
    }
    if (!e.target.closest('#drop-terminal-container')) {
      dDropdown?.classList.add('hidden');
      dArrow?.classList.remove('rotate-180');
    }
  });

  // Click listeners for simplified vehicle cards
  $('#btn-vehicle-4-seater')?.addEventListener('click', () => {
    selectSimpleVehicle('4-Seater');
  });
  $('#btn-vehicle-6-seater')?.addEventListener('click', () => {
    selectSimpleVehicle('6-Seater');
  });
  selectSimpleVehicle('4-Seater'); // Set default
}

function scrollToHeroBooking() {
  $('#booking-widget-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// DATE & TIME PICKERS (WITH 24-HR ADVANCE VALIDATION & POPUP CALENDAR)
// ============================================
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();

function initDateAndTimePickers() {
  const dateInput = $('#date-display-input');
  const timeSelect = $('#time-display-input');
  const triggerWrap = $('#trigger-date-input-wrap');
  const dropdown = $('#dropdown-calendar');

  if (dateInput) {
    // Set default SGT tomorrow value on init
    const sgNow = getSingaporeNow();
    const sgTomorrow = new Date(sgNow.getTime() + 24 * 60 * 60 * 1000);
    
    if (!state.travelDate) {
      state.travelDate = sgTomorrow;
    }
    
    calMonth = state.travelDate.getMonth();
    calYear = state.travelDate.getFullYear();

    dateInput.value = state.travelDate.toLocaleDateString('en-SG', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });

    // Populate dropdown and set default selection
    populateTimeDropdown();

    // Toggle popover calendar on trigger click
    triggerWrap?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (dropdown) {
        const isHidden = dropdown.classList.contains('hidden');
        if (isHidden) {
          renderCalendarGrid();
          dropdown.classList.remove('hidden');
        } else {
          dropdown.classList.add('hidden');
        }
      }
    });

    // Month Navigation inside calendar popover
    $('#btn-cal-prev')?.addEventListener('click', (e) => {
      e.stopPropagation();
      calMonth--;
      if (calMonth < 0) { calMonth = 11; calYear--; }
      renderCalendarGrid();
    });

    $('#btn-cal-next')?.addEventListener('click', (e) => {
      e.stopPropagation();
      calMonth++;
      if (calMonth > 11) { calMonth = 0; calYear++; }
      renderCalendarGrid();
    });

    $('#btn-cal-today')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const sgNow2 = getSingaporeNow();
      const sgTomorrow2 = new Date(sgNow2.getTime() + 24 * 60 * 60 * 1000);
      window.selectCalendarDate(sgTomorrow2.getFullYear(), sgTomorrow2.getMonth(), sgTomorrow2.getDate());
    });

    $('#btn-cal-close')?.addEventListener('click', (e) => {
      e.stopPropagation();
      dropdown?.classList.add('hidden');
    });

    // Close calendar when clicking anywhere else on page
    document.addEventListener('click', (e) => {
      if (dropdown && !dropdown.contains(e.target) && !triggerWrap.contains(e.target)) {
        dropdown.classList.add('hidden');
      }
    });
  }

  if (timeSelect) {
    timeSelect.addEventListener('change', () => {
      state.travelTime = timeSelect.value;
      validateAdvanceNotice();
      triggerFareEstimation();
    });
  }
}

function renderCalendarGrid() {
  const title = $('#cal-month-title');
  const grid = $('#cal-days-grid');
  if (!title || !grid) return;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  title.textContent = `${monthNames[calMonth]} ${calYear}`;

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const sgNow = getSingaporeNow();
  const sgTomorrow = new Date(sgNow.getTime() + 24 * 60 * 60 * 1000);
  sgTomorrow.setHours(0, 0, 0, 0);

  let html = '';
  for (let i = 0; i < firstDay; i++) {
    html += `<div></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cellDate = new Date(calYear, calMonth, day);
    cellDate.setHours(0, 0, 0, 0);

    const isPastOrToday = cellDate < sgTomorrow;
    const isTomorrow = cellDate.getTime() === sgTomorrow.getTime();
    const isSelected = state.travelDate && new Date(state.travelDate).toDateString() === cellDate.toDateString();

    let classes = 'p-1.5 rounded-lg transition-all font-semibold font-mono text-center text-xs ';

    if (isPastOrToday) {
      classes += 'text-stone-300 pointer-events-none opacity-65'; // Increased opacity for readability, visually disabled but readable
    } else if (isSelected) {
      classes += 'bg-stb-red text-white shadow-md font-bold scale-105';
    } else if (isTomorrow) {
      classes += 'border border-stb-red text-stb-red font-bold hover:bg-red-50 cursor-pointer';
    } else {
      classes += 'hover:bg-stone-100 text-stb-charcoal cursor-pointer';
    }

    html += `<button type="button" class="${classes}" onclick="window.selectCalendarDate(${calYear}, ${calMonth}, ${day})">${day}</button>`;
  }

  grid.innerHTML = html;
}

window.selectCalendarDate = function (y, m, d) {
  const selected = new Date(y, m, d);
  state.travelDate = selected;
  const display = $('#date-display-input');
  if (display) {
    display.value = selected.toLocaleDateString('en-SG', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  }
  $('#dropdown-calendar')?.classList.add('hidden');
  populateTimeDropdown();
  validateAdvanceNotice();
  triggerFareEstimation();
};

// Singapore Time Zone Helpers
function getSingaporeNow() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 8));
}

function isTimeSlotValid(timeStr) {
  if (!state.travelDate) return true;

  const sgNow = getSingaporeNow();
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return true;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const isPM = match[3].toUpperCase() === 'PM';
  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;

  const slotTimeSGT = new Date(state.travelDate);
  slotTimeSGT.setHours(hours, minutes, 0, 0);

  const minAdvanceMs = 24 * 60 * 60 * 1000; // 24 hours
  return (slotTimeSGT.getTime() - sgNow.getTime()) >= minAdvanceMs;
}

function populateTimeDropdown() {
  const timeSelect = $('#time-display-input');
  if (!timeSelect) return;

  const currentSelection = timeSelect.value || state.travelTime;
  timeSelect.innerHTML = '<option value="" disabled>Select Time</option>';

  const periods = ['AM', 'PM'];
  const hours = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const minutes = ['00', '30'];

  const slots = [];
  for (const period of periods) {
    for (const hour of hours) {
      for (const min of minutes) {
        const formattedHour = String(hour).padStart(2, '0');
        const timeStr = `${formattedHour}:${min} ${period}`;
        slots.push(timeStr);
      }
    }
  }

  let firstValidSlot = null;
  for (const slot of slots) {
    const valid = isTimeSlotValid(slot);
    if (valid) {
      const option = document.createElement('option');
      option.value = slot;
      option.textContent = slot;
      if (!firstValidSlot) {
        firstValidSlot = slot;
      }
      timeSelect.appendChild(option);
    }
  }

  if (currentSelection) {
    timeSelect.value = currentSelection;
    if (timeSelect.selectedIndex === -1) {
      timeSelect.value = firstValidSlot || "";
      state.travelTime = firstValidSlot;
    }
  } else {
    timeSelect.value = firstValidSlot || "";
    state.travelTime = firstValidSlot;
  }
}

function getSelectedTravelDateTimeSGT() {
  if (!state.travelDate || !state.travelTime) return null;

  const timeStr = state.travelTime;
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const isPM = match[3].toUpperCase() === 'PM';
  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;

  const slotTimeSGT = new Date(state.travelDate);
  slotTimeSGT.setHours(hours, minutes, 0, 0);
  return slotTimeSGT;
}

function validateAdvanceNotice() {
  const selectedDT = getSelectedTravelDateTimeSGT();
  const noticeEl = $('#advance-notice-msg');
  if (!selectedDT) {
    noticeEl?.classList.add('hidden');
    return true;
  }

  const sgNow = getSingaporeNow();
  const diffMs = selectedDT.getTime() - sgNow.getTime();
  const minAdvanceMs = 24 * 60 * 60 * 1000; // 24 hours

  if (diffMs < minAdvanceMs) {
    if (noticeEl) {
      noticeEl.classList.remove('hidden');
      const textEl = $('#advance-notice-text');
      if (textEl) {
        textEl.textContent = 'Please select a pickup time at least 24 hours from now.';
      }
    }
    return false;
  }

  noticeEl?.classList.add('hidden');
  return true;
}

// ============================================
// BOOKING TIMER CONTROL
// ============================================
let bookingTimerInterval = null;

function startBookingTimer() {
  stopBookingTimer();
  const timerStrip = $('#booking-timer-strip');
  const timerDisplay = $('#booking-timer-display');
  if (!timerStrip || !timerDisplay) return;

  timerStrip.classList.remove('hidden');
  let durationSec = 300; // 5 minutes

  const updateDisplay = () => {
    const m = Math.floor(durationSec / 60);
    const s = durationSec % 60;
    timerDisplay.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  updateDisplay();
  bookingTimerInterval = setInterval(() => {
    durationSec--;
    if (durationSec <= 0) {
      durationSec = 0;
      updateDisplay();
      clearInterval(bookingTimerInterval);
      bookingTimerInterval = null;
    } else {
      updateDisplay();
    }
  }, 1000);
}

function stopBookingTimer() {
  if (bookingTimerInterval) {
    clearInterval(bookingTimerInterval);
    bookingTimerInterval = null;
  }
  $('#booking-timer-strip')?.classList.add('hidden');
}

// ============================================
// FLOW NAVIGATION & VIEW TRANSITIONS
// ============================================
function showReviewView() {
  $('#hero-booking-section')?.classList.add('hidden');

  const reviewView = $('#review-booking-view');
  if (reviewView) {
    reviewView.classList.remove('hidden');
    reviewView.classList.add('block');
  }

  // Start 5-minute countdown
  startBookingTimer();

  // Generate a temporary booking reference if it doesn't exist
  if (!state.tempReference) {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const rand = String(Math.floor(1000 + Math.random() * 9000));
    state.tempReference = `STB-${yyyy}${mm}${dd}-${rand}`;
  }

  // Populate Review Details
  const pickup = ($('#pickup-input')?.value || '').trim();
  const dest = ($('#dest-input')?.value || '').trim();
  const pickupTerm = $('#pickup-terminal-select')?.value || '';
  const dropTerm = $('#drop-terminal-select')?.value || '';
  const dateVal = $('#date-display-input')?.value || '';
  const timeVal = $('#time-display-input')?.value || '';
  const pax = $('#pax-select')?.value || '1-3 Passengers';

  let finalPickup = pickup;
  if (pickupTerm) finalPickup += ` (${pickupTerm})`;

  let finalDest = dest;
  const destC = $('#review-dest-container');
  if (state.tripMode === 'hourly') {
    destC?.classList.add('hidden');
    finalDest = `${state.hourlyDuration || 4}h disposal`;
  } else if (state.tripMode === 'daily') {
    destC?.classList.add('hidden');
    finalDest = `${state.dailyDuration || 2} days charter`;
  } else {
    destC?.classList.remove('hidden');
    if (dropTerm) finalDest += ` (${dropTerm})`;
  }

  const reviewPickup = $('#review-pickup-val');
  if (reviewPickup) reviewPickup.textContent = finalPickup;

  const reviewDest = $('#review-dest-val');
  if (reviewDest) reviewDest.textContent = finalDest;

  const reviewDateTime = $('#review-datetime-val');
  if (reviewDateTime) {
    let formattedDate = dateVal;
    if (state.travelDate) {
      formattedDate = state.travelDate.toLocaleDateString('en-SG', {
        weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
      });
    }
    reviewDateTime.textContent = `${formattedDate} at ${timeVal}`;
  }

  const reviewPax = $('#review-pax-val');
  if (reviewPax) reviewPax.textContent = pax;

  let modeTitle = 'One Way Transport';
  if (pickup.toLowerCase().includes('changi') || dest.toLowerCase().includes('changi')) modeTitle = 'Airport Transfer';
  if (state.tripMode === 'hourly') modeTitle = 'Hourly Chauffeur';
  if (state.tripMode === 'daily') modeTitle = 'Daily Tour Charter';

  const reviewType = $('#review-type-val');
  if (reviewType) reviewType.textContent = modeTitle;

  const reviewRef = $('#review-ref-val');
  if (reviewRef) reviewRef.textContent = state.tempReference;

  // Selected Vehicle Info
  const selectedVehicle = state.selectedSimpleVehicle || '4-Seater';
  const is4Seater = selectedVehicle === '4-Seater';

  const vTitle = $('#review-vehicle-cat-title');
  const vSubtitle = $('#review-vehicle-cat-subtitle');
  const vPaxCount = $('#review-vehicle-pax-count');
  const vLuggageCount = $('#review-vehicle-luggage-count');
  const vImg = $('#review-vehicle-img');

  if (vTitle) vTitle.textContent = selectedVehicle;
  if (vSubtitle) vSubtitle.textContent = is4Seater ? 'Up to 4 Passengers' : 'Up to 6 Passengers';
  if (vPaxCount) vPaxCount.textContent = is4Seater ? '4 Pax' : '6 Pax';
  if (vLuggageCount) vLuggageCount.textContent = is4Seater ? '2 Bags' : '4 Bags';
  if (vImg) {
    vImg.src = is4Seater 
      ? 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=600&q=80'
      : 'https://images.unsplash.com/photo-1631295868223-63265b40d9e4?auto=format&fit=crop&w=600&q=80';
  }

  // Populate Distance / Duration / Rates & Fare for all 3 booking types
  const statLbl1 = $('#review-stat-lbl-1');
  const statDistEl = $('#review-stat-dist');
  const statSub1 = $('#review-stat-sub-1');

  const statLbl2 = $('#review-stat-lbl-2');
  const statDurEl = $('#review-stat-dur');
  const statSub2 = $('#review-stat-sub-2');

  const statLbl3 = $('#review-stat-lbl-3');
  const fareValEl = $('#review-vehicle-fare-val');
  const statSub3 = $('#review-stat-sub-3');

  const distValEl = $('#review-vehicle-dist-val');
  const durValEl = $('#review-vehicle-duration-val');

  // Breakdown fields
  const breakLblBase = $('#breakdown-lbl-base');
  const breakValBase = $('#breakdown-val-base');
  const breakLblDist = $('#breakdown-lbl-dist');
  const breakValDist = $('#breakdown-val-dist');
  const breakValSubtotal = $('#breakdown-val-subtotal');
  const breakValRounding = $('#breakdown-val-rounding');
  const breakValTotal = $('#breakdown-val-total');

  if (state.tripMode === 'one_way') {
    const rawFare = (state.calculatedFares && state.calculatedFares[selectedVehicle]) || (is4Seater ? 40.0 : 45.0);
    const roundedFare = Math.round(rawFare);
    const rounding = roundedFare - rawFare;

    const baseFare = is4Seater ? 40.0 : 45.0;
    const perKmRate = is4Seater ? 2.2 : 2.5;
    const distanceKm = state.distanceKm || 0.0;
    const distanceFare = distanceKm * perKmRate;

    const durationMinutes = state.durationSeconds
      ? Math.round(state.durationSeconds / 60)
      : Math.round(distanceKm * 1.5 + 5);
    const durText = `~${durationMinutes} mins`;
    const distText = `${distanceKm.toFixed(1)} km`;

    // 3-Stat Card Labels & Values
    if (statLbl1) statLbl1.textContent = 'Distance';
    if (statDistEl) statDistEl.textContent = distText;
    if (statSub1) statSub1.textContent = 'km';

    if (statLbl2) statLbl2.textContent = 'Est. Duration';
    if (statDurEl) statDurEl.textContent = durText;
    if (statSub2) statSub2.textContent = 'mins';

    if (statLbl3) statLbl3.textContent = 'Approx. Fare';
    if (fareValEl) fareValEl.textContent = formatCurrency(roundedFare);
    if (statSub3) statSub3.textContent = 'Estimated Transport Fare';

    // Hidden compatibility elements
    if (distValEl) distValEl.textContent = distText;
    if (durValEl) durValEl.textContent = durText;

    // Breakdown Table
    if (breakLblBase) breakLblBase.textContent = `Base Fare (${selectedVehicle})`;
    if (breakValBase) breakValBase.textContent = formatCurrency(baseFare);
    if (breakLblDist) breakLblDist.textContent = `Distance Fare (${distanceKm.toFixed(1)} km × S$${perKmRate.toFixed(2)}/km)`;
    if (breakValDist) breakValDist.textContent = formatCurrency(distanceFare);

    if (breakValSubtotal) breakValSubtotal.textContent = formatCurrency(rawFare);
    if (breakValRounding) {
      const sign = rounding >= 0 ? '+' : '';
      breakValRounding.textContent = `${sign}${formatCurrency(rounding)}`;
    }
    if (breakValTotal) breakValTotal.textContent = formatCurrency(roundedFare);

  } else if (state.tripMode === 'hourly') {
    const hours = Number(state.hourlyDuration) || 4;
    state.hourlyDuration = hours;

    const hourlyRate = is4Seater ? 60.0 : 65.0;
    const totalFare = hours * hourlyRate;

    // 3-Stat Card Labels & Values
    if (statLbl1) statLbl1.textContent = 'Duration';
    if (statDistEl) statDistEl.textContent = `${hours} Hours`;
    if (statSub1) statSub1.textContent = 'Hourly Chauffeur Disposal';

    if (statLbl2) statLbl2.textContent = 'Hourly Rate';
    if (statDurEl) statDurEl.textContent = `S$${hourlyRate.toFixed(0)}/hr`;
    if (statSub2) statSub2.textContent = `${selectedVehicle}`;

    if (statLbl3) statLbl3.textContent = 'Approx. Fare';
    if (fareValEl) fareValEl.textContent = formatCurrency(totalFare);
    if (statSub3) statSub3.textContent = 'Estimated Transport Fare';

    // Hidden compatibility elements
    if (distValEl) distValEl.textContent = `${hours} Hours`;
    if (durValEl) durValEl.textContent = `${hours} Hours Disposal`;

    // Breakdown Table
    if (breakLblBase) breakLblBase.textContent = `Hourly Rate (${selectedVehicle})`;
    if (breakValBase) breakValBase.textContent = `S$${hourlyRate.toFixed(2)} / hr`;
    if (breakLblDist) breakLblDist.textContent = `Duration (${hours} Hours Disposal)`;
    if (breakValDist) breakValDist.textContent = `${hours} Hours`;

    if (breakValSubtotal) breakValSubtotal.textContent = formatCurrency(totalFare);
    if (breakValRounding) breakValRounding.textContent = 'S$0.00';
    if (breakValTotal) breakValTotal.textContent = formatCurrency(totalFare);

  } else if (state.tripMode === 'daily') {
    const days = Number(state.dailyDuration) || 1;
    state.dailyDuration = days;

    const dailyRate = is4Seater ? 450.0 : 500.0;
    const totalFare = days * dailyRate;

    // 3-Stat Card Labels & Values
    if (statLbl1) statLbl1.textContent = 'Charter Days';
    if (statDistEl) statDistEl.textContent = `${days} ${days === 1 ? 'Day' : 'Days'}`;
    if (statSub1) statSub1.textContent = 'Full-Day Charter';

    if (statLbl2) statLbl2.textContent = 'Daily Rate';
    if (statDurEl) statDurEl.textContent = `S$${dailyRate.toFixed(0)}/day`;
    if (statSub2) statSub2.textContent = `${selectedVehicle}`;

    if (statLbl3) statLbl3.textContent = 'Approx. Fare';
    if (fareValEl) fareValEl.textContent = formatCurrency(totalFare);
    if (statSub3) statSub3.textContent = 'Estimated Transport Fare';

    // Hidden compatibility elements
    if (distValEl) distValEl.textContent = `${days} Days`;
    if (durValEl) durValEl.textContent = `${days} Days Charter`;

    // Breakdown Table
    if (breakLblBase) breakLblBase.textContent = `Daily Rate (${selectedVehicle})`;
    if (breakValBase) breakValBase.textContent = `S$${dailyRate.toFixed(2)} / day`;
    if (breakLblDist) breakLblDist.textContent = `Charter Duration`;
    if (breakValDist) breakValDist.textContent = `${days} ${days === 1 ? 'Day' : 'Days'}`;

    if (breakValSubtotal) breakValSubtotal.textContent = formatCurrency(totalFare);
    if (breakValRounding) breakValRounding.textContent = 'S$0.00';
    if (breakValTotal) breakValTotal.textContent = formatCurrency(totalFare);
  }

  // Tolls Badge dynamically based on current configuration
  if (tollsBadge) {
    const tollsIncluded = state.surcharges ? state.surcharges.tollsIncluded : false;
    const badgeParent = tollsBadge.parentElement;
    
    if (tollsIncluded) {
      tollsBadge.textContent = 'Tolls included';
      badgeParent?.classList.remove('text-stone-600');
      badgeParent?.classList.add('text-emerald-800');
      if (tollsIcon) {
        tollsIcon.textContent = 'check';
        tollsIcon.classList.remove('text-stone-400');
        tollsIcon.classList.add('text-emerald-600');
      }
    } else {
      tollsBadge.textContent = 'Tolls excluded';
      badgeParent?.classList.remove('text-emerald-800');
      badgeParent?.classList.add('text-stone-600');
      if (tollsIcon) {
        tollsIcon.textContent = 'info';
        tollsIcon.classList.remove('text-emerald-600');
        tollsIcon.classList.add('text-stone-400');
      }
    }
  }

  // Scroll to review section top
  reviewView?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Defer map init so the container has layout before Google Maps measures it
  requestAnimationFrame(() => {
    updateGoogleMapPreview();
  });
}

function hideReviewView() {
  stopBookingTimer();
  const reviewView = $('#review-booking-view');
  if (reviewView) {
    reviewView.classList.remove('block', 'flex');
    reviewView.classList.add('hidden');
  }
  $('#hero-booking-section')?.classList.remove('hidden');
  scrollToHeroBooking();
}

function handleContinueToReview() {
  const pickup = ($('#pickup-input')?.value || '').trim();
  const dest = ($('#dest-input')?.value || '').trim();
  const dateVal = $('#date-display-input')?.value || '';
  const timeVal = $('#time-display-input')?.value || '';

  // 1. Validate Pickup
  if (!pickup) {
    alert('Please enter your pickup location.');
    $('#pickup-input')?.focus();
    return;
  }

  // 2. Validate Destination (if One Way)
  if (state.tripMode === 'one_way' && !dest) {
    alert('Please enter your destination.');
    $('#dest-input')?.focus();
    return;
  }

  // 3. Validate Date & Time
  if (!dateVal) {
    alert('Please select your travel date.');
    $('#date-display-input')?.focus();
    return;
  }
  if (!timeVal) {
    alert('Please select your travel time.');
    $('#time-display-input')?.focus();
    return;
  }

  // 4. Validate 24-Hour Advance Booking Requirement
  if (!validateAdvanceNotice()) {
    alert('Please select a pickup time at least 24 hours from now.');
    return;
  }

  showReviewView();
}

// ============================================
// FINAL BOOKING SUBMISSION & CONFIRMATION
// ============================================
let _isBookingSubmitting = false;

async function handleBookingSubmit() {
  if (_isBookingSubmitting) return; // prevent double / spot submits
  _isBookingSubmitting = true;

  const pickup = ($('#pickup-input')?.value || '').trim();
  const dest = ($('#dest-input')?.value || '').trim();
  const dateVal = $('#date-display-input')?.value || '';
  const timeVal = $('#time-display-input')?.value || '';
  const pax = $('#pax-select')?.value || '1-3 Passengers';
  const flight = ($('#flight-input')?.value || '').trim();
  const notes = ($('#notes-input')?.value || '').trim();
  const name = ($('#cust-name')?.value || '').trim();
  const email = ($('#cust-email')?.value || '').trim();
  const phone = ($('#cust-phone')?.value || '').trim();
  const pickupTerm = $('#pickup-terminal-select')?.value || '';
  const dropTerm = $('#drop-terminal-select')?.value || '';

  // 1. Validate Pickup
  if (!pickup) {
    alert('Please enter your pickup location.');
    $('#pickup-input')?.focus();
    _isBookingSubmitting = false;
    return;
  }

  // 2. Validate Destination (if One Way)
  if (state.tripMode === 'one_way' && !dest) {
    alert('Please enter your destination.');
    $('#dest-input')?.focus();
    _isBookingSubmitting = false;
    return;
  }

  // 3. Validate Date & Time
  if (!dateVal) {
    alert('Please select your travel date.');
    $('#date-display-input')?.focus();
    _isBookingSubmitting = false;
    return;
  }
  if (!timeVal) {
    alert('Please select your travel time.');
    $('#time-display-input')?.focus();
    _isBookingSubmitting = false;
    return;
  }

  // 4. Validate 24-Hour Advance Booking Requirement
  if (!validateAdvanceNotice()) {
    alert('Please select a pickup time at least 24 hours from now.');
    _isBookingSubmitting = false;
    return;
  }

  // 5. Validate Customer Details (Name, Email, WhatsApp)
  if (!name) {
    alert('Please enter your name.');
    $('#cust-name')?.focus();
    _isBookingSubmitting = false;
    return;
  }
  if (!phone || phone.length < 7) {
    alert('Please enter a valid WhatsApp / contact phone number.');
    $('#cust-phone')?.focus();
    _isBookingSubmitting = false;
    return;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    alert('Please enter a valid email address.');
    $('#cust-email')?.focus();
    _isBookingSubmitting = false;
    return;
  }

  let finalPickup = pickup;
  if (pickupTerm) finalPickup += ` (${pickupTerm})`;
  let finalDest = dest;
  if (state.tripMode === 'hourly') finalDest = `${state.hourlyDuration || 4}h disposal`;
  else if (state.tripMode === 'daily') finalDest = `${state.dailyDuration || 2} days charter`;
  else if (dropTerm) finalDest += ` (${dropTerm})`;

  let modeTitle = 'One Way Transport';
  if (finalPickup.toLowerCase().includes('changi') || finalDest.toLowerCase().includes('changi')) modeTitle = 'Airport Transfer';
  if (state.tripMode === 'hourly') modeTitle = 'Hourly Chauffeur';
  if (state.tripMode === 'daily') modeTitle = 'Daily Tour Charter';

  const btn = $('#btn-calc-confirm');
  const btnLabel = $('#btn-submit-label');
  if (btn) btn.disabled = true;
  if (btnLabel) btnLabel.textContent = 'SUBMITTING INQUIRY...';

  let bookingSuccessful = false;
  let serverVoucherCode = '';

  let submitVehicle = state.selectedSimpleVehicle || '4-Seater';
  let submitFare = 'Pending Quote';
  const is4S = submitVehicle === '4-Seater';

  if (state.tripMode === 'one_way') {
    if (state.calculatedFares && state.calculatedFares[submitVehicle]) {
      const amt = state.calculatedFares[submitVehicle];
      submitFare = `Estimated SGD ${amt.toFixed(2)}`;
    } else {
      const base = is4S ? 40.0 : 45.0;
      submitFare = `Estimated SGD ${base.toFixed(2)}`;
    }
  } else if (state.tripMode === 'hourly') {
    const hrs = Number(state.hourlyDuration) || 4;
    const rate = is4S ? 60.0 : 65.0;
    submitFare = `Estimated SGD ${(hrs * rate).toFixed(2)}`;
  } else if (state.tripMode === 'daily') {
    const days = Number(state.dailyDuration) || 1;
    const rate = is4S ? 450.0 : 500.0;
    submitFare = `Estimated SGD ${(days * rate).toFixed(2)}`;
  }

  // Submit to Backend API
  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passengerName: name,
        passengerEmail: email,
        passengerPhone: phone,
        vehicle: submitVehicle,
        bookingType: modeTitle,
        pickup: finalPickup,
        destination: finalDest,
        dateTime: `${dateVal} at ${timeVal}`,
        flightNo: flight,
        notes: notes,
        pax: pax,
        fare: submitFare,
        currency: state.currency,
        paymentMethod: 'Pay After Service',
        pickupPlaceId: state.pickupPlaceId,
        pickupCoords: state.pickupCoords,
        destPlaceId: state.destPlaceId,
        destCoords: state.destCoords,
        distanceKm: state.tripMode === 'one_way' ? state.distanceKm : null,
      }),
    });
    if (res.ok) {
      const data = await res.json();
      serverVoucherCode = data.booking?.voucherCode;
      if (serverVoucherCode) {
        bookingSuccessful = true;
        if (window.STBAnalytics) {
          STBAnalytics.bookingSubmitted();
          STBAnalytics.bookingSuccess();
        }
      } else {
        console.error('[API] Server response did not return a valid voucherCode.');
      }
    } else {
      console.error('[API] Booking submission failed on backend status:', res.status);
    }
  } catch (e) {
    console.error('[API] Submission error:', e);
  } finally {
    if (btn) btn.disabled = false;
    if (btnLabel) btnLabel.textContent = 'SUBMIT BOOKING REQUEST';
    _isBookingSubmitting = false;
  }

  if (bookingSuccessful) {
    // Construct WhatsApp success inquiry link
    let waMsg = `Hello STB Singapore,\n\n`;
    waMsg += `I have submitted a transport booking inquiry.\n\n`;
    waMsg += `🎟 *Ref:* ${serverVoucherCode}\n`;
    waMsg += `👤 *Passenger:* ${name}\n`;
    waMsg += `📱 *WhatsApp:* ${phone}\n`;
    waMsg += `✉️ *Email:* ${email}\n`;
    if (state.tripMode === 'one_way') {
      waMsg += `🚘 *Vehicle Selection:* ${state.selectedSimpleVehicle} (Representative)\n`;
      if (state.distanceKm) {
        waMsg += `📏 *Distance:* ${state.distanceKm.toFixed(1)} km\n`;
      }
    }
    waMsg += `🚘 *Booking Type:* ${modeTitle}\n`;
    waMsg += `📍 *Pickup:* ${finalPickup}\n`;
    if (state.tripMode !== 'hourly' && state.tripMode !== 'daily') {
      waMsg += `🏁 *Destination:* ${finalDest}\n`;
    }
    waMsg += `📅 *Date & Time:* ${dateVal} at ${timeVal}\n`;
    waMsg += `👥 *Passengers:* ${pax}\n`;
    if (state.tripMode === 'hourly') waMsg += `⏱ *Duration:* ${state.hourlyDuration || 4} hours\n`;
    if (state.tripMode === 'daily') waMsg += `🗓 *Duration:* ${state.dailyDuration || 2} days\n`;
    if (flight) waMsg += `✈️ *Flight:* ${flight}\n`;
    if (notes) waMsg += `📝 *Notes:* ${notes}\n`;
    if (state.tripMode === 'one_way' && state.calculatedFares && state.calculatedFares[state.selectedSimpleVehicle]) {
      const amt = state.calculatedFares[state.selectedSimpleVehicle];
      waMsg += `💰 *Estimated Fare:* ${formatCurrency(amt)} (subject to verification)\n`;
    }
    waMsg += `\nPlease confirm vehicle availability for this inquiry. Thank you!`;

    const waUrl = `https://wa.me/6590629107?text=${encodeURIComponent(waMsg)}`;

    // Display Dedicated Confirmation Screen
    showDedicatedConfirmation({
      voucherCode: serverVoucherCode,
      name,
      phone,
      email,
      modeTitle,
      pickup: finalPickup,
      destination: finalDest,
      dateTime: `${dateVal} at ${timeVal}`,
      pax,
      flight,
      notes,
      waUrl,
      vehicle: submitVehicle,
      fare: submitFare,
      distanceKm: state.distanceKm,
    });
  } else {
    // Construct WhatsApp error backup link
    let waErrorMsg = `Hello STB Singapore,\n\n`;
    waErrorMsg += `My online booking submission failed. Here are my booking details:\n\n`;
    waErrorMsg += `👤 *Passenger:* ${name}\n`;
    waErrorMsg += `📱 *WhatsApp:* ${phone}\n`;
    waErrorMsg += `✉️ *Email:* ${email}\n`;
    if (state.tripMode === 'one_way') {
      waErrorMsg += `🚘 *Vehicle Selection:* ${state.selectedSimpleVehicle} (Representative)\n`;
      if (state.distanceKm) {
        waErrorMsg += `📏 *Distance:* ${state.distanceKm.toFixed(1)} km\n`;
      }
    }
    waErrorMsg += `🚘 *Booking Type:* ${modeTitle}\n`;
    waErrorMsg += `📍 *Pickup:* ${finalPickup}\n`;
    if (state.tripMode !== 'hourly' && state.tripMode !== 'daily') {
      waErrorMsg += `🏁 *Destination:* ${finalDest}\n`;
    }
    waErrorMsg += `📅 *Date & Time:* ${dateVal} at ${timeVal}\n`;
    waErrorMsg += `👥 *Passengers:* ${pax}\n`;
    if (state.tripMode === 'hourly') waErrorMsg += `⏱ *Duration:* ${state.hourlyDuration || 4} hours\n`;
    if (state.tripMode === 'daily') waErrorMsg += `🗓 *Duration:* ${state.dailyDuration || 2} days\n`;
    if (flight) waErrorMsg += `✈️ *Flight:* ${flight}\n`;
    if (notes) waErrorMsg += `📝 *Notes:* ${notes}\n`;
    if (state.tripMode === 'one_way' && state.calculatedFares && state.calculatedFares[state.selectedSimpleVehicle]) {
      const amt = state.calculatedFares[state.selectedSimpleVehicle];
      waErrorMsg += `💰 *Estimated Fare:* ${formatCurrency(amt)} (subject to verification)\n`;
    }
    waErrorMsg += `\nPlease manual book this inquiry. Thank you!`;

    const waErrorUrl = `https://wa.me/6590629107?text=${encodeURIComponent(waErrorMsg)}`;

    // Display Dedicated Error Screen
    showDedicatedError({
      pickup: finalPickup,
      destination: finalDest,
      dateTime: `${dateVal} at ${timeVal}`,
      waUrl: waErrorUrl,
    });
  }
}

function showDedicatedConfirmation(data) {
  if ($('#confirm-ref-code')) $('#confirm-ref-code').textContent = data.voucherCode;
  if ($('#confirm-name')) $('#confirm-name').textContent = data.name;
  if ($('#confirm-phone')) $('#confirm-phone').textContent = data.phone;
  if ($('#confirm-email')) $('#confirm-email').textContent = data.email;
  if ($('#confirm-type')) $('#confirm-type').textContent = data.modeTitle;
  if ($('#confirm-pickup')) $('#confirm-pickup').textContent = data.pickup;
  if ($('#confirm-dest')) $('#confirm-dest').textContent = data.destination;
  if ($('#confirm-datetime')) $('#confirm-datetime').textContent = data.dateTime;
  if ($('#confirm-pax')) $('#confirm-pax').textContent = data.pax;

  const confirmVehicle = $('#confirm-vehicle');
  if (confirmVehicle) {
    if (state.tripMode === 'one_way') {
      const formattedDistance = data.distanceKm ? ` (${data.distanceKm.toFixed(1)} km)` : '';
      confirmVehicle.textContent = `${data.vehicle}${formattedDistance}`;
    } else if (state.tripMode === 'hourly') {
      const hrs = Number(state.hourlyDuration) || 4;
      confirmVehicle.textContent = `${data.vehicle} (${hrs} Hours Disposal)`;
    } else if (state.tripMode === 'daily') {
      const days = Number(state.dailyDuration) || 1;
      confirmVehicle.textContent = `${data.vehicle} (${days} ${days === 1 ? 'Day' : 'Days'} Charter)`;
    } else {
      confirmVehicle.textContent = data.vehicle;
    }
  }

  const confirmFare = $('#confirm-fare');
  if (confirmFare) {
    confirmFare.textContent = data.fare;
  }

  const flightWrap = $('#confirm-flight-wrap');
  if (flightWrap) {
    if (data.flight) {
      flightWrap.classList.remove('hidden');
      if ($('#confirm-flight')) $('#confirm-flight').textContent = data.flight;
    } else {
      flightWrap.classList.add('hidden');
    }
  }

  const waBtn = $('#confirm-whatsapp-btn');
  if (waBtn) waBtn.href = data.waUrl;

  stopBookingTimer();
  $('#hero-booking-section')?.classList.add('hidden');
  const reviewView = $('#review-booking-view');
  if (reviewView) {
    reviewView.classList.remove('block', 'flex');
    reviewView.classList.add('hidden');
  }

  const confirmSection = $('#confirmation-view');
  if (confirmSection) {
    confirmSection.classList.remove('hidden');
    confirmSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  window.location.hash = 'confirmation';
}

function showDedicatedError(data) {
  $('#error-pickup').textContent = data.pickup;
  $('#error-dest').textContent = data.destination;
  $('#error-datetime').textContent = data.dateTime;

  const destWrap = $('#error-dest-wrap');
  if (destWrap) {
    if (state.tripMode === 'hourly' || state.tripMode === 'daily') destWrap.classList.add('hidden');
    else destWrap.classList.remove('hidden');
  }

  const waBtn = $('#error-whatsapp-btn');
  if (waBtn) waBtn.href = data.waUrl;

  $('#hero-booking-section')?.classList.add('hidden');
  const reviewView = $('#review-booking-view');
  if (reviewView) {
    reviewView.classList.remove('flex');
    reviewView.classList.add('hidden');
  }
  
  const errorSection = $('#error-view');
  if (errorSection) {
    errorSection.classList.remove('hidden');
    errorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  window.location.hash = 'error';
}

function initErrorHandling() {
  $('#btn-error-back')?.addEventListener('click', () => {
    $('#error-view')?.classList.add('hidden');
    $('#hero-booking-section')?.classList.remove('hidden');
    const reviewView = $('#review-booking-view');
    if (reviewView) {
      reviewView.classList.add('flex');
      reviewView.classList.remove('hidden');
    }
    window.location.hash = 'booking-summary';
  });

  $('#btn-book-another')?.addEventListener('click', () => {
    window.location.reload();
  });
}

// ============================================
// FLEET, SERVICES, DESTINATIONS & FAQS
// ============================================
function initFleetSection() {
  const filterBtns = $$('.fleet-filter-btn');
  filterBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      filterBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.fleetCategory = btn.dataset.category || 'all';
      renderFleetCards(state.fleetCategory);
    });
  });
  renderFleetCards('all');
}

function showVehicleSpecs(vid) {
  const v = VEHICLES.find((x) => x.id === vid);
  if (!v) return;

  const content = $('#modal-vehicle-content');
  if (content) {
    content.innerHTML = `
      <div class="p-6 sm:p-8 space-y-6">
        <div class="relative h-48 sm:h-64 rounded-2xl overflow-hidden bg-cover bg-center" style="background-image: url('${v.image}')">
          <div class="absolute bottom-2 right-2 bg-stone-900/75 backdrop-blur-[2px] text-[0.52rem] font-bold text-white px-2 py-0.5 rounded-md leading-tight text-center">
            Representative vehicle · Subject to availability
          </div>
        </div>
        <div>
          <div class="flex items-center gap-2 mb-1.5">
            <span class="bg-stb-red text-white text-[0.62rem] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">${v.tag || 'Luxury'}</span>
            <span class="text-xs text-stone-500 font-bold uppercase tracking-wider">${v.category}</span>
          </div>
          <h3 class="font-display font-bold text-2xl text-stb-charcoal">${v.fullName}</h3>
          <p class="text-sm text-stone-500 mt-2 leading-relaxed">${v.description}</p>
        </div>

        <div class="grid grid-cols-2 gap-4 border-t border-b border-stone-200/80 py-4 text-xs font-semibold">
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-stb-red text-lg">group</span>
            <span>Capacity: ${v.pax} Passengers</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-stb-red text-lg">luggage</span>
            <span>Luggage: ${v.luggage} Bags</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-stb-red text-lg">payments</span>
            <span>Min. Transfer: S$${v.minFareSGD}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="material-symbols-outlined text-stb-red text-lg">schedule</span>
            <span>Hourly Rate: S$${v.hourlySGD}/hr</span>
          </div>
        </div>

        <div>
          <h4 class="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2.5">Premium Features Onboard</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-bold text-stone-700">
            ${v.features.map(f => `
              <div class="flex items-center gap-2">
                <span class="material-symbols-outlined text-stb-gold-dark text-base">check_circle</span>
                <span>${f}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="pt-2">
          <button type="button" class="w-full btn-primary py-3 font-bold text-sm text-white bg-stb-red rounded-xl shadow-md" onclick="closeModal('modal-vehicle'); window.selectSimpleVehicle(Number('${v.pax}') <= 4 ? '4-Seater' : '6-Seater'); scrollToHeroBooking();">
            Book ${v.name}
          </button>
        </div>
      </div>
    `;
    openModal('modal-vehicle');
  }
}

function renderFleetCards(category = 'all') {
  const container = $('#fleet-card-container');
  if (!container) return;

  const filtered = category === 'all'
    ? VEHICLES
    : VEHICLES.filter((v) => v.category === category);

  container.innerHTML = filtered.map((v) => `
    <article class="fleet-card" data-testid="fleet-card-${v.id}">
      <div class="fleet-img-wrap">
        <img src="${v.image}" alt="${v.name}" onerror="this.src='${v.fallback}'" />
        <span class="fleet-tag ${v.tagStyle === 'gold' ? 'gold' : ''}">${v.tag || ''}</span>
        <div class="absolute bottom-2 right-2 bg-stone-900/75 backdrop-blur-[2px] text-[0.52rem] font-bold text-white px-2 py-0.5 rounded-md leading-tight text-center z-10">
          Representative vehicle · Subject to availability
        </div>
      </div>
      <div class="fleet-body">
        <h3 class="fleet-title">${v.fullName}</h3>
        <p class="fleet-desc">${v.description}</p>
        
        <div class="fleet-stats">
          <div class="fleet-stat">
            <span class="material-symbols-outlined">group</span>
            <span>${v.pax} pax</span>
          </div>
          <div class="fleet-stat">
            <span class="material-symbols-outlined">luggage</span>
            <span>${v.luggage} bags</span>
          </div>
        </div>

        <div class="fleet-features space-y-1 my-3">
          ${v.features.slice(0, 3).map((f) => `
            <div class="fleet-feature">
              <span class="material-symbols-outlined">check_circle</span>
              <span>${f}</span>
            </div>
          `).join('')}
        </div>

        <div class="fleet-foot">
          <div class="fleet-price-block">
            <div class="fleet-price-label">Fixed Rate</div>
            <div class="fleet-price">${formatCurrency(v.baseFareSGD)}</div>
          </div>
          <div class="flex gap-2">
            <button type="button" class="btn-ghost show-specs-btn px-3 py-1.5 text-xs font-bold rounded-lg border border-stone-200" data-vid="${v.id}">
              Specs
            </button>
            <button type="button" class="btn-primary select-fleet-btn px-4 py-1.5 text-xs font-bold rounded-lg text-white bg-stb-red" data-vid="${v.id}">
              Book
            </button>
          </div>
        </div>
      </div>
    </article>
  `).join('');

  container.querySelectorAll('.select-fleet-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const vid = btn.dataset.vid;
      state.selectedVehicleId = vid;
      const v = VEHICLES.find((x) => x.id === vid);
      if (v) {
        window.selectSimpleVehicle(v.pax <= 4 ? '4-Seater' : '6-Seater');
      }
      scrollToHeroBooking();
    });
  });

  container.querySelectorAll('.show-specs-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const vid = btn.dataset.vid;
      showVehicleSpecs(vid);
    });
  });
}

async function initServiceGrid() {
  try {
    const res = await fetch('/src/services.json');
    SERVICES = await res.json();
    renderServiceGrid();
    initServiceCarousel();
  } catch (err) {
    console.error('Failed to load services:', err);
  }
}

function initServiceCarousel() {
  const grid = $('#service-grid');
  if (!grid || window.innerWidth >= 768) return; // Only on mobile/tab

  let scrollInterval;
  let isPaused = false;
  
  // Clone cards to allow seamless looping
  const originalCards = Array.from(grid.children);
  originalCards.forEach(card => {
    const clone = card.cloneNode(true);
    // Bind click events on clones
    const btn = clone.querySelector('.srv-book-btn');
    if (btn) {
      btn.addEventListener('click', () => {
        const sid = btn.dataset.service;
        if (sid === 'hourly_disposal') {
          const hourlyBtn = $('.type-btn[data-type="hourly"]');
          if (hourlyBtn) hourlyBtn.click();
        } else if (sid === 'daily_booking') {
          const dailyBtn = $('.type-btn[data-type="daily"]');
          if (dailyBtn) dailyBtn.click();
        } else {
          const oneWayBtn = $('.type-btn[data-type="one_way"]');
          if (oneWayBtn) oneWayBtn.click();
        }
        scrollToHeroBooking();
      });
    }
    grid.appendChild(clone);
  });

  const scrollNext = () => {
    if (isPaused) return;
    
    // Width of one card including gap (approx)
    const cardWidth = grid.querySelector('.service-card').offsetWidth;
    const gap = 16; // 1rem gap
    const scrollAmount = cardWidth + gap;
    
    // Smooth scroll by one card
    grid.scrollBy({ left: scrollAmount, behavior: 'smooth' });

    // Seamless loop check: If scrolled past original cards, jump back instantly
    // We wait 600ms for the smooth scroll animation to finish before jumping
    setTimeout(() => {
      const scrollLimit = (originalCards.length * scrollAmount);
      if (grid.scrollLeft >= scrollLimit - gap) {
        grid.scrollTo({ left: grid.scrollLeft - scrollLimit, behavior: 'instant' });
      }
    }, 600);
  };

  scrollInterval = setInterval(scrollNext, 3000);

  // Pause on user interaction
  grid.addEventListener('touchstart', () => isPaused = true, { passive: true });
  grid.addEventListener('touchend', () => {
    setTimeout(() => isPaused = false, 2000);
  }, { passive: true });
}


function renderServiceGrid() {
  const grid = $('#service-grid');
  if (!grid) return;

  grid.innerHTML = SERVICES.map((s, i) => `
    <article class="service-card flex flex-col items-center text-center p-3" data-testid="service-card-${s.id}">
      <div class="service-card-icon mb-1.5">
        <span class="material-symbols-outlined fill-1">${s.icon}</span>
      </div>
      <h3 class="service-card-title mb-1.5">${s.title}</h3>
      <div class="mt-auto flex flex-col items-center">
        <div class="service-card-price-label">From</div>
        <div class="service-card-price">${formatCurrency(s.priceSGD)}${s.id === 'hourly_disposal' ? '<span class="price-suffix">/hr</span>' : ''}</div>
      </div>
      <button class="srv-book-btn mt-2 flex items-center justify-center gap-1" data-service="${s.id}" data-testid="srv-book-${s.id}">
        Book
      </button>
    </article>
  `).join('');

  grid.querySelectorAll('.srv-book-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sid = btn.dataset.service;
      if (sid === 'hourly_disposal') {
        const hourlyBtn = $('.type-btn[data-type="hourly"]');
        if (hourlyBtn) hourlyBtn.click();
      } else if (sid === 'daily_booking') {
        const dailyBtn = $('.type-btn[data-type="daily"]');
        if (dailyBtn) dailyBtn.click();
      } else {
        const oneWayBtn = $('.type-btn[data-type="one_way"]');
        if (oneWayBtn) oneWayBtn.click();
      }
      scrollToHeroBooking();
    });
  });
}

function initDestinations() {
  $$('.dest-card').forEach((card) => {
    card.addEventListener('click', () => {
      const loc = card.dataset.location;
      const destInput = $('#dest-input');
      if (destInput && loc) {
        destInput.value = loc;
        updateDestState(loc, null, DEFAULT_SINGAPORE_LOCATIONS[loc]);
        scrollToHeroBooking();
      }
    });
  });
}

function initFAQSection() {
  const container = $('#faq-accordion-list');
  const searchInput = $('#faq-search-input');
  const catBtns = $$('.faq-cat-btn');
  if (!container) return;

  const render = (cat = 'all', query = '') => {
    let filtered = cat === 'all' ? FAQS : FAQS.filter((f) => f.cat === cat);
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
    }

    if (!filtered.length) {
      container.innerHTML = `<div class="p-6 text-center text-xs text-stb-muted font-bold">No questions found matching your search.</div>`;
      return;
    }

    container.innerHTML = filtered.map((f, i) => `
      <div class="faq-item ${i === 0 ? 'open' : ''}">
        <button type="button" class="faq-trigger">
          <span>${f.question}</span>
          <span class="faq-icon material-symbols-outlined">expand_more</span>
        </button>
        <div class="faq-answer">${f.answer}</div>
      </div>
    `).join('');

    container.querySelectorAll('.faq-trigger').forEach((btn) => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.faq-item');
        const isOpen = item.classList.contains('open');
        container.querySelectorAll('.faq-item').forEach((i) => i.classList.remove('open'));
        if (!isOpen) item.classList.add('open');
      });
    });
  };

  render('all', '');

  catBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      catBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      state.faqCategory = btn.dataset.cat || 'all';
      render(state.faqCategory, searchInput?.value || '');
    });
  });

  searchInput?.addEventListener('input', () => {
    render(state.faqCategory, searchInput.value);
  });
}

function initReviewsSection() {
  const container = $('#reviews-container');
  if (!container) return;

  container.innerHTML = REVIEWS.map((r) => `
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
// MODAL CONTROLS & UTILITIES
// ============================================
function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('hidden');
    el.classList.add('open');
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
    el.classList.add('hidden');
  }
}

window.openModal = openModal;
window.closeModal = closeModal;

function initModals() {
  ['modal-vehicle'].forEach((id) => {
    const modal = document.getElementById(id);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(id);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      ['modal-vehicle'].forEach((id) => closeModal(id));
    }
  });
}

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

  // Shift floating WhatsApp button up when footer is visible to prevent overlap
  const footer = $('.stb-footer');
  const floatBtn = $('.floating-whatsapp-btn');
  if (footer && floatBtn && typeof IntersectionObserver !== 'undefined') {
    const footerObserver = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        floatBtn.classList.add('above-footer');
      } else {
        floatBtn.classList.remove('above-footer');
      }
    }, { threshold: 0.05 });
    footerObserver.observe(footer);
  }

  $('#mbb-whatsapp-btn')?.addEventListener('click', () => {
    scrollToHeroBooking();
  });
}

function initReveal() {
  const els = document.querySelectorAll('.reveal:not(.in)');
  if (!('IntersectionObserver' in window)) {
    els.forEach((e) => e.classList.add('in'));
    return;
  }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px 100px 0px' });
  els.forEach((el) => io.observe(el));
}

// ============================================
// SIMPLIFIED VEHICLE & PRICING FUNCTIONS
// ============================================
window.selectSimpleVehicle = selectSimpleVehicle;
function selectSimpleVehicle(category) {
  state.selectedSimpleVehicle = category;
  const btn4 = $('#btn-vehicle-4-seater');
  const btn6 = $('#btn-vehicle-6-seater');

  if (!btn4 || !btn6) return;

  if (category === '4-Seater') {
    btn4.classList.add('border-stb-red', 'bg-stb-red-soft');
    btn4.classList.remove('border-stone-200', 'bg-white');
    btn6.classList.remove('border-stb-red', 'bg-stb-red-soft');
    btn6.classList.add('border-stone-200', 'bg-white');
  } else {
    btn6.classList.add('border-stb-red', 'bg-stb-red-soft');
    btn6.classList.remove('border-stone-200', 'bg-white');
    btn4.classList.remove('border-stb-red', 'bg-stb-red-soft');
    btn4.classList.add('border-stone-200', 'bg-white');
  }
}

async function triggerFareEstimation() {
  const pickupReady = state.pickupPlaceId || state.pickupCoords;
  const destReady = state.destPlaceId || state.destCoords;
  const estimateContainer = $('#estimate-container');

  const fare4 = $('#fare-4-seater-val');
  const fare6 = $('#fare-6-seater-val');
  const dist4 = $('#dist-4-seater-val');
  const dist6 = $('#dist-6-seater-val');
  const break4 = $('#breakdown-4-seater');
  const break6 = $('#breakdown-6-seater');

  if (state.tripMode === 'hourly') {
    if (!pickupReady) {
      estimateContainer?.classList.add('hidden');
      return;
    }
    estimateContainer?.classList.remove('hidden');
    const hrs = Number(state.hourlyDuration) || 4;

    if (fare4) fare4.textContent = formatCurrency(hrs * 60);
    if (fare6) fare6.textContent = formatCurrency(hrs * 65);
    if (dist4) dist4.textContent = `${hrs} Hours`;
    if (dist6) dist6.textContent = `${hrs} Hours`;
    if (break4) break4.textContent = `S$60.00/hr × ${hrs} Hours`;
    if (break6) break6.textContent = `S$65.00/hr × ${hrs} Hours`;
    return;
  }

  if (state.tripMode === 'daily') {
    if (!pickupReady) {
      estimateContainer?.classList.add('hidden');
      return;
    }
    estimateContainer?.classList.remove('hidden');
    const days = Number(state.dailyDuration) || 1;

    if (fare4) fare4.textContent = formatCurrency(days * 450);
    if (fare6) fare6.textContent = formatCurrency(days * 500);
    if (dist4) dist4.textContent = `${days} ${days === 1 ? 'Day' : 'Days'}`;
    if (dist6) dist6.textContent = `${days} ${days === 1 ? 'Day' : 'Days'}`;
    if (break4) break4.textContent = `S$450.00/day × ${days} ${days === 1 ? 'Day' : 'Days'}`;
    if (break6) break6.textContent = `S$500.00/day × ${days} ${days === 1 ? 'Day' : 'Days'}`;
    return;
  }

  if (!pickupReady || !destReady) {
    estimateContainer?.classList.add('hidden');
    return;
  }

  estimateContainer?.classList.remove('hidden');

  if (fare4) fare4.innerHTML = `<span class="animate-pulse text-stone-400">Calculating...</span>`;
  if (fare6) fare6.innerHTML = `<span class="animate-pulse text-stone-400">Calculating...</span>`;
  if (dist4) dist4.innerHTML = `<span class="animate-pulse text-stone-400">...</span>`;
  if (dist6) dist6.innerHTML = `<span class="animate-pulse text-stone-400">...</span>`;

  state.isFareEstimating = true;

  try {
    const res = await fetch('/api/estimate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: {
          placeId: state.pickupPlaceId,
          lat: state.pickupCoords?.lat,
          lng: state.pickupCoords?.lng
        },
        destination: {
          placeId: state.destPlaceId,
          lat: state.destCoords?.lat,
          lng: state.destCoords?.lng
        }
      })
    });

    if (!res.ok) {
      throw new Error(`Estimate API error status: ${res.status}`);
    }

    const data = await res.json();
    if (data.success && data.fares) {
      state.calculatedFares = data.fares;
      state.distanceKm = data.distanceKm;
      state.pricingRates = data.rates;
      state.durationSeconds = data.durationSeconds;
      state.surcharges = data.surcharges;
      renderEstimatedFares();
    } else {
      throw new Error(data.error || "Estimation unsuccessful");
    }
  } catch (err) {
    console.warn("[ESTIMATE] Fare estimation failed:", err);
    state.calculatedFares = null;
    state.distanceKm = null;
    state.pricingRates = null;
    renderEstimatedFares();
    if (fare4) fare4.textContent = "Pending Dispatch Quote";
    if (fare6) fare6.textContent = "Pending Dispatch Quote";
  } finally {
    state.isFareEstimating = false;
  }
}

function renderEstimatedFares() {
  const fare4 = $('#fare-4-seater-val');
  const fare6 = $('#fare-6-seater-val');
  const dist4 = $('#dist-4-seater-val');
  const dist6 = $('#dist-6-seater-val');
  const breakdown4 = $('#breakdown-4-seater');
  const breakdown6 = $('#breakdown-6-seater');

  if (state.calculatedFares && state.distanceKm !== null && state.distanceKm !== undefined) {
    const amt4 = state.calculatedFares['4-Seater'];
    const amt6 = state.calculatedFares['6-Seater'];
    const formattedDistance = state.distanceKm.toFixed(1);

    if (fare4) fare4.textContent = formatCurrency(amt4);
    if (fare6) fare6.textContent = formatCurrency(amt6);
    if (dist4) dist4.textContent = `${formattedDistance} km`;
    if (dist6) dist6.textContent = `${formattedDistance} km`;

    // Dynamic breakdown strings using rates from server
    if (state.pricingRates) {
      const rate4 = state.pricingRates['4-Seater'];
      const rate6 = state.pricingRates['6-Seater'];
      if (breakdown4 && rate4) {
        breakdown4.textContent = `S$${rate4.baseFare.toFixed(2)} base + ${formattedDistance} km × S$${rate4.perKmRate.toFixed(2)}/km`;
      }
      if (breakdown6 && rate6) {
        breakdown6.textContent = `S$${rate6.baseFare.toFixed(2)} base + ${formattedDistance} km × S$${rate6.perKmRate.toFixed(2)}/km`;
      }
    } else {
      if (breakdown4) breakdown4.textContent = `S$40.00 base + ${formattedDistance} km × S$2.20/km`;
      if (breakdown6) breakdown6.textContent = `S$45.00 base + ${formattedDistance} km × S$2.50/km`;
    }
  } else {
    if (fare4) fare4.textContent = "Pending Quote";
    if (fare6) fare6.textContent = "Pending Quote";
    if (dist4) dist4.textContent = "— km";
    if (dist6) dist6.textContent = "— km";
    if (breakdown4) breakdown4.textContent = "S$40.00 base + 0.0 km × S$2.20/km";
    if (breakdown6) breakdown6.textContent = "S$45.00 base + 0.0 km × S$2.50/km";
  }
}
