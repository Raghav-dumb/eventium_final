import { NextResponse } from "next/server";
import { getDB, dbAll } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";
import { normalizeCategory } from "@/app/lib/categories";

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

export async function POST(req) {
  try {
    const auth = verifyToken(req);
    const isAuthed = auth.valid;
    const authedUserId = isAuthed ? auth.decoded.id : null;

    const body = await req.json();
    console.log("Filter API - Request body:", body);
    
    const {
      latitude,
      longitude,
      radius = 5000,
      category = "",
      venueCategory = "",
      dateFrom = "",
      dateTo = "",
      capacityMin = "",
      capacityMax = "",
      searchQuery = "",
      limit = 50
    } = body;

    const db = await getDB();

    // Build WHERE clause with proper parameter binding
    const conditions = [];
    const params = [];

    // Base visibility condition
    if (isAuthed) {
      conditions.push("(type = 'public' OR host_id = ?)");
      params.push(authedUserId);
    } else {
      conditions.push("type = 'public'");
    }

    // Search query filter - make it less sensitive
    if (searchQuery && searchQuery.trim()) {
      const searchTerm = searchQuery.trim();
      // Use more flexible search with multiple LIKE conditions
      conditions.push("(title LIKE ? OR description LIKE ? OR title LIKE ? OR description LIKE ?)");
      params.push(
        `%${searchTerm}%`,           // Contains anywhere
        `%${searchTerm}%`,           // Contains anywhere
        `${searchTerm}%`,            // Starts with
        `${searchTerm}%`             // Starts with
      );
    }

    // Event category filter - fix the logic
    if (category && category !== "all") {
      console.log("Filtering by event category:", category);
      // Don't normalize here, use the exact value from the form
      conditions.push("event_category = ?");
      params.push(category);
    }

    // Venue category filter - fix the logic
    if (venueCategory && venueCategory.trim()) {
      console.log("Filtering by venue category:", venueCategory);
      // Use more flexible search for venue category
      conditions.push("(venue_category LIKE ? OR venue_category LIKE ?)");
      params.push(
        `%${venueCategory.trim()}%`,  // Contains anywhere
        `${venueCategory.trim()}%`    // Starts with
      );
    }

    // Date range filters
    if (dateFrom) {
      console.log("Filtering from date:", dateFrom);
      conditions.push("date_time >= ?");
      params.push(dateFrom);
    }

    if (dateTo) {
      console.log("Filtering to date:", dateTo);
      conditions.push("date_time <= ?");
      params.push(dateTo + " 23:59:59"); // Include the entire day
    }

    // Capacity filters - fix max capacity
    if (capacityMin !== "" && capacityMin !== null && capacityMin !== undefined) {
      console.log("Min capacity filter:", capacityMin);
      conditions.push("capacity >= ?");
      params.push(Number(capacityMin));
    }

    if (capacityMax !== "" && capacityMax !== null && capacityMax !== undefined) {
      console.log("Max capacity filter:", capacityMax);
      conditions.push("capacity <= ?");
      params.push(Number(capacityMax));
    }

    // Construct the WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

          console.log("Final WHERE clause:", whereClause);
          console.log("Parameters:", params);

    // Test the event category filter specifically
    if (category && category !== "all") {
      console.log("Testing event category filter specifically...");
      const testQuery = `
        SELECT event_id, title, event_category, type, host_id 
        FROM events 
        WHERE event_category = ?
      `;
      const testResults = await dbAll(db, testQuery, [category]);
      console.log("Test query results for category '" + category + "':", testResults);
    }

    // Test the exact WHERE clause that will be used
    if (category && category !== "all") {
      console.log("Testing exact WHERE clause...");
      const testWhereClause = `WHERE (type = 'public' OR host_id = ?) AND event_category = ?`;
      const testParams = [authedUserId, category];
      console.log("Test WHERE clause:", testWhereClause);
      console.log("Test parameters:", testParams);
      
      const testExactQuery = `
        SELECT event_id, title, event_category, type, host_id 
        FROM events 
        ${testWhereClause}
        LIMIT 5
      `;
      const testExactResults = await dbAll(db, testExactQuery, testParams);
      console.log("Test exact query results:", testExactResults);
    }

    // Fetch events with filters
    let rows;
    if (isAuthed) {
      const query = `
        SELECT e.*, 
               (SELECT COUNT(*) FROM event_enrollments ee WHERE ee.event_id = e.event_id) AS enrollment_count,
               (SELECT COUNT(*) FROM event_enrollments ee2 WHERE ee2.event_id = e.event_id AND ee2.user_id = ?) AS is_enrolled
        FROM events e
        ${whereClause}
        ORDER BY date_time DESC
        LIMIT ?
      `;
      
      console.log("Authenticated query:", query);
      rows = await dbAll(db, query, [...params, authedUserId, limit]);
    } else {
      const query = `
        SELECT e.*, 
               (SELECT COUNT(*) FROM event_enrollments ee WHERE ee.event_id = e.event_id) AS enrollment_count,
               0 AS is_enrolled
        FROM events e
        ${whereClause}
        ORDER BY date_time DESC
        LIMIT ?
      `;
      
      console.log("Unauthenticated query:", query);
      rows = await dbAll(db, query, [...params, limit]);
    }

          console.log("Raw database results count:", rows ? rows.length : 0);
    if (rows && rows.length > 0) {
      console.log("Sample event data:", {
        event_id: rows[0].event_id,
        title: rows[0].title,
        event_category: rows[0].event_category,
        venue_category: rows[0].venue_category,
        capacity: rows[0].capacity,
        date_time: rows[0].date_time
      });
    }

    let events = rows || [];

    // Apply distance filtering if coordinates provided
    if (latitude != null && longitude != null) {
      console.log("Applying distance filtering from:", { latitude, longitude });
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
      
      console.log("After distance filtering:", events.length, "events");
    }

    // Apply limit
    if (limit && limit > 0) {
      events = events.slice(0, limit);
    }

          console.log("Final result:", events.length, "events");

    return NextResponse.json({ 
      events,
      total: events.length,
      filters: {
        category,
        venueCategory,
        dateFrom,
        dateTo,
        capacityMin,
        capacityMax,
        searchQuery,
        radius,
        limit
      },
      debug: {
        whereClause,
        params,
        conditions,
        rawCount: rows ? rows.length : 0,
        finalCount: events.length
      }
    });

  } catch (err) {
    console.error("Filter events error:", err);
          console.error("Error stack:", err.stack);
    return NextResponse.json({ 
      error: err.message || "Server error",
      details: err.stack
    }, { status: 500 });
  }
}
