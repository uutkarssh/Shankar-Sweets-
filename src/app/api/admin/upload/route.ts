import { NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { uploadMenuImage } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { image, fileName, contentType } = body;

    if (!image || !fileName) {
      return NextResponse.json({ error: "Missing image or fileName" }, { status: 400 });
    }

    // Validate it's a reasonable image (max ~5MB base64)
    if (image.length > 7_000_000) {
      return NextResponse.json({ error: "Image too large (max 5MB)" }, { status: 400 });
    }

    const url = await uploadMenuImage(image, fileName, contentType || "image/png");
    if (!url) {
      return NextResponse.json({ error: "Upload failed — Supabase may not be configured" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}
