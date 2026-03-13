"use server";

import { generateEmbedding } from "@/lib/embeddings";

export async function getEmbeddingAction(text: string) {
  if (!text) {
    throw new Error("Text is required for embedding generation.");
  }

  try {
    const vector = await generateEmbedding(text);
    return { ok: true, vector };
  } catch (err) {
    console.error("Embedding Action Error:", err);
    return { ok: false, error: "Failed to generate AI embedding." };
  }
}
