import React, { useState, useEffect, useMemo, forwardRef } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PlaceCard from "./PlaceCard";

const stripImageSyntax = (text: string): string =>
  text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/<img[\s\S]*?>/gi, "")
    .replace(/<figure[\s\S]*?<\/figure>/gi, "")
    .trim();

interface ChatMessageProps {
  role: "user" | "assistant" | "system";
  messageId: string;
  content: string;
  timestamp?: Date;
  isLoading?: boolean;
  isTyping?: boolean;
  typingSpeed?: number;
  places?: Array<{
    place_id: string;
    name: string;
    formatted_address?: string;
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    types?: string[];
    photos?: Array<{
      photo_reference: string;
      height: number;
      width: number;
    }>;
    opening_hours?: {
      open_now?: boolean;
    };
    editorial_summary?: {
      overview?: string;
    };
    distance_m?: number;
    affiliateUrl?: string; // アフィリエイトリンク
    price?: string; // アフィリエイト価格表示
    duration?: string; // 所要時間
    isAffiliate?: boolean; // アフィリエイト体験フラグ
    imageUrl?: string; // アフィリエイト画像URL
  }>;
  onPlaceClick?: (place: any) => void;
  onDetailsClick?: (place: any) => void;
  fullHeightPlaceholder?: boolean;
  functionResults?: Array<{
    function: string;
    result: any;
  }>;
  images?: Array<{
    url: string;
    prompt: string;
    mimeType: string;
    width: number;
    height: number;
    createdAt: string;
    model: string;
  }>;
  statusUpdates?: Array<{
    id: string;
    label: string;
    state: "pending" | "success" | "error";
    startedAt?: string;
    finishedAt?: string;
  }>;
  userAvatarUrl?: string | null;
  uiBlocks?: UIBlock[];
}

type UIBlockState = "pending" | "ready" | "error";

type UIBlock = {
  id: string;
  kind: string;
  state: UIBlockState;
  input?: Record<string, unknown>;
  places?: ChatMessageProps["places"];
  updatedCards?: ChatMessageProps["places"];
  message?: string;
};

