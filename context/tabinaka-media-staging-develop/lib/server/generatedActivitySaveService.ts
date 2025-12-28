import { supabaseServer } from "@/lib/supabaseServer";

export type SaveSource = "chat" | "recommendation" | "manual";

export interface GeneratedActivityRecord {
  id: string;
  draft_slug?: string | null;
  activity_id?: string | null;
  status?: string | null;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
}

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

const GENERATED_ACTIVITIES_TABLE = "generated_activities";
const GENERATED_ACTIVITY_SAVES_TABLE = "generated_activity_saves";

function getErrorMessage(error: unknown): string {
  if (!error) return "unknown error";
  if (typeof error === "string") return error;
  if (typeof error === "object") {
    return (
      (error as { message?: string; toString?: () => string }).message ??
      error.toString?.() ??
      "unknown error"
    );
  }
  return String(error);
}

function isMissingTableError(error: unknown, table: string): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes(`relation "${table}" does not exist`) ||
    message.includes(`relation '${table}' does not exist`) ||
    message.includes(`table "${table}" does not exist`) ||
    message.includes(`table '${table}' does not exist`)
  );
}

function isMissingColumnError(error: unknown, column: string): boolean {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes(`column "${column}"`) ||
    message.includes(`column '${column}'`)
  );
}

function buildStubGeneratedActivity(
  place: PlacePayload,
): GeneratedActivityRecord {
  const draft_slug = place.name
    ? place.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    : `generated-${place.place_id}`;
  return {
    id: `generated-${place.place_id}`,
    draft_slug,
    title: place.name,
    status: "draft",
    metadata: { place },
  };
}

const DEFAULT_SAVE_SOURCE: SaveSource = "chat";
const SAVE_SOURCE_SET: Record<SaveSource, true> = {
  chat: true,
  recommendation: true,
  manual: true,
};

const AI_SAVE_INTERACTION = "ai_save";

export const normalizeSaveSource = (input: unknown): SaveSource => {
  if (typeof input === "string") {
    const lowered = input.trim().toLowerCase();
    if (SAVE_SOURCE_SET[lowered as SaveSource]) {
      return lowered as SaveSource;
    }
  }
  return DEFAULT_SAVE_SOURCE;
};

const slugify = (input: string) => {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
};

export const buildGeneratedActivitySlug = (
  record: GeneratedActivityRecord | null,
  generatedActivityId: string,
) => {
  if (record?.draft_slug && record.draft_slug.trim().length > 0) {
    return record.draft_slug;
  }
  return `generated-${generatedActivityId}`;
};

