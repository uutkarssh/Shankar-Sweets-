"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Globe, Smartphone, Check } from "lucide-react";
import { BUSINESS } from "@/lib/constants";

/**
 * /install — a standalone landing page for QR code scans.
 *
 * When users scan the QR code (pointing to shankarsweets.vercel.app/install),
 * they land here and see:
 * 1. The Shankar Sweets logo + brand name
 * 2. An "Install App" button that triggers the PWA install prompt
 * 3. A "Continue with Browser" link that takes them to the homepage
 *
 * On iOS (which doesn't support the beforeinstallprompt API), the install
 * button shows step-by-step instructions (Add to Home Screen).
 */
export default function InstallPage() {
  const router = useRouter();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);

  useEffect(() => {
    // Detect iOS (no beforeinstallprompt support)
    const ua = navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document);
    setIsIOS(ios);

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Capture the beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Check if app was successfully installed
    const installedHandler = () => setIsInstalled(true);
    window.addEventListener("appinstalled", installedHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (isIOS) {
      setShowIOSSteps(true);
      return;
    }
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6" style={{ background: "linear-gradient(135deg, #641C27 0%, #3D1018 100%)" }}>
      {/* Logo */}
      <div className="mb-6 flex flex-col items-center">
        <div className="relative h-24 w-24 overflow-hidden rounded-3xl border-2" style={{ borderColor: "#D4A83E", background: "#FFF8E8" }}>
          <img
            src="/images/brand/icon-512.png"
            alt="Shankar Sweets & Bakery"
            className="h-full w-full object-cover"
          />
        </div>
        <h1 className="mt-4 text-center text-2xl font-extrabold" style={{ color: "#FFF8E8", fontFamily: "var(--font-poppins)" }}>
          {BUSINESS.name}
        </h1>
        <p className="mt-1 text-sm" style={{ color: "#E5B84B" }}>
          {BUSINESS.tagline} • Since {BUSINESS.sinceYear}
        </p>
        <div className="mt-2 flex items-center gap-1.5 rounded-full px-3 py-1" style={{ background: "rgba(255,255,255,0.1)" }}>
          <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "#E5B84B" }}>
            Sweets • Bakery • Ice Cream • Chaat
          </span>
        </div>
      </div>

      {/* Already installed state */}
      {isInstalled ? (
        <div className="flex flex-col items-center">
          <div className="grid h-16 w-16 place-items-center rounded-full" style={{ background: "#2F6B45" }}>
            <Check style={{ width: 32, height: 32, color: "#FFF8E8" }} />
          </div>
          <h2 className="mt-4 text-lg font-bold" style={{ color: "#FFF8E8", fontFamily: "var(--font-poppins)" }}>
            App Installed!
          </h2>
          <p className="mt-1 text-center text-sm" style={{ color: "rgba(255,248,232,0.7)" }}>
            You can find the app on your home screen.
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-full px-8 py-3 text-sm font-bold uppercase tracking-wide transition hover:scale-105"
            style={{ background: "#D4A83E", color: "#3D1018" }}
          >
            Open App
          </button>
        </div>
      ) : (
        <>
          {/* Install button */}
          <button
            onClick={handleInstall}
            className="flex w-full max-w-sm items-center justify-center gap-2.5 rounded-full py-4 text-base font-bold uppercase tracking-wide transition hover:scale-[1.02]"
            style={{ background: "#D4A83E", color: "#3D1018" }}
          >
            <Download style={{ width: 20, height: 20 }} />
            Install App
          </button>

          {/* iOS install instructions */}
          {showIOSSteps && (
            <div className="mt-4 w-full max-w-sm rounded-2xl border p-4" style={{ borderColor: "#D4A83E", background: "rgba(255,248,232,0.1)" }}>
              <h3 className="text-sm font-bold" style={{ color: "#E5B84B", fontFamily: "var(--font-poppins)" }}>
                How to install on iPhone/iPad:
              </h3>
              <ol className="mt-2 space-y-2 text-xs" style={{ color: "#FFF8E8" }}>
                <li className="flex gap-2">
                  <span className="font-bold" style={{ color: "#E5B84B" }}>1.</span>
                  <span>Tap the <strong>Share</strong> button in Safari's bottom toolbar</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold" style={{ color: "#E5B84B" }}>2.</span>
                  <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
                </li>
                <li className="flex gap-2">
                  <span className="font-bold" style={{ color: "#E5B84B" }}>3.</span>
                  <span>Tap <strong>Add</strong> — the app will appear on your home screen</span>
                </li>
              </ol>
            </div>
          )}

          {/* Continue with browser */}
          <button
            onClick={() => router.push("/")}
            className="mt-4 flex items-center justify-center gap-2 text-sm font-semibold transition hover:underline"
            style={{ color: "rgba(255,248,232,0.7)" }}
          >
            <Globe style={{ width: 16, height: 16 }} />
            Continue with Browser
          </button>
        </>
      )}

      {/* Footer info */}
      <div className="mt-12 flex flex-col items-center gap-1 text-center">
        <p className="text-[10px]" style={{ color: "rgba(255,248,232,0.4)" }}>
          {BUSINESS.address}
        </p>
        <p className="text-[10px]" style={{ color: "rgba(255,248,232,0.4)" }}>
          {BUSINESS.phones.join(" · ")}
        </p>
        <div className="mt-3 flex items-center gap-1.5">
          <Smartphone style={{ width: 12, height: 12, color: "rgba(255,248,232,0.3)" }} />
          <span className="text-[9px]" style={{ color: "rgba(255,248,232,0.3)" }}>
            Works offline once installed • No app store needed
          </span>
        </div>
      </div>
    </div>
  );
}
