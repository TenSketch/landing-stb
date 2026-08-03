import React, { useEffect, useRef } from 'react';

interface LeafletRouteMapProps {
  pickupCoords?: [number, number];
  pickupName?: string;
  destCoords?: [number, number];
  destName?: string;
  className?: string;
}

declare global {
  interface Window {
    L: any;
  }
}

export const LeafletRouteMap: React.FC<LeafletRouteMapProps> = ({
  pickupCoords,
  pickupName,
  destCoords,
  destName,
  className = 'h-[280px] w-full rounded-2xl overflow-hidden'
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (!window.L) return;

    const L = window.L;

    // Initialize map if not existing
    if (!mapInstanceRef.current) {
      const defaultCenter = pickupCoords || [1.3521, 103.8198]; // Singapore default
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 11,
        zoomControl: true,
        scrollWheelZoom: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 18
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear previous markers and polylines
    markersRef.current.forEach((m) => map.removeLayer(m));
    markersRef.current = [];
    if (polylineRef.current) {
      map.removeLayer(polylineRef.current);
      polylineRef.current = null;
    }

    const points: [number, number][] = [];

    // Add Pickup Marker
    if (pickupCoords && pickupCoords[0] && pickupCoords[1]) {
      points.push(pickupCoords);
      const pickupIcon = L.divIcon({
        className: 'custom-map-icon-pickup',
        html: `<div style="background-color:#ae0011; color:white; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border:2px solid white;"><span class="material-symbols-outlined" style="font-size:16px;">location_on</span></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const pMarker = L.marker(pickupCoords, { icon: pickupIcon })
        .addTo(map)
        .bindPopup(`<b>Pickup:</b> ${pickupName || 'Selected Location'}`);
      markersRef.current.push(pMarker);
    }

    // Add Destination Marker
    if (destCoords && destCoords[0] && destCoords[1]) {
      points.push(destCoords);
      const destIcon = L.divIcon({
        className: 'custom-map-icon-dest',
        html: `<div style="background-color:#795900; color:white; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; box-shadow: 0 4px 10px rgba(0,0,0,0.3); border:2px solid white;"><span class="material-symbols-outlined" style="font-size:16px;">flag</span></div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const dMarker = L.marker(destCoords, { icon: destIcon })
        .addTo(map)
        .bindPopup(`<b>Destination:</b> ${destName || 'Selected Location'}`);
      markersRef.current.push(dMarker);
    }

    // Draw route if 2 points
    if (points.length === 2) {
      const polyline = L.polyline(points, {
        color: '#ae0011',
        weight: 4,
        opacity: 0.8,
        dashArray: '8, 8'
      }).addTo(map);
      polylineRef.current = polyline;

      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [40, 40] });
    } else if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      map.setView([1.3521, 103.8198], 11);
    }

    // Invalidate size to ensure clean render
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
  }, [pickupCoords, pickupName, destCoords, destName]);

  return (
    <div className={`relative shadow-inner border border-gray-200/60 ${className}`}>
      <div ref={mapContainerRef} className="w-full h-full z-10" />
      <div className="absolute top-2 right-2 z-20 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-md text-[11px] font-semibold text-gray-700 shadow-sm border border-gray-200 pointer-events-none flex items-center gap-1">
        <span className="material-symbols-outlined text-sm text-[#ae0011]">map</span>
        <span>Interactive Route Map</span>
      </div>
    </div>
  );
};
