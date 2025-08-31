"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/app/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, MapPin, TrendingUp, Eye, Edit, BarChart3, PieChart, Activity, Trash2 } from "lucide-react";
import { BarChartComponent, LineChartComponent, PieChartComponent } from "@/components/ui/charts";
import { toast } from "sonner";

export default function HostDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    totalEnrollments: 0,
    averageEnrollments: 0,
    upcomingEvents: 0
  });
  const [enrollmentTimePeriod, setEnrollmentTimePeriod] = useState(5); // 5, 7, 14, or 30 days
  const [monthlyTimePeriod, setMonthlyTimePeriod] = useState(30); // 5, 7, 14, or 30 days
  const [enrollmentHistory, setEnrollmentHistory] = useState([]);
  const [cleaningUp, setCleaningUp] = useState(false);

  useEffect(() => {
    if (user) {
      fetchHostEvents();
    }
  }, [user]);

  const handleCleanup = async () => {
    try {
      setCleaningUp(true);
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to perform cleanup");
        return;
      }

      const response = await fetch("/api/events/cleanup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Cleanup completed: ${result.deletedEvents} events and ${result.deletedEnrollments} enrollments removed`);
        // Refresh the dashboard data
        fetchHostEvents();
      } else {
        throw new Error("Cleanup failed");
      }
    } catch (error) {
      console.error("Cleanup error:", error);
      toast.error("Failed to perform cleanup");
    } finally {
      setCleaningUp(false);
    }
  };

  const fetchHostEvents = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        toast.error("Please log in to access dashboard");
        return;
      }

      const response = await fetch("/api/events/my", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch events");
      }

      const data = await response.json();
      const hostEvents = data.events || [];
      
      setEvents(hostEvents);
      
      if (hostEvents.length > 0) {
        setSelectedEvent(hostEvents[0]);
        calculateStats(hostEvents);
        fetchEnrollmentHistory(hostEvents[0].event_id);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollmentHistory = async (eventId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await fetch(`/api/events/${eventId}/enrollments/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setEnrollmentHistory(data.enrollments || []);
      }
    } catch (error) {
      console.error("Error fetching enrollment history:", error);
    }
  };

  const calculateStats = (eventsList) => {
    const totalEvents = eventsList.length;
    const totalEnrollments = eventsList.reduce((sum, event) => sum + (event.enrollment_count || 0), 0);
    const averageEnrollments = totalEvents > 0 ? Math.round(totalEnrollments / totalEvents) : 0;
    const upcomingEvents = eventsList.filter(event => new Date(event.date_time) > new Date()).length;

    setStats({
      totalEvents,
      totalEnrollments,
      averageEnrollments,
      upcomingEvents
    });
  };

  const getChartData = () => {
    if (!selectedEvent) return { enrollmentTrend: [], categoryBreakdown: [], monthlyEvents: [] };

    // Generate enrollment trend data for the selected time period using real data
    const generateEnrollmentTrend = (days) => {
      const data = [];
      const today = new Date();
      
      // If no enrollment history, show current enrollment count for all days
      if (!enrollmentHistory || enrollmentHistory.length === 0) {
        const currentEnrollmentCount = selectedEvent.enrollment_count || 0;
        
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          
          data.push({
            name: dayName,
            total: currentEnrollmentCount
          });
        }
        
        return data;
      }
      
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Count enrollments that happened on this specific date
        const enrollmentsOnDate = enrollmentHistory.filter(enrollment => {
          const enrollmentDate = new Date(enrollment.enrolled_at);
          return enrollmentDate.toDateString() === date.toDateString();
        }).length;
        
        data.push({
          name: dayName,
          total: enrollmentsOnDate
        });
      }
      
      return data;
    };

    // Generate events data for the selected time period using real data
    const generateMonthlyEvents = (days) => {
      const data = [];
      const today = new Date();
      
      console.log('Generating events overview for', days, 'days');
      console.log('Selected event:', selectedEvent?.title);
      console.log('Enrollment history:', enrollmentHistory);
      
      // If no selected event, show 0 for all days
      if (!selectedEvent) {
        console.log('No selected event, showing 0 for all days');
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          
          data.push({
            name: dayName,
            total: 0
          });
        }
        return data;
      }
      
      // If no enrollment history, show current enrollment count for all days
      if (!enrollmentHistory || enrollmentHistory.length === 0) {
        console.log('No enrollment history available, using current enrollment count');
        const currentEnrollmentCount = selectedEvent.enrollment_count || 0;
        
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          
          data.push({
            name: dayName,
            total: currentEnrollmentCount
          });
        }
        
        return data;
      }
      
      // Use real enrollment history data like the enrollment trend chart
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dayName = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        
        // Count enrollments that happened on this specific date
        const enrollmentsOnDate = enrollmentHistory.filter(enrollment => {
          const enrollmentDate = new Date(enrollment.enrolled_at);
          return enrollmentDate.toDateString() === date.toDateString();
        }).length;
        
        data.push({
          name: dayName,
          total: enrollmentsOnDate
        });
      }
      
      console.log('Generated events overview data:', data);
      return data;
    };

    const enrollmentTrend = generateEnrollmentTrend(enrollmentTimePeriod);
    const monthlyEvents = generateMonthlyEvents(monthlyTimePeriod);

    // Category breakdown using real data
    const categoryBreakdown = [
      { name: "Enrolled", value: selectedEvent.enrollment_count || 0 },
      { name: "Available", value: Math.max(0, (selectedEvent.capacity || 100) - (selectedEvent.enrollment_count || 0)) },
    ];

    return { enrollmentTrend, categoryBreakdown, monthlyEvents };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-600">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600">Please log in to access your dashboard.</p>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">No Events Found</h1>
          <p className="text-gray-600 mb-6">You haven't created any events yet. Create your first event to access the dashboard.</p>
          <Button onClick={() => window.location.href = '/events/create'}>
            Create Event
          </Button>
        </div>
      </div>
    );
  }

  const { enrollmentTrend, categoryBreakdown, monthlyEvents } = getChartData();

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Host Dashboard</h1>
            <p className="text-gray-600">Manage and analyze your events</p>
          </div>
          <Button 
            onClick={handleCleanup} 
            disabled={cleaningUp}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {cleaningUp ? "Cleaning..." : "Cleanup Expired Events"}
          </Button>
        </div>
      </div>

      {/* Event Selector */}
      <div className="mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Select Event to Analyze
            </CardTitle>
            <CardDescription>
              Choose an event to view detailed analytics and statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Select value={selectedEvent?.event_id} onValueChange={(value) => {
              const event = events.find(e => e.event_id === value);
              setSelectedEvent(event);
              fetchEnrollmentHistory(event.event_id);
            }}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Select an event" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.event_id} value={event.event_id}>
                    {event.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      {selectedEvent && (
        <>
          {/* Event Overview */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{selectedEvent.title}</span>
                  <Badge variant={selectedEvent.type === 'public' ? 'default' : 'secondary'}>
                    {selectedEvent.type}
                  </Badge>
                </CardTitle>
                <CardDescription>{selectedEvent.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{formatDate(selectedEvent.date_time)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">{selectedEvent.venue_name || 'Venue TBD'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {selectedEvent.enrollment_count || 0} / {selectedEvent.capacity || '∞'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {selectedEvent.event_category || 'Uncategorized'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEvents}</div>
                <p className="text-xs text-muted-foreground">Events you've created</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalEnrollments}</div>
                <p className="text-xs text-muted-foreground">Across all events</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Enrollments</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.averageEnrollments}</div>
                <p className="text-xs text-muted-foreground">Per event</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Events</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.upcomingEvents}</div>
                <p className="text-xs text-muted-foreground">Future events</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Enrollment Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Enrollment Trend
                </CardTitle>
                <CardDescription>Enrollment growth over time</CardDescription>
                <div className="flex gap-2 mt-2">
                  {[5, 7, 14, 30].map((days) => (
                    <Button
                      key={days}
                      variant={enrollmentTimePeriod === days ? "default" : "outline"}
                      size="sm"
                      onClick={() => setEnrollmentTimePeriod(days)}
                    >
                      {days} days
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <LineChartComponent data={enrollmentTrend} />
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Enrollment Status
                </CardTitle>
                <CardDescription>Current enrollment vs. capacity</CardDescription>
              </CardHeader>
              <CardContent>
                <PieChartComponent data={categoryBreakdown} />
              </CardContent>
            </Card>
          </div>

          {/* Daily Enrollments Chart */}
          <div className="mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Daily Enrollments Overview
                </CardTitle>
                <CardDescription>Daily enrollment activity for this event</CardDescription>
                <div className="flex gap-2 mt-2">
                  {[5, 7, 14, 30].map((days) => (
                    <Button
                      key={days}
                      variant={monthlyTimePeriod === days ? "default" : "outline"}
                      size="sm"
                      onClick={() => setMonthlyTimePeriod(days)}
                    >
                      {days} days
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <BarChartComponent data={monthlyEvents} />
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <Button onClick={() => window.location.href = `/events/${selectedEvent.event_id}`}>
              <Eye className="h-4 w-4 mr-2" />
              View Event
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/events/create'}>
              <Edit className="h-4 w-4 mr-2" />
              Create New Event
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/events/my'}>
              <BarChart3 className="h-4 w-4 mr-2" />
              My Events
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
