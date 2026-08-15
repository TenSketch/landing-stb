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

const SERVICES = [
  {
    id: 'airport_arrival',
    icon: 'flight_land',
    tag: 'Meet & Greet',
    title: 'Airport Arrival Pickup',
    desc: 'Changi Airport arrival hall meet & greet with printed name board. 60-min complimentary flight delay buffer.',
    priceSGD: 55,
  },
  {
    id: 'airport_departure',
    icon: 'flight_takeoff',
    tag: 'Express Drop-off',
    title: 'Airport Departure Transfer',
    desc: 'Punctual door-to-terminal transport directly to Changi T1/T2/T3/T4 departure gates with luggage assistance.',
    priceSGD: 55,
  },
  {
    id: 'point_to_point',
    icon: 'directions_car',
    tag: 'Direct Transfer',
    title: 'Point-to-Point Transport',
    desc: 'Seamless private city transfers between hotels, Marina Bay Sands, Sentosa, restaurants, and attractions.',
    priceSGD: 45,
  },
  {
    id: 'hourly_disposal',
    icon: 'schedule',
    tag: 'Flexible Charter',
    title: 'Hourly Chauffeur Disposal',
    desc: 'Dedicated vehicle and licensed professional chauffeur on standby for business meetings, sightseeing, or shopping.',
    priceSGD: 60,
  },
  {
    id: 'daily_booking',
    icon: 'calendar_today',
    tag: 'Full Day',
    title: 'Full-Day Tour Charter',
    desc: 'Unlimited mileage full-day tour chauffeur across all Singapore attractions. Customizable itineraries.',
    priceSGD: 350,
  },
  {
    id: 'cross_border',
    icon: 'commute',
    tag: 'Singapore - Malaysia',
    title: 'Cross-Border (JB / Desaru)',
    desc: 'Direct private transfer to Johor Bahru, Legoland Malaysia, and Desaru Coast. No alighting required at customs.',
    priceSGD: 120,
  },
];

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
    answer: 'All bookings must be made at least 1 hour in advance of the pickup time. Please note that we operate on a strict advance-booking-only basis and do not support urgent or immediate/on-demand bookings.',
  },
  {
    cat: 'airport',
    question: 'What if my flight into Changi Airport is delayed?',
    answer: 'We monitor live flight arrival times in real time. Your assigned chauffeur automatically tracks the flight and provides 60 minutes of complimentary waiting time from actual touchdown.',
  },
  {
    cat: 'pricing',
    question: 'Are ERP tolls, parking, and peak-hour surcharges included?',
    answer: 'Yes! All STB transport quotes are 100% fixed and all-inclusive. ERP road tolls, peak hour surcharges, airport surcharges, and fuel are strictly included.',
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
      const coords = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };
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
      const coords = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };
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
    });
  });

  $$('.hourly-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.hourly-btn').forEach((b) => b.classList.remove('active', 'bg-stb-red', 'text-white'));
      btn.classList.add('active');
      state.hourlyDuration = Number(btn.dataset.hours || 4);
    });
  });

  $$('.daily-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      $$('.daily-btn').forEach((b) => b.classList.remove('active', 'bg-stb-red', 'text-white'));
      btn.classList.add('active');
      state.dailyDuration = Number(btn.dataset.days || 2);
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
}

