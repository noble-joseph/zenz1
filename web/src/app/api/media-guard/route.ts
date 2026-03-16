import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { guardImage, guardAudio, findExactMatch, isFpcalcAvailable } from "@/lib/mediaGuard";
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
    const hash = formData.get("hash") as string | undefined;
    const storageUrl = formData.get("storage_url") as string | undefined;

    // Handle Pre-Upload Hash Check (Stage 1: Identity Guard)
    if (hash && !file) {
      const match = await findExactMatch(hash);
      if (match) {
        return NextResponse.json({
          action: "exact_match",
          asset: match,
        });
      }
      return NextResponse.json({ action: "not_found" });
    }

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
      result = await guardImage(buffer, user.id, metadata, storageUrl);
    } else if (mimeType.startsWith("audio/")) {
      const ext = file.name.split(".").pop() ?? "mp3";
      result = await guardAudio(buffer, user.id, metadata, ext, storageUrl);
    } else {
      return NextResponse.json(
        {
          error: `Unsupported media type: ${file.type}. Only image/* and audio/* are supported.`,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Media Guard API POST Error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error", 
        details: error?.message || "Unknown error",
        stack: process.env.NODE_ENV === "development" ? error?.stack : undefined
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/media-guard
 * 
 * Health check and capability diagnostic.
 */
export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    const fpAvailable = await isFpcalcAvailable();
    
    return NextResponse.json({
      status: "online",
      authenticated: !!user,
      capabilities: {
        audio_fingerprinting: fpAvailable,
        image_embeddings: "dinov2-vits14 (transformers.js)"
      },
      env: process.env.NODE_ENV
    });
  } catch (error: any) {
    return NextResponse.json({ status: "error", message: error?.message }, { status: 500 });
  }
}
