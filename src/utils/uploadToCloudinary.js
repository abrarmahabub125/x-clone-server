import crypto from "node:crypto";

import { createAppError } from "./apiError.js";

const CLOUDINARY_UPLOAD_FOLDER = "x-clone/tweets";

function assertCloudinaryConfig() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;

  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    throw createAppError({
      statusCode: 500,
      code: "CLOUDINARY_CONFIG_MISSING",
      message:
        "Image upload is not configured on the server. Please add Cloudinary credentials.",
    });
  }

  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    apiSecret: CLOUDINARY_API_SECRET,
  };
}

function assertUploadRuntimeSupport() {
  if (
    typeof globalThis.fetch !== "function" ||
    typeof globalThis.FormData !== "function"
  ) {
    throw createAppError({
      statusCode: 500,
      code: "UPLOAD_RUNTIME_NOT_SUPPORTED",
      message:
        "The server runtime does not support image uploads. Use Node.js 18 or newer in production.",
    });
  }
}

function buildCloudinarySignature({ folder, timestamp }, apiSecret) {
  const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;

  return crypto.createHash("sha1").update(signaturePayload).digest("hex");
}

export async function uploadTweetImageToCloudinary(dataUrl) {
  if (!dataUrl) {
    return "";
  }

  if (!/^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(dataUrl)) {
    throw createAppError({
      statusCode: 400,
      code: "INVALID_IMAGE_DATA",
      message: "The selected image format is not supported.",
    });
  }

  const { cloudName, apiKey, apiSecret } = assertCloudinaryConfig();
  assertUploadRuntimeSupport();
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = buildCloudinarySignature(
    {
      folder: CLOUDINARY_UPLOAD_FOLDER,
      timestamp,
    },
    apiSecret,
  );

  const formData = new FormData();
  formData.set("file", dataUrl);
  formData.set("api_key", apiKey);
  formData.set("timestamp", String(timestamp));
  formData.set("folder", CLOUDINARY_UPLOAD_FOLDER);
  formData.set("signature", signature);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.secure_url) {
    throw createAppError({
      statusCode: 502,
      code: "CLOUDINARY_UPLOAD_FAILED",
      message: "We could not upload the image right now. Please try again.",
      details: payload?.error?.message,
    });
  }

  return payload.secure_url;
}
