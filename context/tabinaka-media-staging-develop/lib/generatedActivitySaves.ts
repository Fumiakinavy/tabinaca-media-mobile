export type GeneratedActivitySaveSource = "chat" | "recommendation" | "manual";

export interface PlacePayload {
  place_id: string;
  name: string;
  formatted_address?: string;
  hook?: string;
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  types?: string[];
  photos?: Array<{ photo_reference: string; height: number; width: number }>;
  opening_hours?: { open_now?: boolean };
  editorial_summary?: { overview?: string };
  distance_m?: number;
  geometry?: {
    location: {
      lat: number;
      lng: number;
    };
  };
  metadata?: Record<string, unknown>;
}

export interface PlaceSaveState {
  saved: boolean;
  generatedActivityId?: string | null;
}

export interface GeneratedActivitySummary {
  id: string;
  draft_slug?: string | null;
  activity_id?: string | null;
  title?: string | null;
  summary?: string | null;
  status?: string | null;
  created_at?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface GeneratedActivitySaveRecord {
  id: string;
  generated_activity_id: string;
  source: GeneratedActivitySaveSource;
  created_at: string;
  interaction_id?: string | null;
  generated_activity?: GeneratedActivitySummary | null;
}

export interface GeneratedActivitySaveResponse {
  success: boolean;
  saved?: boolean;
  saveId?: string;
  interactionId?: string | null;
  error?: string;
  detail?: string;
}

const DEFAULT_SOURCE: GeneratedActivitySaveSource = "chat";

const PLACE_SAVE_ENDPOINT = (placeId: string) =>
  `/api/chat/places/${encodeURIComponent(placeId)}/save`;

async function handleJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    const error = (data && data.error) || response.statusText;
    throw new Error(typeof error === "string" ? error : "Request failed");
  }
  return data as T;
}

export async function fetchGeneratedActivitySaves(): Promise<
  GeneratedActivitySaveRecord[]
> {
  const response = await fetch("/api/generated-activities/saves", {
    method: "GET",
    credentials: "include",
  });
  const data = await handleJsonResponse<{
    success: boolean;
    saves?: GeneratedActivitySaveRecord[];
  }>(response);
  return data.saves ?? [];
}

export async function saveGeneratedActivity(
  generatedActivityId: string,
  source: GeneratedActivitySaveSource = DEFAULT_SOURCE,
): Promise<GeneratedActivitySaveResponse> {
  const response = await fetch(
    `/api/generated-activities/${encodeURIComponent(generatedActivityId)}/save`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ source }),
    },
  );
  return handleJsonResponse<GeneratedActivitySaveResponse>(response);
}

export async function deleteGeneratedActivitySave(
  generatedActivityId: string,
): Promise<GeneratedActivitySaveResponse> {
  const response = await fetch(
    `/api/generated-activities/${encodeURIComponent(generatedActivityId)}/save`,
    {
      method: "DELETE",
      credentials: "include",
    },
  );
  return handleJsonResponse<GeneratedActivitySaveResponse>(response);
}

export async function fetchPlaceSaveState(
  placeId: string,
): Promise<PlaceSaveState> {
  const response = await fetch(PLACE_SAVE_ENDPOINT(placeId), {
    method: "GET",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    return { saved: false, generatedActivityId: null };
  }
  return {
    saved: Boolean(data.saved),
    generatedActivityId: data.generatedActivityId ?? null,
  };
}

export async function savePlaceCard(
  place: PlacePayload,
  source: GeneratedActivitySaveSource = DEFAULT_SOURCE,
): Promise<PlaceSaveState> {
  const response = await fetch(PLACE_SAVE_ENDPOINT(place.place_id), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ place, source }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const error = data?.detail || data?.error || response.statusText;
    throw new Error(
      typeof error === "string" ? error : "Failed to save AI card",
    );
  }
  return {
    saved: Boolean(data.saved),
    generatedActivityId: data.generatedActivityId ?? null,
  };
}

export async function deletePlaceSave(
  placeId: string,
): Promise<PlaceSaveState> {
  const response = await fetch(PLACE_SAVE_ENDPOINT(placeId), {
    method: "DELETE",
    credentials: "include",
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const error = data?.detail || data?.error || response.statusText;
    throw new Error(
      typeof error === "string" ? error : "Failed to unsave AI card",
    );
  }
  return {
    saved: Boolean(data.saved),
    generatedActivityId: data.generatedActivityId ?? null,
  };
}
