import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { publicId } = req.body;

  if (!publicId) {
    return res.status(400).json({ message: "Public ID is required" });
  }

  try {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return res
        .status(500)
        .json({ message: "Cloudinary configuration missing" });
    }

    // Cloudinary Admin APIを使用して画像を削除
    const timestamp = Math.round(new Date().getTime() / 1000);
    const signature = require("crypto")
      .createHash("sha1")
      .update(`public_id=${publicId}&timestamp=${timestamp}${apiSecret}`)
      .digest("hex");

    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("timestamp", timestamp.toString());
    formData.append("api_key", apiKey);
    formData.append("signature", signature);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`,
      {
        method: "POST",
        body: formData,
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || "Failed to delete image");
    }

    const result = await response.json();
    res.status(200).json({ message: "Image deleted successfully", result });
  } catch (error) {
    console.error("Cloudinary delete error:", error);
    res.status(500).json({
      message: "Failed to delete image from Cloudinary",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
