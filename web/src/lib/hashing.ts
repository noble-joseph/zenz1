/**
 * Talent OS — Client-side hashing utilities.
 *
 * SHA-256: binary integrity hash (deduplication key).
 * pHash:   perceptual hash stub (to be replaced with blockhash-js or server-side).
 */

/** Compute SHA-256 hex digest of a File in the browser. */
export async function sha256Hex(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const bytes = new Uint8Array(digest);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Detect media type from MIME string.
 * Maps to the `media_type` enum in the database.
 */
export function detectMediaType(
  mimeType: string,
): "image" | "video" | "audio" | "document" | "other" {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType === "application/pdf" ||
    mimeType.startsWith("text/") ||
    mimeType.includes("document") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation")
  )
    return "document";
  return "other";
}
