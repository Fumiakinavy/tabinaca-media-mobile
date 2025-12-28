import Head from "next/head";
import type { GetServerSideProps } from "next";
import { verifyShareToken } from "@/lib/shareToken";
import { fetchRecentChatMessages } from "@/lib/server/chatSessions";
import { supabaseServer } from "@/lib/supabaseServer";
import ChatMessage from "@/components/ChatMessage";

type SharedMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
  places?: Array<{
    place_id: string;
    name: string;
    formatted_address: string;
    rating?: number;
    user_ratings_total?: number;
    price_level?: number;
    types: string[];
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
  }>;
};

type SharePageProps =
  | {
    valid: true;
    sessionTitle: string;
    messages: SharedMessage[];
  }
  | {
    valid: false;
    reason: "invalid_token" | "not_found" | "db_error" | "verification_error";
  };

export default function SharePage(props: SharePageProps) {
  if (!props.valid) {
    const messageMap: Record<
      typeof props.reason,
      { title: string; body: string }
    > = {
      invalid_token: {
        title: "Share link is invalid",
        body: "The link might be broken or incomplete. Please generate a new share link.",
      },
      verification_error: {
        title: "Link verification failed",
        body: "Server configuration may be missing. Please contact the administrator.",
      },
      db_error: {
        title: "Failed to load data",
        body: "Please try again in a moment.",
      },
      not_found: {
        title: "Session not found",
        body: "The session may have been deleted or sharing was disabled.",
      },
    };

    const info = messageMap[props.reason];

    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-800 px-6 text-center">
        <p className="text-lg font-semibold">{info.title}</p>
        <p className="text-sm text-slate-600 mt-2">{info.body}</p>
      </div>
    );
  }

  const { sessionTitle, messages } = props;

  return (
    <>
      <Head>
        <title>{sessionTitle} | Shared chat</title>
      </Head>

      <div className="flex min-h-screen h-screen flex-col bg-gray-50 text-slate-900">
        <div className="border-b border-gray-200 bg-white/90 backdrop-blur-sm">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-gray-500">
                Shared Gappy Chat
              </p>
              <h1
                className="truncate text-base font-semibold text-gray-900"
                title={sessionTitle}
              >
                {sessionTitle}
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                Read only
              </span>
              <a
                href="/chat"
                className="inline-flex items-center rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Sign in
              </a>
            </div>
          </div>
        </div>

        <main className="flex-1 flex flex-col min-h-0">
          <div
            className="flex-1 min-h-0 overflow-y-auto py-6 max-h-[calc(100vh-120px)]"
            style={{ overscrollBehaviorY: "contain", scrollBehavior: "smooth" }}
          >
            <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 space-y-4">
              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  messageId={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={new Date(message.created_at)}
                  places={message.places}
                  isTyping={false}
                  isLoading={false}
                  typingSpeed={0}
                />
              ))}

              {messages.length === 0 && (
                <p className="text-sm text-gray-500">
                  まだメッセージがありません。
                </p>
              )}
            </div>
          </div>

          <div className="border-t border-gray-200 bg-white/90 backdrop-blur-sm">
            <div className="mx-auto flex max-w-4xl items-center gap-3 px-3 sm:px-4 md:px-6 lg:px-8 py-3">
              <div className="flex-1 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                This is a shared, view-only copy of the conversation.
              </div>
              <a
                href="/chat"
                className="inline-flex items-center rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
              >
                Sign in
              </a>
              <span className="hidden sm:inline-flex text-xs text-gray-400">
                Gappy Chat powered by Gappy
              </span>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<SharePageProps> = async (
  ctx,
) => {
  const rawToken =
    typeof ctx.params?.token === "string" ? ctx.params.token : null;
  const queryToken =
    typeof ctx.query?.token === "string" ? ctx.query.token : null;
  const token = (rawToken || queryToken || "").trim();

  let payload: ReturnType<typeof verifyShareToken> = null;
  try {
    payload = token ? verifyShareToken(token) : null;
  } catch (error) {
    console.error("[share page] token verification error", error);
    return { props: { valid: false, reason: "verification_error" } };
  }

  if (!payload) {
    return { props: { valid: false, reason: "invalid_token" } };
  }

  const normalizePlaces = (value: any): SharedMessage["places"] => {
    if (!Array.isArray(value)) return undefined;
    const toPhoto = (ph: any) => {
      if (
        !ph ||
        !ph.photo_reference ||
        typeof ph.height !== "number" ||
        typeof ph.width !== "number"
      ) {
        return null;
      }
      return {
        photo_reference: ph.photo_reference,
        height: ph.height,
        width: ph.width,
      };
    };

    return value.map((p) => {
      const photos = Array.isArray(p.photos)
        ? p.photos.map(toPhoto).filter((ph: any): ph is NonNullable<typeof ph> => ph !== null)
        : null;

      return {
        place_id: p.place_id ?? "",
        name: p.name ?? "",
        formatted_address: p.formatted_address ?? "",
        types: Array.isArray(p.types) ? p.types.filter(Boolean) : [],
        ...(typeof p.rating === "number" && { rating: p.rating }),
        ...(typeof p.user_ratings_total === "number" && {
          user_ratings_total: p.user_ratings_total,
        }),
        ...(typeof p.price_level === "number" && { price_level: p.price_level }),
        ...(photos !== null && photos.length > 0 && { photos }),
        ...(p.opening_hours &&
          typeof p.opening_hours.open_now === "boolean" && {
          opening_hours: { open_now: p.opening_hours.open_now },
        }),
        ...(p.editorial_summary?.overview && {
          editorial_summary: { overview: p.editorial_summary.overview },
        }),
        ...(typeof p.distance_m === "number" && { distance_m: p.distance_m }),
      };
    });
  };

  try {
    const { data: sessionRow, error: sessionError } = await supabaseServer
      .from("chat_sessions" as any)
      .select("id, title")
      .eq("id", payload.sid)
      .maybeSingle();

    if (sessionError) {
      console.error("[share page] failed to fetch session", sessionError);
      return { props: { valid: false, reason: "db_error" } };
    }

    if (!sessionRow) {
      return { props: { valid: false, reason: "not_found" } };
    }

    const messagesRaw = await fetchRecentChatMessages(payload.sid, 200);
    const messages: SharedMessage[] = messagesRaw.map((m) => {
      const normalizedPlaces = normalizePlaces((m as any).metadata?.places);
      return {
        id: m.id,
        role: m.role === "tool" ? "assistant" : (m.role as SharedMessage["role"]),
        content: m.content ?? "",
        created_at: m.created_at,
        ...(normalizedPlaces && { places: normalizedPlaces }),
      };
    });

    return {
      props: {
        valid: true,
        sessionTitle: (sessionRow as any).title || "Shared chat",
        messages,
      },
    };
  } catch (error) {
    console.error("[share page] failed to load session", error);
    return { props: { valid: false, reason: "db_error" } };
  }
};
