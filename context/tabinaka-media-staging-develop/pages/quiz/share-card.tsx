import {
  type WheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { GetStaticProps } from "next";
import Head from "next/head";
import { useRouter } from "next/router";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { getTravelTypeResultContent } from "@/content/travelTypeResults";
import {
  TRAVEL_TYPE_MAPPINGS,
  TravelTypeCode,
  isValidTravelTypeCode,
} from "@/lib/travelTypeMapping";
import { getSiteUrl } from "@/lib/env";

const DEFAULT_CARD_WIDTH = 640;
const DEFAULT_CARD_HEIGHT = 960;

export default function ShareCardPage() {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);
  const dragRef = useRef<{
    isActive: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    startRotation: number;
    axis: "x" | "y" | null;
  }>({
    isActive: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startRotation: 0,
    axis: null,
  });
  const [downloading, setDownloading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [ringRadius, setRingRadius] = useState(420);
  const [userTravelTypeCode, setUserTravelTypeCode] =
    useState<TravelTypeCode | null>(null);
  const [selectedCode, setSelectedCode] = useState<TravelTypeCode | null>(
    (Object.keys(TRAVEL_TYPE_MAPPINGS) as TravelTypeCode[])[0] ?? null,
  );
  const { t } = useTranslation("common");

  const travelTypes = useMemo(
    () =>
      (Object.keys(TRAVEL_TYPE_MAPPINGS) as TravelTypeCode[]).map((typeCode) =>
        getTravelTypeResultContent(typeCode),
      ),
    [],
  );
  const stepDeg = 360 / travelTypes.length;
  const baseTiltDeg = 0;

  const rawCode =
    typeof router.query.code === "string" ? router.query.code : null;
  const code = useMemo<TravelTypeCode | null>(
    () => (rawCode && isValidTravelTypeCode(rawCode) ? rawCode : null),
    [rawCode],
  );
  useEffect(() => {
    if (code) {
      setSelectedCode(code);
    }
  }, [code]);

  useEffect(() => {
    const node = ringRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const size = Math.min(entry.contentRect.width, entry.contentRect.height);
        const base = size < 768 ? size * 0.72 : size * 0.6;
        setRingRadius(Math.min(Math.max(380, base), 700));
      });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let aborted = false;
    const fetchUserType = async () => {
      try {
        const res = await fetch("/api/account/quiz-state");
        if (!res.ok) return;
        const data = await res.json();
        const candidate = data?.quizState?.travelType?.travelTypeCode;
        if (candidate && isValidTravelTypeCode(candidate) && !aborted) {
          setUserTravelTypeCode(candidate);
        }
      } catch (e) {
        console.warn("[share-card] failed to fetch quiz state", e);
      }
    };
    fetchUserType();
    return () => {
      aborted = true;
    };
  }, []);

  const travel = useMemo(() => {
    if (!travelTypes.length) return null;
    if (!selectedCode) return travelTypes[0] ?? null;
    return (
      travelTypes.find((type) => type.code === selectedCode) ?? travelTypes[0]
    );
  }, [selectedCode, travelTypes]);

  const shareUrl = useMemo(() => {
    const base = getSiteUrl().replace(/\/$/, "");
    const targetCode = selectedCode ?? rawCode ?? "";
    return `${base}/quiz/share-card?code=${encodeURIComponent(targetCode)}`;
  }, [selectedCode, rawCode]);

  useEffect(() => {
    if (!code && router.isReady) {
      // redirect back to quiz
      router.replace("/quiz").catch(() => undefined);
    }
  }, [code, router]);

  useEffect(() => {
    if (!selectedCode) return;
    const activeIndex = travelTypes.findIndex(
      (type) => type.code === selectedCode,
    );
    if (activeIndex >= 0) {
      setRotationDeg(-activeIndex * stepDeg);
    }
  }, [selectedCode, stepDeg, travelTypes]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    const normalized = ((rotationDeg % 360) + 360) % 360;
    const nextLeft = (normalized / 360) * max;
    isSyncingScroll.current = true;
    el.scrollTo({ left: nextLeft });
    requestAnimationFrame(() => {
      isSyncingScroll.current = false;
    });
  }, [rotationDeg]);

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    setRotationDeg((prev) => prev + delta * 0.25);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    dragRef.current = {
      isActive: true,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startRotation: rotationDeg,
      axis: null,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // no-op
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state.isActive || state.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;

    if (!state.axis) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      state.axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
    }

    if (state.axis !== "x") return;
    event.preventDefault();
    setRotationDeg(state.startRotation + dx * 0.35);
  };

  const handlePointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state.isActive || state.pointerId !== event.pointerId) return;
    dragRef.current.isActive = false;
    dragRef.current.pointerId = null;
    dragRef.current.axis = null;
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // no-op
    }
  };

  const handleHorizontalScroll = () => {
    const el = scrollRef.current;
    if (!el || isSyncingScroll.current) return;
    const max = el.scrollWidth - el.clientWidth;
    if (max <= 0) return;
    const ratio = el.scrollLeft / max;
    setRotationDeg(ratio * 360);
  };

  const handleSelectType = (typeCode: TravelTypeCode) => {
    setSelectedCode(typeCode);
    router
      .replace(
        { pathname: router.pathname, query: { code: typeCode } },
        undefined,
        { shallow: true },
      )
      .catch(() => undefined);
  };

  const buildCanvasBlob = async (): Promise<Blob> => {
    if (!travel) throw new Error("no travel");

    const targetWidth =
      cardRef.current?.getBoundingClientRect().width ?? DEFAULT_CARD_WIDTH;
    const width = Math.max(320, Math.round(targetWidth));
    const heroHeight = Math.round(width * 1.25); // 画像高さは維持
    const textAreaHeight = 360; // 説明枠を大きく確保
    const height = heroHeight + textAreaHeight;

    const canvas = document.createElement("canvas");
    canvas.width = width * 2; // higher resolution for clarity
    canvas.height = height * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no canvas");
    ctx.scale(2, 2);

    // background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // hero image area
    await drawImageCoverTop(ctx, travel.heroImage, 0, 0, width, heroHeight);

    // description（残りわずか）
    const paddingX = 20;
    const textTop = heroHeight + 120; // 説明開始位置をさらに下げる
    wrapText(
      ctx,
      travel.description,
      paddingX,
      textTop,
      width - paddingX * 2,
      22,
      "#1f2937",
      '16px "Helvetica Neue", Arial',
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob) throw new Error("blob null");
    return blob;
  };

  const downloadImage = async () => {
    if (!travel) return;
    setDownloading(true);
    try {
      const blob = await buildCanvasBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `travel-type-${travel.code}.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[share-card] download failed", e);
    } finally {
      setDownloading(false);
    }
  };

  const copyImage = async () => {
    if (
      !travel ||
      typeof navigator === "undefined" ||
      !navigator.clipboard ||
      !(window as any).ClipboardItem
    )
      return;
    setCopying(true);
    try {
      const blob = await buildCanvasBlob();
      const item = new (window as any).ClipboardItem({ "image/png": blob });
      await navigator.clipboard.write([item]);
    } catch (e) {
      console.error("[share-card] copy image failed", e);
    } finally {
      setCopying(false);
    }
  };

  const buildShareFile = async () => {
    const blob = await buildCanvasBlob();
    return new File([blob], `travel-type-${travel?.code ?? "share"}.png`, {
      type: "image/png",
    });
  };

  const shareToX = async () => {
    if (!travel) return;
    const text = `${travel.title} - ${travel.description}`;

    // Try Web Share API first (works on mobile with image support)
    try {
      if (typeof navigator !== "undefined" && (navigator as any).canShare) {
        const file = await buildShareFile();
        if ((navigator as any).canShare({ files: [file] })) {
          await (navigator as any).share({
            title: travel.title,
            text,
            files: [file],
          });
          return;
        }
      }
    } catch (e) {
      console.warn(
        "[share-card] X share with file failed, trying clipboard method",
        e,
      );
    }

    // Fallback: Copy image to clipboard and open X with text
    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        (window as any).ClipboardItem
      ) {
        const blob = await buildCanvasBlob();
        const item = new (window as any).ClipboardItem({ "image/png": blob });
        await navigator.clipboard.write([item]);

        // Open X tweet composer
        const intentText = encodeURIComponent(text);
        const url = encodeURIComponent(shareUrl);
        window.open(
          `https://twitter.com/intent/tweet?text=${intentText}&url=${url}`,
          "_blank",
        );

        // Show instruction if possible
        if (typeof window !== "undefined") {
          setTimeout(() => {
            alert(
              t(
                "shareCard.xImageCopied",
                "画像をクリップボードにコピーしました。Xの投稿画面で画像を貼り付けてください。",
              ),
            );
          }, 500);
        }
        return;
      }
    } catch (e) {
      console.warn(
        "[share-card] Clipboard copy failed, fallback to download",
        e,
      );
    }

    // Final fallback: Download image and open X
    try {
      const blob = await buildCanvasBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `travel-type-${travel.code}.png`;
      a.click();
      URL.revokeObjectURL(url);

      const intentText = encodeURIComponent(text);
      const shareUrlEncoded = encodeURIComponent(shareUrl);
      window.open(
        `https://twitter.com/intent/tweet?text=${intentText}&url=${shareUrlEncoded}`,
        "_blank",
      );

      setTimeout(() => {
        alert(
          t(
            "shareCard.xImageDownloaded",
            "画像をダウンロードしました。Xの投稿画面で画像をアップロードしてください。",
          ),
        );
      }, 500);
    } catch (e) {
      console.error("[share-card] X share fallback failed", e);
      // Last resort: just open X with text and URL
      const intentText = encodeURIComponent(text);
      const shareUrlEncoded = encodeURIComponent(shareUrl);
      window.open(
        `https://twitter.com/intent/tweet?text=${intentText}&url=${shareUrlEncoded}`,
        "_blank",
      );
    }
  };

  const shareToInstagram = async () => {
    if (!travel) return;
    try {
      if (typeof navigator !== "undefined" && (navigator as any).canShare) {
        const file = await buildShareFile();
        if ((navigator as any).canShare({ files: [file] })) {
          await (navigator as any).share({
            title: travel.title,
            text: travel.title,
            files: [file],
          });
          return;
        }
      }
    } catch (e) {
      console.warn(
        "[share-card] Instagram share via share sheet failed, fallback to download",
        e,
      );
    }

    // Fallback: save image locally and ask user to post manually
    try {
      const blob = await buildCanvasBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `travel-type-${travel.code}.png`;
      a.click();
      URL.revokeObjectURL(url);
      alert("画像を保存しました。Instagramで画像を選択して投稿してください。");
    } catch (e) {
      console.error("[share-card] Instagram fallback download failed", e);
    }
  };

  if (!travel) {
    return null;
  }

  return (
    <>
      <Head>
        <title>{t("shareCard.pageTitle", { code: travel.code })}</title>
        <meta name="description" content={travel.description} />
        <link rel="canonical" href={shareUrl} />
      </Head>
      <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 overflow-x-hidden">
        <Header />
        <main className="flex-1 px-4 py-12 flex flex-col items-center">
          <div className="w-full max-w-5xl flex flex-col items-center gap-12">
            <section className="w-full flex flex-col items-center gap-3">
              <div
                ref={scrollRef}
                onScroll={handleHorizontalScroll}
                className="w-full max-w-3xl sm:max-w-4xl overflow-x-auto px-3 sm:px-4 py-3 [-webkit-overflow-scrolling:touch] no-scrollbar touch-pan-x"
              >
                <div className="h-3 w-[900px] sm:w-[1300px] lg:w-[1600px] rounded-full bg-gradient-to-r from-slate-100 via-slate-200 to-slate-100 shadow-inner" />
              </div>
              <div
                ref={ringRef}
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerEnd}
                onPointerCancel={handlePointerEnd}
                className="relative w-full max-w-3xl sm:max-w-4xl aspect-square rounded-full border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-inner overflow-visible select-none touch-pan-y"
                style={{
                  perspective: `${Math.max(ringRadius * 4.5, 900)}px`,
                }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: `translateZ(0px) rotateX(${baseTiltDeg}deg) rotateY(${rotationDeg}deg)`,
                  }}
                >
                  {travelTypes.map((type, idx) => {
                    const angleDeg = idx * stepDeg;
                    const relativeDeg =
                      ((angleDeg + rotationDeg) % 360 + 360) % 360;
                    const facing = Math.cos((relativeDeg * Math.PI) / 180); // 1: front, -1: back
                    const depthFactor = (facing + 1) / 2; // 0..1
                    const scale = 0.85 + 0.12 * depthFactor;
                    const opacity = 0.6 + 0.4 * depthFactor;
                    const depthZ = ringRadius * (1.12 + 0.14 * depthFactor);
                    const isActive = type.code === selectedCode;
                    const isUserType =
                      userTravelTypeCode && type.code === userTravelTypeCode;
                    return (
                      <div
                        key={type.code}
                        className="absolute left-1/2 top-1/2"
                        style={{
                          transformStyle: "preserve-3d",
                          transform: `translate(-50%, -50%) rotateY(${angleDeg}deg) translateZ(${depthZ}px)`,
                          zIndex: Math.round(depthFactor * 1000),
                          opacity,
                        }}
                      >
                        <button
                          onClick={() => handleSelectType(type.code)}
                          className={`group relative rounded-2xl bg-white/90 backdrop-blur shadow-lg border border-slate-200 transition-all duration-300 [backface-visibility:hidden] ${
                            isUserType
                              ? "ring-2 ring-emerald-400 shadow-xl border-emerald-500"
                              : isActive
                                ? "ring-2 ring-slate-200 shadow-xl"
                                : "hover:shadow-xl"
                          }`}
                          style={{
                            transformStyle: "preserve-3d",
                            transform: `scale(${scale})`,
                          }}
                        >
                          {isUserType && (
                            <span className="absolute left-2 top-2 rounded-full bg-emerald-500 px-2 py-1 text-[11px] font-semibold text-white shadow-sm">
                              You
                            </span>
                          )}
                          <div className="w-32 h-48 sm:w-40 sm:h-56 md:w-44 md:h-64 p-3 flex items-center justify-center">
                            <img
                              src={type.heroImage}
                              alt={type.title}
                              loading="lazy"
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <div className="px-3 pb-3 text-center text-xs text-slate-700 font-medium">
                            {type.title}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            <div className="w-full max-w-2xl flex flex-col items-center gap-8">
              <div
                ref={cardRef}
                className="w-full max-w-[328px] md:max-w-[369px] rounded-[28px] bg-white shadow-2xl border border-slate-200 overflow-hidden"
              >
                <div className="bg-slate-100 p-0 flex items-center justify-center">
                  <img
                    src={travel.heroImage}
                    alt={travel.title}
                    className="w-full max-w-full object-contain"
                  />
                </div>
                <div className="px-6 py-6 md:px-7 md:py-7 bg-white">
                  <p className="text-sm md:text-base text-slate-700 leading-relaxed whitespace-pre-line text-center">
                    {travel.description}
                  </p>
                </div>
              </div>

              <div className="text-center space-y-2">
                <p className="text-sm text-slate-500">
                  {t("shareCard.shareLink")}
                </p>
                <div className="text-sm bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm break-all">
                  {shareUrl}
                </div>
                <div className="flex flex-wrap justify-center gap-3 text-sm">
                  <button
                    onClick={() => navigator.clipboard?.writeText(shareUrl)}
                    className="rounded-md bg-slate-900 text-white px-3 py-2"
                  >
                    {t("shareCard.copyLink")}
                  </button>
                  <button
                    onClick={shareToX}
                    className="rounded-md bg-[#000000] text-white px-3 py-2"
                  >
                    {t("shareCard.shareXImage", "Share on X")}
                  </button>
                  <button
                    onClick={shareToInstagram}
                    className="rounded-md bg-gradient-to-r from-[#f58529] via-[#feda77] to-[#dd2a7b] text-white px-3 py-2"
                  >
                    {t("shareCard.shareInstagram", "Share on Instagram")}
                  </button>
                  <button
                    onClick={downloadImage}
                    disabled={downloading}
                    className="rounded-md bg-emerald-600 text-white px-3 py-2 disabled:opacity-60"
                  >
                    {downloading
                      ? t("shareCard.downloading")
                      : t("shareCard.downloadImage")}
                  </button>
                  <button
                    onClick={copyImage}
                    disabled={copying}
                    className="rounded-md bg-emerald-50 text-emerald-700 px-3 py-2 border border-emerald-200 disabled:opacity-60"
                  >
                    {copying ? t("shareCard.copying") : t("shareCard.copyImage")}
                  </button>
                </div>
                <p className="text-xs text-slate-500">
                  {t("shareCard.noteInstagram")}
                </p>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </>
  );
}

export const getStaticProps: GetStaticProps = async ({ locale }) => ({
  props: {
    ...(await serverSideTranslations(locale ?? "en", ["common"])),
  },
});

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  color: string,
  font = '32px "Helvetica Neue", Arial',
) {
  ctx.fillStyle = color;
  ctx.font = font;
  const words = text.split(/\s+/);
  let line = "";
  let cy = y;
  words.forEach((word, idx) => {
    const testLine = line + word + " ";
    const { width } = ctx.measureText(testLine);
    if (width > maxWidth && line !== "") {
      ctx.fillText(line, x, cy);
      line = word + " ";
      cy += lineHeight;
    } else {
      line = testLine;
    }
    if (idx === words.length - 1) {
      ctx.fillText(line, x, cy);
    }
  });
}

function drawImageCoverTop(
  ctx: CanvasRenderingContext2D,
  src: string | undefined,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
) {
  return new Promise<void>((resolve) => {
    if (!src) {
      resolve();
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const ratio = Math.max(maxW / img.width, maxH / img.height);
      const drawW = img.width * ratio;
      const drawH = img.height * ratio;
      const offsetX = x + (maxW - drawW) / 2;
      const offsetY = y; // 上寄せでトリミングは下側優先
      ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = src;
  });
}
