import {
  GEOLOCATION_ERROR_CODE,
  getGeolocationErrorCode,
} from "@/lib/client/geolocationError";
import { requestBrowserLocation } from "@/lib/client/requestLocation";

/**
 * Standardized location error codes
 * - "permission_denied": User denied location permission
 * - "position_unavailable": Location could not be determined
 * - "timeout": Location request timed out
 * - "unsupported": Browser doesn't support geolocation
 * - "insecure_context": Not running in HTTPS context
 * - "unknown": Unknown or unexpected error
 */
export type LocationErrorCode =
  | "permission_denied"
  | "position_unavailable"
  | "timeout"
  | "unsupported"
  | "insecure_context"
  | "unknown";

/**
 * Browser's geolocation support status
 */
export type LocationSupport = {
  /** Whether geolocation API is supported by the browser */
  supported: boolean;
  /** Whether running in a secure context (HTTPS or localhost) */
  secureContext: boolean;
};

/**
 * Checks if the browser supports geolocation and is in a secure context.
 * @returns Object indicating support status
 */
export const getLocationSupport = (): LocationSupport => {
  if (typeof window === "undefined") {
    return { supported: false, secureContext: false };
  }
  const isHttps = window.location?.protocol === "https:";
  const isLocalhost = window.location?.hostname === "localhost";
  const secureContext = isHttps || isLocalhost;
  const supported =
    typeof navigator !== "undefined" && Boolean(navigator.geolocation);
  return { supported, secureContext };
};

/**
 * Normalizes various location errors into a standardized format.
 * Converts browser geolocation errors, HTTPS errors, and unknown errors
 * into a consistent LocationErrorCode.
 *
 * @param error - The error object from geolocation API or other sources
 * @returns Normalized error with code and message
 */
export const normalizeLocationError = (
  error: unknown,
): { code: LocationErrorCode; message: string } => {
  const geolocationCode = getGeolocationErrorCode(error);
  switch (geolocationCode) {
    case GEOLOCATION_ERROR_CODE.PERMISSION_DENIED:
      return { code: "permission_denied", message: "Permission denied" };
    case GEOLOCATION_ERROR_CODE.POSITION_UNAVAILABLE:
      return { code: "position_unavailable", message: "Position unavailable" };
    case GEOLOCATION_ERROR_CODE.TIMEOUT:
      return { code: "timeout", message: "Location request timed out" };
    default:
      break;
  }

  if (error instanceof Error) {
    const message = error.message || "Unknown error";
    if (message.includes("HTTPS")) {
      return { code: "insecure_context", message };
    }
    if (message.toLowerCase().includes("not supported")) {
      return { code: "unsupported", message };
    }
    return { code: "unknown", message };
  }

  return { code: "unknown", message: "Unknown error" };
};

/**
 * Gets the current position from the browser's geolocation API.
 * This is a wrapper around requestBrowserLocation that provides a cleaner API.
 *
 * @param options - Geolocation position options (timeout, accuracy, etc.)
 * @returns Promise resolving to GeolocationPosition
 * @throws Error if geolocation is not supported or permission is denied
 */
export const getCurrentPosition = async (
  options?: PositionOptions,
): Promise<GeolocationPosition> => {
  return requestBrowserLocation(options);
};
