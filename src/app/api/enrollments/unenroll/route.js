import { NextResponse } from "next/server";
import { verifyToken } from "@/app/lib/auth";
import { getDB, dbRun } from "@/app/lib/db";

export async function POST(req) {
  try {
    const auth = verifyToken(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.message }, { status: 401 });
    }

    const { event_id } = await req.json();
    if (!event_id) {
      return NextResponse.json({ error: "Missing event_id" }, { status: 400 });
    }

    const userId = auth.decoded.id;
    const db = await getDB();
    const result = await dbRun(
      db,
      "DELETE FROM event_enrollments WHERE event_id = ? AND user_id = ?",
      [event_id, userId]
    );

    if (result.changes === 0) {
      return NextResponse.json({ error: "Not enrolled" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Unenrollment error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}


