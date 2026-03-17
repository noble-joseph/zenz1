/**
 * Media Guard — Vibe Vector (DINOv2 Embedding)
 *
 * Server-side image embedding generation using the DINOv2 vits14 model
 * via Hugging Face's transformers.js library.
 *
 * Produces 768-dimensional vectors for semantic similarity search.
 * Runs entirely locally — no API calls, zero cost.
 *
 * The model and processor are lazy-loaded and cached for the lifetime
 * of the server process, so only the first invocation is slow (~10-15s).
 */

import {
  AutoImageProcessor,
  AutoModel,
  RawImage,
  type PreTrainedModel,
} from "@huggingface/transformers";

// ── Singleton cache ────────────────────────────────────────────────────────

let cachedModel: PreTrainedModel | null = null;
let cachedProcessor: ReturnType<typeof AutoImageProcessor.from_pretrained> | null = null;

const MODEL_ID = "Xenova/dinov2-base";

async function getModel(): Promise<PreTrainedModel> {
  if (!cachedModel) {
    cachedModel = await AutoModel.from_pretrained(MODEL_ID, {
      dtype: "fp32",
    });
  }
  return cachedModel;
}

async function getProcessor() {
  if (!cachedProcessor) {
    cachedProcessor = AutoImageProcessor.from_pretrained(MODEL_ID);
  }
  return cachedProcessor;
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a 768-dimensional DINOv2 embedding from raw image bytes.
 *
 * @param imageBuffer - Raw image file bytes (PNG, JPEG, WebP, etc.)
 * @returns 768-element float array suitable for pgvector storage
 */
export async function generateVibeVector(
  imageBuffer: Buffer,
): Promise<number[] | null> {
  if (process.env.SKIP_HEAVY_AI === "true") {
    console.log("Media Guard: SKIP_HEAVY_AI is enabled, skipping DINOv2.");
    return null;
  }

  let model, processor;
  try {
    [model, processor] = await Promise.all([
      getModel(),
      getProcessor(),
    ]);
  } catch (err: any) {
    console.error("Media Guard: Failed to load DINOv2 model/processor. This often happens on serverless environments due to resource limits.", err);
    return null; // Fallback gracefully
  }

  try {
    // Decode image from buffer
    const blob = new Blob([new Uint8Array(imageBuffer)]);
    const image = await RawImage.fromBlob(blob);

    // Process image into model-ready tensors
    const inputs = await processor(image);

    // Run inference
    const outputs = await model(inputs);

    // Extract the [CLS] token embedding (first token of last_hidden_state)
    const lastHiddenState = outputs.last_hidden_state;
    const embedding: number[] = Array.from(
      lastHiddenState.data.slice(0, 768) as Float32Array,
    );

    return embedding;
  } catch (err) {
    console.error("Media Guard: DINOv2 inference failed:", err);
    return null;
  }
}
