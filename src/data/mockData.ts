import { ServiceItem, Vehicle, Destination, LocationPreset, Review, FAQItem, Currency } from '../types';

export const LOGO_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDcArSc3UCKLQppokQ4cvcoKngannYVnW5w95cJf9VXPiJKm7Jau-7HjA4lIs0nhDMWMbL8JkGmZ6U2bmB3NYDfsTgVyYt7etoEPcMmbSUa31akmG1veYPh1qE0sO0mWhsM-eVinK2Y_Mumyg1USEbP1L58QhYQs9XB_Hw0A_uqIerCk3g_EiV4og-fonpwqTFYj65WjSHqINZDrfKLvOoJM1BYYFEb7NbRwc2_XmMRFf6QHW7VFO8Jq3AFvq9Fuv89a7g';

export const FOOTER_LOGO_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBkC84IGQJXF0UDHSAya5oW-_ntdmkXaiUHbAUdWVuNe1sfExaEIzEU2SYzMmSu0jTCLbwXtooK4jWIbdAmSu9gbbbuT2D7DhI_x8TnrUNZ87vGkrzPE6ocaGqtHrV3DpbkQis9sE2LXvLb1Ca9lRjteDTScZHCvpvDSBtR0AHLL97s4zWRv4EDWG2qmBJl3kb7RlXQUDL5fabKFUlVxSjLhJSfZ3-F832wc4UCZQM-WaJkHZCmOjj5HBFix84Jrvlpj40';

export const HERO_BG_IMAGE = 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1920&q=80';

export const CURRENCY_RATES: Record<Currency, { symbol: string; rate: number }> = {
  SGD: { symbol: 'S$', rate: 1.0 },
  USD: { symbol: '$', rate: 0.74 },
  EUR: { symbol: '€', rate: 0.68 },
  AUD: { symbol: 'A$', rate: 1.12 }
};

export const SERVICES: ServiceItem[] = [
  {
    id: 'airport_arrival',
    title: 'Airport Arrival',
    description: 'Meet & Greet service with 60 mins complimentary waiting time.',
    icon: 'flight_land',
    popularTag: 'Most Requested',
    basePriceSgd: 75
  },
  {
    id: 'airport_departure',
    title: 'Airport Departure',
    description: 'Punctual pickup from hotel or home directly to Terminal 1-4.',
    icon: 'flight_takeoff',
    basePriceSgd: 70
  },
  {
    id: 'point_to_point',
    title: 'Point-to-Point',
    description: 'Direct transfers between any two locations in Singapore.',
    icon: 'directions_car',
    basePriceSgd: 65
  },
  {
    id: 'chauffeur_drive',
    title: 'Chauffeur Drive',
    description: 'Personal driver for hourly booking, flexible itineraries.',
    icon: 'hail',
    basePriceSgd: 80
  },
  {
    id: 'corporate_events',
    title: 'Corporate Events',
    description: 'Luxury fleet for VIP guests and corporate delegations.',
    icon: 'business_center',
    basePriceSgd: 95
  },
  {
    id: 'city_tours',
    title: 'City Tours',
    description: "Guided tours across Singapore's iconic landmarks.",
    icon: 'landscape',
    basePriceSgd: 85
  },
  {
    id: 'bus_charter',
    title: 'Bus Charter',
    description: '23 to 45-seater coaches for large groups and events.',
    icon: 'directions_bus',
    basePriceSgd: 180
  },
  {
    id: 'jb_malaysia',
    title: 'JB/Malaysia Transfer',
    description: 'Cross-border private car service to Johor Bahru and beyond.',
    icon: 'departure_board',
    basePriceSgd: 140
  }
];

