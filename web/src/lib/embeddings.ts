import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";

/**
 * Generates an embedding for a piece of text.
 * We use Google's 'embedding-001' via Gemini, which is free in AI Studio.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  
  if (!apiKey) {
    console.warn("GOOGLE_GENERATIVE_AI_API_KEY is not set. Skipping embedding generation.");
    return [];
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = "text-embedding-004";
    const model = genAI.getGenerativeModel({ model: modelName });
    
    console.log(`Embeddings: Generating embedding for text length ${text.length} using ${modelName}`);
    
    const result = await model.embedContent({
      content: { parts: [{ text }], role: "user" },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
      outputDimensionality: 1536
    } as import("@google/generative-ai").EmbedContentRequest & { outputDimensionality: number });
    
    const embedding = result.embedding.values;
    console.log(`Embeddings: Successfully generated ${embedding.length}d vector`);
    
    return embedding;
  } catch (error: any) {
    console.error("Error generating embedding with Gemini:", {
      message: error.message,
      status: error.status,
      stack: error.stack
    });
    // Log specific details if available
    if (error.message?.includes("API_KEY_INVALID")) {
      console.error("Critical: GOOGLE_GENERATIVE_AI_API_KEY is invalid.");
    }
    // Return null instead of throwing to allow caller to handle gracefully
    return [];
  }
}