export async function getGeneratedActivityById(
  generatedActivityId: string,
): Promise<GeneratedActivityRecord | null> {
  try {
    const { data, error } = await supabaseServer
      .from("generated_activities")
      .select("id, draft_slug, activity_id, status, title, metadata")
      .eq("id", generatedActivityId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as GeneratedActivityRecord | null;
  } catch (error) {
    console.error(
      "[generatedActivitySaveService] Failed to fetch generated activity",
      {
        generatedActivityId,
        error,
      },
    );
    return null;
  }
}

export async function getGeneratedActivityByPlaceId(
  placeId: string,
): Promise<GeneratedActivityRecord | null> {
  try {
    const { data, error } = await supabaseServer
      .from("generated_activities")
      .select("id, draft_slug, activity_id, status, title, metadata")
      .eq("source_place_id", placeId)
      .maybeSingle();

    if (error) {
      if (isMissingColumnError(error, "source_place_id")) {
        console.info(
          "[generatedActivitySaveService] source_place_id column missing, falling back to metadata search",
        );
      } else {
        throw error;
      }
    } else {
      return data as GeneratedActivityRecord | null;
    }
  } catch (error) {
    if (!isMissingColumnError(error, "source_place_id")) {
      console.error(
        "[generatedActivitySaveService] Failed to fetch generated activity by place_id",
        {
          placeId,
          error,
        },
      );
      return null;
    }
  }

  try {
    const { data, error } = await supabaseServer
      .from("generated_activities")
      .select("id, draft_slug, activity_id, status, title, metadata")
      .eq("metadata->'place'->>place_id", placeId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data as GeneratedActivityRecord | null;
  } catch (error) {
    if (!isMissingColumnError(error, "place_id")) {
      console.error(
        "[generatedActivitySaveService] Failed to fetch generated activity by metadata place_id",
        {
          placeId,
          error,
        },
      );
    }
    return null;
  }
}

const buildGeneratedActivityBody = (place: PlacePayload) => {
  const parts: string[] = [];
  const primary = place.editorial_summary?.overview?.trim() || place.hook || "";

  parts.push(`# ${place.name}`);
  if (primary) {
    parts.push(primary);
  }

  const details: string[] = [];
  if (place.formatted_address) {
    details.push(`- **Address:** ${place.formatted_address}`);
  }
  if (place.opening_hours?.open_now !== undefined) {
    details.push(
      `- **Status:** ${place.opening_hours.open_now ? "Open now" : "Closed at the moment"}`,
    );
  }
  if (typeof place.rating === "number") {
    const reviews =
      typeof place.user_ratings_total === "number"
        ? ` (${place.user_ratings_total} reviews)`
        : "";
    details.push(`- **Rating:** ${place.rating.toFixed(1)}${reviews}`);
  }
  if (Array.isArray(place.types) && place.types.length > 0) {
    details.push(`- **Categories:** ${place.types.slice(0, 5).join(", ")}`);
  }
  if (details.length > 0) {
    parts.push(details.join("\n"));
  }

  parts.push(
    "Save this AI-generated card to revisit it later, get booking help, or share it with your travel buddies.",
  );

  return parts.join("\n\n");
};

const buildGeneratedActivitySummary = (place: PlacePayload) => {
  return (
    place.hook ||
    place.editorial_summary?.overview ||
    `Discover ${place.name} in Tokyo.`
  );
};

const buildDraftSlug = (place: PlacePayload) => {
  const base = place.name ? slugify(place.name).slice(0, 40) : "generated-spot";
  const suffix =
    place.place_id.replace(/[^a-zA-Z0-9]/g, "").slice(-6) ||
    Math.random().toString(36).slice(-6);
  return `${base}-${suffix}`;
};

export async function ensureGeneratedActivityFromPlace(
  place: PlacePayload,
): Promise<GeneratedActivityRecord> {
  const existing = await getGeneratedActivityByPlaceId(place.place_id);
  if (existing) {
    return existing;
  }

  const summary = buildGeneratedActivitySummary(place);
  const body = buildGeneratedActivityBody(place);
  const draftSlug = buildDraftSlug(place);

  const payload: Record<string, unknown> = {
    chat_session_id: null,
    draft_slug: draftSlug,
    title: place.name,
    summary,
    body_mdx: body,
    source_place_id: place.place_id,
    status: "draft",
    metadata: {
      place,
    },
  };

  const insertRecord = async (payloadOverride?: Record<string, unknown>) => {
    const insertPayload = payloadOverride ?? payload;
    const { data, error } = await supabaseServer
      .from("generated_activities")
      .insert(insertPayload as any)
      .select("id, draft_slug, activity_id, status, title, metadata")
      .single();

    if (error) {
      throw error;
    }

    return data as GeneratedActivityRecord;
  };

  try {
    return await insertRecord();
  } catch (error) {
    if (isMissingTableError(error, GENERATED_ACTIVITIES_TABLE)) {
      console.warn(
        "[generatedActivitySaveService] generated_activities table missing, using stub record",
        { placeId: place.place_id },
      );
      return buildStubGeneratedActivity(place);
    }
    if (isMissingColumnError(error, "source_place_id")) {
      const payloadWithoutColumn = { ...payload };
      delete payloadWithoutColumn.source_place_id;
      return await insertRecord(payloadWithoutColumn);
    }

    console.error(
      "[generatedActivitySaveService] Failed to ensure generated activity from place",
      {
        placeId: place.place_id,
        error,
      },
    );
    throw error;
  }
}

async function upsertAiSaveInteraction(options: {
  accountId: string;
  activityId: string | null;
  activitySlug: string;
  source: SaveSource;
  generatedActivityId: string;
}): Promise<string | null> {
  const payload = {
    account_id: options.accountId,
    activity_id: options.activityId,
    activity_slug: options.activitySlug,
    interaction_type: AI_SAVE_INTERACTION,
    source_type: options.source,
    source_id: options.generatedActivityId,
  };

  try {
    const { data, error } = (await supabaseServer
      .from("activity_interactions" as any)
      .upsert(payload as any, {
        onConflict: "account_id,activity_slug,interaction_type",
      })
      .select("id")
      .single()) as any;

    if (error) {
      throw error;
    }

    return data?.id ?? null;
  } catch (error) {
    console.warn(
      "[generatedActivitySaveService] Failed to record ai_save interaction",
      {
        generatedActivityId: options.generatedActivityId,
        error,
      },
    );
    return null;
  }
}

async function deleteAiSaveInteraction(
  interactionId: string | null,
  options: {
    accountId: string;
    activitySlug: string;
  },
) {
  try {
    const query = supabaseServer.from("activity_interactions").delete();

    if (interactionId) {
      query.eq("id", interactionId);
    } else {
      query
        .eq("account_id", options.accountId)
        .eq("activity_slug", options.activitySlug)
        .eq("interaction_type", AI_SAVE_INTERACTION);
    }

    const { error } = await query;
    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn(
      "[generatedActivitySaveService] Failed to delete ai_save interaction",
      {
        interactionId,
        error,
      },
    );
  }
}

export async function saveGeneratedActivityForAccount(options: {
  accountId: string;
  generatedActivity: GeneratedActivityRecord;
  source?: SaveSource;
}) {
  const source = normalizeSaveSource(options.source);
  const activitySlug = buildGeneratedActivitySlug(
    options.generatedActivity,
    options.generatedActivity.id,
  );
  const interactionId = await upsertAiSaveInteraction({
    accountId: options.accountId,
    activityId: options.generatedActivity.activity_id ?? null,
    activitySlug,
    source,
    generatedActivityId: options.generatedActivity.id,
  });

  try {
    const { data, error } = (await supabaseServer
      .from("generated_activity_saves" as any)
      .upsert(
        {
          generated_activity_id: options.generatedActivity.id,
          account_id: options.accountId,
          source,
          interaction_id: interactionId,
        } as any,
        { onConflict: "generated_activity_id,account_id" },
      )
      .select("id, interaction_id")
      .single()) as any;

    if (error) {
      throw error;
    }

    return {
      saveId: data?.id ?? null,
      interactionId: data?.interaction_id ?? interactionId ?? null,
      activitySlug,
    };
  } catch (error) {
    if (isMissingTableError(error, GENERATED_ACTIVITY_SAVES_TABLE)) {
      console.info(
        "[generatedActivitySaveService] generated_activity_saves table missing, skipping save record",
      );
      return {
        saveId: null,
        interactionId,
        activitySlug,
      };
    }
    throw error;
  }
}

export async function deleteGeneratedActivitySaveForAccount(options: {
  accountId: string;
  generatedActivity: GeneratedActivityRecord;
}) {
  const activitySlug = buildGeneratedActivitySlug(
    options.generatedActivity,
    options.generatedActivity.id,
  );
  try {
    const { data, error } = await supabaseServer
      .from("generated_activity_saves" as any)
      .delete()
      .eq("generated_activity_id", options.generatedActivity.id)
      .eq("account_id", options.accountId)
      .select("interaction_id")
      .maybeSingle<{ interaction_id: string | null }>();

    if (error) {
      throw error;
    }

    const interactionId = data?.interaction_id ?? null;
    await deleteAiSaveInteraction(interactionId, {
      accountId: options.accountId,
      activitySlug,
    });
  } catch (error) {
    if (isMissingTableError(error, GENERATED_ACTIVITY_SAVES_TABLE)) {
      console.info(
        "[generatedActivitySaveService] generated_activity_saves table missing, skipping delete record",
      );
      await deleteAiSaveInteraction(null, {
        accountId: options.accountId,
        activitySlug,
      });
      return;
    }
    throw error;
  }
}

export async function getGeneratedActivitySaveRecord(options: {
  accountId: string;
  generatedActivityId: string;
}) {
  try {
    const { data, error } = await supabaseServer
      .from("generated_activity_saves" as any)
      .select("id, interaction_id")
      .eq("generated_activity_id", options.generatedActivityId)
      .eq("account_id", options.accountId)
      .maybeSingle<{ id: string; interaction_id: string | null }>();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    if (isMissingTableError(error, GENERATED_ACTIVITY_SAVES_TABLE)) {
      console.info(
        "[generatedActivitySaveService] generated_activity_saves table missing, skipping lookup",
      );
      return null;
    }
    throw error;
  }
}
