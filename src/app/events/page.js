"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Filter, X, Search, MapPin } from "lucide-react";
import EventCard from "@/app/components/EventCard";
import MapView from "@/app/components/MapView";
import { EVENT_CATEGORIES } from "@/app/lib/categories";

export default function EventsPage() {
  const search = useSearchParams();
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState([]);

  // Address search state
  const [address, setAddress] = useState("");
  const [addrResults, setAddrResults] = useState([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrOpen, setAddrOpen] = useState(false);
  const addrTimerRef = useRef(null);

  // Filter state
  const [filters, setFilters] = useState({
    category: "all",
    venueCategory: "",
    dateFrom: "",
    dateTo: "",
    capacityMin: "",
    capacityMax: "",
    searchQuery: "",
    radius: 5000
  });
  const [activeFilters, setActiveFilters] = useState(0);
  const [filterLoading, setFilterLoading] = useState(false);

  // Auto-fetch ONLY when no URL-driven filters are present
  useEffect(() => {
    const hasCoords = Boolean(latitude && longitude);
    if (!hasCoords) return;
    const hasQ = Boolean(search.get("q"));
    const hasCat = Boolean(search.get("category"));
    const hasDates = Boolean(search.get("dates"));
    if (hasQ || hasCat || hasDates) return; // URL filters will drive fetching elsewhere
    fetchEvents();
  }, [latitude, longitude, search]);

  // Initialize location from URL or session storage; apply query presets
  useEffect(() => {
    // Prefer ll from URL
    const ll = search.get("ll");
    if (ll && ll.includes(",")) {
      const [latStr, lonStr] = ll.split(",");
      if (latStr && lonStr) {
        setLatitude(String(latStr.trim()));
        setLongitude(String(lonStr.trim()));
      }
    } else {
      // Fallback to session storage saved by navbar
      try {
        const saved = sessionStorage.getItem("userLocation");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.lat != null && parsed?.lng != null) {
            setLatitude(String(parsed.lat));
            setLongitude(String(parsed.lng));
          }
        }
      } catch (_) {}
    }

    // Apply category, searchQuery and dates presets from URL
    const cat = search.get("category");
    const dates = search.get("dates");
    const qParam = search.get("q");
    setFilters(prev => ({
      ...prev,
      category: cat ? cat : prev.category,
      searchQuery: qParam ? qParam : prev.searchQuery,
      ...computeDatePreset(dates)
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // One-time auto-fetch when coords ready and query params present
  const didAutoFetchRef = useRef(false);
  useEffect(() => {
    if (didAutoFetchRef.current) return;
    const hasCoords = Boolean(latitude && longitude);
    if (!hasCoords) return;
    const hasQ = Boolean(search.get("q"));
    const hasCat = Boolean(search.get("category"));
    const hasDates = Boolean(search.get("dates"));
    if (hasQ || hasCat || hasDates) {
      didAutoFetchRef.current = true;
      // Apply filters directly to ensure category queries like "Concerts" are respected
      applyFilters();
    }
  }, [latitude, longitude, search]);

  // Count active filters
  useEffect(() => {
    const count = Object.values(filters).filter(value => 
      value !== "" && value !== null && value !== 5000 && value !== "all"
    ).length;
    setActiveFilters(count);
  }, [filters]);

  const handleEnrollmentChange = (eventId, isEnrolled) => {
    setEvents(prevEvents => 
      prevEvents.map(event => 
        event.event_id === eventId 
          ? { ...event, is_enrolled: isEnrolled ? 1 : 0 }
          : event
      )
    );
  };

  // Debounced geocoding query
  const onAddressChange = (val) => {
    setAddress(val);
    setAddrResults([]);
    setAddrOpen(false);
    if (addrTimerRef.current) clearTimeout(addrTimerRef.current);
    if (!val.trim()) return;
    addrTimerRef.current = setTimeout(async () => {
      try {
        setAddrLoading(true);
        const llParam = (latitude && longitude)
          ? `&ll=${encodeURIComponent(`${latitude},${longitude}`)}`
          : "";
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val.trim())}&limit=5${llParam}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Geocoding failed");
        setAddrResults(Array.isArray(data?.results) ? data.results : []);
        setAddrOpen(true);
      } catch (e) {
        toast.error(e.message || "Geocoding failed");
      } finally {
        setAddrLoading(false);
      }
    }, 300);
  };

  const selectAddress = (item) => {
    if (item?.lat != null && item?.lng != null) {
      setLatitude(String(item.lat));
      setLongitude(String(item.lng));
      toast.success(item?.address ? `Using: ${item.address}` : "Coordinates set");
      setAddrOpen(false);
    } else {
      toast.error("No coordinates for this result");
    }
  };

  const userLocation =
    Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
      ? [Number(latitude), Number(longitude)]
      : null;

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setLatitude(String(lat));
        setLongitude(String(lon));
        toast.success("Location detected");
      },
      () => toast.error("Unable to retrieve your location")
    );
  };

  const clearFilters = () => {
    setFilters({
      category: "all",
      venueCategory: "",
      dateFrom: "",
      dateTo: "",
      capacityMin: "",
      capacityMax: "",
      searchQuery: "",
      radius: 5000
    });
  };

  // Map preset keys to date range
  const computeDatePreset = (preset) => {
    const toISO = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };
    const startOfDay = (d) => { const x = new Date(d); x.setHours(0,0,0,0); return x; };
    const endOfDay = (d) => { const x = new Date(d); x.setHours(23,59,59,999); return x; };
    const today = new Date();
    if (preset === 'today') {
      return { dateFrom: toISO(startOfDay(today)), dateTo: toISO(endOfDay(today)) };
    }
    if (preset === 'tomorrow') {
      const t = new Date(today); t.setDate(t.getDate() + 1);
      return { dateFrom: toISO(startOfDay(t)), dateTo: toISO(endOfDay(t)) };
    }
    if (preset === 'weekend') {
      // Find upcoming Saturday and Sunday
      const t = new Date(today);
      const day = t.getDay(); // 0 Sun - 6 Sat
      const diffToSat = (6 - day + 7) % 7; // days until Saturday
      const sat = new Date(t); sat.setDate(t.getDate() + diffToSat);
      const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
      return { dateFrom: toISO(startOfDay(sat)), dateTo: toISO(endOfDay(sun)) };
    }
    if (preset === 'next_week') {
      // Next week Monday to Sunday
      const t = new Date(today);
      const day = t.getDay();
      const diffToMon = ((8 - day) % 7) || 7; // days until next Monday
      const mon = new Date(t); mon.setDate(t.getDate() + diffToMon);
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      return { dateFrom: toISO(startOfDay(mon)), dateTo: toISO(endOfDay(sun)) };
    }
    return {};
  };

  const fetchEvents = async () => {
    const latNum = Number(latitude);
    const lonNum = Number(longitude);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      toast.error("Please provide a valid location");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.set("ll", `${latNum},${lonNum}`);
      params.set("radius", "5000");
      const q = search.get("q");
      if (q) params.set("q", q);
      
      const headers = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/events/list?${params.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch events");
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = async () => {
    const latNum = Number(latitude);
    const lonNum = Number(longitude);
    if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
      toast.error("Please provide a valid location");
      return;
    }

    setFilterLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const filterData = {
        latitude: latNum,
        longitude: lonNum,
        radius: filters.radius,
        category: filters.category === "all" ? null : filters.category,
        venueCategory: filters.venueCategory,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
        capacityMin: filters.capacityMin,
        capacityMax: filters.capacityMax,
        searchQuery: filters.searchQuery
      };

      console.log("Frontend sending filter data:", filterData);

      const res = await fetch("/api/events/filter", {
        method: "POST",
        headers,
        body: JSON.stringify(filterData)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to filter events");
      
      console.log("Filter API response:", data);
      
      setEvents(Array.isArray(data.events) ? data.events : []);
      toast.success(`Found ${data.events.length} events matching your filters`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setFilterLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-4rem)] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Discover Events</h1>
        <Button 
          onClick={() => window.location.href = '/events/create'} 
          className="bg-blue-600 hover:bg-blue-700"
        >
          Create Event
        </Button>
      </div>
      
      <Card className="mb-4 relative z-10">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] items-end">
            <div className="space-y-2">
              <Label htmlFor="address">Search Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="address"
                  placeholder="Search by address or place (e.g., Times Square, NYC)"
                  value={address}
                  onChange={(e) => onAddressChange(e.target.value)}
                  onFocus={() => addrResults.length > 0 && setAddrOpen(true)}
                  className="pl-10"
                />
                {addrLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                    Searching...
                  </div>
                )}
                {addrOpen && (
                  <div className="absolute z-50 mt-1 w-full rounded-md border bg-white shadow max-h-72 overflow-auto">
                    {addrResults.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-gray-500">No results</div>
                    ) : (
                      addrResults.map((r) => (
                        <button
                          key={r.fsq_place_id || `${r.lat},${r.lng}`}
                          type="button"
                          className="w-full text-left px-3 py-2 hover:bg-gray-50"
                          onClick={() => selectAddress(r)}
                        >
                          <div className="text-sm font-medium">{r.name || "Unnamed place"}</div>
                          <div className="text-xs text-gray-600">{r.address || `${r.lat}, ${r.lng}`}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <Button variant="outline" onClick={useMyLocation}>
              Use my location
            </Button>

            <div className="flex gap-2">
              <Button onClick={fetchEvents} disabled={loading}>
                {loading ? "Loading..." : "Search 5km"}
              </Button>
              
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filters
                    {activeFilters > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px]">
                        {activeFilters}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Filter Events</SheetTitle>
                  </SheetHeader>
                  
                  <div className="mt-6 space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="searchQuery">Search Events</Label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            id="searchQuery"
                            placeholder="Search titles & descriptions..."
                            value={filters.searchQuery}
                            onChange={(e) => setFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                            className="pl-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category">Event Category</Label>
                        <Select
                          value={filters.category}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, category: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            {EVENT_CATEGORIES.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="venueCategory">Venue Category</Label>
                        <Input
                          id="venueCategory"
                          placeholder="e.g., Restaurant, Park, Museum"
                          value={filters.venueCategory}
                          onChange={(e) => setFilters(prev => ({ ...prev, venueCategory: e.target.value }))}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="dateFrom">From Date</Label>
                          <Input
                            id="dateFrom"
                            type="date"
                            value={filters.dateFrom}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="dateTo">To Date</Label>
                          <Input
                            id="dateTo"
                            type="date"
                            value={filters.dateTo}
                            onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="capacityMin">Min Capacity</Label>
          <Input
                            id="capacityMin"
                            type="number"
                            placeholder="Min attendees"
                            min="1"
                            value={filters.capacityMin}
                            onChange={(e) => setFilters(prev => ({ ...prev, capacityMin: e.target.value }))}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="capacityMax">Max Capacity</Label>
          <Input
                            id="capacityMax"
                            type="number"
                            placeholder="Max attendees"
                            min="1"
                            value={filters.capacityMax}
                            onChange={(e) => setFilters(prev => ({ ...prev, capacityMax: e.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="radius">Search Radius</Label>
                        <Select
                          value={filters.radius}
                          onValueChange={(value) => setFilters(prev => ({ ...prev, radius: Number(value) }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={1000}>1 km</SelectItem>
                            <SelectItem value={5000}>5 km</SelectItem>
                            <SelectItem value={10000}>10 km</SelectItem>
                            <SelectItem value={25000}>25 km</SelectItem>
                            <SelectItem value={50000}>50 km</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t">
                      {activeFilters > 0 && (
                        <Button variant="ghost" onClick={clearFilters} className="text-gray-500">
                          <X className="h-4 w-4 mr-1" />
                          Clear Filters
                        </Button>
                      )}
                      <div className="flex gap-2 ml-auto">
                        <Button onClick={applyFilters} disabled={filterLoading}>
                          {filterLoading ? "Applying..." : "Apply Filters"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 h-[calc(100%-12rem)]">
        <div className="rounded-lg overflow-hidden">
          <MapView userLocation={userLocation} events={events} className="w-full h-full" style={{ height: "100%", width: "100%" }} />
        </div>
        <div className="rounded-lg border bg-card text-card-foreground h-full overflow-y-auto p-4">
          {events.length === 0 ? (
            <div className="text-center text-muted-foreground py-12">
              {loading || filterLoading ? "Fetching events..." : "No events. Search with a location or adjust your filters."}
            </div>
          ) : (
            <div className="grid gap-4">
              {events.map((e) => (
                <EventCard 
                  key={e.event_id} 
                  event={e} 
                  onEnrollmentChange={handleEnrollmentChange}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
