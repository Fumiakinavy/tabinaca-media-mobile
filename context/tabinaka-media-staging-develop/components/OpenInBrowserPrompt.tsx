import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  getInAppBrowserKind,
  isAndroid,
  isIOS,
  isInAppBrowser,
} from "@/lib/client/inAppBrowser";

const DISMISSED_KEY = "gappy_open_in_browser_dismissed";

const getAppLabel = (kind: ReturnType<typeof getInAppBrowserKind>) => {
  if (kind === "line") return "LINE";
  if (kind === "instagram") return "Instagram";
  if (kind === "facebook") return "Facebook";
  return "App";
};

export default function OpenInBrowserPrompt() {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const { currentUrl, userAgent, inAppKind } = useMemo(() => {
    const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
    const url = typeof window === "undefined" ? "" : window.location.href;
    return {
      currentUrl: url,
      userAgent: ua,
      inAppKind: getInAppBrowserKind(ua),
    };
  }, [router.asPath]);

  const appLabel = getAppLabel(inAppKind);

  const androidIntentChromeUrl = useMemo(() => {
    if (!currentUrl) return "";
    try {
      const url = new URL(currentUrl);
      const hostPathQuery = `${url.host}${url.pathname}${url.search}`;
      const scheme = url.protocol.replace(":", "");
      // Prefer Chrome on Android; if missing, Android typically shows a chooser.
      return `intent://${hostPathQuery}#Intent;scheme=${scheme};package=com.android.chrome;end`;
    } catch {
      return "";
    }
  }, [currentUrl]);

  const androidIntentChooserUrl = useMemo(() => {
    if (!currentUrl) return "";
    try {
      const url = new URL(currentUrl);
      const hostPathQuery = `${url.host}${url.pathname}${url.search}`;
      const scheme = url.protocol.replace(":", "");
      return `intent://${hostPathQuery}#Intent;scheme=${scheme};end`;
    } catch {
      return "";
    }
  }, [currentUrl]);

  const iosChromeUrl = useMemo(() => {
    if (!currentUrl) return "";
    try {
      const url = new URL(currentUrl);
      const hostPathQuery = `${url.host}${url.pathname}${url.search}${url.hash}`;
      if (url.protocol === "https:") return `googlechromes://${hostPathQuery}`;
      if (url.protocol === "http:") return `googlechrome://${hostPathQuery}`;
      return "";
    } catch {
      return "";
    }
  }, [currentUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.sessionStorage.getItem(DISMISSED_KEY) === "1";
    const ua = navigator.userAgent;
    const isMobile = isIOS(ua) || isAndroid(ua);
    setIsVisible(!dismissed && isMobile && isInAppBrowser(ua));
  }, [router.asPath]);

  const dismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // ignore
    }
    setIsVisible(false);
  };

  const handleCopy = async () => {
    if (!currentUrl) return;
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = currentUrl;
        textarea.setAttribute("readonly", "true");
        textarea.style.position = "fixed";
        textarea.style.top = "-1000px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // ignore
      }
    }
  };

  const handleShare = async () => {
    if (!currentUrl) return;
    try {
      if (!("share" in navigator)) return;
      await (navigator as any).share({
        title: document.title,
        url: currentUrl,
      });
    } catch {
      // ignore
    }
  };

  if (!isVisible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="外部ブラウザで開く"
    >
      <button
        type="button"
        aria-label="閉じる"
        className="absolute inset-0 cursor-default bg-black/40"
        onClick={dismiss}
      />

      <div className="relative mx-4 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        <div className="space-y-2">
          <p className="text-sm font-semibold text-gray-900">
            {appLabel}のアプリ内ブラウザで開かれています
          </p>
          <p className="text-xs leading-relaxed text-gray-600">
            Safari / Google Chrome で開くと、表示やログイン、位置情報などが安定する場合があります。
          </p>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2">
          {isIOS(userAgent) ? (
            <>
              <button
                type="button"
                onClick={handleShare}
                className="inline-flex items-center justify-center rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 disabled:opacity-50"
                disabled={!currentUrl || !("share" in navigator)}
              >
                Safariで開く（共有から）
              </button>

              {iosChromeUrl ? (
                <a
                  href={iosChromeUrl}
                  onClick={dismiss}
                  className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50"
                >
                  Google Chromeで開く
                </a>
              ) : null}

              <p className="text-xs text-gray-500">
                Safariで開く: 共有 →「Safariで開く」を選択してください
              </p>
            </>
          ) : null}

          {isAndroid(userAgent) ? (
            <>
              {androidIntentChromeUrl ? (
                <a
                  href={androidIntentChromeUrl}
                  onClick={dismiss}
                  className="inline-flex items-center justify-center rounded-full bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800"
                >
                  Google Chromeで開く
                </a>
              ) : null}

              {androidIntentChooserUrl ? (
                <a
                  href={androidIntentChooserUrl}
                  onClick={dismiss}
                  className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50"
                >
                  ブラウザを選んで開く
                </a>
              ) : null}
            </>
          ) : null}

          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 transition hover:bg-gray-50 disabled:opacity-50"
            disabled={!currentUrl}
          >
            {copied ? "コピーしました" : "リンクをコピー"}
          </button>

          <button
            type="button"
            onClick={dismiss}
            className="inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
          >
            このまま続ける
          </button>
        </div>
      </div>
    </div>
  );
}
