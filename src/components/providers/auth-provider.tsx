"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase-browser";

/**
 * Global auth listener — ensures session persists across all pages.
 * Listens for SIGNED_IN and SIGNED_OUT events.
 *
 * Safe to mount during build / prerender: if Supabase env vars aren't
 * configured (e.g., build environment), `supabase.auth` is a no-op stub and
 * `onAuthStateChange` returns a no-op subscription — so this effect is inert.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    try {
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("auth-signed-out"));
          }
        }
      });
      const subscription = data?.subscription;
      return () => {
        try {
          subscription?.unsubscribe?.();
        } catch {
          /* noop */
        }
      };
    } catch {
      // Supabase not configured — no-op.
      return;
    }
  }, []);

  return <>{children}</>;
}