export const VEHICLES: Vehicle[] = [
  {
    id: 'luxury_mpv',
    name: 'Luxury MPV',
    category: 'mpv',
    tag: 'MOST POPULAR',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNpG14zjBK8f399oFZZuKFeVY6TmmMd6TBQgIWEq80j8QvKf80GJiDd28XFL-d1A8RM0oiWbHyr7bLFVowEVotq4isDtFvT9DXFW8OwE5jrZyOA8PocLmvFPOFzumUB7K-MZEP329dHIPmtEEMWJmSvDtCLAc1REFbiqIWMSP2g28Kzmj6ID-YGwyL_svcTVg-VeqDJRj0IYu7rOYeqqyaNwQsgQjMm70b1w5MBDmxccvnQgyt8AVeBg',
    pax: 6,
    bags: 4,
    specialFeature: 'Premium Captain Seats',
    pricePerTripSgd: 85,
    pricePerHourSgd: 75,
    description: 'Toyota Alphard / Vellfire 7-seater MPV with plush leather reclining seats, double sunroof, dual power doors, and ultra-smooth air suspension for ultimate family and VIP travel.',
    specs: {
      engine: '2.5L Hybrid / V6 Smooth Engine',
      seating: '6 Passengers + Driver',
      wifi: true,
      water: true,
      flightTracking: true,
      childSeat: true,
      meetAndGreet: true
    },
    gallery: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuBNpG14zjBK8f399oFZZuKFeVY6TmmMd6TBQgIWEq80j8QvKf80GJiDd28XFL-d1A8RM0oiWbHyr7bLFVowEVotq4isDtFvT9DXFW8OwE5jrZyOA8PocLmvFPOFzumUB7K-MZEP329dHIPmtEEMWJmSvDtCLAc1REFbiqIWMSP2g28Kzmj6ID-YGwyL_svcTVg-VeqDJRj0IYu7rOYeqqyaNwQsgQjMm70b1w5MBDmxccvnQgyt8AVeBg',
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'executive_sedan',
    name: 'Executive Sedan',
    category: 'sedan',
    tag: 'BUSINESS',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB299Dm4Y88leP9L0dht_nOwv2aXIMdBjK14vKvyFsIB_MnkWc5ziHqgh3nmsl40LgAVA1_CR8uOn2v10eyrLRMOx--at44jPxiDMSP-W_b0G9jpsP5RBb9SLV23Frsx2jx-0d5Uyyyj21NQdHBonjvnzVMzbD4C9v-r5VjBXMTSshzXU3ZVqZ6BhZJMhjfcT-0pxSc9G9ea8rKvvmXjIe7sjNpgBRqis_jH0FwWI-UHLqkw7k76-iK6g',
    pax: 3,
    bags: 2,
    specialFeature: 'Full Climate Control',
    pricePerTripSgd: 75,
    pricePerHourSgd: 65,
    description: 'Mercedes-Benz E-Class or BMW 5 Series executive saloon. High comfort, quiet cabin, ideal for corporate executives, solo travelers, and couples.',
    specs: {
      engine: '2.0L Turbocharged Saloon',
      seating: '3 Passengers + Driver',
      wifi: true,
      water: true,
      flightTracking: true,
      childSeat: false,
      meetAndGreet: true
    },
    gallery: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuB299Dm4Y88leP9L0dht_nOwv2aXIMdBjK14vKvyFsIB_MnkWc5ziHqgh3nmsl40LgAVA1_CR8uOn2v10eyrLRMOx--at44jPxiDMSP-W_b0G9jpsP5RBb9SLV23Frsx2jx-0d5Uyyyj21NQdHBonjvnzVMzbD4C9v-r5VjBXMTSshzXU3ZVqZ6BhZJMhjfcT-0pxSc9G9ea8rKvvmXjIe7sjNpgBRqis_jH0FwWI-UHLqkw7k76-iK6g',
      'https://images.unsplash.com/photo-1563720223185-11003d516935?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'large_coach',
    name: 'Large Coach',
    category: 'coach',
    tag: 'GROUPS',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA31Vtf6r7fdzfLt5dlckn6h9WlaJlnUfjFeQX7DUJViGP_JQIwcn-Ky1t9nLR4kwQEEHAG2w2DsDd5VBdee1TXdiEU_GAsCDla0qshH0STgip2gxYC_pnkSGCuBn3TLFvydLJS1K0ziMYZNcZm7ELtX7YS9DHAW7tLiDU-9jRo5S6GPW07iLRBr-ropd-TDYnPU5k8UisAChDX0G4YrXbiu3xUWGD03IsTjlxhZbA2vVo60cUX2CSVXg',
    pax: 45,
    bags: 40,
    specialFeature: 'PA Audio System',
    pricePerTripSgd: 180,
    pricePerHourSgd: 150,
    description: '23 to 45-seater luxury air-conditioned bus coach equipped with PA system, panoramic touring windows, and ample undercarriage luggage compartments.',
    specs: {
      engine: 'Heavy Duty Diesel Coach',
      seating: '23-45 Passengers',
      wifi: true,
      water: false,
      flightTracking: true,
      childSeat: false,
      meetAndGreet: true
    },
    gallery: [
      'https://lh3.googleusercontent.com/aida-public/AB6AXuA31Vtf6r7fdzfLt5dlckn6h9WlaJlnUfjFeQX7DUJViGP_JQIwcn-Ky1t9nLR4kwQEEHAG2w2DsDd5VBdee1TXdiEU_GAsCDla0qshH0STgip2gxYC_pnkSGCuBn3TLFvydLJS1K0ziMYZNcZm7ELtX7YS9DHAW7tLiDU-9jRo5S6GPW07iLRBr-ropd-TDYnPU5k8UisAChDX0G4YrXbiu3xUWGD03IsTjlxhZbA2vVo60cUX2CSVXg'
    ]
  },
  {
    id: 'vip_vclass',
    name: 'VIP Mercedes V-Class',
    category: 'luxury',
    tag: 'ULTRA LUXURY',
    image: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80',
    pax: 7,
    bags: 6,
    specialFeature: 'Conference Seating & Ambient Light',
    pricePerTripSgd: 110,
    pricePerHourSgd: 95,
    description: 'Mercedes-Benz V250d extra long luxury van with face-to-face seating option, onboard high-speed 5G WiFi, ambient lighting, and USB-C fast charging.',
    specs: {
      engine: '2.0L Diesel Twin-Turbo',
      seating: '7 Passengers + Driver',
      wifi: true,
      water: true,
      flightTracking: true,
      childSeat: true,
      meetAndGreet: true
    },
    gallery: [
      'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80'
    ]
  },
  {
    id: 'limousine_sclass',
    name: 'S-Class VIP Limousine',
    category: 'luxury',
    tag: 'FIRST CLASS',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80',
    pax: 3,
    bags: 2,
    specialFeature: 'Burmester Sound & Massaging Seats',
    pricePerTripSgd: 160,
    pricePerHourSgd: 140,
    description: 'Mercedes-Benz S-Class Long Wheelbase. First-class luxury with reclining rear seats, soft-close doors, active ambient lighting, and dedicated uniform chauffeur.',
    specs: {
      engine: '3.0L Inline-6 Mild Hybrid',
      seating: '3 Passengers + Chauffeur',
      wifi: true,
      water: true,
      flightTracking: true,
      childSeat: false,
      meetAndGreet: true
    },
    gallery: [
      'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80'
    ]
  }
];

