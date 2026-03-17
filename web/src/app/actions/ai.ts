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

/**
 * AI Bio Rewrite — uses Gemini to generate a polished, professional bio.
 */
export async function rewriteBioAction(currentBio: string, profession: string | null) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "AI API key not configured" };
  }

  const prompt = `
    You are an expert copywriter for creative professionals.
    Rewrite the following bio for a ${profession || "creative professional"} to make it more compelling, SEO-friendly, and professional.
    Keep the same personality and facts but make it polished and engaging. Max 200 words.

    Original bio: "${currentBio}"

    Output strictly valid JSON with no markdown formatting:
    { "bio": "rewritten bio text" }
  `;

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```json/i, "").replace(/```$/i, "").trim();
    const data = JSON.parse(text) as { bio: string };
    return { ok: true, data };
  } catch (err: unknown) {
    console.error("AI Bio Rewrite Error:", err);
    return { ok: false, error: "AI generation failed. Please try again." };
  }
}

/**
 * AI SEO Caption — generates an SEO-optimized caption for portfolio items.
 */
export async function generateSEOCaptionAction(title: string, description: string, tags: string[]) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "AI API key not configured" };
  }

  const prompt = `
    Generate an SEO-optimized, compelling caption for a creative project:
    Title: "${title}"
    Description: "${description}"
    Tags: ${tags.join(", ")}

    The caption should be professional, keyword-rich, and under 160 characters (ideal for meta descriptions).

    Output strictly valid JSON with no markdown formatting:
    { "caption": "seo caption text" }
  `;

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```json/i, "").replace(/```$/i, "").trim();
    const data = JSON.parse(text) as { caption: string };
    return { ok: true, data };
  } catch (err: unknown) {
    console.error("AI SEO Caption Error:", err);
    return { ok: false, error: "AI generation failed." };
  }
}

/**
 * AI Network Insights — generates analytical insights from network data.
 */
export async function generateNetworkInsightsAction(data: {
  totalConnections: number;
  verifiedCount: number;
  velocity30: number;
  velocity7: number;
  topRoles: [string, number][];
  influenceScore: number;
  profession: string | null;
}) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    // Fallback to rule-based insights
    return { ok: true, data: generateLocalInsights(data) };
  }

  const prompt = `
    You are an AI career advisor for creative professionals. Analyze this creator's network data and provide exactly 3 actionable insights.

    Profile: ${data.profession || "Creative Professional"}
    Influence Score: ${data.influenceScore}
    Total Connections: ${data.totalConnections}
    Verified Credits: ${data.verifiedCount}
    Last 30 days new credits: ${data.velocity30}
    Last 7 days new credits: ${data.velocity7}
    Top Roles: ${data.topRoles.map(([r, c]) => `${r} (${c})`).join(", ") || "None yet"}

    Provide 3 short insights (max 1 sentence each) about network growth, opportunities, and recommendations.
    
    Output strictly valid JSON with no markdown formatting:
    { "insights": [
      { "title": "short title", "text": "insight text", "type": "growth|opportunity|warning" }
    ] }
  `;

  const { GoogleGenerativeAI } = await import("@google/generative-ai");
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/^```json/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(text) as { insights: { title: string; text: string; type: string }[] };
    return { ok: true, data: parsed };
  } catch (err: unknown) {
    console.error("AI Network Insights Error:", err);
    return { ok: true, data: generateLocalInsights(data) };
  }
}

function generateLocalInsights(data: {
  totalConnections: number;
  verifiedCount: number;
  velocity30: number;
  velocity7: number;
  topRoles: [string, number][];
  influenceScore: number;
}) {
  const insights: { title: string; text: string; type: string }[] = [];

  if (data.velocity30 > 0) {
    insights.push({ title: "Growing Network", text: `You've gained ${data.velocity30} new verified credits this month — keep the momentum going!`, type: "growth" });
  } else {
    insights.push({ title: "Network Stalled", text: "No new verified credits in the last 30 days. Consider reaching out to past collaborators.", type: "warning" });
  }

  if (data.topRoles.length > 0) {
    insights.push({ title: "Specialist Profile", text: `You're most recognized as a "${data.topRoles[0][0]}" — lean into this strength in your portfolio.`, type: "opportunity" });
  } else {
    insights.push({ title: "Build Your Identity", text: "Start collaborating on projects to build recognized specializations.", type: "opportunity" });
  }

  if (data.influenceScore < 5) {
    insights.push({ title: "Early Stage", text: "Your influence score is just starting. Each verified credit increases your visibility to hirers.", type: "growth" });
  } else {
    insights.push({ title: "Rising Creator", text: `With an influence score of ${data.influenceScore}, you're building real credibility in the industry.`, type: "growth" });
  }

  return { insights };
}
