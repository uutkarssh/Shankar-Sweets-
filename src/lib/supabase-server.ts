import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

/**
 * Server-side Supabase client using the service role key.
 * Used for admin image uploads to the menu-images bucket.
 */
export function getSupabaseServer(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!_client) {
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

export const MENU_BUCKET = process.env.SUPABASE_MENU_BUCKET || "menu-images";

/**
 * Upload a base64 image to the menu-images bucket and return the public URL.
 */
export async function uploadMenuImage(
  base64Data: string,
  fileName: string,
  contentType: string = "image/png"
): Promise<string | null> {
  const supabase = getSupabaseServer();
  if (!supabase) return null;

  // Strip data URL prefix if present
  const base64 = base64Data.replace(/^data:[^;]+;base64,/, "");
  const buffer = Buffer.from(base64, "base64");
  const path = `menu/${fileName}`;

  const { error } = await supabase.storage
    .from(MENU_BUCKET)
    .upload(path, buffer, { contentType, upsert: true });

  if (error) {
    console.error("Supabase upload error:", error.message);
    return null;
  }

  const { data } = supabase.storage.from(MENU_BUCKET).getPublicUrl(path);
  return data?.publicUrl || null;
}
