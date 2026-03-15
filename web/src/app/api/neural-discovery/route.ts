import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generateEmbedding } from "@/lib/embeddings";

/**
 * Neural Discovery API
 * - GET: Returns matching creators based on user's professional blueprint.
 * - POST: Forces profile embedding re-sync.
 */

export async function GET(req: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Fetch current profile
    const { data: profile, error: profError } = await supabase
        .from("profiles")
        .select("id, display_name, bio, profession, specializations, embedding")
        .eq("id", user.id)
        .single();

    if (profError || !profile) {
        return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    let embedding = profile.embedding;

    // 2. If no embedding or forced refresh, generate one
    const { searchParams } = new URL(req.url);
    const forceRefresh = searchParams.get("refresh") === "true";

    if (!embedding || forceRefresh) {
        const blueprint = `
            Profession: ${profile.profession || "Creative"}
            Bio: ${profile.bio || ""}
            Skills: ${(profile.specializations || []).join(", ")}
        `.trim();

        if (blueprint.length > 10) {
            embedding = await generateEmbedding(blueprint);
            if (embedding && embedding.length > 0) {
                // Update profile with new embedding
                await supabase
                    .from("profiles")
                    .update({ embedding })
                    .eq("id", user.id);
            }
        }
    }

    if (!embedding) {
        return NextResponse.json({ error: "Not enough profile data for neural matching" }, { status: 400 });
    }

    // 3. Match creators
    const { data: matches, error: matchError } = await supabase.rpc("match_creators", {
        query_embedding: embedding,
        match_threshold: 0.1, // Creative/Looser matching for discovery
        match_count: 6,
        excluded_id: user.id
    });

    if (matchError) {
        console.error("Match Creators Error:", matchError);
        return NextResponse.json({ error: "Discovery engine failed" }, { status: 500 });
    }

    return NextResponse.json({ matches });

  } catch (error) {
    console.error("Neural Discovery Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
