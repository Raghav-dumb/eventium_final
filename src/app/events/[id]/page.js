"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MapPin, Calendar, Users, Building2, Image as ImageIcon, Tag } from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";

export default function EventDetailPage() {
  const params = useParams();
  const { id } = params || {};
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/events/${id}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load event");
        setEvent(data.event);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    if (id) load();
  }, [id]);

  const handleEnroll = async () => {
    if (!user) {
      toast.error("Please log in to enroll in events");
      return;
    }

    setEnrolling(true);
    try {
      const res = await fetch("/api/enrollments/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_id: id }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to enroll");
      
      toast.success("Successfully enrolled in event!");
      const eventRes = await fetch(`/api/events/${id}`);
      const eventData = await eventRes.json();
      if (eventRes.ok) {
        setEvent(eventData.event);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEnrolling(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-48 bg-gray-200 rounded"></div>
            <div className="h-48 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="p-8 text-center border rounded-xl bg-card">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Event Not Found</h2>
          <p className="text-gray-600">The event you're looking for doesn't exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const isHost = user && event.host_id === user.id;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Full-width image placeholder with overlays */}
      <div className="relative overflow-hidden rounded-xl border bg-card">
        <div className="w-full bg-gray-100 flex items-center justify-center h-64 sm:h-80 lg:h-[380px]">
          <div className="text-center text-gray-500">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">Image Placeholder for Future</p>
          </div>
        </div>

        {/* Overlays: category & enroll only */}
        <div className="absolute inset-0 p-4 lg:p-6 flex flex-col justify-between pointer-events-none">
          <div className="flex justify-start">
            <Badge variant="secondary" className="pointer-events-auto">{event.event_category || "Event"}</Badge>
          </div>
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-bold text-gray-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]">
              {event.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 pointer-events-auto">
              {!isHost && (
                <Button onClick={handleEnroll} disabled={enrolling} className="shadow">
                  {enrolling ? "Enrolling..." : "Enroll"}
                </Button>
              )}
              {isHost && (
                <span className="inline-flex items-center bg-white/90 backdrop-blur-sm rounded-md px-3 py-1.5 shadow text-sm text-gray-700">
                  You're hosting this event
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Body sections without boxes */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Description & FAQs (no card) */}
        <section>
          <h2 className="text-xl font-semibold text-gray-900">Description</h2>
          <Separator className="my-4" />
          <div className="prose prose-sm max-w-none">
            {event.description ? (
              <p className="text-gray-700 leading-relaxed">{event.description}</p>
            ) : (
              <p className="text-gray-500 italic">No description provided.</p>
            )}
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">FAQs</h3>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>What should I bring?</AccordionTrigger>
                <AccordionContent>
                  Please bring comfortable clothing and any specific items mentioned in the event description. If you have any questions, feel free to contact the event organizer.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-2">
                <AccordionTrigger>Is there parking available?</AccordionTrigger>
                <AccordionContent>
                  Parking availability varies by venue. Please check the venue details or contact the organizer for specific parking information.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="item-3">
                <AccordionTrigger>Can I bring guests?</AccordionTrigger>
                <AccordionContent>
                  Guest policies depend on the event type and venue capacity. Please check with the event organizer before bringing additional guests.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* Venue details boxed with thin outline */}
        <section>
          <div className="rounded-xl border p-6">
            <h2 className="text-xl font-semibold text-gray-900">Venue Details</h2>
            <Separator className="my-4" />
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">When</p>
                  <p className="text-sm text-gray-600">{event.date_time ? new Date(event.date_time).toLocaleString() : "TBD"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Venue</p>
                  <p className="text-sm text-gray-600">{event.venue_name || "TBD"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Address</p>
                  <p className="text-sm text-gray-600">{event.venue_address || "TBD"}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Tag className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Category</p>
                  <p className="text-sm text-gray-600">{event.event_category || "Event"}</p>
                </div>
      </div>
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-500" />
      <div>
                  <p className="text-sm font-medium text-gray-900">Attendees</p>
                  <p className="text-sm text-gray-600">{event.enrollment_count || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
