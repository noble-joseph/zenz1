import { NextResponse } from "next/server";

// Boundary stub:
// - Never generate signed/original URLs in the browser.
// - In production, verify the requester is allowed (project owner / verified collaborator)
//   then return a short-lived signed URL to the original asset.

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      message:
        "Not implemented. Provide server-side auth + authorization checks, then generate a signed URL.",
    },
    { status: 501 },
  );
}

