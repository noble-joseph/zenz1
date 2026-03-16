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
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent({
      content: { parts: [{ text }], role: "user" },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
      outputDimensionality: 1536
    } as import("@google/generative-ai").EmbedContentRequest & { outputDimensionality: number });
    const embedding = result.embedding.values;
    
    return embedding;
  } catch (error) {
    console.error("Error generating embedding with Gemini:", error);
    throw new Error("Failed to generate embedding.");
  }
}

