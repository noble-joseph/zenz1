import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

import { getEnv } from "@/lib/env";

export async function POST(request: Request) {
  const { publicId } = await request.json();
  const env = getEnv();
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) {
    return NextResponse.json(
      { ok: false, message: "Missing Cloudinary env vars." },
      { status: 500 },
    );
  }

  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });

  const timestamp = Math.floor(Date.now() / 1000);
  const folder = "talentos";

  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder,
  };

  if (publicId) {
    paramsToSign.public_id = publicId;
  }

  // Cloudinary's SDK handles the sorting and secret hashing automatically here
  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  return NextResponse.json({
    ok: true,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature,
    publicId: publicId || undefined,
  });
}
