import { useCallback, useEffect, useState } from "react";
import { persistLocationPermission } from "@/lib/client/locationPermission";

const LOCATION_PERMISSION_ENDPOINT = "/api/account/location-permission";

export type SavedLocationPermissionState = "unknown" | "granted" | "denied";

/**
 * Fetches the location permission state from the server.
 * @returns The permission state or null if fetch fails
 */
async function fetchLocationPermission(
  accountId: string,
  accountToken: string,
  signal?: AbortSignal,
): Promise<SavedLocationPermissionState> {
  try {
    const response = await fetch(LOCATION_PERMISSION_ENDPOINT, {
      method: "GET",
      headers: {
        "X-Gappy-Account-Id": accountId,
        "X-Gappy-Account-Token": accountToken,
      },
      signal,
    });

    if (!response.ok) {
      throw new Error("Failed to load location permission");
    }

    const data = (await response.json()) as {
      granted?: boolean | null;
      state?: "granted" | "denied" | "unknown";
    };
    if (data?.state === "granted" || data?.state === "denied") {
      return data.state;
    }
    if (data?.state === "unknown") {
      return "unknown";
    }
    if (data?.granted === true) {
      return "granted";
    }
    if (data?.granted === false) {
      return "denied";
    }
    return "unknown";
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    console.warn("[locationPermission] Failed to load permission", error);
    return "unknown";
  }
}

export function useSavedLocationPermission(
  accountId?: string | null,
  accountToken?: string | null,
) {
  const [savedPermission, setSavedPermission] =
    useState<SavedLocationPermissionState>("unknown");
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!accountId || !accountToken) {
      setSavedPermission("unknown");
      return;
    }

    setIsLoading(true);
    const permission = await fetchLocationPermission(accountId, accountToken);
    setSavedPermission(permission);
    setIsLoading(false);
  }, [accountId, accountToken]);

  useEffect(() => {
    if (!accountId || !accountToken) {
      setSavedPermission("unknown");
      return;
    }

    const controller = new AbortController();
    const { signal } = controller;

    setIsLoading(true);
    fetchLocationPermission(accountId, accountToken, signal)
      .then((permission) => {
        if (!signal.aborted) {
          setSavedPermission(permission);
        }
      })
      .finally(() => {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [accountId, accountToken]);

  const persist = useCallback(
    async (granted: boolean) => {
      const success = await persistLocationPermission(
        granted,
        accountId,
        accountToken,
      );
      if (success) {
        setSavedPermission(granted ? "granted" : "denied");
      }
      return success;
    },
    [accountId, accountToken],
  );

  return {
    savedPermission,
    isLoading,
    refresh,
    persist,
  };
}
