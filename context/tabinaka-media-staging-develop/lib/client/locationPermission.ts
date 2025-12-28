/**
 * Persists the user's location permission status to their account profile.
 * This is called when the user grants or denies location access.
 *
 * @param granted Whether the location permission was granted
 * @param accountId The user's account ID
 * @param accountToken The user's account token for authentication
 * @returns boolean indicating success of the operation
 */
export async function persistLocationPermission(
    granted: boolean,
    accountId?: string | null,
    accountToken?: string | null,
): Promise<boolean> {
    // アカウント情報がない場合は何もしない（保存できないため）
    if (!accountId || !accountToken) {
        return false;
    }

    try {
        const response = await fetch("/api/account/location-permission", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Gappy-Account-Id": accountId,
                "X-Gappy-Account-Token": accountToken,
            },
            body: JSON.stringify({ granted }),
        });

        if (!response.ok) {
            console.warn(
                `[locationPermission] Failed to persist permission (status: ${response.status})`,
            );
            return false;
        }

        return true;
    } catch (error) {
        console.warn("[locationPermission] Error persisting permission", error);
        return false;
    }
}
