import { NextResponse } from "next/server";
import { searchPlaces } from "@/app/lib/foursquare";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q');
    const latitude = searchParams.get('lat');
    const longitude = searchParams.get('lng');
    const radius = searchParams.get('radius') || '5000'; // Default 5km radius

    if (!latitude || !longitude) {
      return NextResponse.json({ error: "Latitude and longitude are required" }, { status: 400 });
    }

    if (!query) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    console.log("FOURSQUARE_API_KEY exists:", !!process.env.FOURSQUARE_API_KEY);
    console.log("FOURSQUARE_API_KEY length:", process.env.FOURSQUARE_API_KEY?.length);
    
    const searchResults = await searchPlaces({
      query,
      ll: `${latitude},${longitude}`,
      radius: parseInt(radius),
      limit: 10 // Limit to 10 results as requested
    });

    console.log("Raw Foursquare response:", JSON.stringify(searchResults, null, 2));

    if (!searchResults.results) {
      return NextResponse.json({ error: "Failed to fetch venues" }, { status: 500 });
    }

    // Format the results to include only necessary information
    const venues = searchResults.results.map(venue => {
      console.log("Individual venue object:", JSON.stringify(venue, null, 2));
      return {
        fsq_place_id: venue.fsq_place_id, // Use fsq_place_id from API response
        name: venue.name,
        address: venue.location?.formatted_address || venue.location?.address || venue.location?.cross_street || 'Address not available',
        category: venue.categories?.[0]?.name || venue.categories?.[0]?.icon?.prefix || 'No category',
        distance: venue.distance || 0,
        coordinates: {
          lat: venue.latitude || venue.geocodes?.drop_off?.latitude || venue.location?.latitude,
          lng: venue.longitude || venue.geocodes?.drop_off?.longitude || venue.location?.longitude
        },
        // Additional useful fields from Foursquare API
        tel: venue.tel || null,
        email: venue.email || null,
        website: venue.website || null,
        hours: venue.hours || null,
        popularity: venue.popularity || null,
        price: venue.price || null,
        rating: venue.rating || null,
        stats: venue.stats || null,
        features: venue.features || null,
        photos: venue.photos || null
      };
    });

    console.log("Formatted venues:", JSON.stringify(venues, null, 2));

    return NextResponse.json({ venues });
  } catch (error) {
    console.error("Venue search error:", error);
    return NextResponse.json({ error: "Failed to search venues" }, { status: 500 });
  }
}
