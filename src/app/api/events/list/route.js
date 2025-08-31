import { NextResponse } from "next/server";
import { getDB, dbAll, dbRun } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";
import { normalizeCategory } from "@/app/lib/categories";
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
    // Try with fields param first
    let res = await fetch(`${base}?fields=fsq_place_id,name,location,latitude,longitude,categories,geocodes`, { method: "GET", headers });
    if (!res.ok) {
      // Fallback: request default details without fields filter
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

function toNumber(value, fallback = null) {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function haversineMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(req) {
  try {
    const auth = verifyToken(req);
    const isAuthed = auth.valid;
    const authedUserId = isAuthed ? auth.decoded.id : null;

    const url = new URL(req.url);
    const sp = url.searchParams;
    const ll = sp.get("ll"); // "lat,lon"
    const radius = toNumber(sp.get("radius")); // meters
    const limit = toNumber(sp.get("limit"));
    const inviteCode = sp.get("invite_code");
    const q = sp.get("q");
    const eventCategory = normalizeCategory(sp.get("event_category"));

    let latitude = null;
    let longitude = null;
    if (ll) {
      const parts = ll.split(",");
      if (parts.length === 2) {
        latitude = toNumber(parts[0]);
        longitude = toNumber(parts[1]);
      }
    }

    const db = await getDB();

    // Base: public events only, exclude expired events
    const params = [];
    let where = "WHERE type = 'public' AND date_time > datetime('now')";

    // If invite code is provided, include matching private events too (also exclude expired)
    if (inviteCode) {
      where = `${where} OR (invite_code = ? AND date_time > datetime('now'))`;
      params.push(inviteCode);
    }

    // If authed, include the user's own private events (also exclude expired)
    if (isAuthed) {
      where = `${where} OR (host_id = ? AND date_time > datetime('now'))`;
      params.push(authedUserId);
    }

    // Optional simple search by title
    if (q) {
      where = `(${where}) AND title LIKE ?`;
      params.push(`%${q}%`);
    }

    // Optional filter by event_category
    if (eventCategory) {
      where = `(${where}) AND event_category = ?`;
      params.push(eventCategory);
    }

    // Pull candidates; distance filtering will be applied in JS if ll provided
    let rows;
    if (isAuthed) {
      rows = await dbAll(
        db,
        `SELECT e.*, 
                (SELECT COUNT(*) FROM event_enrollments ee WHERE ee.event_id = e.event_id) AS enrollment_count,
                (SELECT COUNT(*) FROM event_enrollments ee2 WHERE ee2.event_id = e.event_id AND ee2.user_id = ?) AS is_enrolled
         FROM events e
         ${where}
         ORDER BY date_time DESC`,
        [...params, authedUserId]
      );
    } else {
      rows = await dbAll(
        db,
        `SELECT e.*, 
                (SELECT COUNT(*) FROM event_enrollments ee WHERE ee.event_id = e.event_id) AS enrollment_count,
                0 AS is_enrolled
         FROM events e
         ${where}
         ORDER BY date_time DESC`,
        params
      );
    }

    // Enrich missing venue fields using Foursquare details when possible
    const dbForUpdate = db;
    const enriched = await Promise.all(
      rows.map(async (e) => {
        const needsVenue = (
          e && (
            e.venue_name == null ||
            e.venue_address == null ||
            e.venue_lat == null ||
            e.venue_lon == null ||
            e.venue_category == null
          )
        );

        if (!needsVenue || !e.fsq_place_id) return e;

        try {
          const details = await fetchFsqPlace(e.fsq_place_id);
          if (!details || details.error) return e;

          const venueName = details.name ?? details.place?.name ?? e.venue_name ?? null;
          const loc = details.location || details.place?.location || {};
          const addressParts = [loc.address, loc.locality, loc.region, loc.postcode, loc.country].filter(Boolean);
          const venueAddress = loc.formatted_address || loc.address_line || (addressParts.length ? addressParts.join(", ") : null) || e.venue_address || null;
          const venueLat =
            (details.geocodes && details.geocodes.main && details.geocodes.main.latitude) ?? details.latitude ?? details.place?.latitude ?? e.venue_lat ?? null;
          const venueLon =
            (details.geocodes && details.geocodes.main && details.geocodes.main.longitude) ?? details.longitude ?? details.place?.longitude ?? e.venue_lon ?? null;
          const venueCategory =
            (Array.isArray(details.categories) && details.categories.length > 0
              ? details.categories[0]?.name
              : null) ?? (Array.isArray(details.place?.categories) && details.place.categories.length > 0 ? details.place.categories[0]?.name : null) ?? e.venue_category ?? null;

          const updated = {
            ...e,
            venue_name: venueName,
            venue_address: venueAddress,
            venue_lat: venueLat,
            venue_lon: venueLon,
            venue_category: venueCategory,
          };

          // Persist back if we filled anything new
          const shouldPersist =
            (e.venue_name == null && venueName != null) ||
            (e.venue_address == null && venueAddress != null) ||
            (e.venue_lat == null && venueLat != null) ||
            (e.venue_lon == null && venueLon != null) ||
            (e.venue_category == null && venueCategory != null);

          if (shouldPersist) {
            try {
              await dbRun(
                dbForUpdate,
                `UPDATE events SET venue_name = ?, venue_address = ?, venue_lat = ?, venue_lon = ?, venue_category = ? WHERE event_id = ?`,
                [venueName, venueAddress, venueLat, venueLon, venueCategory, e.event_id]
              );
            } catch (_) {
              // best-effort update; ignore failures here
            }
          }

          return updated;
        } catch (_) {
          return e;
        }
      })
    );

    let events = enriched;

    if (latitude != null && longitude != null) {
      events = events
        .map((e) => {
          const d = (e.venue_lat != null && e.venue_lon != null)
            ? haversineMeters(latitude, longitude, e.venue_lat, e.venue_lon)
            : null;
          return { ...e, distance: d };
        })
        .filter((e) => radius == null || (e.distance != null && e.distance <= radius))
        .sort((a, b) => {
          if (a.distance == null && b.distance == null) return 0;
          if (a.distance == null) return 1;
          if (b.distance == null) return -1;
          return a.distance - b.distance;
        });
    }

    if (limit != null && limit > 0) {
      events = events.slice(0, limit);
    }

    return NextResponse.json({ events });
  } catch (err) {
    console.error("List events error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


