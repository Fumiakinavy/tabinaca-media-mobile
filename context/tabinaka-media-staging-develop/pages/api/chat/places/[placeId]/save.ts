import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAccountId } from "@/lib/server/accountResolver";
import {
  ensureGeneratedActivityFromPlace,
  getGeneratedActivityByPlaceId,
  getGeneratedActivitySaveRecord,
  normalizeSaveSource,
  saveGeneratedActivityForAccount,
  deleteGeneratedActivitySaveForAccount,
  PlacePayload,
} from "@/lib/server/generatedActivitySaveService";

interface ApiResponse {
  success: boolean;
  saved?: boolean;
  generatedActivityId?: string;
  error?: string;
  detail?: string;
}

const formatErrorDetail = (error: unknown, fallback: string) => {
  if (!error) return fallback;
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "object") {
    try {
      return JSON.stringify(error);
    } catch {
      // ignore
    }
  }
  return fallback;
};

function extractPlaceId(value: string | string[] | undefined) {
  if (!value) return null;
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function validatePlacePayload(place: any): place is PlacePayload {
  if (!place || typeof place !== "object") return false;
  return (
    typeof place.place_id === "string" &&
    typeof place.name === "string" &&
    place.place_id.length > 0
  );
}

async function handleGet(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  placeId: string,
) {
  const resolved = await resolveAccountId(req);
  const generatedActivity = await getGeneratedActivityByPlaceId(placeId);

  if (!resolved) {
    return res.status(200).json({
      success: true,
      saved: false,
      generatedActivityId: generatedActivity?.id,
    });
  }

  if (!generatedActivity) {
    return res.status(200).json({ success: true, saved: false });
  }

  try {
    const existing = await getGeneratedActivitySaveRecord({
      accountId: resolved.accountId,
      generatedActivityId: generatedActivity.id,
    });

    return res.status(200).json({
      success: true,
      saved: Boolean(existing),
      generatedActivityId: generatedActivity.id,
    });
  } catch (error) {
    console.error("[API][ai-place] Failed to get save status", {
      placeId,
      error,
    });
    return res.status(500).json({
      success: false,
      error: "STATE_UNAVAILABLE",
      detail: "Could not check save state",
    });
  }
}

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  placeId: string,
) {
  const resolved = await resolveAccountId(req);
  if (!resolved) {
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      detail: "Account session required",
    });
  }

  if (!validatePlacePayload(req.body?.place)) {
    return res.status(400).json({
      success: false,
      error: "INVALID_PLACE",
      detail: "Valid place payload is required",
    });
  }

  const placePayload = req.body.place as PlacePayload;
  if (placePayload.place_id !== placeId) {
    return res.status(400).json({
      success: false,
      error: "PLACE_MISMATCH",
      detail: "Place ID mismatch",
    });
  }

  try {
    const generatedActivity =
      await ensureGeneratedActivityFromPlace(placePayload);
    await saveGeneratedActivityForAccount({
      accountId: resolved.accountId,
      generatedActivity,
      source: normalizeSaveSource(req.body?.source),
    });

    return res.status(200).json({
      success: true,
      saved: true,
      generatedActivityId: generatedActivity.id,
    });
  } catch (error) {
    const detail = formatErrorDetail(error, "Could not save AI card");
    console.error("[API][ai-place] Failed to save generated activity", {
      placeId,
      detail,
      error,
    });
    return res
      .status(500)
      .json({ success: false, error: "SAVE_FAILED", detail });
  }
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
  placeId: string,
) {
  const resolved = await resolveAccountId(req);
  if (!resolved) {
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      detail: "Account session required",
    });
  }

  const generatedActivity = await getGeneratedActivityByPlaceId(placeId);
  if (!generatedActivity) {
    return res.status(404).json({
      success: false,
      error: "NOT_FOUND",
      detail: "No saved card found for this place",
    });
  }

  try {
    await deleteGeneratedActivitySaveForAccount({
      accountId: resolved.accountId,
      generatedActivity,
    });
    return res.status(200).json({
      success: true,
      saved: false,
      generatedActivityId: generatedActivity.id,
    });
  } catch (error) {
    const detail = formatErrorDetail(error, "Could not unsave AI card");
    console.error("[API][ai-place] Failed to delete generated activity save", {
      placeId,
      detail,
      error,
    });
    return res
      .status(500)
      .json({ success: false, error: "DELETE_FAILED", detail });
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>,
) {
  const placeId = extractPlaceId(req.query.placeId);
  if (!placeId || typeof placeId !== "string") {
    return res.status(400).json({
      success: false,
      error: "INVALID_PLACE_ID",
      detail: "placeId is required",
    });
  }

  if (req.method === "GET") {
    return handleGet(req, res, placeId);
  }

  if (req.method === "POST") {
    return handlePost(req, res, placeId);
  }

  if (req.method === "DELETE") {
    return handleDelete(req, res, placeId);
  }

  res.setHeader("Allow", ["GET", "POST", "DELETE"]);
  return res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
}
