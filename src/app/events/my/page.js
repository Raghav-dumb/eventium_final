"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import EventCard from "@/app/components/EventCard";
import EditEventOverlay from "@/app/components/EditEventOverlay";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/app/lib/auth-context";
import { BarChart3 } from "lucide-react";

export default function MyEventsPage() {
  const { user } = useAuth();
  const [hosted, setHosted] = useState([]);
  const [enrolled, setEnrolled] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("hosted");
  const [editingEvent, setEditingEvent] = useState(null);
  const [isEditOverlayOpen, setIsEditOverlayOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setHosted([]);
          setEnrolled([]);
          setLoading(false);
          return;
        }
        const [resHosted, resEnrolled] = await Promise.all([
          fetch("/api/events/my", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/enrollments/my", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const dataHosted = await resHosted.json();
        const dataEnrolled = await resEnrolled.json();
        if (!resHosted.ok) throw new Error(dataHosted.error || "Failed to fetch your hosted events");
        if (!resEnrolled.ok) throw new Error(dataEnrolled.error || "Failed to fetch enrolled events");
        setHosted(Array.isArray(dataHosted.events) ? dataHosted.events : []);
        setEnrolled(Array.isArray(dataEnrolled.events) ? dataEnrolled.events : []);
      } catch (err) {
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (!user) {
    if (typeof window !== "undefined") {
      window.location.replace("/register");
    }
    return null;
  }

  const handleEditEvent = (event) => {
    setEditingEvent(event);
    setIsEditOverlayOpen(true);
  };

  const handleEventUpdated = () => {
    // Refresh the hosted events list
    loadHostedEvents();
  };

  const handleEnrollmentChange = (eventId, isEnrolled) => {
    // Update both hosted and enrolled events lists
    setHosted(prevEvents => 
      prevEvents.map(event => 
        event.event_id === eventId 
          ? { ...event, is_enrolled: isEnrolled ? 1 : 0 }
          : event
      )
    );
    setEnrolled(prevEvents => 
      prevEvents.map(event => 
        event.event_id === eventId 
          ? { ...event, is_enrolled: isEnrolled ? 1 : 0 }
          : event
      )
    );
  };

  const loadHostedEvents = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      const res = await fetch("/api/events/my", { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      const data = await res.json();
      if (res.ok) {
        setHosted(Array.isArray(data.events) ? data.events : []);
      }
    } catch (err) {
      console.error("Failed to refresh hosted events:", err);
    }
  };

  const renderGrid = (list) => (
    list.length === 0 ? (
      <Card>
        <CardHeader>
          <CardTitle>No events</CardTitle>
          <CardDescription>
            {activeTab === "hosted" ? "You haven't created any events." : "You haven't enrolled in any events."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeTab === "hosted" ? (
            <Link href="/events/create">
              <Button>Create your first event</Button>
            </Link>
          ) : null}
        </CardContent>
      </Card>
    ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((e) => (
                     <EventCard 
             key={e.event_id} 
             event={e} 
             onEventUpdated={activeTab === "hosted" ? handleEditEvent : undefined}
             onEnrollmentChange={handleEnrollmentChange}
           />
        ))}
      </div>
    )
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Events</h1>
        <div className="flex gap-3">
          {hosted.length > 0 && (
            <Link href="/dashboard">
              <Button variant="outline" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Dashboard
              </Button>
            </Link>
          )}
          <Link href="/events/create"><Button>Create Event</Button></Link>
        </div>
      </div>

      <div className="mb-6 border-b">
        <nav className="-mb-px flex gap-6" aria-label="Tabs">
          <button
            className={`whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium ${activeTab === "hosted" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            onClick={() => setActiveTab("hosted")}
          >
            Hosted
          </button>
          <button
            className={`whitespace-nowrap border-b-2 px-1 pb-2 text-sm font-medium ${activeTab === "enrolled" ? "border-primary text-primary" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            onClick={() => setActiveTab("enrolled")}
          >
            Enrolled
          </button>
        </nav>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : activeTab === "hosted" ? (
        renderGrid(hosted)
      ) : (
        renderGrid(enrolled)
      )}

      <EditEventOverlay
        event={editingEvent}
        isOpen={isEditOverlayOpen}
        onClose={() => {
          setIsEditOverlayOpen(false);
          setEditingEvent(null);
        }}
        onEventUpdated={handleEventUpdated}
      />
    </div>
  );
}
