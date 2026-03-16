import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assetId = searchParams.get("assetId");
  const threshold = parseFloat(searchParams.get("threshold") || "0.5");
  const limit = parseInt(searchParams.get("limit") || "12");

  if (!assetId) {
    return NextResponse.json({ ok: false, error: "Missing assetId" }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) throw new Error("Supabase client failed");

    // 1. Get the vector for the target asset
    const { data: asset, error: assetErr } = await supabase
      .from("media_assets")
      .select("vibe_vector, media_type")
      .eq("id", assetId)
      .single();

    if (assetErr || !asset?.vibe_vector) {
      return NextResponse.json({ ok: false, error: "Asset embedding not found" }, { status: 404 });
    }

    // 2. Perform similarity search
    const { data: results, error: searchErr } = await supabase.rpc("search_similar_media", {
      query_vector: asset.vibe_vector,
      threshold: threshold,
      result_limit: limit
    });

    if (searchErr) throw searchErr;

    // 3. Filter out the original asset and fetch owner details
    const filteredResults = results?.filter((r: any) => r.id !== assetId) || [];
    
    // Fetch profiles for these assets
    const assetIds = filteredResults.map((r: any) => r.id);
    const { data: assetsWithProfiles } = await supabase
      .from("media_assets")
      .select("id, created_by, profiles(display_name, public_slug)")
      .in("id", assetIds);

    const finalResults = filteredResults.map((r: any) => {
      const profile: any = assetsWithProfiles?.find((ap: any) => ap.id === r.id)?.profiles;
      return {
        ...r,
        owner: profile
      };
    });

    return NextResponse.json({
      ok: true,
      data: finalResults
    });

  } catch (err: any) {
    console.error("Discovery API Error:", err);
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
