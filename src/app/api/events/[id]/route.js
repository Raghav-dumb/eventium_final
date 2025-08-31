import { NextResponse } from "next/server";
import { getDB, dbGet, dbRun } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";
import { getPlaceDetails } from "@/app/lib/foursquare";

// Local fetch to Foursquare to avoid dependency on helper changes
async function fetchFsqPlace(fsqPlaceId) {
  const base = `https://places-api.foursquare.com/places/${encodeURIComponent(fsqPlaceId)}`;
  const headers = {
    Authorization: `Bearer ${process.env.FOURSQUARE_API_KEY || ""}`,
    accept: "application/json",
    "X-Places-Api-Version": "2025-06-17"
  };
  try {
    if (!headers.Authorization) {
      console.warn("Foursquare API key missing or empty (FOURSQUARE_API_KEY)");
      return null;
    }
    let res = await fetch(`${base}?fields=fsq_place_id,name,location,latitude,longitude,categories,geocodes`, { method: "GET", headers });
    if (!res.ok) {
      res = await fetch(base, { method: "GET", headers });
    }
    if (!res.ok) {
      console.warn("Foursquare details fetch failed", fsqPlaceId, res.status);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.warn("Foursquare details fetch error", fsqPlaceId, err?.message);
    return null;
  }
}

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const db = await getDB();
    const event = await dbGet(
      db,
      `SELECT e.*, 
              (SELECT COUNT(*) FROM event_enrollments ee WHERE ee.event_id = e.event_id) AS enrollment_count
       FROM events e WHERE e.event_id = ? AND e.date_time > datetime('now')`,
      [id]
    );
    if (!event) return NextResponse.json({ error: "Event not found or has expired" }, { status: 404 });
    // If any venue fields are missing, enrich from Foursquare and persist best-effort
    const needsVenue = (
      event && (
        event.venue_name == null ||
        event.venue_address == null ||
        event.venue_lat == null ||
        event.venue_lon == null ||
        event.venue_category == null
      )
    );

    if (needsVenue && event.fsq_place_id) {
      try {
        const details = await fetchFsqPlace(event.fsq_place_id);
        if (details && !details.error) {
          const venueName = details.name ?? details.place?.name ?? event.venue_name ?? null;
          const loc = details.location || details.place?.location || {};
          const addressParts = [loc.address, loc.locality, loc.region, loc.postcode, loc.country].filter(Boolean);
          const venueAddress = loc.formatted_address || loc.address_line || (addressParts.length ? addressParts.join(", ") : null) || event.venue_address || null;
          const venueLat = (details.geocodes && details.geocodes.main && details.geocodes.main.latitude) ?? details.latitude ?? details.place?.latitude ?? event.venue_lat ?? null;
          const venueLon = (details.geocodes && details.geocodes.main && details.geocodes.main.longitude) ?? details.longitude ?? details.place?.longitude ?? event.venue_lon ?? null;
          const venueCategory = (Array.isArray(details.categories) && details.categories.length > 0 ? details.categories[0]?.name : null) ?? (Array.isArray(details.place?.categories) && details.place.categories.length > 0 ? details.place.categories[0]?.name : null) ?? event.venue_category ?? null;

          const shouldPersist =
            (event.venue_name == null && venueName != null) ||
            (event.venue_address == null && venueAddress != null) ||
            (event.venue_lat == null && venueLat != null) ||
            (event.venue_lon == null && venueLon != null) ||
            (event.venue_category == null && venueCategory != null);

          if (shouldPersist) {
            try {
              await dbRun(
                db,
                `UPDATE events SET venue_name = ?, venue_address = ?, venue_lat = ?, venue_lon = ?, venue_category = ? WHERE event_id = ?`,
                [venueName, venueAddress, venueLat, venueLon, venueCategory, event.event_id]
              );
            } catch (_) {}
          }

          const enrichedEvent = {
            ...event,
            venue_name: venueName,
            venue_address: venueAddress,
            venue_lat: venueLat,
            venue_lon: venueLon,
            venue_category: venueCategory,
          };
          return NextResponse.json({ event: enrichedEvent });
        }
      } catch (_) {}
    }
    return NextResponse.json({ event });
  } catch (err) {
    console.error("Get event error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const auth = verifyToken(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.message }, { status: 401 });
    }

    const { id } = await params;
    const userId = auth.decoded.id;
    const body = await req.json();

    // Allow updating core fields; fsq_place_id could be updated to move venues
    const allowed = [
      "title",
      "description",
      "fsq_place_id",
      "venue_name",
      "venue_address",
      "venue_lat",
      "venue_lon",
      "venue_category",
      "event_category",
      "type",
      "date_time",
      "capacity",
      "invite_code",
    ];
    const fields = Object.keys(body).filter((k) => allowed.includes(k));
    if (fields.length === 0) {
      return NextResponse.json({ error: "No updateable fields provided" }, { status: 400 });
    }

    // If fsq_place_id changed, refresh venue fields from Foursquare
    if (fields.includes("fsq_place_id")) {
      const details = await fetchFsqPlace(body.fsq_place_id);
      const venue = details || {};
      const venueName = venue.name || null;
      const venueAddress = venue.location?.formatted_address || venue.location?.address || null;
      const venueLat = venue.geocodes?.main?.latitude ?? null;
      const venueLon = venue.geocodes?.main?.longitude ?? null;
      const venueCategory = Array.isArray(venue.categories) && venue.categories.length > 0 ? venue.categories[0]?.name : null;

      // Replace provided venue fields with authoritative details if not explicitly provided
      if (!fields.includes("venue_name")) body.venue_name = venueName;
      if (!fields.includes("venue_address")) body.venue_address = venueAddress;
      if (!fields.includes("venue_lat")) body.venue_lat = venueLat;
      if (!fields.includes("venue_lon")) body.venue_lon = venueLon;
      if (!fields.includes("venue_category")) body.venue_category = venueCategory;
      ["venue_name","venue_address","venue_lat","venue_lon","venue_category"].forEach((k) => {
        if (!fields.includes(k)) fields.push(k);
      });
    }

    const setSql = fields.map((f) => `${f} = ?`).join(", ");
    const paramsArr = fields.map((f) => body[f]);
    paramsArr.push(id, userId);

    const db = await getDB();
    const result = await dbRun(
      db,
      `UPDATE events SET ${setSql} WHERE event_id = ? AND host_id = ?`,
      paramsArr
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: "Not found or not authorized" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update event error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const auth = verifyToken(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.message }, { status: 401 });
    }
    const { id } = await params;
    const userId = auth.decoded.id;
    const db = await getDB();
    const result = await dbRun(db, "DELETE FROM events WHERE event_id = ? AND host_id = ?", [id, userId]);
    if (result.changes === 0) {
      return NextResponse.json({ error: "Not found or not authorized" }, { status: 403 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete event error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