export const DESTINATIONS: Destination[] = [
  {
    id: 'mbs',
    name: 'Marina Bay Sands',
    tag: 'MOST VISITED',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA2AAJpRYLkCbKEPFGefanrd-lkB3SdgqQSBsaZ2J9OIksjaeb2xtPYxIXG_enarEyL8HS83faSjM82NjRbVk2T50wvWWJ8h08WDH75kJh45ZLUVFh56uRjunVlHfJbusAidMYL6u5iRUugOGDXmNHAlFhXdbcllbc3nsIrg6K-1iwG92K4PLab_iW4-Th_YDct6TwsdaoEzoVIJRlxBYcTAOCZctoULBKj6X-_aejMy9EusKgg2O2JIA',
    description: 'Experience the pinnacle of luxury and world-class architecture in the heart of the city.',
    gridSpan: 'md:col-span-8 md:row-span-2',
    coords: [1.2838, 103.8591],
    recommendedVehicle: 'luxury_mpv'
  },
  {
    id: 'sentosa',
    name: 'Sentosa Island',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDDzERa3oD4NyFW_kKZ_a-pOv9FBrVTmytNtkIXlcSa_WUjT2-NXqiQ8FyM4l-Jd8vOYdgSD8W4g_qfUwZ7NMPi73b_0BLTmTxg0hZ07AkgCA_5Qyo_olCWaC-fejU7waNJ7GZ8PMIVnFdeyMFWh-GyuEpEBPHDSvAIDbn6AtJa4TBLbOIvUidku3m8HxjJ1heansqHfXMzYzrMrmfWyJ76Xxjysv01MvVfuWY6FszA1hzoa_chlecEGw',
    description: 'Universal Studios, pristine beaches, resort hotels, and vibrant island nightlife.',
    gridSpan: 'md:col-span-4 md:row-span-1',
    coords: [1.2494, 103.8303],
    recommendedVehicle: 'luxury_mpv'
  },
  {
    id: 'jewel',
    name: 'Jewel Changi',
    image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAe8T0kqGLbDPxwIb3Z6fisXNDrkZ0mb38_QO9-wwr10gdf9PsRlPllfJB5Wa7TAnTkECaVlaaXcMUfuXn0xu-dY5rf4hVgbuWOjaZSiWKUcuUcgrREbp_rdeKdR7kZAdTexbAbYOTCzNu1KOfzl-OwlBuSoixzT2YsFRiohS2nHRwacvgBVQrNzDwGDPAmoGdj9ASMCVqiFCeu0yGbUF7O1Rksh5d4QrTdvTVtrscHgcSYdy9FcCNShA',
    description: "World's tallest indoor waterfall, rain vortex, forest valley, and terminal transfers.",
    gridSpan: 'md:col-span-4 md:row-span-1',
    coords: [1.3602, 103.9898],
    recommendedVehicle: 'executive_sedan'
  },
  {
    id: 'gardens',
    name: 'Gardens by the Bay',
    tag: 'ICONIC NATURE',
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?auto=format&fit=crop&w=800&q=80',
    description: 'Futuristic Supertree Grove, Flower Dome, and Cloud Forest indoor conservatories.',
    gridSpan: 'md:col-span-6 md:row-span-1',
    coords: [1.2815, 103.8636],
    recommendedVehicle: 'luxury_mpv'
  },
  {
    id: 'jb_checkpoint',
    name: 'Johor Bahru (Cross Border)',
    tag: 'MALAYSIA TRIP',
    image: 'https://images.unsplash.com/photo-1596422846543-75c6fc197f07?auto=format&fit=crop&w=800&q=80',
    description: 'Direct door-to-door transfer across Singapore-Malaysia Causeway without alighting for customs.',
    gridSpan: 'md:col-span-6 md:row-span-1',
    coords: [1.4552, 103.7619],
    recommendedVehicle: 'luxury_mpv'
  }
];

