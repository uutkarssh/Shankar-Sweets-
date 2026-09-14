"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase-browser";

/**
 * Global auth listener — ensures session persists across all pages.
 * Listens for SIGNED_IN and SIGNED_OUT events.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("auth-signed-out"));
        }
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}
