"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, MapPin, Calendar, User, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/app/lib/auth-context";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState("");
  const [locationCoords, setLocationCoords] = useState(null);
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);
  const [manualOverlayOpen, setManualOverlayOpen] = useState(false);
  const [manualQuery, setManualQuery] = useState("");
  const [manualLoading, setManualLoading] = useState(false);
  const [manualResults, setManualResults] = useState([]);
  const [manualOpen, setManualOpen] = useState(false);
  const manualTimerRef = useRef(null);
  const { user, logout } = useAuth();
  const locationMenuRef = useRef(null);

  // Unified search overlay state (A–E)
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [searchMode, setSearchMode] = useState(null); // 'events' | 'venues' | 'categories' | 'datetime' | 'history'
  const [searchInput, setSearchInput] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const suggestTimerRef = useRef(null);

  useEffect(() => {
    // Load saved location from session first
    try {
      const saved = sessionStorage.getItem("userLocation");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.label && parsed?.lat != null && parsed?.lng != null) {
          setUserLocation(parsed.label);
          setLocationCoords({ lat: parsed.lat, lng: parsed.lng });
          return;
        }
      }
    } catch (e) {}
    // No pre-saved location; show placeholder
    setUserLocation("Set location");
  }, []);

  const saveLocation = ({ lat, lng, label }) => {
    const truncated = label && label.length > 40 ? label.slice(0, 40) + "..." : label;
    setUserLocation(truncated || `${lat.toFixed(3)}, ${lng.toFixed(3)}`);
    setLocationCoords({ lat, lng });
    try {
      sessionStorage.setItem("userLocation", JSON.stringify({ lat, lng, label: truncated || `${lat.toFixed(3)}, ${lng.toFixed(3)}` }));
    } catch (e) {}
  };

  // Close desktop location dropdown on outside click / Escape
  useEffect(() => {
    const handleClick = (e) => {
      if (!locationMenuOpen) return;
      const el = locationMenuRef.current;
      if (el && !el.contains(e.target)) {
        setLocationMenuOpen(false);
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setLocationMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick, { passive: true });
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [locationMenuOpen]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setUserLocation("Geolocation not supported");
      return;
    }
      navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        // Try reverse geocoding for a friendly label
        (async () => {
          try {
            const res = await fetch(`/api/reverse-geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
            const data = await res.json();
            const label = res.ok && data?.label ? data.label : `${lat.toFixed(3)}, ${lng.toFixed(3)}`;
            saveLocation({ lat, lng, label });
          } catch (_) {
            saveLocation({ lat, lng, label: `${lat.toFixed(3)}, ${lng.toFixed(3)}` });
          }
        })();
        setLocationMenuOpen(false);
        resetSearchContext();
      },
      (err) => {
        console.log("Location access denied or error:", err);
          setUserLocation("Location unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 15000 }
    );
  };

  const openManualOverlay = () => {
    setManualQuery("");
    setManualResults([]);
    setManualOpen(false);
    setManualOverlayOpen(true);
    setLocationMenuOpen(false);
  };

  const resetSearchContext = () => {
    setSearchQuery("");
    setSearchOverlayOpen(false);
    setSearchMode(null);
    setSearchInput("");
    setSuggestions([]);
  };

  const loadHistory = () => {
    try {
      const raw = localStorage.getItem("searchHistory") || "[]";
      const hist = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      setSuggestions(hist.map((h) => ({ key: `hist:${h}`, type: 'history', title: h })));
    } catch (_) {
      setSuggestions([]);
    }
  };

  const getHistory = () => {
    try {
      const raw = localStorage.getItem("searchHistory") || "[]";
      const hist = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      return hist;
    } catch (_) { return []; }
  };

  const onSuggestChange = (val) => {
    setSearchInput(val);
    if (suggestTimerRef.current) clearTimeout(suggestTimerRef.current);
    if (!val.trim()) { setSuggestions([]); return; }
    suggestTimerRef.current = setTimeout(async () => {
      try {
        setSuggestLoading(true);
        const ll = locationCoords ? `${locationCoords.lat},${locationCoords.lng}` : "";
        if (searchMode === 'venues') {
          // Use geocode endpoint as place autocomplete
          const res = await fetch(`/api/geocode?q=${encodeURIComponent(val.trim())}&limit=5${ll ? `&ll=${encodeURIComponent(ll)}` : ''}`);
          const data = await res.json();
          const items = (data?.results || []).map((r) => ({ key: `venue:${r.fsq_place_id || `${r.lat},${r.lng}`}`, type: 'venue', title: r.name || r.address || 'Unnamed', subtitle: r.address || `${r.lat}, ${r.lng}`, lat: r.lat, lng: r.lng }));
          setSuggestions(items);
        } else if (searchMode === 'categories') {
          // Client-only list from EVENT_CATEGORIES
          try {
            const mod = await import("@/app/lib/categories");
            const cats = Array.isArray(mod.EVENT_CATEGORIES) ? mod.EVENT_CATEGORIES : [];
            const items = cats.filter(c => c.toLowerCase().includes(val.trim().toLowerCase())).slice(0, 8).map((c) => ({ key: `cat:${c}`, type: 'category', title: c }));
            setSuggestions(items);
          } catch { setSuggestions([]); }
        } else if (searchMode === 'events') {
          // 'events' mode: fetch titles near location using filter endpoint minimal query
          const res = await fetch(`/api/events/filter`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ latitude: locationCoords?.lat, longitude: locationCoords?.lng, radius: 5000, searchQuery: val.trim() }) });
          const data = await res.json();
          const items = Array.isArray(data?.events) ? data.events.slice(0, 8).map((e) => ({ key: `event:${e.event_id}`, type: 'event', title: e.title, subtitle: e.location_name || e.venue_name || e.address || '' , eventId: e.event_id })) : [];
          setSuggestions(items);
    } else {
          // No mode selected: aggregate events, categories, venues in parallel
          const tasks = [];
          // Events
          tasks.push((async () => {
            try {
              const res = await fetch(`/api/events/filter`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ latitude: locationCoords?.lat, longitude: locationCoords?.lng, radius: 5000, searchQuery: val.trim() }) });
              const data = await res.json();
              return Array.isArray(data?.events) ? data.events.slice(0, 6).map((e) => ({ key: `event:${e.event_id}`, type: 'event', title: e.title, subtitle: e.location_name || e.venue_name || e.address || '' , eventId: e.event_id })) : [];
            } catch { return []; }
          })());
          // Categories
          tasks.push((async () => {
            try {
              const mod = await import("@/app/lib/categories");
              const cats = Array.isArray(mod.EVENT_CATEGORIES) ? mod.EVENT_CATEGORIES : [];
              return cats.filter(c => c.toLowerCase().includes(val.trim().toLowerCase())).slice(0, 6).map((c) => ({ key: `cat:${c}`, type: 'category', title: c }));
            } catch { return []; }
          })());
          // Venues
          tasks.push((async () => {
            try {
              const res = await fetch(`/api/geocode?q=${encodeURIComponent(val.trim())}&limit=5${ll ? `&ll=${encodeURIComponent(ll)}` : ''}`);
              const data = await res.json();
              return (data?.results || []).map((r) => ({ key: `venue:${r.fsq_place_id || `${r.lat},${r.lng}`}`, type: 'venue', title: r.name || r.address || 'Unnamed', subtitle: r.address || `${r.lat}, ${r.lng}`, lat: r.lat, lng: r.lng }));
            } catch { return []; }
          })());

          const results = await Promise.all(tasks);
          const merged = [...results[0], ...results[1], ...results[2]].slice(0, 12);
          setSuggestions(merged);
        }
      } catch (_) {
        setSuggestions([]);
      } finally {
        setSuggestLoading(false);
      }
    }, 250);
  };

  const navigateWithParams = ({ q, dates }) => {
    if (!locationCoords) return;
    const params = new URLSearchParams();
    params.set("ll", `${locationCoords.lat},${locationCoords.lng}`);
    if (q) params.set("q", q);
    if (dates) params.set("dates", dates);
    window.location.href = `/events?${params.toString()}`;
  };

  const onSuggestionClick = (s) => {
    if (s.type === 'venue' && s.lat != null && s.lng != null) {
      // Navigate to events near venue lat/lng
      const params = new URLSearchParams();
      params.set("ll", `${s.lat},${s.lng}`);
      window.location.href = `/events?${params.toString()}`;
      return;
    }
    if (s.type === 'category') {
      // Navigate with category filter via POST page flow not available; send as query to be applied client-side
      const params = new URLSearchParams();
      params.set("ll", `${locationCoords.lat},${locationCoords.lng}`);
      params.set("category", s.title);
      window.location.href = `/events?${params.toString()}`;
      return;
    }
    if (s.type === 'event' && s.eventId) {
      window.location.href = `/events/${s.eventId}`;
      return;
    }
    if (s.type === 'history') {
      navigateWithParams({ q: s.title });
    }
  };
  const onManualQueryChange = (val) => {
    setManualQuery(val);
    setManualResults([]);
    setManualOpen(false);
    if (manualTimerRef.current) clearTimeout(manualTimerRef.current);
    if (!val.trim()) return;
    manualTimerRef.current = setTimeout(async () => {
      try {
        setManualLoading(true);
        const llParam = locationCoords ? `&ll=${encodeURIComponent(`${locationCoords.lat},${locationCoords.lng}`)}` : "";
        const res = await fetch(`/api/geocode?q=${encodeURIComponent(val.trim())}&limit=6${llParam}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Geocoding failed");
        setManualResults(Array.isArray(data?.results) ? data.results : []);
        setManualOpen(true);
      } catch (e) {
        // Keep silent in navbar
      } finally {
        setManualLoading(false);
      }
    }, 300);
  };

  const selectManual = (item) => {
    if (item?.lat != null && item?.lng != null) {
      saveLocation({ lat: item.lat, lng: item.lng, label: item.address || item.name || "Selected location" });
      setManualOverlayOpen(false);
      // Reset search context upon location change
      resetSearchContext();
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!locationCoords) {
      // If no location set yet, prompt location menu
      setLocationMenuOpen(true);
      return;
    }
    // If overlay is open, use its input; else use nav input
    const q = (searchOverlayOpen ? searchInput : searchQuery).trim();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("ll", `${locationCoords.lat},${locationCoords.lng}`);
    // Persist to recent history (max 5)
    try {
      const raw = localStorage.getItem("searchHistory") || "[]";
      const hist = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
      const next = [q, ...hist.filter((h) => h !== q)].filter(Boolean).slice(0, 5);
      localStorage.setItem("searchHistory", JSON.stringify(next));
    } catch(_) {}
    window.location.href = `/events?${params.toString()}`;
  };

  const initials = user?.username?.slice(0, 2)?.toUpperCase() || user?.email?.slice(0, 2)?.toUpperCase() || "U";

  return (
    <nav className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <Image 
              src="/logo.svg" 
              alt="Eventium Logo" 
              width={120} 
              height={120} 
              className="w-24 h-24"
            />
          </Link>

          {/* Desktop Search */}
          <div ref={locationMenuRef} className="hidden md:flex flex-1 max-w-md mx-8 relative">
            <form onSubmit={handleSearch} className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 h-4 w-4" />
                <Input
                  type="text"
                  placeholder={locationCoords ? "Search events, venues, categories…" : "Set location to start searching"}
                  value={searchQuery}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSearchQuery(v);
                    if (locationCoords) {
                      setSearchOverlayOpen(true);
                      setSearchMode(null);
                      setSearchInput(v);
                      onSuggestChange(v);
                    }
                  }}
                  onFocus={() => {
                    if (!locationCoords) setLocationMenuOpen(true);
                    else {
                      setSearchOverlayOpen(true);
                      setSearchMode(null);
                      if (searchQuery) {
                        setSearchInput(searchQuery);
                        onSuggestChange(searchQuery);
                      }
                    }
                  }}
                  className="pl-10 pr-12 py-2 w-full bg-gray-100 border-gray-200 text-gray-800 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setLocationMenuOpen((v) => !v)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 px-2 py-1 text-gray-700 hover:text-gray-900"
                  aria-label="Set location"
                >
                  <MapPin className="h-5 w-5" />
                </button>
              </div>
            </form>
            {locationMenuOpen && (
              <div className="absolute z-50 mt-2 top-full w-full rounded-md border bg-white shadow">
                <div className="p-3 border-b text-sm font-medium">Choose a location</div>
                <div className="p-2 grid gap-2">
                  <button
                    type="button"
                    onClick={useCurrentLocation}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 flex items-center gap-2"
                  >
                    <MapPin className="h-4 w-4" /> Use Current Location
                  </button>
                  <button
                    type="button"
                    onClick={openManualOverlay}
                    className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 flex items-center gap-2"
                  >
                    ✏️ Enter Location Manually
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {/* Location Display */}
            <button
              type="button"
              onClick={() => setLocationMenuOpen((v) => !v)}
              className="flex items-center space-x-2 text-gray-800 hover:text-gray-900"
              title="Set location"
            >
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium max-w-40 truncate" title={userLocation}>
                {userLocation}
              </span>
            </button>
            
            {user ? (
              <>
                <Link href="/events/create">
                  <Button className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="h-4 w-4" />
                    <span>Create Event</span>
                  </Button>
                </Link>
                <Link href="/events/my">
                  <Button variant="ghost" className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    <User className="h-4 w-4" />
                    <span>My Events</span>
                  </Button>
                </Link>
                {/* Avatar */}
                <div className="ml-2">
                  <Avatar>
                    <AvatarImage src={user?.avatarUrl} alt={user?.username || "User"} />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </div>
                <Button variant="ghost" onClick={logout} className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" className="text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    Log In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="ghost" className="bg-blue-600 hover:bg-blue-700 text-white">
                    Sign Up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700 hover:text-gray-900 hover:bg-gray-100"
            >
              {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden pb-4">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full bg-gray-100 border-gray-200 text-gray-800 placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </form>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden pb-4 border-t border-gray-200 pt-4">
            {/* Mobile Location Display */}
            <div className="flex items-center justify-between text-gray-800 mb-4 px-2">
              <div className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span className="text-sm font-medium" title={userLocation}>
                {userLocation}
              </span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={useCurrentLocation}>Use Current</Button>
                <Button variant="outline" size="sm" onClick={openManualOverlay}>Enter Manually</Button>
              </div>
            </div>
            
            <div className="flex flex-col space-y-2">
              <Link href="/events">
                <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                  <MapPin className="h-4 w-4 mr-2" />
                  Events
                </Button>
              </Link>
              
              {user ? (
                <>
                  <Link href="/events/create">
                    <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Event
                    </Button>
                  </Link>
                  <Link href="/events/my">
                    <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                      <User className="h-4 w-4 mr-2" />
                      My Events
                    </Button>
                  </Link>
                  <div className="px-2">
                    <Avatar>
                      <AvatarImage src={user?.avatarUrl} alt={user?.username || "User"} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                  </div>
                  <Button variant="ghost" onClick={logout} className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" className="w-full justify-start text-gray-700 hover:text-gray-900 hover:bg-gray-100">
                      Log In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button variant="ghost" className="w-full justify-start bg-blue-600 hover:bg-blue-700 text-white">
                      Sign Up
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Manual Location Overlay */}
      {manualOverlayOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50" onClick={(e) => { if (e.target === e.currentTarget) setManualOverlayOpen(false); }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold">Enter Location</div>
              <button className="p-1" onClick={() => setManualOverlayOpen(false)} aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative">
                <Input
                  autoFocus
                  placeholder="Search address or place"
                  value={manualQuery}
                  onChange={(e) => onManualQueryChange(e.target.value)}
                  onFocus={() => manualResults.length > 0 && setManualOpen(true)}
                  className="pl-3"
                />
                {manualLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">Searching...</div>
                )}
              </div>
              {manualOpen && (
                <div className="mt-2 rounded-md border bg-white shadow max-h-64 overflow-auto">
                  {manualResults.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No results</div>
                  ) : (
                    manualResults.map((r) => (
                      <button
                        key={r.fsq_place_id || `${r.lat},${r.lng}`}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-50"
                        onClick={() => selectManual(r)}
                      >
                        <div className="text-sm font-medium">{r.name || "Unnamed place"}</div>
                        <div className="text-xs text-gray-600">{r.address || `${r.lat}, ${r.lng}`}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setManualOverlayOpen(false)}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search Modes Overlay */}
      {searchOverlayOpen && locationCoords && (
        <div className="fixed inset-0 z-[55] flex items-start justify-center pt-20 bg-black/30" onClick={(e) => { if (e.target === e.currentTarget) setSearchOverlayOpen(false); }}>
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <div className="font-semibold">Search</div>
              <button className="p-1" onClick={() => setSearchOverlayOpen(false)} aria-label="Close"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4 space-y-3">
              {/* Mode chips A–E */}
              <div className="flex flex-wrap gap-2">
                <Button variant={searchMode === 'events' ? 'default' : 'outline'} size="sm" onClick={() => { setSearchMode('events'); setSearchInput(searchInput || searchQuery); onSuggestChange(searchInput || searchQuery); }}>Events</Button>
                <Button variant={searchMode === 'venues' ? 'default' : 'outline'} size="sm" onClick={() => { setSearchMode('venues'); setSearchInput(searchInput || searchQuery); onSuggestChange(searchInput || searchQuery); }}>Location / Venue</Button>
                <Button variant={searchMode === 'datetime' ? 'default' : 'outline'} size="sm" onClick={() => { setSearchMode('datetime'); setSuggestions([]); }}>Date / Time</Button>
                <Button variant={searchMode === 'categories' ? 'default' : 'outline'} size="sm" onClick={() => { setSearchMode('categories'); setSearchInput(searchInput || searchQuery); onSuggestChange(searchInput || searchQuery); }}>Categories</Button>
                <Button variant={searchMode === 'history' ? 'default' : 'outline'} size="sm" onClick={() => { setSearchMode('history'); loadHistory(); }}>Recent</Button>
              </div>

              {/* Input */}
              {(searchMode !== 'datetime' && searchMode !== 'history') && (
                <Input
                  autoFocus
                  placeholder={searchMode === 'venues' ? 'Search places or areas' : searchMode === 'categories' ? 'Search categories' : 'Search events'}
                  value={searchInput}
                  onChange={(e) => onSuggestChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(e); }}
                />
              )}

              {/* Date presets */}
              {searchMode === 'datetime' && (
                <div className="flex flex-wrap gap-2">
                  {[
                    { k: 'today', label: 'Today' },
                    { k: 'tomorrow', label: 'Tomorrow' },
                    { k: 'weekend', label: 'This Weekend' },
                    { k: 'next_week', label: 'Next Week' },
                  ].map((d) => (
                    <Button key={d.k} variant="outline" onClick={() => navigateWithParams({ dates: d.k })}>{d.label}</Button>
                  ))}
                </div>
              )}

              {/* History */}
              {searchMode === 'history' && (
                <div className="space-y-1">
                  {(getHistory()).length === 0 ? (
                    <div className="text-sm text-gray-500">No recent searches</div>
                  ) : (
                    getHistory().map((h) => (
                      <button key={h} className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 flex items-center gap-2" onClick={() => navigateWithParams({ q: h })}>
                        <span className="inline-block text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">Recent</span>
                        <span>{h}</span>
                      </button>
                    ))
                  )}
                </div>
              )}

              {/* Suggestions list with badges */}
              {(searchMode == null || ['events','venues','categories'].includes(searchMode)) && (
                <div className="rounded-md border bg-white max-h-72 overflow-auto">
                  {suggestLoading ? (
                    <div className="px-3 py-2 text-sm text-gray-500">Searching…</div>
                  ) : suggestions.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">No results</div>
                  ) : (
                    suggestions.map((s) => (
                      <button key={s.key} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2" onClick={() => onSuggestionClick(s)}>
                        <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded ${s.type==='event' ? 'bg-blue-100 text-blue-700' : s.type==='venue' ? 'bg-green-100 text-green-700' : 'bg-purple-100 text-purple-700'}`}>{s.type === 'event' ? 'Event' : s.type === 'venue' ? 'Venue' : 'Category'}</span>
                        <span className="font-medium text-sm">{s.title}</span>
                        {s.subtitle && <span className="text-xs text-gray-600">{s.subtitle}</span>}
                      </button>
                    ))
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setSearchOverlayOpen(false)}>Close</Button>
                <Button onClick={(e) => handleSearch(e)}>Search</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
