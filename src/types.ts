export type TripMode = 'one_way' | 'return' | 'hourly';

export type ServiceTypeId = 
  | 'airport_arrival'
  | 'airport_departure'
  | 'point_to_point'
  | 'chauffeur_drive'
  | 'corporate_events'
  | 'city_tours'
  | 'bus_charter'
  | 'jb_malaysia';

export interface ServiceItem {
  id: ServiceTypeId;
  title: string;
  description: string;
  icon: string;
  popularTag?: string;
  basePriceSgd: number;
}

export interface Vehicle {
  id: string;
  name: string;
  category: 'mpv' | 'sedan' | 'coach' | 'luxury';
  tag?: string;
  image: string;
  pax: number;
  bags: number;
  specialFeature: string;
  pricePerTripSgd: number;
  pricePerHourSgd: number;
  description: string;
  specs: {
    engine: string;
    seating: string;
    wifi: boolean;
    water: boolean;
    flightTracking: boolean;
    childSeat: boolean;
    meetAndGreet: boolean;
  };
  gallery: string[];
}

export interface Destination {
  id: string;
  name: string;
  tag?: string;
  image: string;
  description: string;
  gridSpan: string;
  coords: [number, number];
  recommendedVehicle: string;
}

export interface LocationPreset {
  id: string;
  name: string;
  category: 'airport' | 'hotel' | 'attraction' | 'business' | 'malaysia';
  address: string;
  coords: [number, number];
}

export interface BookingDetails {
  tripMode: TripMode;
  serviceType: ServiceTypeId;
  pickupLocation: string;
  pickupCoords?: [number, number];
  destinationLocation: string;
  destinationCoords?: [number, number];
  passengers: string;
  dateTime: string;
  vehicleId: string;
  hourlyDuration?: number;
  flightNumber?: string;
  specialRequests?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface Review {
  id: string;
  name: string;
  role: string;
  location: string;
  comment: string;
  rating: number;
  avatar: string;
}

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: 'pricing' | 'booking' | 'airport' | 'vehicles';
}

export type Currency = 'SGD' | 'USD' | 'EUR' | 'AUD';
