import { NextResponse } from "next/server";
import { geocodeAddress } from "@/app/lib/foursquare";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const limit = Number(searchParams.get("limit") || 5);
    const ll = searchParams.get("ll");

    if (!q) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const res = await geocodeAddress({ query: q, ll, limit: Math.min(limit, 10) });
    const results = Array.isArray(res?.results) ? res.results : [];

    const mapped = results
      .map((venue) => {
        const lat =
          venue?.geocodes?.main?.latitude ??
          venue?.geocodes?.drop_off?.latitude ??
          venue?.location?.latitude ??
          null;
        const lng =
          venue?.geocodes?.main?.longitude ??
          venue?.geocodes?.drop_off?.longitude ??
          venue?.location?.longitude ??
          null;
        const loc = venue?.location || {};
        const addressParts = [loc.address, loc.locality, loc.region, loc.postcode, loc.country].filter(Boolean);
        return {
          fsq_place_id: venue?.fsq_place_id ?? null,
          name: venue?.name ?? null,
          address: loc.formatted_address || (addressParts.length ? addressParts.join(", ") : null) || null,
          lat,
          lng,
        };
      })
      .filter(v => v.lat != null && v.lng != null)
      .slice(0, limit);

    return NextResponse.json({ results: mapped }, { status: 200 });
  } catch (err) {
    console.error("Geocode error:", err);
    return NextResponse.json({ error: "Failed to geocode" }, { status: 500 });
  }
}


