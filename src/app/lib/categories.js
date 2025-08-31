export const EVENT_CATEGORIES = [
  "Conferences",
  "Trade Shows",
  "Seminars",
  "Workshops",
  "Product Launches",
  "Company Parties",
  "Networking Events",
  "Weddings",
  "Birthday Parties",
  "Anniversaries",
  "Festivals",
  "Concerts",
  "Art Exhibitions",
  "Charity Events",
  "Sports Competitions",
  "Marathons",
  "Educational Events",
  "Religious Gatherings",
  "Political Rallies",
  "Community Fairs",
  "Award Ceremonies",
  "Fashion Shows",
  "Hybrid Events",
  "Virtual Events",
  "Galas",
  "Film Screenings",
  "Book Signings",
  "Car Shows",
  "Food and Wine Tastings",
  "Parades",
  "Comedy Shows",
  "Theater Performances",
  "Meetups",
  "Retreats",
  "Fundraisers",
  "Open Houses",
  "Career Fairs",
  "Town Halls",
  "Science Fairs",
  "Grand Openings",
];

export function normalizeCategory(value) {
  if (!value) return null;
  const target = String(value).trim().toLowerCase();
  for (const cat of EVENT_CATEGORIES) {
    if (cat.toLowerCase() === target) return cat; // return canonical value
  }
  return null;
}


