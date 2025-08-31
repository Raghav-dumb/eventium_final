const API_KEY = process.env.FOURSQUARE_API_KEY;

export async function geocodeAddress(query) {
  const res = await fetch(`https://places-api.foursquare.com/places/search?query=${encodeURIComponent(query)}`, {
    method: 'GET',
    headers: { Authorization: API_KEY }
  });
  return res.json();
}

export async function reverseGeocode(lat, lon) {
  const res = await fetch(`https://places-api.foursquare.com/places/search?ll=${lat},${lon}&limit=1`, {
    method: 'GET',
    headers: { Authorization: API_KEY }
  });
  return res.json();
}
