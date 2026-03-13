import { NextRequest, NextResponse } from "next/server";
import { generateEmbedding } from "@/lib/embeddings";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json(
      { error: "Missing query parameter 'q'" },
      { status: 400 }
    );
  }

  try {
    const vector = await generateEmbedding(decodeURIComponent(query));
    return NextResponse.json({ ok: true, vector });
  } catch (error) {
    console.error("Embedding API Error:", error);
    return NextResponse.json(
      { error: "Failed to generate search embedding" },
      { status: 500 }
    );
  }
}