function scrollToHeroBooking() {
  $('#booking-widget-container')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================
// DATE & TIME PICKERS (WITH 1-HR ADVANCE VALIDATION)
// ============================================
let calMonth = new Date().getMonth();
let calYear = new Date().getFullYear();

function initDateAndTimePickers() {
  const dateTrigger = $('#trigger-date-modal');
  const dateInput = $('#date-display-input');
  const timeTrigger = $('#trigger-time-modal');
  const timeInput = $('#time-display-input');

  dateTrigger?.addEventListener('click', () => {
    renderCalendarGrid();
    openModal('modal-calendar');
  });
  dateInput?.addEventListener('click', () => {
    renderCalendarGrid();
    openModal('modal-calendar');
  });

  $('#btn-cal-prev')?.addEventListener('click', () => {
    calMonth--;
    if (calMonth < 0) { calMonth = 11; calYear--; }
    renderCalendarGrid();
  });
  $('#btn-cal-next')?.addEventListener('click', () => {
    calMonth++;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    renderCalendarGrid();
  });
  $('#btn-cal-today')?.addEventListener('click', () => {
    const today = getSingaporeNow();
    window.selectCalendarDate(today.getFullYear(), today.getMonth(), today.getDate());
  });

  timeTrigger?.addEventListener('click', () => {
    renderTimeSlots();
    openModal('modal-time-picker');
  });
  timeInput?.addEventListener('click', () => {
    renderTimeSlots();
    openModal('modal-time-picker');
  });
}

// Singapore Time Zone Helpers
function getSingaporeNow() {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  return new Date(utc + (3600000 * 8));
}

function isSingaporeToday(date) {
  if (!date) return false;
  const sgNow = getSingaporeNow();
  const d = new Date(date);
  return d.getFullYear() === sgNow.getFullYear() &&
         d.getMonth() === sgNow.getMonth() &&
         d.getDate() === sgNow.getDate();
}

function isTimeSlotValid(timeStr) {
  if (!state.travelDate) return true;
  if (!isSingaporeToday(state.travelDate)) return true;

  const sgNow = getSingaporeNow();
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return true;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const isPM = match[3].toUpperCase() === 'PM';
  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;

  const slotTime = new Date(sgNow);
  slotTime.setHours(hours, minutes, 0, 0);

  const minAdvanceMs = 60 * 60 * 1000; // 1 hour
  return (slotTime.getTime() - sgNow.getTime()) >= minAdvanceMs;
}

function renderCalendarGrid() {
  const title = $('#cal-month-title');
  const grid = $('#cal-days-grid');
  if (!title || !grid) return;

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  title.textContent = `${monthNames[calMonth]} ${calYear}`;

  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();

  const today = getSingaporeNow();
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

window.selectCalendarDate = function (y, m, d) {
  const selected = new Date(y, m, d);
  state.travelDate = selected;
  const display = $('#date-display-input');
  if (display) {
    display.value = selected.toLocaleDateString('en-SG', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  }
  closeModal('modal-calendar');
  validateAdvanceNotice();
};

function renderTimeSlots() {
  const grid = $('#time-slots-grid');
  if (!grid) return;

  const slots = [
    '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM',
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
    '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
    '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM',
    '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM', '08:00 PM', '08:30 PM',
    '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM',
    '12:00 AM', '12:30 AM', '01:00 AM', '01:30 AM', '02:00 AM', '02:30 AM',
    '03:00 AM', '03:30 AM', '04:00 AM', '04:30 AM', '05:00 AM', '05:30 AM',
  ];

  grid.innerHTML = slots.map((s) => {
    const isSelected = state.travelTime === s;
    const isValid = isTimeSlotValid(s);
    let activeClass = '';
    let disabledAttr = '';

    if (!isValid) {
      activeClass = 'bg-stone-100 text-stone-300 pointer-events-none opacity-40 border border-stone-200/50';
      disabledAttr = 'disabled';
    } else if (isSelected) {
      activeClass = 'bg-stb-red text-white font-bold shadow-md';
    } else {
      activeClass = 'bg-stone-50 border border-stone-200 text-stone-700 hover:bg-red-50 hover:border-stb-red cursor-pointer';
    }

    return `<button type="button" ${disabledAttr} class="py-2.5 px-1 rounded-xl text-center transition-all ${activeClass}" onclick="window.selectTimeSlot('${s}')">${s}</button>`;
  }).join('');
}

window.selectTimeSlot = function (s) {
  state.travelTime = s;
  const display = $('#time-display-input');
  if (display) {
    display.value = s;
  }
  closeModal('modal-time-picker');
  validateAdvanceNotice();
};

function getSelectedTravelDateTimeSGT() {
  if (!state.travelDate || !state.travelTime) return null;
  const y = state.travelDate.getFullYear();
  const m = state.travelDate.getMonth();
  const d = state.travelDate.getDate();

  const timeStr = state.travelTime;
  const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const isPM = match[3].toUpperCase() === 'PM';
  if (isPM && hours < 12) hours += 12;
  if (!isPM && hours === 12) hours = 0;

  const utcTime = Date.UTC(y, m, d, hours, minutes, 0, 0);
  return new Date(utcTime - (8 * 3600000));
}

function validateAdvanceNotice() {
  const selectedDT = getSelectedTravelDateTimeSGT();
  const noticeEl = $('#advance-notice-msg');
  if (!selectedDT) {
    noticeEl?.classList.add('hidden');
    return true;
  }

  const now = new Date();
  const diffMs = selectedDT.getTime() - now.getTime();
  const minAdvanceMs = 60 * 60 * 1000; // 1 hour

  if (diffMs < minAdvanceMs) {
    if (noticeEl) {
      noticeEl.classList.remove('hidden');
      const textEl = $('#advance-notice-text');
      if (textEl) {
        textEl.textContent = 'Please select a pickup time at least 1 hour from now.';
      }
    }
    return false;
  }

  noticeEl?.classList.add('hidden');
  return true;
}

// ============================================
// FLOW NAVIGATION & VIEW TRANSITIONS
// ============================================
function showReviewView() {
  $('#hero-booking-section')?.classList.add('hidden');

  const reviewView = $('#review-booking-view');
  if (reviewView) {
    reviewView.classList.remove('hidden');
    reviewView.classList.add('flex'); // matches index.html flex centering
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
  if (reviewDateTime) reviewDateTime.textContent = `${dateVal} at ${timeVal}`;

  const reviewPax = $('#review-pax-val');
  if (reviewPax) reviewPax.textContent = pax;

  let modeTitle = 'One Way Transport';
  if (pickup.toLowerCase().includes('changi') || dest.toLowerCase().includes('changi')) modeTitle = 'Airport Transfer';
  if (state.tripMode === 'hourly') modeTitle = 'Hourly Chauffeur';
  if (state.tripMode === 'daily') modeTitle = 'Daily Tour Charter';

  const reviewType = $('#review-type-val');
  if (reviewType) reviewType.textContent = modeTitle;

  // Scroll to review section top
  reviewView?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Defer map init so the container has layout before Google Maps measures it
  requestAnimationFrame(() => {
    updateGoogleMapPreview();
  });
}

function hideReviewView() {
  const reviewView = $('#review-booking-view');
  if (reviewView) {
    reviewView.classList.remove('flex');
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
    renderCalendarGrid();
    openModal('modal-calendar');
    return;
  }
  if (!timeVal) {
    alert('Please select your travel time.');
    renderTimeSlots();
    openModal('modal-time-picker');
    return;
  }

  // 4. Validate 1-Hour Advance Booking Requirement
  if (!validateAdvanceNotice()) {
    alert('Please select a pickup time at least 1 hour from now.');
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
    renderCalendarGrid();
    openModal('modal-calendar');
    _isBookingSubmitting = false;
    return;
  }
  if (!timeVal) {
    alert('Please select your travel time.');
    renderTimeSlots();
    openModal('modal-time-picker');
    _isBookingSubmitting = false;
    return;
  }

  // 4. Validate 1-Hour Advance Booking Requirement
  if (!validateAdvanceNotice()) {
    alert('Please select a pickup time at least 1 hour from now.');
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

  // Submit to Backend API
  try {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        passengerName: name,
        passengerEmail: email,
        passengerPhone: phone,
        vehicle: modeTitle,
        bookingType: modeTitle,
        pickup: finalPickup,
        destination: finalDest,
        dateTime: `${dateVal} at ${timeVal}`,
        flightNo: flight,
        notes: notes,
        pax: pax,
        fare: 'Pending Quote',
        currency: state.currency,
        paymentMethod: 'Pay After Service',
        pickupPlaceId: state.pickupPlaceId,
        pickupCoords: state.pickupCoords,
        destPlaceId: state.destPlaceId,
        destCoords: state.destCoords,
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
    });
  } else {
    // Construct WhatsApp error backup link
    let waErrorMsg = `Hello STB Singapore,\n\n`;
    waErrorMsg += `My online booking submission failed. Here are my booking details:\n\n`;
    waErrorMsg += `👤 *Passenger:* ${name}\n`;
    waErrorMsg += `📱 *WhatsApp:* ${phone}\n`;
    waErrorMsg += `✉️ *Email:* ${email}\n`;
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
  $('#confirm-ref-code').textContent = data.voucherCode;
  $('#confirm-name').textContent = data.name;
  $('#confirm-phone').textContent = data.phone;
  $('#confirm-email').textContent = data.email;
  $('#confirm-type').textContent = data.modeTitle;
  $('#confirm-pickup').textContent = data.pickup;
  $('#confirm-dest').textContent = data.destination;
  $('#confirm-datetime').textContent = data.dateTime;
  $('#confirm-pax').textContent = data.pax;

  const destWrap = $('#confirm-dest-wrap');
  if (destWrap) {
    if (state.tripMode === 'hourly' || state.tripMode === 'daily') destWrap.classList.add('hidden');
    else destWrap.classList.remove('hidden');
  }

  const flightWrap = $('#confirm-flight-wrap');
  if (flightWrap) {
    if (data.flight) {
      flightWrap.classList.remove('hidden');
      $('#confirm-flight').textContent = data.flight;
    } else {
      flightWrap.classList.add('hidden');
    }
  }

  const waBtn = $('#confirm-whatsapp-btn');
  if (waBtn) waBtn.href = data.waUrl;

  $('#hero-booking-section')?.classList.add('hidden');
  const reviewView = $('#review-booking-view');
  if (reviewView) {
    reviewView.classList.remove('flex');
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
        <div class="h-48 sm:h-64 rounded-2xl overflow-hidden bg-cover bg-center" style="background-image: url('${v.image}')"></div>
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
          <button type="button" class="w-full btn-primary py-3 font-bold text-sm text-white bg-stb-red rounded-xl shadow-md" onclick="closeModal('modal-vehicle'); state.selectedVehicleId='${v.id}'; scrollToHeroBooking();">
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
    <article class="fleet-card reveal" data-testid="fleet-card-${v.id}">
      <div class="fleet-img-wrap">
        <img src="${v.image}" alt="${v.name}" onerror="this.src='${v.fallback}'" />
        <span class="fleet-tag ${v.tagStyle === 'gold' ? 'gold' : ''}">${v.tag || ''}</span>
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
  ['modal-vehicle', 'modal-calendar', 'modal-time-picker'].forEach((id) => {
    const modal = document.getElementById(id);
    modal?.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(id);
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      ['modal-vehicle', 'modal-calendar', 'modal-time-picker'].forEach((id) => closeModal(id));
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
