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

/**
 * Extract the storage path from a Supabase public URL.
 * Example URL: https://xxx.supabase.co/storage/v1/object/public/menu-images/menu/123-abc.png
 * Returns: menu/123-abc.png
 */
function extractPathFromUrl(url: string): string | null {
  if (!url) return null;
  // Only process Supabase storage URLs
  if (!url.includes("supabase.co/storage/v1/object/public/")) return null;
  const prefix = `/storage/v1/object/public/${MENU_BUCKET}/`;
  const idx = url.indexOf(prefix);
  if (idx === -1) return null;
  return decodeURIComponent(url.substring(idx + prefix.length));
}

/**
 * Delete a file from the menu-images bucket by its public URL.
 * Used when replacing or removing item/category images to prevent junk buildup.
 * Silently does nothing if the URL is not a Supabase storage URL.
 */
export async function deleteMenuImage(url: string | null | undefined): Promise<boolean> {
  if (!url) return false;
  const supabase = getSupabaseServer();
  if (!supabase) return false;

  const path = extractPathFromUrl(url);
  if (!path) return false;

  const { error } = await supabase.storage
    .from(MENU_BUCKET)
    .remove([path]);

  if (error) {
    console.error("Supabase delete error:", error.message);
    return false;
  }
  return true;
}

/**
 * Delete multiple files from the menu-images bucket by their public URLs.
 * Used when deleting gallery images or cleaning up on item deletion.
 */
export async function deleteMenuImages(urls: (string | null | undefined)[]): Promise<void> {
  const supabase = getSupabaseServer();
  if (!supabase) return;

  const paths = urls
    .filter(Boolean)
    .map(url => extractPathFromUrl(url!))
    .filter(Boolean) as string[];

  if (paths.length === 0) return;

  const { error } = await supabase.storage
    .from(MENU_BUCKET)
    .remove(paths);

  if (error) {
    console.error("Supabase batch delete error:", error.message);
  }
}
