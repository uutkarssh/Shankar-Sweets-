import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthed } from "@/lib/admin-auth";
import { uploadMenuImage } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

// POST: upload an image to Supabase Storage (menu-images bucket)
// Accepts both JSON (base64) and multipart/form-data
export async function POST(req: NextRequest) {
  if (!isAdminAuthed(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const contentType = req.headers.get("content-type") || "";

    // Handle multipart/form-data (like Apna Baithak)
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file") as File | null;
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "File must be an image." }, { status: 400 });
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "Image must be under 5MB." }, { status: 400 });
      }

      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buf = Buffer.from(await file.arrayBuffer());
      const base64 = buf.toString("base64");

      const url = await uploadMenuImage(base64, fileName, file.type);
      if (!url) {
        return NextResponse.json({ error: "Upload failed — Supabase may not be configured" }, { status: 500 });
      }
      return NextResponse.json({ ok: true, url });
    }

    // Handle JSON (base64) — used by the admin form's ImageUploadField
    const body = await req.json();
    const { image, fileName, contentType: ct } = body;

    if (!image || !fileName) {
      return NextResponse.json({ error: "Missing image or fileName" }, { status: 400 });
    }

    if (image.length > 7_000_000) {
      return NextResponse.json({ error: "Image too large (max 5MB)" }, { status: 400 });
    }

    const url = await uploadMenuImage(image, fileName, ct || "image/png");
    if (!url) {
      return NextResponse.json({ error: "Upload failed — Supabase may not be configured" }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url });
  } catch (e: any) {
    console.error("Upload error:", e);
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}
