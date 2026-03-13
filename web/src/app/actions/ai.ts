"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateProjectMetadataAction(
  files: { name: string; type: string }[],
  profession: string | null
) {
  if (!files || files.length === 0) {
    throw new Error("No files provided for AI analysis.");
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_GENERATIVE_AI_API_KEY is missing. Returning fallback data.");
    return { ok: true, data: { description: "", tags: [] } };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "models/gemini-1.5-flash" });

    const prompt = `
      You are an AI assistant helping a creative professional (Profession: ${profession || "Creator"}).
      They are uploading a new project with the following files:
      ${files.map(f => `- ${f.name} (type: ${f.type})`).join("\n")}

      Based ONLY on these filenames and file types, generate a short, professional description for the project (1-2 sentences) and a list of 3 to 7 relevant tags.
      
      Output strictly valid JSON with no markdown formatting, using this schema:
      {
        "description": "string",
        "tags": ["tag1", "tag2"]
      }
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    
    // Attempt to parse json by stripping markdown backticks if present
    const cleanText = responseText.replace(/^```json/i, "").replace(/```$/i, "").trim();
    
    const data = JSON.parse(cleanText) as { description: string; tags: string[] };
    
    return { ok: true, data };
  } catch (error) {
    console.error("AI Metadata Generation Error:", error);
    return { ok: false, error: "Failed to generate AI metadata.", data: { description: "", tags: [] } };
  }
}