export const LOCATION_PRESETS: LocationPreset[] = [
  {
    id: 'changi_t1',
    name: 'Changi Airport Terminal 1',
    category: 'airport',
    address: '80 Airport Boulevard, Singapore 819642',
    coords: [1.3644, 103.9915]
  },
  {
    id: 'changi_t3',
    name: 'Changi Airport Terminal 3',
    category: 'airport',
    address: '65 Airport Boulevard, Singapore 819663',
    coords: [1.3556, 103.9863]
  },
  {
    id: 'jewel_dropoff',
    name: 'Jewel Changi Airport',
    category: 'airport',
    address: '78 Airport Boulevard, Singapore 819666',
    coords: [1.3602, 103.9898]
  },
  {
    id: 'mbs_hotel',
    name: 'Marina Bay Sands Hotel Tower 1',
    category: 'hotel',
    address: '10 Bayfront Ave, Singapore 018956',
    coords: [1.2838, 103.8591]
  },
  {
    id: 'raffles_hotel',
    name: 'Raffles Hotel Singapore',
    category: 'hotel',
    address: '1 Beach Rd, Singapore 189673',
    coords: [1.2949, 103.8545]
  },
  {
    id: 'sentosa_uss',
    name: 'Universal Studios Sentosa',
    category: 'attraction',
    address: '8 Sentosa Gateway, Singapore 098269',
    coords: [1.254, 103.8238]
  },
  {
    id: 'orchard_ion',
    name: 'ION Orchard Shopping Centre',
    category: 'business',
    address: '2 Orchard Turn, Singapore 238801',
    coords: [1.3040, 103.8318]
  },
  {
    id: 'jb_city_square',
    name: 'Johor Bahru City Square (Malaysia)',
    category: 'malaysia',
    address: 'Jalan Wong Ah Fook, 80000 Johor Bahru, Johor',
    coords: [1.4619, 103.7638]
  }
];

