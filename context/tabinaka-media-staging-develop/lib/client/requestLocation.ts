export type LocationRequestOptions = PositionOptions;

const DEFAULT_LOCATION_OPTIONS: LocationRequestOptions = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 300000,
};

/**
 * Requests the browser's geolocation.
 * Note: This function assumes security checks (HTTPS, support) have already been performed.
 * Use `getLocationSupport()` from locationService.ts before calling this function.
 *
 * @param options - Geolocation position options
 * @returns Promise resolving to GeolocationPosition
 * @throws GeolocationPositionError if the browser denies permission or fails to get position
 */
export async function requestBrowserLocation(
  options: LocationRequestOptions = DEFAULT_LOCATION_OPTIONS,
): Promise<GeolocationPosition> {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    throw new Error("Geolocation is not available in the server environment");
  }

  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by the browser");
  }

  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position);
      },
      (error) => {
        reject(error);
      },
      options
    );
  });
}
