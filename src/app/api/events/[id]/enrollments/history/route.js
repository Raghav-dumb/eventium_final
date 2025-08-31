import { NextResponse } from 'next/server';
import { verifyToken } from '@/app/lib/auth';
import { getDB, dbAll } from '@/app/lib/db';

export async function GET(request, { params }) {
  try {
    // Verify JWT token
    const authResult = verifyToken(request);
    if (!authResult.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId } = await params;
    const userId = authResult.decoded.id;

    // Get database connection
    const db = getDB();

    // Check if the user is the host of this event
    const eventCheckQuery = `
      SELECT host_id FROM events WHERE event_id = ?
    `;
    const eventCheck = await dbAll(db, eventCheckQuery, [eventId]);
    
    if (!eventCheck.length || eventCheck[0].host_id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Fetch enrollment history for the event
    const enrollmentHistoryQuery = `
      SELECT 
        e.enrollment_id,
        e.user_id,
        e.enrolled_at,
        u.username,
        u.email
      FROM event_enrollments e
      JOIN users u ON e.user_id = u.id
      WHERE e.event_id = ?
      ORDER BY e.enrolled_at DESC
    `;

    const enrollments = await dbAll(db, enrollmentHistoryQuery, [eventId]);

    return NextResponse.json({
      success: true,
      enrollments: enrollments.map(enrollment => ({
        enrollment_id: enrollment.enrollment_id,
        user_id: enrollment.user_id,
        enrolled_at: enrollment.enrolled_at,
        user_name: enrollment.username,
        email: enrollment.email
      }))
    });

  } catch (error) {
    console.error('Error fetching enrollment history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
