export async function generateEmbedding(text: string): Promise<number[]> {
  const hfToken = process.env.HUGGING_FACE_API_KEY;
  const modelId = "sentence-transformers/all-distilroberta-v1"; // Exactly 768 dimensions

  // 1. Try Hugging Face Cloud API (Best for Production/Vercel)
  if (hfToken) {
    try {
      console.log(`Embeddings: Requesting HF Cloud vector for "${text.substring(0, 20)}..."`);
      const response = await fetch(
        `https://router.huggingface.co/hf-inference/models/${modelId}/pipeline/feature-extraction`,
        {
          headers: { 
            Authorization: `Bearer ${hfToken}`,
            "Content-Type": "application/json"
          },
          method: "POST",
          body: JSON.stringify({ inputs: text }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        const embedding = Array.isArray(result) ? result : result[0]; // Handle different HF response shapes
        console.log(`Embeddings: Successfully generated ${embedding.length}d cloud vector`);
        return embedding;
      }
      console.warn("HF API Error:", await response.text());
    } catch (apiError) {
      console.warn("HF Cloud API failed, falling back to local...", apiError);
    }
  }

  // 2. Local Fallback (Best for Local Dev / No API Key)
  try {
    const { pipeline } = await import("@huggingface/transformers");
    console.log("Embeddings: Falling back to local model...");
    const extractor = await pipeline("feature-extraction", "Xenova/all-distilroberta-v1");
    const result = await extractor(text, { pooling: "mean", normalize: true });
    const embedding = Array.from(result.data as Float32Array);
    
    console.log(`Embeddings: Successfully generated ${embedding.length}d local vector`);
    return embedding;
  } catch (error: any) {
    console.error("Critical: Embedding Failure:", error.message);
    return new Array(768).fill(0);
  }
}

