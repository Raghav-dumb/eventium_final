const API_KEY = process.env.FOURSQUARE_API_KEY;

export async function geocodeAddress({ query, ll, limit = 10 }) {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (ll) params.set('ll', ll);
  if (limit != null) params.set('limit', String(limit));
  // Ensure coordinates are included in search response
  params.set('fields', 'fsq_place_id,name,location,geocodes');
  
  const url = `https://places-api.foursquare.com/places/search?${params.toString()}`;
  console.log("FSQ geocode URL:", url);
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'X-Places-Api-Version': '2025-06-17'
    }
  });
  const fsq = await res.json();
  try { console.log("FSQ geocode status:", res.status, JSON.stringify(fsq)?.slice(0, 300)); } catch(_) {}
  if (Array.isArray(fsq?.results) && fsq.results.length > 0) {
    return fsq;
  }

  // Fallback: Nominatim (OpenStreetMap) when FSQ returns nothing or errors
  try {
    const nomParams = new URLSearchParams();
    nomParams.set('q', query || '');
    nomParams.set('format', 'json');
    nomParams.set('addressdetails', '1');
    nomParams.set('limit', String(limit || 5));
    const nomUrl = `https://nominatim.openstreetmap.org/search?${nomParams.toString()}`;
    console.log("Nominatim geocode URL:", nomUrl);
    const nomRes = await fetch(nomUrl, { headers: { 'Accept': 'application/json' } });
    const nomJson = await nomRes.json();
    const results = Array.isArray(nomJson) ? nomJson.map((r) => ({
      fsq_place_id: null,
      name: r.display_name,
      location: { formatted_address: r.display_name },
      geocodes: { main: { latitude: Number(r.lat), longitude: Number(r.lon) } },
    })) : [];
    return { results };
  } catch (e) {
    console.warn('Nominatim fallback failed', e?.message);
    return fsq || { results: [] };
  }
}

export async function reverseGeocode(lat, lon) {
  const params = new URLSearchParams();
  params.set('ll', `${lat},${lon}`);
  params.set('limit', '1');
  
  const res = await fetch(`https://places-api.foursquare.com/places/search?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'X-Places-Api-Version': '2025-06-17'
    }
  });
  return res.json();
}

export async function searchPlaces({ query, ll, radius, limit }) {
  const params = new URLSearchParams();
  if (query) params.set('query', query);
  if (ll) params.set('ll', ll);
  if (radius != null) params.set('radius', String(radius));
  if (limit != null) params.set('limit', String(limit));

  console.log("Foursquare API call URL:", `https://places-api.foursquare.com/places/search?${params.toString()}`);
  console.log("API_KEY exists:", !!API_KEY);
  console.log("API_KEY length:", API_KEY?.length);

  const res = await fetch(`https://places-api.foursquare.com/places/search?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'X-Places-Api-Version': '2025-06-17'
    }
  });
  
  console.log("Foursquare API response status:", res.status);
  console.log("Foursquare API response headers:", Object.fromEntries(res.headers.entries()));
  
  const result = await res.json();
  console.log("Foursquare API response body:", JSON.stringify(result, null, 2));
  
  return result;
}

export async function getPlaceDetails(fsqPlaceId) {
  const res = await fetch(`https://places-api.foursquare.com/places/${encodeURIComponent(fsqPlaceId)}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'X-Places-Api-Version': '2025-06-17'
    }
  });
  return res.json();
}