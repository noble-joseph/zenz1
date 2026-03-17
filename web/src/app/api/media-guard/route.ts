import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { guardImage, guardAudio, guardVideo, findExactMatch, checkFpcalcAvailability, getOriginalProjectForAsset } from "@/lib/mediaGuard";
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
    const frame = formData.get("frame");
    const hash = formData.get("hash") as string | undefined;
    const storageUrl = formData.get("storage_url") as string | undefined;

    // Handle Pre-Upload Hash Check (Stage 1: Identity Guard)
    if (hash && !file) {
      const match = await findExactMatch(hash);
      if (match) {
        const originalProjectId = await getOriginalProjectForAsset(hash);
        return NextResponse.json({
          action: "exact_match",
          asset: match,
          original_project_id: originalProjectId || undefined
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

    try {
      if (mimeType.startsWith("image/")) {
        result = await guardImage(buffer, user.id, metadata, storageUrl);
      } else if (mimeType.startsWith("audio/")) {
        const ext = file.name.split(".").pop() ?? "mp3";
        result = await guardAudio(buffer, user.id, metadata, ext, storageUrl);
      } else if (mimeType.startsWith("video/")) {
        let frameBuffer: Buffer | null = null;
        if (frame && frame instanceof File) {
          frameBuffer = Buffer.from(await frame.arrayBuffer());
        }
        result = await guardVideo(buffer, user.id, metadata, storageUrl, frameBuffer);
      } else {
        return NextResponse.json(
          {
            error: `Unsupported media type: ${file.type}. Only image/*, audio/*, and video/* are supported.`,
          },
          { status: 400 },
        );
      }

      console.log(`Media Guard: DNA check successful for ${file.name} (${result?.action})`);
      return NextResponse.json(result);
    } catch (error: any) {
      console.error("Media Guard API: DNA Check Internal Failure:", {
        message: error.message,
        stack: error.stack,
        fileName: file.name,
        type: file.type
      });
      return NextResponse.json(
        { 
          error: "Media Guard DNA Check Failed", 
          details: error.message,
          stack: process.env.NODE_ENV === "development" ? error.stack : undefined
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("Media Guard API: Request Error:", error);
    return NextResponse.json(
      { error: "Bad Request", details: error.message },
      { status: 400 }
    );
  }
}

/**
 * GET /api/media-guard
 * 
 * Health check and capability diagnostic.
 */
export async function GET() {
  return NextResponse.json({ 
    status: "alive", 
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    secrets_check: {
      supabase: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      gemini: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY
    }
  });
}
