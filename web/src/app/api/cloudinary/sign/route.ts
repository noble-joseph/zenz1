import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

import { getEnv } from "@/lib/env";

export async function POST() {
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

  // Optional: enforce folder/preset conventions here.
  const paramsToSign: Record<string, string | number> = {
    timestamp,
    folder: "talentos",
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, env.CLOUDINARY_API_SECRET);

  return NextResponse.json({
    ok: true,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    folder: paramsToSign.folder,
    signature,
  });
}

