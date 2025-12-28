# Location Permission Fix

## Issue
The user asked if the current location is being used. Upon investigation, it was found that while the system is designed to use location data, the `LocationPermission` component was not being displayed because the trigger logic was missing.

## Fix
1.  **State Management**: Added `hasPromptedLocation` state to `ChatInterface.tsx` to ensure the permission prompt is shown only once per session.
2.  **Automatic Prompt**: Added a `useEffect` hook to automatically trigger `setShowLocationPermission(true)` if:
    *   No location data is available from quiz results.
    *   No user location is currently set.
    *   The prompt hasn't been shown yet.
3.  **Rendering Logic**: Updated the rendering condition for the `LocationPermission` component to allow it to display even if `quizResults` exist, provided that `locationLat` is missing.

## Result
When a user opens the chat and no location is available, a popup will now appear asking for location permission. If granted, the `userLocation` state is updated, and subsequent searches will be biased towards the user's current location (default 5km radius).
