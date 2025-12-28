import type { NextApiRequest, NextApiResponse } from "next";
import { resolveAccountId } from "@/lib/server/accountResolver";
import {
  getGeneratedActivityById,
  normalizeSaveSource,
  saveGeneratedActivityForAccount,
  deleteGeneratedActivitySaveForAccount,
} from "@/lib/server/generatedActivitySaveService";

type SaveResponse = {
  success: boolean;
  saved?: boolean;
  saveId?: string | null;
  interactionId?: string | null;
  error?: string;
  detail?: string;
};

async function handlePost(
  req: NextApiRequest,
  res: NextApiResponse<SaveResponse>,
  generatedActivityId: string,
) {
  const resolved = await resolveAccountId(req);
  if (!resolved) {
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      detail: "Account session required",
    });
  }

  const generatedActivity = await getGeneratedActivityById(generatedActivityId);
  if (!generatedActivity) {
    return res.status(404).json({
      success: false,
      error: "NOT_FOUND",
      detail: "Generated activity not found",
    });
  }

  try {
    const saveResult = await saveGeneratedActivityForAccount({
      accountId: resolved.accountId,
      generatedActivity,
      source: normalizeSaveSource(req.body?.source),
    });

    return res.status(200).json({
      success: true,
      saved: true,
      saveId: saveResult.saveId,
      interactionId: saveResult.interactionId,
    });
  } catch (error) {
    console.error("[API] Failed to persist generated_activity_save", {
      generatedActivityId,
      error,
    });
    return res.status(500).json({
      success: false,
      error: "SAVE_FAILED",
      detail: "Could not save generated activity",
    });
  }
}

async function handleDelete(
  req: NextApiRequest,
  res: NextApiResponse<SaveResponse>,
  generatedActivityId: string,
) {
  const resolved = await resolveAccountId(req);
  if (!resolved) {
    return res.status(401).json({
      success: false,
      error: "UNAUTHORIZED",
      detail: "Account session required",
    });
  }

  const generatedActivity = await getGeneratedActivityById(generatedActivityId);
  if (!generatedActivity) {
    return res.status(404).json({
      success: false,
      error: "NOT_FOUND",
      detail: "Generated activity not found",
    });
  }

  try {
    await deleteGeneratedActivitySaveForAccount({
      accountId: resolved.accountId,
      generatedActivity,
    });
  } catch (error) {
    console.error("[API] Failed to delete generated_activity_save", {
      generatedActivityId,
      error,
    });
    return res.status(500).json({
      success: false,
      error: "DELETE_FAILED",
      detail: "Could not delete save record",
    });
  }

  return res.status(200).json({ success: true, saved: false });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SaveResponse>,
) {
  const generatedActivityIdParam = Array.isArray(req.query.id)
    ? req.query.id[0]
    : req.query.id;

  if (
    !generatedActivityIdParam ||
    typeof generatedActivityIdParam !== "string"
  ) {
    return res.status(400).json({
      success: false,
      error: "INVALID_ID",
      detail: "Generated activity id is required",
    });
  }

  if (req.method === "POST") {
    return handlePost(req, res, generatedActivityIdParam);
  }

  if (req.method === "DELETE") {
    return handleDelete(req, res, generatedActivityIdParam);
  }

  res.setHeader("Allow", ["POST", "DELETE"]);
  return res.status(405).json({ success: false, error: "METHOD_NOT_ALLOWED" });
}
