/**
 * Media Guard — Core Orchestrator
 *
 * Central module that coordinates content deduplication and version linking
 * for images and audio. All processing is local and free.
 *
 * Image flow: SHA-256 → pHash → DINOv2 vibe_vector → similarity search → insert
 * Audio flow: SHA-256 → Chromaprint → Jaccard similarity → insert
 */

import { createHash } from "node:crypto";
import { createSupabaseAdminClient } from "@/lib/supabase/server";
import { computePHash, hammingDistance } from "@/lib/phash";
import { generateVibeVector } from "@/lib/vibeVector";
import {
  generateFingerprint,
  isFpcalcAvailable,
  jaccardSimilarity,
} from "@/lib/fingerprint";
export { isFpcalcAvailable };
import type { AssetMetadata, GuardResult, MediaAsset } from "@/lib/types/database";

// ── Helpers ────────────────────────────────────────────────────────────────

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * Check if a media asset with this exact hash already exists.
 */
export async function findExactMatch(hash: string): Promise<(MediaAsset & { storage_url?: string }) | null> {
  const supabase = createSupabaseAdminClient();
  const { data } = await supabase
    .from("media_assets")
    .select("*")
    .eq("sha256_hash", hash)
    .maybeSingle();

  if (!data) return null;

  const asset = data as MediaAsset;
  return {
    ...asset,
    storage_url: (asset.metadata as { storage_url?: string })?.storage_url
  };
}

/**
 * Insert a new media_asset row.
 */
async function insertMediaAsset(
  row: Omit<MediaAsset, "id" | "created_at">,
): Promise<MediaAsset> {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("media_assets")
    .insert(row)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(`Failed to insert media_asset: ${error?.message ?? "unknown"}`);
  }
  return data as MediaAsset;
}

// ── Image Guard ────────────────────────────────────────────────────────────

const SIMILARITY_THRESHOLD = 0.5; // Wider range to capture remixes (Distance 0.0 to 0.5)
const PHASH_THRESHOLD = 5;       // Max hamming distance for perceptual identity

export async function guardImage(
  imageBuffer: Buffer,
  userId?: string | null,
  metadata: AssetMetadata = {},
  storageUrl?: string,
): Promise<GuardResult> {
  // 1. SHA-256 exact match check
  const hash = sha256(imageBuffer);
  const existing = await findExactMatch(hash);
  if (existing) {
    return { action: "exact_match", asset: existing, similarity: 0 };
  }

  // 2. Compute pHash (best-effort, non-blocking of flow)
  let pHash: string | null = null;
  try {
    pHash = await computePHash(imageBuffer);
  } catch (err) {
    console.warn("Media Guard: pHash computation failed, continuing:", err);
  }

  // 3. Generate DINOv2 vibe_vector
  let vibeVector: number[] | null = null;
  try {
    vibeVector = await generateVibeVector(imageBuffer);
  } catch (err) {
    console.warn("Media Guard: DINOv2 embedding failed, continuing:", err);
  }

  // 4. Similarity search via RPC
  let parentId: string | null = null;
  let similarity: number | undefined;
  let parentOwnerId: string | undefined;
  let parentStorageUrl: string | undefined;

  if (vibeVector) {
    if (vibeVector.length === 768) {
      const supabase = createSupabaseAdminClient();
      const { data: matches, error: rpcError } = await supabase.rpc("search_similar_media", {
        query_vector: vibeVector,
        threshold: SIMILARITY_THRESHOLD,
        result_limit: 1,
      });

      if (rpcError) {
        console.error("Media Guard: RPC Similarity search failed:", rpcError);
      }

      if (matches && matches.length > 0) {
        const best = matches[0] as { id: string; distance: number; created_by?: string; metadata?: { storage_url?: string } };
        parentId = best.id;
        similarity = best.distance;
        parentOwnerId = best.created_by;
        parentStorageUrl = (best.metadata as { storage_url?: string })?.storage_url;
        console.log(`Media Guard: Similarity match found! Parent: ${parentId}, Distance: ${similarity}`);
      } else {
        console.log("Media Guard: No similar assets found within DINOv2 threshold.");
      }
    } else {
      console.warn(`Media Guard: vibeVector dimension mismatch. Expected 768, got ${vibeVector.length}`);
    }
  }

  // 4a. Fallback: pHash check (if no DINOv2 match or DINOv2 failed)
  if (!parentId && pHash) {
    const supabase = createSupabaseAdminClient();
    const { data: pHashMatches } = await supabase
      .from("media_assets")
      .select("id, p_hash, created_by, metadata")
      .eq("media_type", "image")
      .not("p_hash", "is", null);

    if (pHashMatches) {
        // Simple hamming distance comparison would be slow in JS for many assets,
        // but for now we iterate since pHash check is a fallback.
        // Stage 3 would implement this as a Postgres extension or similar.
        for (const row of pHashMatches) {
            // Hamming distance logic...
            const distance = hammingDistance(pHash, row.p_hash as string);
            if (distance <= PHASH_THRESHOLD) {
                parentId = row.id;
                similarity = 0.05; // Treat as direct version
                parentOwnerId = row.created_by as string | undefined;
                parentStorageUrl = (row.metadata as { storage_url?: string })?.storage_url;
                console.log(`Media Guard: pHash match found! Distance: ${distance}`);
                break;
            }
        }
    }
  }

  // 5. Insert new row
  const asset = await insertMediaAsset({
    sha256_hash: hash,
    media_type: "image",
    p_hash: pHash,
    audio_fingerprint: null,
    vibe_vector: vibeVector,
    parent_id: parentId,
    created_by: userId ?? null,
    metadata: { ...metadata, storage_url: storageUrl },
  });

  let action: GuardResult["action"] = "new";
  let attributionType: string = "remix";

  if (parentId && similarity !== undefined) {
    // 0.0 is perfect match, < 0.1 is likely crop/resolution change (Direct Version)
    // 0.1 to 0.5 is likely remix / clear derivative
    if (similarity < 0.1) {
      action = "direct_version";
    } else {
      action = "remix";
    }
  }

  return {
    action,
    asset: {
      ...asset,
      storage_url: (asset.metadata as { storage_url?: string })?.storage_url
    },
    similarity,
    parent_id: parentId ?? undefined,
    parent_owner_id: parentOwnerId,
    parent_storage_url: parentStorageUrl,
  };
}

