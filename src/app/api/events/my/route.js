import { NextResponse } from "next/server";
import { getDB, dbAll } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";

export async function GET(req) {
  try {
    const auth = verifyToken(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.message }, { status: 401 });
    }

    const { decoded } = auth;
    const db = await getDB();
        const events = await dbAll(
      db,
      `SELECT e.*, 
              (SELECT COUNT(*) FROM event_enrollments ee WHERE ee.event_id = e.event_id) AS enrollment_count,
              1 AS is_enrolled
        FROM events e
        WHERE host_id = ? AND date_time > datetime('now')
        ORDER BY date_time DESC`,
      [decoded.id]
    );

    return NextResponse.json({ events });
  } catch (err) {
    console.error("Fetch my events error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
