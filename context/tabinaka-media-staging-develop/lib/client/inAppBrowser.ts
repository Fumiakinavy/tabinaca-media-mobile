export type InAppBrowserKind = "line" | "instagram" | "facebook";

export function getInAppBrowserKind(
  userAgent: string,
): InAppBrowserKind | null {
  const ua = userAgent.toLowerCase();

  if (ua.includes("line/")) return "line";
  if (ua.includes("instagram")) return "instagram";
  // Facebook / Messenger in-app browsers commonly include these tokens.
  if (ua.includes("fban/") || ua.includes("fbav/") || ua.includes("fb_iab"))
    return "facebook";

  return null;
}

export function isInAppBrowser(userAgent: string): boolean {
  return getInAppBrowserKind(userAgent) !== null;
}

export function isIOS(userAgent: string): boolean {
  const ua = userAgent.toLowerCase();
  return ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod");
}

export function isAndroid(userAgent: string): boolean {
  return userAgent.toLowerCase().includes("android");
}

