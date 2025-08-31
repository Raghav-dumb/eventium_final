"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons in Leaflet when bundling
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center) && center.length === 2) {
      map.flyTo(center, 13, { duration: 0.75 });
    }
  }, [center, map]);
  return null;
}

export default function LeafletMap({
  userLocation,
  events = [],
  className,
  style,
}) {
  const center = userLocation ?? [20, 0];

  return (
    <MapContainer
      center={center}
      zoom={13}
      className={`${className || ""} z-0`}
      style={style}
      scrollWheelZoom
    >
      {/* Monochrome light tile layer */}
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url="https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png"
      />

      <FlyTo center={userLocation} />

      {userLocation && (
        <CircleMarker center={userLocation} radius={8} pathOptions={{ color: "#2563eb", fillColor: "#2563eb" }} />
      )}

      {events
        .filter((e) => e.venue_lat != null && e.venue_lon != null)
        .map((e) => (
          <Marker key={e.event_id} position={[e.venue_lat, e.venue_lon]}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{e.title}</div>
                {e.venue_name ? <div className="text-muted-foreground">{e.venue_name}</div> : null}
              </div>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  );
}
