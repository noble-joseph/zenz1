import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

import { createSupabaseServerClient } from "@/lib/supabase/server";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const hashId = searchParams.get("hash");

  if (!hashId) {
    return NextResponse.json({ error: "Missing hash parameter" }, { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  // In a real enterprise system, we'd verify the `user.id` is the `owner_id` 
  // of a project containing this `hash`, or a verified collaborator.
  // For standard Vibe Search / Public viewers, we apply a watermark transformation
  // to protect the creator's IP if it's an image.

  const isCreator = !!user;

  try {
    const { data: asset } = await supabase
      .from("assets")
      .select("media_type, metadata, storage_url")
      .eq("hash_id", hashId)
      .single();

    if (!asset) {
      return NextResponse.json({ error: "Asset not found" }, { status: 404 });
    }

    // Example Cloudinary Transformation:
    // If it's a public user viewing an image, we watermark it and lower the quality.
    // If it's the authenticated creator, give them the original.
    let signedUrl = asset.storage_url;

    if (asset.media_type === "image" && !isCreator && process.env.CLOUDINARY_API_SECRET) {
       // We use Cloudinary SDK to build a signed URL with a text watermark
       const publicId = hashId; // Since we uploaded with hash_id as the public_id
       
       signedUrl = cloudinary.url(publicId, {
         sign_url: true,
         secure: true,
         transformation: [
           { width: 1200, crop: "limit", quality: "auto:eco" },
           { overlay: { font_family: "Arial", font_size: 60, font_weight: "bold", text: "TALENT+OS" } },
           { flags: "relative", width: "0.5", crop: "scale" },
           { opacity: 30, color: "white", gravity: "center" }
         ]
       });
    }

    // Redirect the user securely to the CDN so our Next.js server doesn't proxy the massive bandwidth
    return NextResponse.redirect(signedUrl);

  } catch (err) {
    console.error("Signed URL Error:", err);
    return NextResponse.json({ error: "Failed to generate signed URL" }, { status: 500 });
  }
}
