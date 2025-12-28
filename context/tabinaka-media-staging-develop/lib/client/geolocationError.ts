export const GEOLOCATION_ERROR_CODE = {
  PERMISSION_DENIED: 1,
  POSITION_UNAVAILABLE: 2,
  TIMEOUT: 3,
} as const;

type GeolocationErrorLike = {
  code?: unknown;
};

export const getGeolocationErrorCode = (error: unknown): number | null => {
  if (!error || typeof error !== "object") return null;
  const code = (error as GeolocationErrorLike).code;
  return typeof code === "number" ? code : null;
};

export const isGeolocationPermissionDenied = (error: unknown): boolean =>
  getGeolocationErrorCode(error) === GEOLOCATION_ERROR_CODE.PERMISSION_DENIED;

export const isGeolocationPositionUnavailable = (error: unknown): boolean =>
  getGeolocationErrorCode(error) ===
  GEOLOCATION_ERROR_CODE.POSITION_UNAVAILABLE;

export const isGeolocationTimeout = (error: unknown): boolean =>
  getGeolocationErrorCode(error) === GEOLOCATION_ERROR_CODE.TIMEOUT;
