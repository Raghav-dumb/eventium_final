"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/app/lib/auth-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Users, Edit, Clock } from "lucide-react";
import { formatEventDate } from "@/app/lib/utils";

export default function EventCard({ event, showEnroll = true, onEventUpdated, onEnrollmentChange }) {
  const dateInfo = formatEventDate(event?.date_time);
  const { user } = useAuth();
  const [enrolling, setEnrolling] = useState(false);
  const [unenrolling, setUnenrolling] = useState(false);

  const handleEnroll = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to enroll");
        return;
      }
      setEnrolling(true);
      const res = await fetch("/api/enrollments/enroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ event_id: event.event_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to enroll");
      }
      toast.success("Enrolled successfully");
      if (onEnrollmentChange) {
        onEnrollmentChange(event.event_id, true);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to manage enrollment");
        return;
      }
      setUnenrolling(true);
      const res = await fetch("/api/enrollments/unenroll", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ event_id: event.event_id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to unenroll");
      }
      toast.success("Unenrolled successfully");
      if (onEnrollmentChange) {
        onEnrollmentChange(event.event_id, false);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUnenrolling(false);
    }
  };

  const isHost = user && event && Number(event.host_id) === Number(user.id);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <CardTitle className="text-lg flex justify-between items-start gap-3">
          <span>{event.title}</span>
          <div className="flex gap-2">
            {isHost && (
              <Button size="sm" variant="outline" onClick={() => onEventUpdated && onEventUpdated(event)}>
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            {showEnroll && !isHost ? (
              event.is_enrolled > 0 ? (
                <Button size="sm" variant="outline" onClick={handleUnenroll} disabled={unenrolling || dateInfo.isExpired}>
                  {unenrolling ? "Unenrolling..." : "Unenroll"}
                </Button>
              ) : (
                <Button size="sm" onClick={handleEnroll} disabled={enrolling || dateInfo.isExpired}>
                  {enrolling ? "Enrolling..." : dateInfo.isExpired ? "Expired" : "Enroll"}
                </Button>
              )
            ) : null}
          </div>
        </CardTitle>
        {event.description ? (
          <CardDescription className="line-clamp-2">{event.description}</CardDescription>
        ) : null}
      </CardHeader>
      <CardContent className="grid gap-2 text-sm text-muted-foreground">
        {dateInfo.formatted ? (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span className={dateInfo.isExpired ? "text-red-500 line-through" : ""}>
              {dateInfo.formatted}
            </span>
            {dateInfo.isExpired && (
              <span className="text-xs text-red-500 bg-red-100 px-2 py-1 rounded">
                Expired
              </span>
            )}
          </div>
        ) : null}
        {event.venue_name || event.venue_address ? (
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            <span>{event.venue_name || "Venue"}{event.venue_address ? ` • ${event.venue_address}` : ""}</span>
          </div>
        ) : null}
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4" />
          <span>{event.enrollment_count ?? 0} going</span>
        </div>
        {event.distance != null ? (
          <div className="text-xs">{(event.distance / 1000).toFixed(1)} km away</div>
        ) : null}
        <div className="pt-2">
          <Link href={`/events/${event.event_id}`} className="text-primary hover:underline">View details</Link>
        </div>
      </CardContent>
    </Card>
  );
}
