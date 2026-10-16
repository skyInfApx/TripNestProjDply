/**
 * Date formatting utility for TripNest.
 * 
 * Converts raw database ISO dates (YYYY-MM-DD) into unambiguous, human-friendly dates:
 * Example: "2026-09-20" -> "20 Sep 2026"
 * 
 * Industry Standard (Used by Google Flights, Airbnb, Booking.com, MakeMyTrip):
 * Avoids the famous international date confusion between US format (MM/DD/YYYY)
 * and Indian/UK format (DD/MM/YYYY).
 */
export function formatDisplayDate(dateStr) {
  if (!dateStr) return "";

  try {
    const parts = String(dateStr).split("-");
    if (parts.length === 3 && parts[0].length === 4) {
      const year = parts[0];
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);

      const months = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
      ];

      if (monthIndex >= 0 && monthIndex < 12) {
        return `${day} ${months[monthIndex]} ${year}`;
      }
    }

    // Safe fallback for other timestamp strings
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
      });
    }
  } catch (e) {
    return dateStr;
  }

  return dateStr;
}
