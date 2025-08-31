import { NextResponse } from "next/server";
import { reverseGeocode } from "@/app/lib/foursquare";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get("lat");
    const lng = searchParams.get("lng");

    if (lat == null || lng == null) {
      return NextResponse.json({ error: "Missing lat/lng" }, { status: 400 });
    }

    const fsq = await reverseGeocode(lat, lng);
    const first = Array.isArray(fsq?.results) ? fsq.results[0] : null;
    const loc = first?.location || {};
    const addressParts = [loc.formatted_address, loc.address, loc.locality, loc.region, loc.postcode, loc.country].filter(Boolean);
    const label = addressParts[0] || addressParts.slice(1).join(", ") || `${Number(lat).toFixed(3)}, ${Number(lng).toFixed(3)}`;

    return NextResponse.json({ label });
  } catch (err) {
    console.error("Reverse geocode error:", err);
    return NextResponse.json({ error: "Failed to reverse geocode" }, { status: 500 });
  }
}


