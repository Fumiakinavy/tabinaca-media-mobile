import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useAccount } from "./AccountContext";
import {
  useSavedLocationPermission,
  type SavedLocationPermissionState,
} from "@/lib/client/useSavedLocationPermission";
import {
  getCurrentPosition,
  getLocationSupport,
  normalizeLocationError,
  type LocationErrorCode,
} from "@/lib/locationService";
import { getLocationErrorMessage } from "@/lib/client/locationErrorMessages";

/**
 * User's geographic location information
 */
export interface Location {
  /** Latitude in decimal degrees */
  lat: number;
  /** Longitude in decimal degrees */
  lng: number;
  /** Accuracy of the position in meters */
  accuracy?: number;
  /** Unix timestamp when the position was acquired */
  timestamp?: number;
}

interface LocationContextType {
  userLocation: Location | null;
  isLoadingLocation: boolean;
  locationError: string | null;
  locationErrorCode: LocationErrorCode | null;
  locationStatus: LocationStatus;
  browserPermission: BrowserPermissionState;
  savedPermission: SavedLocationPermissionState;
  lastUpdated: Date | null;
  /**
   * Requests user's location. Can be called manually or automatically.
   * Use source: "user" for explicit user actions (shows browser dialog).
   * Use source: "auto" for background updates (only if permission already granted).
   */
  requestLocation: (
    options?: RefreshLocationOptions,
  ) => Promise<RefreshLocationResult>;
  clearLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);
const USER_REQUEST_FALLBACK_MS = 7000;
const USER_REQUEST_FALLBACK_MESSAGE =
  "位置情報の許可ダイアログが表示されない場合は、Safariの設定で位置情報を許可し、iOSの「位置情報サービス」がオンになっているか確認してください。";

/**
 * Source of the location request:
 * - "auto": Automatic background request (silent, requires granted permission)
 * - "user": User-initiated request (shows browser permission dialog)
 */
type LocationRequestSource = "auto" | "user";

/**
 * Current status of location permission and request:
 * - "idle": No request has been made
 * - "requesting": Currently requesting location
 * - "granted": Permission granted and location obtained
 * - "denied": Permission denied by user
 * - "unsupported": Browser doesn't support geolocation
 * - "insecure": Not running in secure context (HTTPS required)
 * - "error": Error occurred during location request
 */
type LocationStatus =
  | "idle"
  | "requesting"
  | "granted"
  | "denied"
  | "unsupported"
  | "insecure"
  | "error";

/**
 * Browser permission state for geolocation.
 * - "prompt": User has not made a decision (or reset permissions)
 * - "unknown": Cannot be determined (Permissions API unsupported)
 */
type BrowserPermissionState =
  | "unknown"
  | "granted"
  | "denied"
  | "prompt"
  | "unsupported";

/**
 * Options for requesting location
 */
export interface RefreshLocationOptions {
  /** Source of the request: "auto" for background, "user" for explicit user action */
  source?: LocationRequestSource;
  /** Browser geolocation API options (timeout, accuracy, etc.) */
  options?: PositionOptions;
}

/**
 * Result of a location request
 */
export interface RefreshLocationResult {
  /** The obtained location, or null if request failed */
  location: Location | null;
  /** Error object if request failed, or null if successful */
  error: unknown | null;
}

/**
 * Provider component for location context.
 * Manages user's location state, automatic updates, and permission persistence.
 *
 * Features:
 * - Continuous location updates while permission is granted (watchPosition)
 * - Permission state persistence to server
 * - Sync with browser permission changes (Permissions API when available)
 * - Automatic cleanup on logout
 */
