import { NextResponse } from "next/server";
import { getDB } from "@/app/lib/db";
import { verifyToken } from "@/lib/auth";

export async function POST(req) {
  try {
    const auth = verifyToken(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.message }, { status: 401 });
    }

    const { decoded } = auth;
    const { event_id } = await req.json();

    if (!event_id) {
      return NextResponse.json({ error: "Missing event_id" }, { status: 400 });
    }

    const db = await getDB();
    const result = await db.run(
      "DELETE FROM events WHERE event_id = ? AND host_id = ?",
      [event_id, decoded.id]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: "Event not found or not authorized" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete event error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
