import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * GET /api/media-guard/version-tree?parentId=<uuid>
 *
 * Returns all child media assets linked to a given parent_id.
 * Public read access (mirrors RLS policy).
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parentId = searchParams.get("parentId");

    if (!parentId) {
      return NextResponse.json(
        { error: "Missing required query parameter: parentId" },
        { status: 400 },
      );
    }

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(parentId)) {
      return NextResponse.json(
        { error: "parentId must be a valid UUID" },
        { status: 400 },
      );
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.rpc("get_version_tree", {
      target_parent_id: parentId,
    });

    if (error) {
      console.error("Version Tree RPC Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch version tree" },
        { status: 500 },
      );
    }

    return NextResponse.json({ children: data ?? [] });
  } catch (error) {
    console.error("Version Tree API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
