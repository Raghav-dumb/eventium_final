"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/app/lib/auth-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_CATEGORIES } from "@/app/lib/categories";
import { toast } from "sonner";
import VenueMap from "@/components/VenueMap";

export default function CreateEventPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace("/register");
    }
  }, [user, router]);

  // Handle clicking outside location dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (locationDropdownRef.current && !locationDropdownRef.current.contains(event.target)) {
        setVenueSearch(prev => ({ ...prev, showLocationSuggestions: false }));
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        setVenueSearch(prev => ({ ...prev, showLocationSuggestions: false }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    document.addEventListener('keydown', handleEscapeKey);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    fsq_place_id: "",
    event_category: "",
    type: "public",
    date_time: "",
    capacity: "",
    invite_code: ""
  });

  // Venue search state
  const [venueSearch, setVenueSearch] = useState({
    query: "",
    locationQuery: "", // For location suggestions
    latitude: "",
    longitude: "",
    radius: "5000", // Default 5km radius
    venues: [],
    loading: false,
    showResults: false,
    detectingLocation: false,
    geocodingLocation: false,
    locationSuggestions: [],
    showLocationSuggestions: false
  });

  const locationDropdownRef = useRef(null);

  if (!user) {
    return null; // wait for redirect
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVenueSearchChange = (field, value) => {
    setVenueSearch(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    
    setVenueSearch(prev => ({ ...prev, detectingLocation: true }));
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        setVenueSearch(prev => ({
          ...prev,
          latitude: String(lat),
          longitude: String(lon),
          locationQuery: "Current Location",
          detectingLocation: false
        }));
        toast.success("Location detected");
      },
      () => {
        toast.error("Unable to retrieve your location");
        setVenueSearch(prev => ({ ...prev, detectingLocation: false }));
      }
    );
  };

  const searchLocationSuggestions = async (query) => {
    if (!query.trim() || query.length < 2) {
      setVenueSearch(prev => ({
        ...prev,
        locationSuggestions: [],
        showLocationSuggestions: false
      }));
      return;
    }

    try {
      const params = new URLSearchParams({
        q: query.trim(),
        limit: 5
      });

      const response = await fetch(`/api/geocode?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.results) {
        setVenueSearch(prev => ({
          ...prev,
          locationSuggestions: result.results,
          showLocationSuggestions: true
        }));
      }
    } catch (error) {
      console.error("Error searching location suggestions:", error);
    }
  };

  const selectLocation = (location) => {
    setVenueSearch(prev => ({
      ...prev,
      locationQuery: location.address || location.name,
      latitude: String(location.lat),
      longitude: String(location.lng),
      showLocationSuggestions: false,
      locationSuggestions: []
    }));
    toast.success(`Location set to: ${location.address || location.name}`);
  };

  const geocodeLocation = async () => {
    if (!venueSearch.locationQuery.trim()) {
      toast.error("Please enter a location");
      return;
    }

    setVenueSearch(prev => ({ ...prev, geocodingLocation: true }));

    try {
      const params = new URLSearchParams({
        q: venueSearch.locationQuery.trim(),
        limit: 1
      });

      const response = await fetch(`/api/geocode?${params.toString()}`);
      const result = await response.json();

      if (response.ok && result.results && result.results.length > 0) {
        const location = result.results[0];
        setVenueSearch(prev => ({
          ...prev,
          latitude: String(location.lat),
          longitude: String(location.lng),
          geocodingLocation: false
        }));
        toast.success(`Location set to: ${location.address || venueSearch.locationQuery}`);
      } else {
        toast.error("Unable to find that location. Please try a different query.");
        setVenueSearch(prev => ({ ...prev, geocodingLocation: false }));
      }
    } catch (error) {
      console.error("Error geocoding location:", error);
      toast.error("An error occurred while geocoding the location");
      setVenueSearch(prev => ({ ...prev, geocodingLocation: false }));
    }
  };

  const searchVenues = async () => {
    console.log("searchVenues called");
    console.log("venueSearch state:", venueSearch);
    
    if (!venueSearch.query.trim()) {
      toast.error("Please enter a search query");
      console.log("Search query validation failed");
      return;
    }
    if (!venueSearch.latitude || !venueSearch.longitude) {
      toast.error("Please set a location first using 'Use My Location' or enter a location query");
      console.log("Location validation failed");
      return;
    }

    console.log("Starting venue search...");
    setVenueSearch(prev => ({ ...prev, loading: true }));

    try {
      const params = new URLSearchParams({
        q: venueSearch.query.trim(),
        lat: venueSearch.latitude,
        lng: venueSearch.longitude,
        radius: venueSearch.radius
      });

      console.log("Search params:", params.toString());
      const response = await fetch(`/api/venues/search?${params.toString()}`);
      const result = await response.json();

      console.log("Search response:", result);

      if (response.ok) {
        setVenueSearch(prev => ({
          ...prev,
          venues: result.venues || [],
          showResults: true,
          loading: false
        }));
        console.log("Venues found:", result.venues?.length || 0);
      } else {
        toast.error(result.error || "Failed to search venues");
        setVenueSearch(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error("Error searching venues:", error);
      toast.error("An error occurred while searching venues");
      setVenueSearch(prev => ({ ...prev, loading: false }));
    }
  };

  const selectVenue = (venue) => {
    console.log("selectVenue called with venue:", venue);
    console.log("venue.fsq_place_id:", venue.fsq_place_id);
    
    setFormData(prev => {
      const newFormData = {
      ...prev,
        fsq_place_id: venue.fsq_place_id
      };
      console.log("Updated formData:", newFormData);
      return newFormData;
    });
    
    setVenueSearch(prev => ({
      ...prev,
      showResults: false,
      query: venue.name
    }));
    toast.success(`Selected venue: ${venue.name}`);
  };

  const clearVenueSearch = () => {
    setFormData(prev => ({ ...prev, fsq_place_id: "" }));
    setVenueSearch(prev => ({
      ...prev,
      query: "",
      locationQuery: "",
      latitude: "",
      longitude: "",
      showResults: false,
      venues: [],
      locationSuggestions: [],
      showLocationSuggestions: false
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("handleSubmit called");
    console.log("Form data:", formData);
    console.log("User:", user);

    // Validation
    if (!formData.title.trim()) {
      toast.error("Event title is required");
      console.log("Title validation failed");
      return;
    }
    console.log("Title validation passed");
    
    if (!formData.fsq_place_id || !formData.fsq_place_id.trim()) {
      toast.error("Please search for and select a venue");
      console.log("Venue validation failed - fsq_place_id:", formData.fsq_place_id);
      return;
    }
    console.log("Venue validation passed");
    
    if (!formData.event_category) {
      toast.error("Event category is required");
      console.log("Category validation failed");
      return;
    }
    console.log("Category validation passed");
    
    if (!formData.date_time) {
      toast.error("Event date and time is required");
      console.log("Date validation failed");
      return;
    }
    console.log("Date validation passed");
    
    // Check if the selected date is in the future
    const selectedDate = new Date(formData.date_time);
    const now = new Date();
    if (selectedDate <= now) {
      toast.error("Event date and time must be in the future");
      console.log("Date future validation failed");
      return;
    }
    console.log("Date future validation passed");

    console.log("All validation passed, making API call...");
    setLoading(true);

    try {
      const requestBody = {
          title: formData.title.trim(),
          description: formData.description.trim(),
          fsq_place_id: formData.fsq_place_id.trim(),
          event_category: formData.event_category,
          type: formData.type,
          date_time: formData.date_time,
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
          invite_code: formData.invite_code.trim() || null
      };
      
      console.log("Request body:", requestBody);
      console.log("Token:", localStorage.getItem("token"));

      const response = await fetch("/api/events/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(requestBody)
      });

      console.log("Response status:", response.status);
      const result = await response.json();
      console.log("Response result:", result);

      if (response.ok) {
        toast.success("Event created successfully!");
        router.push("/events/my");
      } else {
        toast.error(result.error || "Failed to create event");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("An error occurred while creating the event");
    } finally {
      setLoading(false);
    }
  console.log("handleSubmit finished");
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Event</h1>
        <p className="text-gray-600">Fill in the details below to create your event</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Event Details</CardTitle>
          <CardDescription>
            Provide all the necessary information for your event. Fields marked with (*) are required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Event Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                type="text"
                placeholder="Enter event title"
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                required
              />
            </div>

            {/* Event Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Event Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your event (optional)"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                rows={4}
                maxLength={500}
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>Optional field</span>
                <span>{formData.description.length}/500 characters</span>
              </div>
            </div>

            {/* Venue Search */}
            <div className="space-y-4">
              <Label>
                Venue Search <span className="text-red-500">*</span>
              </Label>

              {/* Location Input */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="locationQuery">Location</Label>
                  <div className="relative" ref={locationDropdownRef}>
                    <Input
                      id="locationQuery"
                      placeholder="Enter location (e.g., 'New York, NY', 'London, UK', 'Downtown Toronto')"
                      value={venueSearch.locationQuery}
                      onChange={(e) => {
                        handleVenueSearchChange("locationQuery", e.target.value);
                        searchLocationSuggestions(e.target.value);
                      }}
                      onFocus={() => {
                        if (venueSearch.locationSuggestions.length > 0) {
                          setVenueSearch(prev => ({ ...prev, showLocationSuggestions: true }));
                        }
                      }}
                    />
                    
                    {/* Location Suggestions Dropdown */}
                    {venueSearch.showLocationSuggestions && venueSearch.locationSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {venueSearch.locationSuggestions.map((location, index) => (
                          <div
                            key={index}
                            className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                            onClick={() => selectLocation(location)}
                          >
                            <div className="font-medium text-gray-900">{location.name}</div>
                            <div className="text-sm text-gray-600">{location.address}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Location Buttons */}
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={geocodeLocation}
                    disabled={venueSearch.geocodingLocation || !venueSearch.locationQuery.trim()}
                    className="flex-1"
                  >
                    {venueSearch.geocodingLocation ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                        Geocoding...
                      </div>
                    ) : (
                      "Set Location"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={useMyLocation}
                    disabled={venueSearch.detectingLocation}
                    className="flex-1"
                  >
                    {venueSearch.detectingLocation ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                        Detecting...
                      </div>
                    ) : (
                      "Use My Location"
                    )}
                  </Button>
                </div>

                {/* Current Location Display */}
                {(venueSearch.latitude && venueSearch.longitude) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Current Location:</strong> {venueSearch.locationQuery || `${venueSearch.latitude}, ${venueSearch.longitude}`}
                    </p>
                  </div>
                )}
              </div>

              {/* Search Query and Radius */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Input
                    placeholder="Search for venues (e.g., 'coffee shop', 'restaurant')"
                    value={venueSearch.query}
                    onChange={(e) => handleVenueSearchChange("query", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Select
                    value={venueSearch.radius}
                    onValueChange={(value) => handleVenueSearchChange("radius", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1000">1 km</SelectItem>
                      <SelectItem value="2500">2.5 km</SelectItem>
                      <SelectItem value="5000">5 km</SelectItem>
                      <SelectItem value="10000">10 km</SelectItem>
                      <SelectItem value="25000">25 km</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search Button */}
                <Button
                  type="button"
                  onClick={searchVenues}
                disabled={venueSearch.loading || !venueSearch.query.trim() || !venueSearch.latitude || !venueSearch.longitude}
                className="w-full"
                >
                  {venueSearch.loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Searching...
                    </div>
                  ) : (
                    "Search Venues"
                  )}
                </Button>

              {/* Selected Venue Display */}
              {formData.fsq_place_id && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm text-green-800">
                        <strong>Selected Venue:</strong> {venueSearch.query}
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        Foursquare ID: {formData.fsq_place_id}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearVenueSearch}
                      className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
              )}

              {/* Venue Search Results */}
              {venueSearch.showResults && venueSearch.venues.length > 0 && (
                <div className="space-y-4">
                    <h4 className="font-medium text-gray-900">Found Venues (select one):</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {venueSearch.venues.map((venue, index) => (
                      <div
                         key={venue.fsq_place_id}
                        className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => selectVenue(venue)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-900">{venue.name}</h5>
                            <p className="text-sm text-gray-600">{venue.address}</p>
                             <div className="flex flex-wrap gap-2 mt-1">
                               <span className="text-xs text-gray-500">{venue.category}</span>
                               {venue.tel && <span className="text-xs text-blue-600">{venue.tel}</span>}
                                                               {venue.website && <span className="text-xs text-green-600">Website</span>}
                                                               {venue.rating && <span className="text-xs text-yellow-600">{venue.rating}</span>}
                                                               {venue.price && <span className="text-xs text-purple-600">{venue.price}</span>}
                             </div>
                          </div>
                          <div className="text-right text-xs text-gray-500">
                            <p>{Math.round(venue.distance)}m away</p>
                            <p className="text-blue-600">Click to select</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Results Message */}
              {venueSearch.showResults && venueSearch.venues.length === 0 && !venueSearch.loading && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    No venues found. Try adjusting your search query or location.
                  </p>
                </div>
              )}

              {/* Venue Map */}
              {venueSearch.showResults && venueSearch.venues.length > 0 && (
                <div className="space-y-2">
                  <Label>Venue Locations</Label>
                  {console.log('Passing venues to VenueMap:', venueSearch.venues)}
                  <VenueMap
                    venues={venueSearch.venues}
                    centerLat={parseFloat(venueSearch.latitude)}
                    centerLng={parseFloat(venueSearch.longitude)}
                    onVenueClick={(venue) => selectVenue(venue)}
                  />
                </div>
              )}
            </div>

            {/* Event Category */}
            <div className="space-y-2">
              <Label htmlFor="event_category">
                Event Category <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.event_category}
                onValueChange={(value) => handleInputChange("event_category", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select event category" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Event Type */}
            <div className="space-y-2">
              <Label htmlFor="type">
                Event Type <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.type}
                onValueChange={(value) => handleInputChange("type", value)}
                required
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Public</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date and Time */}
            <div className="space-y-2">
              <Label htmlFor="date_time">
                Event Date & Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="date_time"
                type="datetime-local"
                value={formData.date_time}
                onChange={(e) => handleInputChange("date_time", e.target.value)}
                required
                min={new Date().toISOString().slice(0, 16)}
              />
              <p className="text-sm text-gray-500">
                Select a future date and time for your event
              </p>
            </div>

            {/* Capacity */}
            <div className="space-y-2">
              <Label htmlFor="capacity">Maximum Capacity</Label>
              <Input
                id="capacity"
                type="number"
                placeholder="Enter maximum number of attendees (optional)"
                value={formData.capacity}
                onChange={(e) => handleInputChange("capacity", e.target.value)}
                min="1"
              />
              <p className="text-sm text-gray-500">
                Leave empty for unlimited capacity
              </p>
            </div>

            {/* Invite Code - Only show for private events */}
            {formData.type === "private" && (
              <div className="space-y-2">
                <Label htmlFor="invite_code">Invite Code</Label>
                <Input
                  id="invite_code"
                  type="text"
                  placeholder="Enter invite code for private event (optional)"
                  value={formData.invite_code}
                  onChange={(e) => handleInputChange("invite_code", e.target.value)}
                />
                <p className="text-sm text-gray-500">
                  Private events can use invite codes to control access
                </p>
              </div>
            )}

            {/* Submit Buttons */}
            <div className="flex gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
                onClick={() => console.log("Submit button clicked")}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Event...
                  </div>
                ) : (
                  "Create Event"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
