import { NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/auth";
import { getDB, dbGet, dbRun, dbAll } from "@/app/lib/db";
import crypto from "node:crypto";

export async function POST(req) {
  try {
    const auth = verifyToken(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.message }, { status: 401 });
    }

    const { event_id, invite_code } = await req.json();
    if (!event_id) {
      return NextResponse.json({ error: "Missing event_id" }, { status: 400 });
    }

    const userId = auth.decoded.id;
    const db = await getDB();

    // Load event
    const event = await dbGet(db, "SELECT * FROM events WHERE event_id = ? AND date_time > datetime('now')", [event_id]);
    if (!event) {
      return NextResponse.json({ error: "Event not found or has expired" }, { status: 404 });
    }

    // Prevent host from enrolling
    if (event.host_id === userId) {
      return NextResponse.json({ error: "Host cannot enroll in own event" }, { status: 400 });
    }

    // Private event: verify invite code
    if (event.type === "private") {
      if (!invite_code || invite_code !== event.invite_code) {
        return NextResponse.json({ error: "Invalid or missing invite code" }, { status: 403 });
      }
    }

    // Check if already enrolled
    const existing = await dbGet(
      db,
      "SELECT 1 FROM event_enrollments WHERE event_id = ? AND user_id = ?",
      [event_id, userId]
    );
    if (existing) {
      return NextResponse.json({ error: "Already enrolled" }, { status: 409 });
    }

    // Capacity check
    if (event.capacity != null) {
      const countRow = await dbGet(
        db,
        "SELECT COUNT(*) AS cnt FROM event_enrollments WHERE event_id = ?",
        [event_id]
      );
      const enrolledCount = countRow?.cnt ?? 0;
      if (enrolledCount >= event.capacity) {
        return NextResponse.json({ error: "Event is full" }, { status: 409 });
      }
    }

    // Enroll
    await dbRun(
      db,
      "INSERT INTO event_enrollments (enrollment_id, event_id, user_id) VALUES (?, ?, ?)",
      [crypto.randomUUID(), event_id, userId]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Enrollment error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


