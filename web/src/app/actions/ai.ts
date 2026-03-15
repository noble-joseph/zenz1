"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Local fallback: generates tags and description from file names alone.
 * No API call needed — works offline and when quota is exhausted.
 */
function generateLocalMetadata(
  files: { name: string; type: string }[],
  profession: string | null
): { description: string; tags: string[] } {
  const tags = new Set<string>();

  // Add profession-based tags
  const prof = (profession || "").toLowerCase();
  if (prof.includes("cinemato")) tags.add("cinematography");
  if (prof.includes("musician") || prof.includes("music")) tags.add("music");
  if (prof.includes("photo")) tags.add("photography");
  if (prof.includes("design")) tags.add("design");
  if (prof.includes("edit")) tags.add("editing");

  // Extract tags from filenames
  for (const f of files) {
    const base = f.name.replace(/\.[^.]+$/, ""); // strip extension
    const words = base
      .replace(/[_\-]+/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 2 && !/^\d+$/.test(w));
    words.forEach((w) => tags.add(w));

    // Add media-type tags
    if (f.type.startsWith("image/")) tags.add("visual");
    if (f.type.startsWith("audio/")) tags.add("audio");
    if (f.type.startsWith("video/")) tags.add("video");
  }

  // Limit to 7 tags
  const tagList = Array.from(tags).slice(0, 7);

  const fileNames = files.map((f) => f.name.replace(/\.[^.]+$/, "")).join(", ");
  const description = `A ${profession || "creative"} project featuring ${files.length} file${files.length > 1 ? "s" : ""}: ${fileNames}.`;

  return { description, tags: tagList };
}

export async function generateProjectMetadataAction(
  files: { name: string; type: string }[],
  profession: string | null
) {
  if (!files || files.length === 0) {
    throw new Error("No files provided for AI analysis.");
  }

  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_GENERATIVE_AI_API_KEY is missing. Using local fallback.");
    return { ok: true, data: generateLocalMetadata(files, profession) };
  }

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

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  const maxRetries = 2;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const responseText = result.response.text().trim();
      const cleanText = responseText.replace(/^```json/i, "").replace(/```$/i, "").trim();
      const data = JSON.parse(cleanText) as { description: string; tags: string[] };
      return { ok: true, data };
    } catch (err: unknown) {
      const error = err as any;
      const is429 = error?.status === 429 || error?.message?.includes("429");
      if (is429 && attempt < maxRetries - 1) {
        console.warn(`Rate limited (attempt ${attempt + 1}/${maxRetries}). Retrying in 5s...`);
        await sleep(5000);
        continue;
      }
      // If rate limited on final attempt, fall back to local generation
      if (is429) {
        console.warn("AI quota exhausted. Falling back to local metadata generation.");
        return { ok: true, data: generateLocalMetadata(files, profession) };
      }
      console.error("AI Metadata Generation Error:", error);
      return { ok: true, data: generateLocalMetadata(files, profession) };
    }
  }

  return { ok: true, data: generateLocalMetadata(files, profession) };
}

