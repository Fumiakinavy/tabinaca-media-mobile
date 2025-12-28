# Persistent Location Permission

## Feature
Ensures that the location permission prompt is only shown once to the user. If the user interacts with the prompt (Grant, Deny, or Manual Input), this preference is remembered, and the prompt will not appear again in future sessions.

## Implementation
*   **Storage**: Uses `localStorage` with the key `gappy_location_permission_handled`.
*   **Initialization**: On component mount, `ChatInterface` checks this key. If set to `'true'`, `hasPromptedLocation` state is set to `true`, preventing the automatic prompt `useEffect` from firing.
*   **Updates**: The key is set to `'true'` in the following handlers:
    *   `handleLocationGranted` (User clicked "Allow")
    *   `handleLocationDenied` (User clicked "Deny")
    *   `handleManualLocation` (User entered a location manually)

## User Benefit
Improves user experience by not pestering them with location requests every time they visit or reload the page, fulfilling the requirement: "When I press yes on location access the first time I sign in, I want it not to appear from then on."
