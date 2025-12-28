// Google Places Photo URL Generation

export function getPhotoUrl(
  photoReference: string,
  width: number = 800,
  apiKey: string,
): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photo_reference=${photoReference}&key=${apiKey}`;
}

export function getMapsUrl(placeId: string): string {
  // Use official Google Maps URL format for place detail deep links
  const params = new URLSearchParams({
    api: "1",
    query: placeId, // query は必須。名前が無いので placeId を使う
    query_place_id: placeId,
  });

  return `https://www.google.com/maps/search/?${params.toString()}`;
}

export function formatPriceLevel(priceLevel: number | null): string {
  if (priceLevel === null) return "—";
  return "¥".repeat(priceLevel + 1);
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}
