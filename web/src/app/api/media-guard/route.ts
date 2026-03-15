import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { guardImage, guardAudio } from "@/lib/mediaGuard";
import type { AssetMetadata } from "@/lib/types/database";

/**
 * POST /api/media-guard
 *
 * Accepts multipart/form-data with a single `file` field.
 * Routes to guardImage or guardAudio based on MIME type.
 * Returns GuardResult as JSON.
 *
 * Requires authentication.
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse multipart form data
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Missing 'file' field in form data" },
        { status: 400 },
      );
    }

    // Read file into Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Build metadata
    const metadata: AssetMetadata = {
      originalName: file.name,
      size: file.size,
      type: file.type,
    };

    // Route based on MIME type
    const mimeType = file.type.toLowerCase();
    let result;

    if (mimeType.startsWith("image/")) {
      result = await guardImage(buffer, metadata);
    } else if (mimeType.startsWith("audio/")) {
      const ext = file.name.split(".").pop() ?? "mp3";
      result = await guardAudio(buffer, metadata, ext);
    } else {
      return NextResponse.json(
        {
          error: `Unsupported media type: ${file.type}. Only image/* and audio/* are supported.`,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Media Guard API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
