import { NextResponse } from "next/server";
import { getDB, dbRun } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";
import crypto from "node:crypto";
import { getPlaceDetails } from "@/app/lib/foursquare";
import { normalizeCategory, EVENT_CATEGORIES } from "@/app/lib/categories";

export async function POST(req) {
  try {
    // verify JWT
    const auth = verifyToken(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.message }, { status: 401 });
    }

    const { decoded } = auth;
    const body = await req.json();
    const { title, description, date_time, type, fsq_place_id, capacity, invite_code, event_category } = body;

    if (!title || !date_time || !type || !fsq_place_id) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate event category if provided
    let chosenCategory = null;
    if (event_category) {
      const normalized = normalizeCategory(event_category);
      if (!normalized) {
        return NextResponse.json({ error: "Invalid event_category" }, { status: 400 });
      }
      chosenCategory = normalized;
    }

    // Optionally validate and enrich venue details from Foursquare
    const details = await getPlaceDetails(fsq_place_id);
    const venue = details || {};
    const venueName = venue.name || null;
    const venueAddress = venue.location?.formatted_address || venue.location?.address || null;
    const venueLat = venue.geocodes?.main?.latitude ?? null;
    const venueLon = venue.geocodes?.main?.longitude ?? null;
    const venueCategory = Array.isArray(venue.categories) && venue.categories.length > 0 ? venue.categories[0]?.name : null;

    const db = await getDB();
    await dbRun(
      db,
      `INSERT INTO events (event_id, host_id, title, description, fsq_place_id, venue_name, venue_address, venue_lat, venue_lon, venue_category, event_category, type, date_time, capacity, invite_code, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [
        crypto.randomUUID(),
        decoded.id,
        title,
        description || "",
        fsq_place_id,
        venueName,
        venueAddress,
        venueLat,
        venueLon,
        venueCategory,
        chosenCategory,
        type,
        date_time,
        capacity ?? null,
        invite_code || null
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Event create error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
