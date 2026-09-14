"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/site/header";
import { BottomNav } from "@/components/site/bottom-nav";
import { supabase } from "@/lib/supabase-browser";
import { ChevronLeft, Mail, Lock, User, Phone, Chrome, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { BUSINESS } from "@/lib/constants";

export default function LoginPageWrapper() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center" style={{ background: "#FFF8E8" }}><div className="shimmer h-8 w-8 rounded-full" /></div>}>
      <LoginPage />
    </Suspense>
  );
}

function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo") || "/";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);

  // Check if already signed in — also listen for auth state changes (handles email verification redirect)
  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push(returnTo);
    });

    // Listen for auth state changes — this catches the email verification redirect
    // When Supabase detects the session in the URL, it fires onAuthStateChange with SIGNED_IN
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        toast.success("Signed in successfully");
        router.push(returnTo);
      }
    });

    return () => subscription.unsubscribe();
  }, [router, returnTo]);

  const normalizeIndianMobile = (input: string): string | null => {
    let digits = input.replace(/\D/g, "");
    if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? digits : null;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      toast.success("Signed in");
      router.push(returnTo);
    } catch (e: any) {
      toast.error(e.message || "Sign in failed");
    } finally {
      setBusy(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const normalizedPhone = normalizeIndianMobile(phone);
    if (!normalizedPhone) {
      toast.error("Enter a valid 10-digit phone number");
      setBusy(false);
      return;
    }
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone: `+91 ${normalizedPhone}`,
          },
        },
      });
      if (error) throw error;
      if (data.session) {
        toast.success("Account created");
        router.push(returnTo);
      } else {
        setVerificationSent(true);
        toast.info("Verification email sent");
      }
    } catch (e: any) {
      toast.error(e.message || "Sign up failed");
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}${returnTo}` },
    });
    if (error) toast.error(error.message);
  };

  if (verificationSent) {
    return (
      <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full" style={{ background: "#D1FAE5" }}>
            <CheckCircle2 style={{ width: 40, height: 40, color: "#2F6B45" }} />
          </div>
          <h1 className="mt-4 text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>Verify your email</h1>
          <p className="mt-2 max-w-xs text-sm" style={{ color: "#76544A" }}>
            We have sent a verification email to <strong>{email}</strong>. Click the link to activate your account.
          </p>
          <button
            onClick={async () => { await supabase.auth.resend({ type: "signup", email }); toast.success("Verification email resent"); }}
            className="mt-5 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wide"
            style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
          >
            Resend verification email
          </button>
          <button onClick={() => { setVerificationSent(false); setMode("signin"); }} className="mt-3 text-xs font-semibold" style={{ color: "#641C27" }}>
            Back to sign in
          </button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "#FFF8E8" }}>
      <Header />
      <main className="flex-1 pb-24">
        <div className="mx-auto max-w-md px-4 pt-8">
          <button onClick={() => router.push(returnTo)} className="inline-flex items-center gap-1 text-sm font-semibold" style={{ color: "#641C27" }}>
            <ChevronLeft style={{ width: 16, height: 16 }} /> Back
          </button>

          {/* Brand */}
          <div className="mt-6 text-center">
            <div className="gold-divider mb-3 mx-auto max-w-[120px]">
              <svg width="24" height="10" viewBox="0 0 24 10" fill="none" aria-hidden>
                <path d="M12 0 L15 5 L12 10 L9 5 Z" fill="#D4A83E" />
              </svg>
            </div>
            <h1 className="text-xl font-bold" style={{ color: "#3D1018", fontFamily: "var(--font-poppins)" }}>
              {mode === "signin" ? "Welcome back!" : "Create your account"}
            </h1>
            <p className="mt-1 text-xs" style={{ color: "#76544A" }}>
              Sign in to place your order. Browse the menu freely without logging in.
            </p>
          </div>

          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border bg-white py-3 text-sm font-semibold transition hover:bg-gray-50"
            style={{ borderColor: "#E8D9B8", color: "#3D1018" }}
          >
            <Chrome style={{ width: 18, height: 18, color: "#641C27" }} />
            Continue with Google
          </button>

          {/* OR divider */}
          <div className="my-5 flex items-center gap-2">
            <div className="h-px flex-1" style={{ background: "#E8D9B8" }} />
            <span className="text-xs font-semibold" style={{ color: "#76544A" }}>OR</span>
            <div className="h-px flex-1" style={{ background: "#E8D9B8" }} />
          </div>

          {/* Email/password form */}
          <form onSubmit={mode === "signin" ? handleSignIn : handleSignUp} className="space-y-3">
            {mode === "signup" && (
              <>
                <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                  <User style={{ width: 16, height: 16, color: "#76544A" }} />
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Full Name"
                    required
                    className="w-full bg-transparent text-sm focus:outline-none"
                    style={{ color: "#2C1715" }}
                  />
                </div>
                <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
                  <Phone style={{ width: 16, height: 16, color: "#76544A" }} />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 12))}
                    placeholder="Contact Number (10 digits)"
                    inputMode="numeric"
                    required
                    className="w-full bg-transparent text-sm focus:outline-none"
                    style={{ color: "#2C1715" }}
                  />
                </div>
                {mode === "signup" && phone.length > 0 && phone.length < 10 && (
                  <p className="text-[10px]" style={{ color: "#76544A" }}>Required for delivery — we'll call/SMS on this number.</p>
                )}
              </>
            )}
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              <Mail style={{ width: 16, height: 16, color: "#76544A" }} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="w-full bg-transparent text-sm focus:outline-none"
                style={{ color: "#2C1715" }}
              />
            </div>
            <div className="flex items-center gap-2 rounded-xl border px-3 py-2.5" style={{ borderColor: "#E8D9B8", background: "#FFFFFF" }}>
              <Lock style={{ width: 16, height: 16, color: "#76544A" }} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)"
                required
                minLength={6}
                className="w-full bg-transparent text-sm focus:outline-none"
                style={{ color: "#2C1715" }}
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl py-3 text-sm font-bold uppercase tracking-wide transition hover:scale-[1.01] disabled:opacity-50"
              style={{ background: "#641C27", color: "#FFF8E8", border: "1px solid #D4A83E" }}
            >
              {busy ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          {/* Mode toggle */}
          <p className="mt-5 text-center text-xs" style={{ color: "#76544A" }}>
            {mode === "signin" ? (
              <>Don't have an account? <button onClick={() => setMode("signup")} className="font-bold" style={{ color: "#641C27" }}>Sign up</button></>
            ) : (
              <>Already have an account? <button onClick={() => setMode("signin")} className="font-bold" style={{ color: "#641C27" }}>Sign in</button></>
            )}
          </p>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