// ── Audio Guard ────────────────────────────────────────────────────────────

const JACCARD_THRESHOLD = 0.8; // High-fidelity duplicate
const SAMPLE_THRESHOLD = 0.15; // Partial overlap (Stage 2 requirements)

export async function guardAudio(
  audioBuffer: Buffer,
  userId?: string | null,
  metadata: AssetMetadata = {},
  fileExtension = "mp3",
  storageUrl?: string,
): Promise<GuardResult> {
  // 1. SHA-256 exact match check
  const hash = sha256(audioBuffer);
  const existing = await findExactMatch(hash);
  if (existing) {
    return { action: "exact_match", asset: existing, similarity: 0 };
  }

  // 2. Generate Chromaprint (requires fpcalc)
  let audioFingerprint: string | null = null;

  const fpcalcReady = await isFpcalcAvailable();
  if (fpcalcReady) {
    try {
      const result = await generateFingerprint(audioBuffer, fileExtension);
      audioFingerprint = result.fingerprint;
    } catch (err) {
      console.warn("Media Guard: fpcalc fingerprinting failed:", err);
    }
  } else {
    console.warn("Media Guard: fpcalc not installed — audio fingerprinting skipped.");
  }

  // 3. Jaccard similarity check against existing audio assets
  let parentId: string | null = null;
  let similarity: number | undefined;
  let parentOwnerId: string | undefined;
  let parentStorageUrl: string | undefined;

  if (audioFingerprint) {
    const supabase = createSupabaseAdminClient();
    const { data: audioAssets } = await supabase
      .from("media_assets")
      .select("id, audio_fingerprint, created_by, metadata")
      .eq("media_type", "audio")
      .not("audio_fingerprint", "is", null);

    if (audioAssets) {
      let bestScore = 0;
      for (const row of audioAssets) {
        const fp = row.audio_fingerprint as string;
        const score = jaccardSimilarity(audioFingerprint, fp);
        if (score > bestScore) {
          bestScore = score;
          parentId = row.id as string;
          similarity = score;
          parentOwnerId = row.created_by as string | undefined;
          parentStorageUrl = (row.metadata as { storage_url?: string })?.storage_url;
        }
      }
      // Link if above sample threshold (15%)
      if (bestScore < SAMPLE_THRESHOLD) {
        parentId = null;
        similarity = undefined;
        parentOwnerId = undefined;
        parentStorageUrl = undefined;
      }
    }
  }

  // 4. Insert new row
  const asset = await insertMediaAsset({
    sha256_hash: hash,
    media_type: "audio",
    p_hash: null,
    audio_fingerprint: audioFingerprint,
    vibe_vector: null,
    parent_id: parentId,
    created_by: userId ?? null,
    metadata: { ...metadata, storage_url: storageUrl },
  });

  let action: GuardResult["action"] = "new";
  if (parentId && similarity !== undefined) {
    action = similarity >= JACCARD_THRESHOLD ? "exact_match" : "sample";
  }

  return {
    action,
    asset: {
      ...asset,
      storage_url: (asset.metadata as { storage_url?: string })?.storage_url
    },
    similarity,
    parent_id: parentId ?? undefined,
    parent_owner_id: parentOwnerId,
    parent_storage_url: parentStorageUrl,
  };
}

