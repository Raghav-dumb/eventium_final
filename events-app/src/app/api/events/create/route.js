import { NextResponse } from "next/server";
import { getDB } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";

export async function POST(req) {
  try {
    // verify JWT
    const auth = verifyToken(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.message }, { status: 401 });
    }

    const { decoded } = auth;
    const body = await req.json();
    const { title, description, date_time, type } = body;

    if (!title || !date_time || !type) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const db = await getDB();
    await db.run(
      `INSERT INTO events (event_id, host_id, title, description, type, date_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        crypto.randomUUID(),
        decoded.id, // from JWT
        title,
        description || "",
        type,
        date_time
      ]
    );

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Event create error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
