"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseAuth";
import { getAuthRedirectUrl } from "@/lib/env";
import { sendGA } from "@/lib/ga";
import type {
  GeneratedActivitySaveSource,
  PlacePayload,
  PlaceSaveState,
} from "@/lib/generatedActivitySaves";
import {
  fetchPlaceSaveState,
  savePlaceCard,
  deletePlaceSave,
} from "@/lib/generatedActivitySaves";

interface GeneratedActivitySaveButtonProps {
  placeId: string;
  place: PlacePayload;
  className?: string;
  source?: GeneratedActivitySaveSource;
  initialState?: PlaceSaveState;
  onStateChange?: (state: PlaceSaveState) => void;
  variant?: "icon" | "button";
}

export default function GeneratedActivitySaveButton({
  placeId,
  place,
  className = "",
  source = "chat",
  initialState,
  onStateChange,
  variant = "icon",
}: GeneratedActivitySaveButtonProps) {
  const [user, setUser] = useState<any>(null);
  const [state, setState] = useState<PlaceSaveState>(
    initialState ?? { saved: false, generatedActivityId: null },
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(Boolean(initialState));
  const hydratedFromInitial = useRef(Boolean(initialState));

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (initialState && !hydratedFromInitial.current) {
      setState(initialState);
      setIsInitialized(true);
      hydratedFromInitial.current = true;
    }
  }, [initialState]);

  useEffect(() => {
    if (hydratedFromInitial.current) {
      return;
    }

    let mounted = true;
    const loadState = async () => {
      try {
        const fetched = await fetchPlaceSaveState(placeId);
        if (mounted) {
          setState(fetched);
        }
      } catch (error) {
        console.warn(
          "[GeneratedActivitySaveButton] Failed to load save state",
          error,
        );
      } finally {
        if (mounted) {
          setIsInitialized(true);
        }
      }
    };

    loadState();
    return () => {
      mounted = false;
    };
  }, [placeId]);

  const handleToggle = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!isInitialized || isLoading) return;

    if (!user) {
      const currentUrl =
        typeof window !== "undefined" ? window.location.href : "";
      const redirectUrl = getAuthRedirectUrl(currentUrl);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
      });
      if (error) {
        console.error("[GeneratedActivitySaveButton] Sign-in failed", error);
        alert("Login failed. Please try again.");
      }
      return;
    }

    setIsLoading(true);
    try {
      if (!state.saved) {
        const result = await savePlaceCard(place, source);
        setState(result);
        onStateChange?.(result);
        sendGA("ai_card_save", {
          place_id: placeId,
          status: "save",
          generated_activity_id: result.generatedActivityId ?? undefined,
          source,
        });
      } else {
        const result = await deletePlaceSave(placeId);
        setState(result);
        onStateChange?.(result);
        sendGA("ai_card_save", {
          place_id: placeId,
          status: "unsave",
          generated_activity_id: state.generatedActivityId ?? undefined,
          source,
        });
      }
    } catch (error) {
      console.error("[GeneratedActivitySaveButton] Toggle failed", error);
      const message =
        error instanceof Error ? error.message : "Failed to update save state.";
      alert(message);
    } finally {
      setIsLoading(false);
      setIsInitialized(true);
    }
  };

  if (!isInitialized) {
    if (variant === "button") {
      return (
        <button
          disabled
          className={`w-full rounded-lg bg-gray-300 px-3 py-1.5 text-[11px] font-semibold text-white ${className}`}
          aria-label="Loading"
        >
          <span className="flex items-center justify-center gap-1">
            <div className="w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
            Like
          </span>
        </button>
      );
    }
    return (
      <button
        disabled
        className={`inline-flex items-center justify-center w-7 h-7 rounded-full border border-gray-200 bg-white text-gray-400 ${className}`}
        aria-label="Loading"
      >
        <div className="w-3.5 h-3.5 border-2 border-gray-200 border-t-transparent rounded-full animate-spin" />
      </button>
    );
  }

  if (variant === "button") {
    return (
      <button
        onClick={handleToggle}
        disabled={isLoading}
        aria-pressed={state.saved}
        aria-label={state.saved ? "Liked" : "Like"}
        className={`w-full rounded-lg px-3 py-1.5 text-[11px] font-semibold shadow hover:shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 ${
          state.saved
            ? "bg-gradient-to-r from-red-500 to-red-600 text-white focus-visible:outline-red-500"
            : "bg-gradient-to-r from-green-500 to-green-600 text-white focus-visible:outline-green-500"
        } ${className}`}
      >
        <span className="flex items-center justify-center gap-1">
          {isLoading ? (
            <div className="w-3 h-3 border-2 border-white/50 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill={state.saved ? "white" : "none"}
              stroke="white"
              strokeWidth="2"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          )}
          {state.saved ? "Liked" : "Like"}
        </span>
      </button>
    );
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      aria-pressed={state.saved}
      aria-label={state.saved ? "Saved" : "Save"}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full border-2 transition-all duration-200 shadow-sm hover:scale-110 disabled:opacity-50 ${
        state.saved
          ? "bg-red-500 border-red-500 text-white"
          : "bg-white border-black text-black"
      } ${className}`}
    >
      {isLoading ? (
        <div className="w-3.5 h-3.5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={state.saved ? "white" : "none"}
          stroke={state.saved ? "white" : "currentColor"}
          strokeWidth="2"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )}
    </button>
  );
}
