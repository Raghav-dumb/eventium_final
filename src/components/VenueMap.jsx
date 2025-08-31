"use client";

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default markers in Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function VenueMap({ venues, centerLat, centerLng, onVenueClick }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  // Debug logging
  console.log('VenueMap props:', { venues, centerLat, centerLng });
  console.log('Venues array:', venues);
  if (venues && venues.length > 0) {
    console.log('First venue:', venues[0]);
    console.log('First venue coordinates:', venues[0].coordinates);
  }

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Initialize map
    const map = L.map(mapRef.current).setView([centerLat, centerLng], 13);
    mapInstanceRef.current = map;

    // Add simple, minimalistic tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap contributors, © CartoDB',
      subdomains: 'abcd',
      maxZoom: 19
    }).addTo(map);

    // Add center marker (default blue)
    L.marker([centerLat, centerLng])
      .addTo(map)
      .bindPopup('Search Center');

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [centerLat, centerLng]);

  useEffect(() => {
    if (!mapInstanceRef.current || !venues) return;

    console.log('Adding venue markers. Venues:', venues);

    // Clear existing markers
    markersRef.current.forEach(marker => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    // Add venue markers as red dots
    venues.forEach((venue, index) => {
      console.log(`Processing venue ${index}:`, venue);
      console.log(`Venue ${index} coordinates:`, venue.coordinates);
      
      if (venue.coordinates?.lat && venue.coordinates?.lng) {
        console.log(`Adding marker for venue ${index} at:`, [venue.coordinates.lat, venue.coordinates.lng]);
        
        // Create red dot marker for venues
        const venueIcon = L.divIcon({
          className: 'venue-marker',
          html: '<div style="background-color: #ef4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });
        
        const marker = L.marker([venue.coordinates.lat, venue.coordinates.lng], { icon: venueIcon })
          .addTo(mapInstanceRef.current)
          .bindTooltip(venue.name, { 
            permanent: false, 
            direction: 'top',
            className: 'venue-tooltip',
            offset: [0, -10]
          })
          .bindPopup(`
            <div class="venue-popup">
              <h3 class="font-bold text-lg">${venue.name}</h3>
              <p class="text-sm text-gray-600">${venue.address || 'Address not available'}</p>
              <p class="text-xs text-gray-500">${Math.round(venue.distance)}m away</p>
              <button 
                class="mt-2 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                onclick="window.selectVenueFromMap('${venue.fsq_place_id}')"
              >
                Select Venue
              </button>
            </div>
          `);

        // Add click handler
        marker.on('click', () => {
          if (onVenueClick) {
            onVenueClick(venue);
          }
        });

        markersRef.current.push(marker);
        console.log(`Marker added for venue ${index}`);
      } else {
        console.log(`Skipping venue ${index} - missing coordinates:`, venue);
        console.log(`Venue ${index} coordinates object:`, venue.coordinates);
        console.log(`Venue ${index} coordinates.lat:`, venue.coordinates?.lat);
        console.log(`Venue ${index} coordinates.lng:`, venue.coordinates?.lng);
      }
    });

    console.log(`Total markers added: ${markersRef.current.length}`);

    // Only fit bounds initially, don't auto-fit on every venue change
    if (markersRef.current.length > 0 && !mapInstanceRef.current._boundsSet) {
      const group = new L.featureGroup(markersRef.current);
      mapInstanceRef.current.fitBounds(group.getBounds().pad(0.1));
      mapInstanceRef.current._boundsSet = true;
      console.log('Initial map bounds set to show all markers');
    }
  }, [venues, onVenueClick]);

  // Add global function for popup button clicks
  useEffect(() => {
    window.selectVenueFromMap = (venueId) => {
      const venue = venues.find(v => v.fsq_place_id === venueId);
      if (venue && onVenueClick) {
        onVenueClick(venue);
      }
    };

    return () => {
      delete window.selectVenueFromMap;
    };
  }, [venues, onVenueClick]);

  return (
    <>
      <style jsx>{`
        .venue-tooltip {
          background: rgba(0, 0, 0, 0.8) !important;
          color: white !important;
          border: none !important;
          border-radius: 6px !important;
          padding: 6px 10px !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3) !important;
        }
        .venue-tooltip::before {
          border-top-color: rgba(0, 0, 0, 0.8) !important;
        }
      `}</style>
      <div 
        ref={mapRef} 
        className="w-full h-64 rounded-lg border border-gray-200"
        style={{ zIndex: 1, minHeight: '256px' }}
      />
    </>
  );
}
