"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const DISMISS_KEY = "shankar-install-dismissed";
const DISMISS_DAYS = 3;

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Don't show on admin routes
    if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) return;

    // Don't show if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Check dismiss cooldown
    try {
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (dismissed) {
        const days = (Date.now() - Number(dismissed)) / (1000 * 60 * 60 * 24);
        if (days < DISMISS_DAYS) return;
      }
    } catch {}

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show after 4 seconds
      setTimeout(() => setShow(true), 4000);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShow(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="fixed bottom-20 left-3 right-3 z-[60] mx-auto max-w-md"
        >
          <div className="flex items-center gap-3 rounded-2xl border p-4 shadow-xl" style={{ background: "#641C27", borderColor: "#D4A83E" }}>
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl" style={{ background: "#FFF8E8" }}>
              { }
              <img src="/images/brand/icon-192.png" alt="Shankar Sweets" className="h-10 w-10 rounded-lg object-contain" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white" style={{ fontFamily: "var(--font-poppins)" }}>Install Shankar Sweets</h3>
              <p className="text-[11px]" style={{ color: "rgba(255,248,232,0.8)" }}>Order faster from your home screen</p>
            </div>
            <button
              onClick={handleInstall}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide"
              style={{ background: "#D4A83E", color: "#3D1018" }}
            >
              <Download style={{ width: 14, height: 14 }} /> Install
            </button>
            <button
              onClick={handleDismiss}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10"
              aria-label="Dismiss"
            >
              <X style={{ width: 16, height: 16, color: "#FFF8E8" }} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
