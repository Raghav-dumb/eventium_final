import { NextResponse } from "next/server";
import { getDB } from "@/app/lib/db";
import { verifyToken } from "@/lib/auth";

export async function GET(req) {
  try {
    const auth = verifyToken(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.message }, { status: 401 });
    }

    const { decoded } = auth;
    const db = await getDB();
    const events = await db.all(
      "SELECT * FROM events WHERE host_id = ? ORDER BY date_time DESC",
      [decoded.id]
    );

    return NextResponse.json({ events });
  } catch (err) {
    console.error("Fetch my events error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
