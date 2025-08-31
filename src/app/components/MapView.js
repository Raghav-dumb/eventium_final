"use client";

import dynamic from "next/dynamic";

const LeafletMap = dynamic(() => import("./leaflet/LeafletMap"), {
  ssr: false,
});

export default function MapView(props) {
  return <LeafletMap {...props} />;
}
