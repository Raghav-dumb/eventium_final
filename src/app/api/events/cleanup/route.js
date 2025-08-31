import { NextResponse } from "next/server";
import { getDB, dbRun } from "@/app/lib/db";
import { verifyToken } from "@/app/lib/auth";

export async function POST(req) {
  try {
    const auth = verifyToken(req);
    if (!auth.valid) {
      return NextResponse.json({ error: auth.message }, { status: 401 });
    }

    const db = await getDB();
    
    // Delete expired events
    const result = await dbRun(
      db,
      `DELETE FROM events WHERE date_time <= datetime('now')`
    );

    // Clean up orphaned enrollments
    const orphanedEnrollments = await dbRun(
      db,
      `DELETE FROM event_enrollments WHERE event_id NOT IN (SELECT event_id FROM events)`
    );

    console.log(`Cleanup: Deleted ${result.changes} expired events and ${orphanedEnrollments.changes} orphaned enrollments`);

    return NextResponse.json({ 
      success: true, 
      deletedEvents: result.changes,
      deletedEnrollments: orphanedEnrollments.changes
    });
  } catch (err) {
    console.error("Cleanup error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// Also allow GET requests for automatic cleanup
export async function GET(req) {
  try {
    const db = await getDB();
    
    // Delete expired events
    const result = await dbRun(
      db,
      `DELETE FROM events WHERE date_time <= datetime('now')`
    );

    // Clean up orphaned enrollments
    const orphanedEnrollments = await dbRun(
      db,
      `DELETE FROM event_enrollments WHERE event_id NOT IN (SELECT event_id FROM events)`
    );

    console.log(`Auto-cleanup: Deleted ${result.changes} expired events and ${orphanedEnrollments.changes} orphaned enrollments`);

    return NextResponse.json({ 
      success: true, 
      deletedEvents: result.changes,
      deletedEnrollments: orphanedEnrollments.changes
    });
  } catch (err) {
    console.error("Auto-cleanup error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
