"use client";

import { useState, useEffect } from "react";

// Global cache for config — avoids re-fetching /api/config on every
// Header and BottomNav mount. The config rarely changes, so we cache it
// for 5 minutes (300000ms) in memory.
let _configCache: { offersEnabled: boolean; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useConfig() {
  const [offersEnabled, setOffersEnabled] = useState(_configCache?.offersEnabled ?? true);

  useEffect(() => {
    // Return cached value if fresh
    if (_configCache && Date.now() - _configCache.ts < CACHE_TTL) {
      setOffersEnabled(_configCache.offersEnabled);
      return;
    }

    let cancelled = false;
    fetch("/api/config", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        const val = d.offersEnabled ?? true;
        setOffersEnabled(val);
        _configCache = { offersEnabled: val, ts: Date.now() };
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  return offersEnabled;
}
