# Search Radius and Card UI Updates

## Changes
1.  **Default Search Radius**: Changed from 5km back to **3km** (3000m) to better focus on local results.
    *   Updated `lib/functionRegistry.ts` default value and descriptions.
    *   Updated `lib/flexibleSystemPrompt.ts` instructions.
    *   Updated `lib/travelTypeMapping.ts` guidelines.

2.  **Place Card UI**:
    *   **Removed Price Level**: The "moderate", "inexpensive", etc. labels are no longer displayed on the place cards.
    *   **Distance Display**: Added logic to calculate and display the distance from the user's location next to the review count (e.g., `(123 reviews) · 1.2km`).
        *   Implemented `calculateDistance` (Haversine formula) in `lib/functionRegistry.ts` to populate `distance_m` in search results.
        *   Updated `PlaceSummary` and `ChatMessageProps` interfaces to include `distance_m`.

## Implementation Details
*   **Distance Calculation**: Since the Google Places Text Search API doesn't always return distance (unless ranking by distance), we now manually calculate the distance between the user's location (if available) and the place's location for every result.
*   **UI Clean-up**: Simplified the card layout by removing the price level, making the reviews and distance more prominent.
