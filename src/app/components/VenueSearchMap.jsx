"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.flyTo(center, 14, { duration: 0.75 });
    }
  }, [center, map]);
  return null;
}

export default function VenueSearchMap({
  searchLocation,
  venues = [],
  onVenueSelect,
  className,
  style,
}) {
  // Default center if no search location
  const center = searchLocation ?? [20, 0];

  return (
    <MapContainer
      center={center}
      zoom={14}
      className={className}
      style={style}
      scrollWheelZoom
    >
      {/* Clean minimalist tile layer */}
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
      />

      <FlyTo center={searchLocation} />

      {/* Search location marker - simple hollow outlined dot */}
      {searchLocation && (
        <CircleMarker 
          center={searchLocation} 
          radius={6} 
          pathOptions={{ 
            color: "#3b82f6", 
            fillColor: "transparent", 
            fillOpacity: 0,
            weight: 2
          }}
        >
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">Search Location</div>
              <div className="text-muted-foreground">
                {searchLocation[0].toFixed(6)}, {searchLocation[1].toFixed(6)}
              </div>
            </div>
          </Popup>
        </CircleMarker>
      )}

      {/* Venue markers - simple solid dots */}
      {console.log("Venues in map:", venues)}
      {venues
        .filter((venue) => {
          console.log("Venue coordinates:", venue.coordinates);
          return venue.coordinates?.lat != null && venue.coordinates?.lng != null;
        })
        .map((venue, index) => (
          <CircleMarker 
            key={venue.fsq_place_id || index} 
            center={[venue.coordinates.lat, venue.coordinates.lng]}
            radius={4}
            pathOptions={{ 
              color: "#ef4444", 
              fillColor: "#ef4444", 
              fillOpacity: 0.8,
              weight: 1
            }}
            eventHandlers={{
              click: () => onVenueSelect && onVenueSelect(venue)
            }}
          >
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{venue.name}</div>
                <div className="text-muted-foreground">{venue.address}</div>
                <div className="text-xs text-gray-500">{venue.category}</div>
                <div className="text-xs text-blue-600 mt-1">
                  {Math.round(venue.distance)}m away
                </div>
                <button 
                  className="mt-2 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  onClick={() => onVenueSelect && onVenueSelect(venue)}
                >
                  Select Venue
                </button>
              </div>
            </Popup>
          </CircleMarker>
        ))}

      {/* Search radius circle - subtle outline */}
      {searchLocation && (
        <CircleMarker 
          center={searchLocation} 
          radius={5000} // 5km radius
          pathOptions={{ 
            color: "#e5e7eb", 
            fillColor: "transparent", 
            fillOpacity: 0,
            weight: 1,
            opacity: 0.5
          }}
        />
      )}
    </MapContainer>
  );
}
