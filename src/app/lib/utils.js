import { randomUUID } from 'crypto';

export function generateId() {
  return randomUUID();
}

// Utility function to check if an event has expired
export function isEventExpired(eventDateTime) {
  if (!eventDateTime) return false;
  const eventDate = new Date(eventDateTime);
  const now = new Date();
  return eventDate < now;
}

// Utility function to format event date with expiration status
export function formatEventDate(dateTime) {
  if (!dateTime) return { formatted: "TBD", isExpired: false, date: null };
  
  const eventDate = new Date(dateTime);
  const now = new Date();
  const isExpired = eventDate < now;
  
  const formattedDate = eventDate.toLocaleString();
  
  return {
    formatted: formattedDate,
    isExpired: isExpired,
    date: eventDate
  };
}
