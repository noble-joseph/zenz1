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
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { computePHash } from "@/lib/phash";
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
  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("sha256_hash", hash)
    .maybeSingle();

  if (!data) return null;

  const asset = data as MediaAsset;
  return {
    ...asset,
    storage_url: (asset.metadata as any)?.storage_url as string | undefined
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

const SIMILARITY_THRESHOLD = 0.3; // Allow up to Remix range

export async function guardImage(
  imageBuffer: Buffer,
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

  if (vibeVector && vibeVector.length === 768) {
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
      const best = matches[0] as { id: string; distance: number };
      parentId = best.id;
      similarity = best.distance;
      console.log(`Media Guard: Similarity match found! Parent: ${parentId}, Distance: ${similarity}`);
    } else {
      console.log("Media Guard: No similar assets found within threshold.");
    }
  }

  // 5. Insert new row
  const serverSupabase = await createSupabaseServerClient();
  const { data: { user } } = await serverSupabase.auth.getUser();

  const asset = await insertMediaAsset({
    sha256_hash: hash,
    media_type: "image",
    p_hash: pHash,
    audio_fingerprint: null,
    vibe_vector: vibeVector,
    parent_id: parentId,
    created_by: user?.id ?? null,
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
      storage_url: (asset.metadata as any)?.storage_url as string | undefined
    },
    similarity,
    parent_id: parentId ?? undefined,
  };
}

// ── Audio Guard ────────────────────────────────────────────────────────────

const JACCARD_THRESHOLD = 0.8; // High-fidelity duplicate
const SAMPLE_THRESHOLD = 0.15; // Partial overlap (Stage 2 requirements)

export async function guardAudio(
  audioBuffer: Buffer,
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

  if (audioFingerprint) {
    const supabase = createSupabaseAdminClient();
    const { data: audioAssets } = await supabase
      .from("media_assets")
      .select("id, audio_fingerprint")
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
        }
      }
      // Link if above sample threshold (15%)
      if (bestScore < SAMPLE_THRESHOLD) {
        parentId = null;
        similarity = undefined;
      }
    }
  }

  // 4. Insert new row
  const serverSupabase = await createSupabaseServerClient();
  const { data: { user } } = await serverSupabase.auth.getUser();

  const asset = await insertMediaAsset({
    sha256_hash: hash,
    media_type: "audio",
    p_hash: null,
    audio_fingerprint: audioFingerprint,
    vibe_vector: null,
    parent_id: parentId,
    created_by: user?.id ?? null,
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
      storage_url: (asset.metadata as any)?.storage_url as string | undefined
    },
    similarity,
    parent_id: parentId ?? undefined,
  };
}