export const REVIEWS: Review[] = [
  {
    id: 'rev1',
    name: 'James Thompson',
    role: 'Business Traveler',
    location: 'United Kingdom',
    comment: 'The Alphard was spotless and the driver was 15 minutes early at Terminal 3. Perfect service for my family\'s airport transfer. Highly recommended!',
    rating: 5,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCCY5ZWsNus-HYCXiGB4oNCrSznKkcc_leR9zAVjWV7nvgZzcMMl067aXuppS0CrJzUWtxgtl52B9uBB4UHj01sB9OtgFSpYx3zAw4aw4v-SP-x_RlxG9kt4mnjXx6_ZBAOG8W-rPGSyMqYGz0AeQGxOWonsHAbRRH4-Vgcc_yCGOLuxNr-cFnqmmHb6zWLKwTAoD1I-xqWK4ZiBt_CPEE_yWNlsACIpq7-TxcrJDa6PpaP7WvpEj_OGg'
  },
  {
    id: 'rev2',
    name: 'Sarah Lee',
    role: 'Family Vacation',
    location: 'Australia',
    comment: 'We booked a full-day city tour for 6 people. Our driver was extremely knowledgeable and showed us hidden gems we would have never found ourselves.',
    rating: 5,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBKUeUAZUexTjc7TvoJaQ0XqZuQbvdQeahh17de2ajLVgXdBk1fAUoElOnZfrT8RA-9tJDZGUy80M3PDOiliUj_pH1MPAfsYKtuWGH3GywJjOw4CPxGXekGaYrDM9X55Qyg1p7kZp0D8K-O0jwC9tTdQHbL2hI24H_2DppWjP273VmcOScMS7Qdr91usUzpCs21YwpAccaH9w8R-69ksGHWJFof5SFGCUQoWtd1u60d0LDLdn9Xtqz6cA'
  },
  {
    id: 'rev3',
    name: 'David Chen',
    role: 'Corporate Event Manager',
    location: 'Hong Kong',
    comment: 'Arranged 4 executive Mercedes sedans for our international board meeting delegation. Seamless coordination, fixed pricing, and excellent WhatsApp support.',
    rating: 5,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBPQn5UE9_ew7n9EkFy0ehOvVTRRrWIBhCsYAkPMPkx71d6qcGXxFIlpXpoRF1d1q81IIcUxQe6h7OnKvU38PM_nIbA-oUlKOaRX3yUzToVtBJ8H4_LFv7AA2KTkx3WiboD6SLkVfmewoFbRfba-ejMTxMnME0_S_ucrhiLXZFNgfOxqUv4dENCDqvWLPfWSpsxKEZcNGbhbz9b_wbZnf83NglBNOa8l6ac9sdYOI8NdwFhyFw47ihXZA'
  }
];

export const FAQS: FAQItem[] = [
  {
    id: 'faq1',
    category: 'pricing',
    question: 'Are there any hidden charges or ERP toll fees?',
    answer: 'No, we operate strictly on all-inclusive fixed pricing. All Electronic Road Pricing (ERP) tolls, fuel, parking fees, airport surcharges, and peak hour fees are fully included in the quote provided before your ride.'
  },
  {
    id: 'faq2',
    category: 'booking',
    question: 'How far in advance should I book my ride?',
    answer: 'We recommend booking at least 24 hours in advance to guarantee your preferred vehicle type (especially Toyota Alphard / Vellfire MPVs). However, we also support urgent same-day bookings subject to live vehicle availability via WhatsApp.'
  },
  {
    id: 'faq3',
    category: 'booking',
    question: 'What is your cancellation and amendment policy?',
    answer: 'Cancellations made 24 hours prior to the scheduled pickup time are 100% free of charge. Flight delays are automatically tracked by our team for airport pickups with no penalty.'
  },
  {
    id: 'faq4',
    category: 'airport',
    question: 'How does airport Meet & Greet pickup work?',
    answer: 'Our driver tracks your flight status in real time. Upon landing, your chauffeur will await you inside the Arrival Hall holding a personalized name card and assist with your luggage. Includes 60 minutes complimentary waiting time from actual flight touchdown.'
  },
  {
    id: 'faq5',
    category: 'vehicles',
    question: 'Do you provide child booster seats or wheelchairs?',
    answer: 'Yes! Complimentary child safety seats and booster seats can be requested during booking. Our MPVs and coaches also accommodate collapsible wheelchairs and strollers.'
  },
  {
    id: 'faq6',
    category: 'pricing',
    question: 'Do I need to alight at customs for JB/Malaysia transfers?',
    answer: 'No! With our private cross-border vehicle transfers, you stay comfortably seated inside the air-conditioned vehicle throughout Singapore and Malaysia immigration clearance.'
  }
];