export const ChatMessage = forwardRef<HTMLDivElement, ChatMessageProps>(
  (
    {
      messageId,
      role,
      content,
      timestamp,
      isLoading = false,
      isTyping = false,
      typingSpeed = 30,
      places,
      onPlaceClick,
      onDetailsClick,
      fullHeightPlaceholder = false,
      functionResults,
      images,
      statusUpdates,
      userAvatarUrl,
      uiBlocks,
    },
    ref
  ) => {
    const isUser = role === "user";
    const isSystem = role === "system";
    const hasUIBlocks = !!uiBlocks && uiBlocks.length > 0;
    const [displayedContent, setDisplayedContent] = useState("");
    const [isTypingComplete, setIsTypingComplete] = useState(false);
    const activeStatus = useMemo(() => {
      if (!statusUpdates || statusUpdates.length === 0) {
        return null;
      }

      const parseTime = (value?: string) => {
        if (!value) return 0;
        const parsed = Date.parse(value);
        return Number.isNaN(parsed) ? 0 : parsed;
      };

      return statusUpdates.reduce((latest, current) => {
        const latestTime =
          parseTime(latest.finishedAt) || parseTime(latest.startedAt);
        const currentTime =
          parseTime(current.finishedAt) || parseTime(current.startedAt);
        return currentTime >= latestTime ? current : latest;
      });
    }, [statusUpdates]);
    const contentForRender = useMemo(() => {
      if (isUser || isSystem) {
        return displayedContent;
      }
      return stripImageSyntax(displayedContent);
    }, [displayedContent, isUser, isSystem]);
    const skeletonLines = useMemo(() => {
      const widths = [
        "w-full",
        "w-11/12",
        "w-10/12",
        "w-4/5",
        "w-3/4",
        "w-2/3",
      ];
      const repetitions = fullHeightPlaceholder ? 3 : 1;
      const lines: Array<{ width: string; delay: number }> = [];
      for (let i = 0; i < repetitions; i++) {
        widths.forEach((width, index) => {
          lines.push({ width, delay: (i * widths.length + index) * 70 });
        });
      }
      return lines;
    }, [fullHeightPlaceholder]);

    // Typewriter effect with natural speed variation
    useEffect(() => {
      if (!isTyping || isUser || isSystem) {
        setDisplayedContent(content);
        setIsTypingComplete(true);
        return;
      }

      setDisplayedContent("");
      setIsTypingComplete(false);

      let currentIndex = 0;
      let timeoutId: NodeJS.Timeout;

      const typeNextChar = () => {
        if (currentIndex < content.length) {
          setDisplayedContent(content.slice(0, currentIndex + 1));
          currentIndex++;

          // Add natural speed variation
          let delay = typingSpeed;

          // Longer pause after punctuation
          const char = content[currentIndex - 1];
          if (char === "." || char === "!" || char === "?" || char === "\n") {
            delay = typingSpeed * 3;
          } else if (char === "," || char === ";" || char === ":") {
            delay = typingSpeed * 2;
          } else if (char === " ") {
            delay = typingSpeed * 1.2;
          }

          // Random speed variation (±20%)
          delay = delay * (0.8 + Math.random() * 0.4);

          timeoutId = setTimeout(typeNextChar, delay);
        } else {
          setIsTypingComplete(true);
        }
      };

      typeNextChar();

      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }, [content, isTyping, isUser, isSystem, typingSpeed]);

    // Cursor blinking during typewriter effect
    const [cursorVisible, setCursorVisible] = useState(true);

    useEffect(() => {
      if (isTyping && !isTypingComplete) {
        const cursorInterval = setInterval(() => {
          setCursorVisible((prev) => !prev);
        }, 500);
        return () => clearInterval(cursorInterval);
      } else {
        setCursorVisible(false);
      }
    }, [isTyping, isTypingComplete]);

    const renderStatusIcon = (state: "pending" | "success" | "error") => {
      if (state === "success") {
        return (
          <span className="inline-flex items-center justify-center w-4 h-4 text-emerald-500">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path
                fillRule="evenodd"
                d="M16.707 5.293a1 1 0 00-1.414 0L8.5 12.086 5.707 9.293a1 1 0 00-1.414 1.414l3.5 3.5a1 1 0 001.414 0l7-7a1 1 0 000-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        );
      }
      if (state === "error") {
        return (
          <span className="inline-flex items-center justify-center w-4 h-4 text-red-500">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm-1-11a1 1 0 112 0v4a1 1 0 11-2 0V7zm1 8a1.5 1.5 0 100-3 1.5 1.5 0 000 3z"
                clipRule="evenodd"
              />
            </svg>
          </span>
        );
      }
      return (
        <span className="inline-flex items-center justify-center w-4 h-4">
          <span className="inline-flex w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </span>
      );
    };

    const getStatusTextClass = (state: "pending" | "success" | "error") => {
      switch (state) {
        case "pending":
          return "text-emerald-600";
        case "success":
          return "text-gray-600";
        case "error":
          return "text-red-600";
        default:
          return "text-gray-600";
      }
    };

    const PlaceSkeletonCard = () => (
      <div className="h-full rounded-2xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50 to-white p-3 shadow-sm">
        <div className="h-36 rounded-xl bg-emerald-100/60 animate-pulse mb-3" />
        <div className="space-y-2">
          <div className="h-3 w-5/6 bg-emerald-100 animate-pulse rounded" />
          <div className="h-3 w-4/6 bg-emerald-100 animate-pulse rounded" />
          <div className="h-3 w-2/3 bg-emerald-50 animate-pulse rounded" />
        </div>
      </div>
    );

    const renderUIBlock = (block: UIBlock) => {
      const cards = block.places || block.updatedCards;

      if (block.state === "pending") {
        return (
          <div
            key={`${messageId}-uiblock-${block.id}`}
            className="mb-5 rounded-2xl border border-emerald-100 bg-white/80 p-4 shadow-sm backdrop-blur"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
              {block.kind === "search_places"
                ? "Searching for spots near you..."
                : "Working on it..."}
            </div>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[0, 1, 2].map((index) => (
                <PlaceSkeletonCard key={`${block.id}-skeleton-${index}`} />
              ))}
            </div>
          </div>
        );
      }

      if (block.state === "error") {
        return (
          <div
            key={`${messageId}-uiblock-${block.id}`}
            className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {block.message || "ツール実行中にエラーが発生しました。"}
          </div>
        );
      }

      if (cards && cards.length > 0) {
        return (
          <div
            key={`${messageId}-uiblock-${block.id}`}
            className="mb-5 rounded-2xl border border-emerald-50 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                {block.kind === "search_places" ? "Search Results" : "Places"}
              </div>
              <div className="text-[11px] text-gray-400">
                {cards.length} spot{cards.length > 1 ? "s" : ""}
              </div>
            </div>
            <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 pr-1 sm:pr-2 w-full -mx-2 sm:mx-0 px-2 sm:px-0 touch-pan-x">
              {cards.map((place, index) => (
                <motion.div
                  key={`${block.id}-${place?.place_id || index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="min-w-[230px] max-w-[230px] flex-shrink-0"
                >
                  <PlaceCard
                    place={place as any}
                    onSelect={
                      onPlaceClick ? () => onPlaceClick(place) : undefined
                    }
                    onDetailsClick={
                      onDetailsClick ? () => onDetailsClick(place) : undefined
                    }
                  />
                </motion.div>
              ))}
            </div>
          </div>
        );
      }

      return null;
    };

    return (
      <motion.div
        ref={ref}
        data-message-id={messageId}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`flex ${isUser ? "justify-end" : "justify-start"} mb-0`}
      >
        <div
          className={`flex ${isUser ? "flex-row-reverse" : "flex-row"} items-end max-w-full xs:max-w-[96%] sm:max-w-[95%] md:max-w-[92%] gap-1.5 sm:gap-2 w-full`}
        >
          {/* Avatar */}
          {!isSystem && (
            <div className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center">
              {isUser ? (
                userAvatarUrl ? (
                  <Image
                    src={userAvatarUrl}
                    alt="Google account profile image"
                    width={32}
                    height={32}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm bg-gradient-to-br from-green-500 to-green-600">
                    U
                  </div>
                )
              ) : (
                <Image
                  src="/images/gappy-round-logo.png"
                  alt="Gappy AI"
                  width={128}
                  height={128}
                  quality={100}
                  priority
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover"
                />
              )}
            </div>
          )}

          {/* Message Content */}
          <div className="flex flex-col w-full max-w-full xs:max-w-[94%] sm:max-w-[92%] md:max-w-[88%] lg:max-w-[80%] xl:max-w-[1500px]">
            {isUser ? (
              <div className="self-end inline-block max-w-[85%] xs:max-w-[82%] sm:max-w-[80%] md:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 bg-green-500 text-white rounded-br-none">
                <div className="whitespace-pre-wrap break-words leading-relaxed text-sm sm:text-base">
                  <p>{contentForRender}</p>
                </div>
              </div>
            ) : isSystem ? (
              <div className="rounded-2xl px-3 sm:px-4 py-2 sm:py-3 bg-gray-100 text-gray-600 text-xs sm:text-sm italic text-center">
                <div className="whitespace-pre-wrap break-words leading-relaxed">
                  <p>{contentForRender}</p>
                </div>
              </div>
            ) : (
              <div className="w-full text-gray-800">
                {activeStatus && (
                  <div className="mb-4">
                    <div className="flex items-center gap-2 text-xs sm:text-sm">
                      {renderStatusIcon(activeStatus.state)}
                      <span className={getStatusTextClass(activeStatus.state)}>
                        {activeStatus.label}
                      </span>
                    </div>
                  </div>
                )}
                {hasUIBlocks && uiBlocks && uiBlocks.length > 0 && (
                  <div className="mb-1 space-y-2">
                    {uiBlocks.map((block) => renderUIBlock(block))}
                  </div>
                )}
                {!hasUIBlocks && places && places.length > 0 && !isLoading && (
                  <div className="mb-4">
                    <div className="text-xs sm:text-sm text-gray-600 font-semibold mb-2 sm:mb-3">
                      Recommended Places (Top {places.length})
                    </div>
                    <div className="flex gap-2 sm:gap-3 overflow-x-auto overflow-y-hidden pb-2 pr-1 sm:pr-2 w-full -mx-2 sm:-mx-0 px-2 sm:px-0 overscroll-x-none">
                      {places.map((place, index) => (
                        <motion.div
                          key={place.place_id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="min-w-[230px] max-w-[230px] flex-shrink-0"
                          data-place-card
                        >
                          <PlaceCard
                            place={place}
                            onSelect={
                              onPlaceClick
                                ? () => onPlaceClick(place)
                                : undefined
                            }
                            onDetailsClick={
                              onDetailsClick
                                ? () => onDetailsClick(place)
                                : undefined
                            }
                          />
                        </motion.div>
                      ))}
                    </div>
                    <div className="mt-1 sm:mt-2 text-[10px] sm:text-xs text-gray-500 flex items-center gap-1">
                      Swipe sideways to explore more spots
                    </div>
                  </div>
                )}
                {isLoading ? (
                  <div className="flex flex-col gap-3 py-2">
                    <div className="flex items-center gap-2 text-xs text-gray-400">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-200 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-400" />
                      </span>
                      Generating suggestions...
                    </div>
                    <div className="flex flex-col gap-2">
                      {skeletonLines.map(({ width, delay }, index) => (
                        <div
                          key={`${messageId}-skeleton-${index}`}
                          className={`h-3 rounded bg-gray-200 animate-pulse ${width}`}
                          style={{ animationDelay: `${delay}ms` }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-gray-300">
                      <span
                        className="w-1 h-1 bg-gray-300 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                      />
                      <span
                        className="w-1 h-1 bg-gray-300 rounded-full animate-bounce"
                        style={{ animationDelay: "120ms" }}
                      />
                      <span
                        className="w-1 h-1 bg-gray-300 rounded-full animate-bounce"
                        style={{ animationDelay: "240ms" }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="break-words leading-relaxed text-gray-800 text-sm sm:text-base">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => (
                          <p className="mb-2 last:mb-0">{children}</p>
                        ),
                        h1: ({ children }) => (
                          <h1 className="text-lg sm:text-xl font-bold mb-2 mt-4 first:mt-0">
                            {children}
                          </h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-base sm:text-lg font-semibold mb-2 mt-3 first:mt-0">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-sm sm:text-base font-medium mb-2 mt-2 first:mt-0">
                            {children}
                          </h3>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc pl-5 mb-2 space-y-1">
                            {children}
                          </ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-5 mb-2 space-y-1">
                            {children}
                          </ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-gray-700">{children}</li>
                        ),
                        code: ({ className, children, ...props }: any) => {
                          const match = /language-(\w+)/.exec(className || "");
                          const isInline = !match;
                          return isInline ? (
                            <code
                              className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded text-sm font-mono"
                              {...props}
                            >
                              {children}
                            </code>
                          ) : (
                            <code className={className} {...props}>
                              {children}
                            </code>
                          );
                        },
                        pre: ({ children }: any) => {
                          // Check if this is a code block (has code child)
                          const hasCode = React.Children.toArray(children).some(
                            (child: any) => child?.type === "code"
                          );
                          return hasCode ? (
                            <pre className="bg-gray-800 text-gray-100 p-4 rounded-lg overflow-x-auto my-3 text-sm font-mono">
                              {children}
                            </pre>
                          ) : (
                            <pre className="bg-gray-100 text-gray-800 p-2 rounded my-2 overflow-x-auto text-sm font-mono">
                              {children}
                            </pre>
                          );
                        },
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-green-500 pl-4 italic text-gray-600 my-2 bg-gray-50 py-2">
                            {children}
                          </blockquote>
                        ),
                        a: ({ href, children }) => (
                          <a
                            href={href}
                            className="text-green-600 hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {children}
                          </a>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-gray-900">
                            {children}
                          </strong>
                        ),
                        em: ({ children }) => (
                          <em className="italic">{children}</em>
                        ),
                      }}
                    >
                      {contentForRender}
                    </ReactMarkdown>
                    {isTyping && !isTypingComplete && cursorVisible && (
                      <span className="inline-block w-2 h-5 bg-gray-600 ml-1 align-middle" />
                    )}
                    {images && images.length > 0 && (
                      <div className="mt-6 space-y-3">
                        <div className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                          Generated Visuals
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {images.map((image, index) => (
                            <figure
                              key={`${messageId}-image-${index}`}
                              className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={image.url}
                                alt={image.prompt}
                                className="w-full h-full object-cover max-h-[420px]"
                                loading="lazy"
                              />
                              <figcaption className="p-3 text-xs text-gray-600 space-y-1">
                                <div className="font-semibold text-gray-700">
                                  Prompt
                                </div>
                                <div className="text-gray-600 leading-snug whitespace-pre-wrap">
                                  {image.prompt}
                                </div>
                                <div className="flex flex-wrap gap-2 text-[10px] text-gray-400 uppercase tracking-wide">
                                  <span>{image.model}</span>
                                  <span>
                                    {image.width}×{image.height}px
                                  </span>
                                  <span>
                                    {new Date(
                                      image.createdAt
                                    ).toLocaleTimeString("en-US", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </span>
                                </div>
                              </figcaption>
                            </figure>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Timestamp */}
            {timestamp && !isLoading && isTypingComplete && (
              <span
                className={`text-[10px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1 ${isUser ? "text-right" : "text-left"} px-1 sm:px-2`}
                suppressHydrationWarning
              >
                {new Date(timestamp).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
        </div>
      </motion.div>
    );
  }
);

ChatMessage.displayName = "ChatMessage";

export default ChatMessage;