// ── Video Guard ────────────────────────────────────────────────────────────

/**
 * Initial Video Guard (Stage 2)
 * Currently performs SHA-256 and Metadata checks.
 * Future refinement: Keyframe extraction via FFmpeg.
 */
export async function guardVideo(
  videoBuffer: Buffer,
  userId?: string | null,
  metadata: AssetMetadata = {},
  storageUrl?: string,
  frameBuffer?: Buffer | null,
): Promise<GuardResult> {
  // 1. SHA-256 exact match check
  const hash = sha256(videoBuffer);
  const existing = await findExactMatch(hash);
  if (existing) {
    return { action: "exact_match", asset: existing, similarity: 0 };
  }

  // 2. Client-side Frame DNA Check (if available)
  let parentId: string | null = null;
  let similarity: number | undefined;
  let parentOwnerId: string | undefined;
  let parentStorageUrl: string | undefined;
  let framePHash: string | null = null;
  let frameVibeVector: number[] | null = null;

  if (frameBuffer) {
    console.log("Media Guard: Analyzing video frame for semantic DNA...");
    
    // Compute pHash for frame
    try {
      framePHash = await computePHash(frameBuffer);
    } catch (err) {
      console.warn("Media Guard: Video frame pHash failed:", err);
    }

    // Generate Vibe Vector for frame
    try {
      frameVibeVector = await generateVibeVector(frameBuffer);
    } catch (err) {
      console.warn("Media Guard: Video frame vibe vector failed:", err);
    }

    // Similarity Search for frame
    if (frameVibeVector && frameVibeVector.length === 768) {
      const supabase = createSupabaseAdminClient();
      const { data: matches } = await supabase.rpc("search_similar_media", {
        query_vector: frameVibeVector,
        threshold: SIMILARITY_THRESHOLD,
        result_limit: 1,
      });

      if (matches && matches.length > 0) {
        const best = matches[0] as { id: string; distance: number; created_by?: string; metadata?: { storage_url?: string } };
        parentId = best.id;
        similarity = best.distance;
        parentOwnerId = best.created_by;
        parentStorageUrl = (best.metadata as { storage_url?: string })?.storage_url;
        console.log(`Media Guard: Video match found via frame DNA! Parent: ${parentId}, Distance: ${similarity}`);
      }
    }

    // Fallback pHash for frame
    if (!parentId && framePHash) {
      const supabase = createSupabaseAdminClient();
      const { data: pHashMatches } = await supabase
        .from("media_assets")
        .select("id, p_hash, created_by, metadata")
        .eq("media_type", "image")
        .not("p_hash", "is", null);

      if (pHashMatches) {
        for (const row of pHashMatches) {
          const distance = hammingDistance(framePHash, row.p_hash as string);
          if (distance <= PHASH_THRESHOLD) {
            parentId = row.id;
            similarity = 0.05;
            parentOwnerId = row.created_by as string | undefined;
            parentStorageUrl = (row.metadata as { storage_url?: string })?.storage_url;
            console.log(`Media Guard: Video match found via frame pHash! Distance: ${distance}`);
            break;
          }
        }
      }
    }
  }

  // 3. Insert new row
  const asset = await insertMediaAsset({
    sha256_hash: hash,
    media_type: "video",
    p_hash: framePHash, // Store the frame's pHash for future video-to-video matches
    audio_fingerprint: null,
    vibe_vector: frameVibeVector, // Store the frame's vibe vector
    parent_id: parentId,
    created_by: userId ?? null,
    metadata: { ...metadata, storage_url: storageUrl },
  });

  let action: GuardResult["action"] = "new";
  if (parentId && similarity !== undefined) {
    action = similarity < 0.1 ? "direct_version" : "remix";
  }

  return {
    action,
    asset: {
      ...asset,
      storage_url: (asset.metadata as { storage_url?: string })?.storage_url
    },
    similarity,
    parent_id: parentId ?? undefined,
    parent_owner_id: parentOwnerId,
    parent_storage_url: parentStorageUrl,
  };
}