export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { accountId, accountToken } = useAccount();
  const { savedPermission, persist: persistSavedPermission } =
    useSavedLocationPermission(accountId, accountToken);
  const [userLocation, setUserLocation] = useState<Location | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationErrorCode, setLocationErrorCode] =
    useState<LocationErrorCode | null>(null);
  const [locationStatus, setLocationStatus] =
    useState<LocationStatus>("idle");
  const [browserPermission, setBrowserPermission] =
    useState<BrowserPermissionState>("unknown");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isLoadingLocationRef = useRef(false);
  const watchIdRef = useRef<number | null>(null);
  const watchHasFirstUpdateRef = useRef(false);
  const hasLocationRef = useRef(false);
  const userRequestTimeoutRef = useRef<number | null>(null);

  const clearUserRequestTimeout = useCallback(() => {
    if (typeof window === "undefined") return;
    if (userRequestTimeoutRef.current !== null) {
      window.clearTimeout(userRequestTimeoutRef.current);
      userRequestTimeoutRef.current = null;
    }
  }, []);

  const startUserRequestTimeout = useCallback(() => {
    if (typeof window === "undefined") return;
    clearUserRequestTimeout();
    userRequestTimeoutRef.current = window.setTimeout(() => {
      if (isLoadingLocationRef.current) {
        isLoadingLocationRef.current = false;
        setIsLoadingLocation(false);
        setLocationStatus("error");
        setLocationErrorCode((prev) => prev ?? "timeout");
        setLocationError((prev) => prev ?? USER_REQUEST_FALLBACK_MESSAGE);
      }
    }, USER_REQUEST_FALLBACK_MS);
  }, [clearUserRequestTimeout]);

  const handlePersistPermission = useCallback((
    granted: boolean,
  ) => {
    const hasSession = Boolean(accountId && accountToken);
    if (!hasSession) return;
    if (granted && savedPermission !== "granted") {
      void persistSavedPermission(true);
      return;
    }
    if (!granted && savedPermission !== "denied") {
      void persistSavedPermission(false);
    }
  }, [accountId, accountToken, persistSavedPermission, savedPermission]);

  const applyLocationSuccess = useCallback((
    position: GeolocationPosition,
  ) => {
    const location: Location = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      timestamp: position.timestamp,
    };

    hasLocationRef.current = true;
    setUserLocation(location);
    setLastUpdated(new Date());
    setLocationStatus("granted");
    setLocationError(null);
    setLocationErrorCode(null);
    setBrowserPermission("granted");
    handlePersistPermission(true);
    return location;
  }, [handlePersistPermission]);

  const applyLocationError = useCallback((
    error: unknown,
  ) => {
    const normalized = normalizeLocationError(error);
    setLocationErrorCode(normalized.code);
    setLocationError(getLocationErrorMessage(normalized.code));

    if (normalized.code === "permission_denied") {
      hasLocationRef.current = false;
      setBrowserPermission("denied");
      setLocationStatus("denied");
      setUserLocation(null);
      setLastUpdated(null);
      handlePersistPermission(false);
    } else if (normalized.code === "unsupported") {
      setBrowserPermission("unsupported");
      setLocationStatus("unsupported");
    } else if (normalized.code === "insecure_context") {
      setLocationStatus("insecure");
    } else {
      setLocationStatus("error");
    }

    return normalized;
  }, [handlePersistPermission]);

  const refreshLocation = useCallback(async (
    options: RefreshLocationOptions = {},
  ): Promise<RefreshLocationResult> => {
    const source: LocationRequestSource = options.source ?? "user";
    const positionOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 300000,
      ...(options.options ?? {}),
    };

    // Check if we should skip auto-request
    if (source === "auto") {
      if (browserPermission !== "granted") {
        return { location: null, error: null };
      }
    }

    // Prevent concurrent requests using ref to avoid stale closure issues
    if (isLoadingLocationRef.current) {
      return { location: null, error: null };
    }

    const support = getLocationSupport();
    if (!support.secureContext) {
      setLocationError(getLocationErrorMessage("insecure_context"));
      setLocationErrorCode("insecure_context");
      setLocationStatus("insecure");
      return {
        location: null,
        error: new Error("Geolocation requires HTTPS"),
      };
    }
    if (!support.supported) {
      setBrowserPermission("unsupported");
      setLocationError(getLocationErrorMessage("unsupported"));
      setLocationErrorCode("unsupported");
      setLocationStatus("unsupported");
      return {
        location: null,
        error: new Error("Geolocation is not supported by the browser"),
      };
    }

    isLoadingLocationRef.current = true;
    setIsLoadingLocation(true);
    setLocationError(null);
    setLocationErrorCode(null);
    setLocationStatus("requesting");
    if (source === "user") {
      startUserRequestTimeout();
    }

    try {
      const position = await getCurrentPosition(positionOptions);
      const location = applyLocationSuccess(position);
      return { location, error: null };
    } catch (error) {
      applyLocationError(error);
      return { location: null, error };
    } finally {
      isLoadingLocationRef.current = false;
      setIsLoadingLocation(false);
      clearUserRequestTimeout();
    }
  }, [
    applyLocationError,
    applyLocationSuccess,
    browserPermission,
    clearUserRequestTimeout,
    startUserRequestTimeout,
  ]);

  const clearLocation = useCallback(() => {
    hasLocationRef.current = false;
    setUserLocation(null);
    setLastUpdated(null);
    setLocationError(null);
    setLocationErrorCode(null);
    setLocationStatus("idle");
    clearUserRequestTimeout();
  }, [clearUserRequestTimeout]);

  // ログアウト時に位置情報をクリア
  useEffect(() => {
    if (!accountId) {
      clearLocation();
    }
  }, [accountId, clearLocation]);

  // ブラウザのパーミッション設定と同期（Safari 16.0+対応）
  useEffect(() => {
    // Permissions API がサポートされているかチェック
    if (typeof navigator === "undefined") {
      return;
    }
    if (!navigator.permissions) {
      const support = getLocationSupport();
      setBrowserPermission(support.supported ? "prompt" : "unsupported");
      return;
    }

    let permissionStatus: PermissionStatus | null = null;
    const hasSession = Boolean(accountId && accountToken);

    const handlePermissionChange = () => {
      if (!permissionStatus) return;

      const state = permissionStatus.state;
      setBrowserPermission(state);

      // ブラウザ設定が変更されたときにステータスを更新
      if (state === "granted") {
        setLocationError(null);
        setLocationErrorCode(null);
        if (locationStatus === "denied" || locationStatus === "error") {
          setLocationStatus("idle");
        }
        if (hasSession && savedPermission !== "granted") {
          void persistSavedPermission(true);
        }
      } else if (state === "denied") {
        hasLocationRef.current = false;
        setLocationStatus("denied");
        setLocationError(getLocationErrorMessage("permission_denied"));
        setLocationErrorCode("permission_denied");
        setUserLocation(null);
        setLastUpdated(null);
        setIsLoadingLocation(false);
        if (hasSession && savedPermission !== "denied") {
          void persistSavedPermission(false);
        }
      } else if (state === "prompt") {
        hasLocationRef.current = false;
        setLocationError(null);
        setLocationErrorCode(null);
        setLocationStatus("idle");
        setUserLocation(null);
        setLastUpdated(null);
        setIsLoadingLocation(false);
      }
    };

    navigator.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        permissionStatus = status;
        // 初期状態をチェック
        handlePermissionChange();
        // 変更を監視
        status.addEventListener("change", handlePermissionChange);
      })
      .catch(() => {
        setBrowserPermission("prompt");
      });

    return () => {
      if (permissionStatus) {
        permissionStatus.removeEventListener("change", handlePermissionChange);
      }
    };
  }, [
    accountId,
    accountToken,
    locationStatus,
    persistSavedPermission,
    savedPermission,
  ]);

  // iOS Safari など Permissions API 非対応時の再同期（設定変更後の復帰を促す）
  useEffect(() => {
    if (typeof document === "undefined" || typeof navigator === "undefined") {
      return;
    }

    const handleVisibility = () => {
      if (document.visibilityState !== "visible") return;
      if (navigator.permissions?.query) {
        navigator.permissions
          .query({ name: "geolocation" })
          .then((status) => {
            setBrowserPermission(status.state);
            if (status.state === "granted") {
              setLocationError(null);
              setLocationErrorCode(null);
              if (locationStatus === "denied" || locationStatus === "error") {
                setLocationStatus("idle");
              }
              return;
            }
            if (status.state === "denied") {
              setLocationStatus("denied");
              setLocationError(getLocationErrorMessage("permission_denied"));
              setLocationErrorCode("permission_denied");
              setUserLocation(null);
              setLastUpdated(null);
              setIsLoadingLocation(false);
              return;
            }
            if (status.state === "prompt") {
              setLocationError(null);
              setLocationErrorCode(null);
              setLocationStatus("idle");
              setUserLocation(null);
              setLastUpdated(null);
              setIsLoadingLocation(false);
            }
          })
          .catch(() => {
            setBrowserPermission("prompt");
          });
        return;
      }

      const support = getLocationSupport();
      setBrowserPermission(support.supported ? "prompt" : "unsupported");
      if (locationStatus === "denied" || locationStatus === "error") {
        setLocationError(null);
        setLocationErrorCode(null);
        setLocationStatus("idle");
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pageshow", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pageshow", handleVisibility);
    };
  }, [locationStatus]);

  // 常時追従: permission が granted の間は watchPosition で継続更新
  useEffect(() => {
    if (typeof navigator === "undefined") return;

    const support = getLocationSupport();
    if (!support.secureContext) {
      setLocationError(getLocationErrorMessage("insecure_context"));
      setLocationErrorCode("insecure_context");
      setLocationStatus("insecure");
      return;
    }
    if (!support.supported || !navigator.geolocation?.watchPosition) {
      setBrowserPermission("unsupported");
      setLocationError(getLocationErrorMessage("unsupported"));
      setLocationErrorCode("unsupported");
      setLocationStatus("unsupported");
      return;
    }

    if (browserPermission !== "granted") {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      return;
    }

    if (watchIdRef.current !== null) {
      return;
    }

    watchHasFirstUpdateRef.current = false;
    if (!hasLocationRef.current) {
      setLocationStatus("requesting");
      setIsLoadingLocation(true);
      setLocationError(null);
      setLocationErrorCode(null);
    }

    const watchOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 10000,
    };

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        if (!watchHasFirstUpdateRef.current) {
          watchHasFirstUpdateRef.current = true;
          setIsLoadingLocation(false);
        }
        applyLocationSuccess(position);
      },
      (error) => {
        if (!watchHasFirstUpdateRef.current) {
          watchHasFirstUpdateRef.current = true;
          setIsLoadingLocation(false);
        }
        applyLocationError(error);
      },
      watchOptions,
    );

    watchIdRef.current = watchId;

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [
    applyLocationError,
    applyLocationSuccess,
    browserPermission,
  ]);

  const value: LocationContextType = {
    userLocation,
    isLoadingLocation,
    locationError,
    locationErrorCode,
    locationStatus,
    browserPermission,
    savedPermission,
    lastUpdated,
    requestLocation: refreshLocation,
    clearLocation,
  };

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
};

/**
 * Hook to access location context.
 * Provides access to user's location, loading state, errors, and location request functions.
 *
 * @throws Error if used outside of LocationProvider
 * @returns Location context value
 *
 * @example
 * ```tsx
 * const { userLocation, requestLocation, locationStatus } = useLocation();
 *
 * // Request location on button click
 * const handleClick = async () => {
 *   const { location, error } = await requestLocation({ source: "user" });
 *   if (location) {
 *     console.log(`Got location: ${location.lat}, ${location.lng}`);
 *   }
 * };
 * ```
 */
export const useLocation = () => {
  const context = useContext(LocationContext);
  if (context === undefined) {
    throw new Error("useLocation must be used within a LocationProvider");
  }
  return context;
};
