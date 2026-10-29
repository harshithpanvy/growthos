"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, KeyRound, LogIn } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/Navigation";
import { isSupabaseConfigured, supabase, syncServerSessionCookie } from "@/lib/supabase";
import { normalizeEmail, sanitizeRedirectPath } from "@/lib/validation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [redirectTo, setRedirectTo] = useState("/dashboard");
  const [mode, setMode] = useState<"login" | "reset">("login");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextParam = params.get("next");
    if (nextParam) {
      setRedirectTo(sanitizeRedirectPath(nextParam, "/dashboard"));
    }
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) {
      setErrorMessage("Please enter your email address.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(
        "Supabase credentials are not configured yet. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local."
      );
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/profile`
        });
        if (error) throw error;
        setSuccessMessage(
          `If an account exists for ${cleanEmail}, a password reset link has been sent to your email.`
        );
        setSubmitting(false);
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (error) throw error;
      if (!data.session) {
        throw new Error("Sign-in succeeded, but no active session was returned. Please confirm your email first.");
      }

      await syncServerSessionCookie(data.session);
      router.push(redirectTo);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Sign-in failed. Please verify your credentials.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container">
      <PublicHeader />

      <div style={{ maxWidth: 520, margin: "42px auto" }}>
        <section className="card">
          <div className="dash-head">
            <span className="pill">
              {mode === "login" ? <LogIn size={13} /> : <KeyRound size={13} />}
              {mode === "login" ? "ACCOUNT SIGN IN" : "PASSWORD RESET"}
            </span>
          </div>

          <h1 style={{ font: "700 25px 'Space Grotesk', sans-serif", margin: "14px 0 6px" }}>
            {mode === "login" ? "Sign in to GrowthOS" : "Reset Your Password"}
          </h1>
          <p className="small">
            {mode === "login"
              ? "Access your Student Dashboard, referral link, unlocked learning resources, or Admin Console."
              : "Enter your registered email address and we will send you a secure password recovery link."}
          </p>

          <form onSubmit={handleLogin} noValidate>
            <label className="field">
              <span>Email Address *</span>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your registered email"
                autoComplete="email"
              />
            </label>

            {mode === "login" && (
              <label className="field">
                <span>Password *</span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
              </label>
            )}

            {errorMessage && (
              <div className="message error" role="alert">
                <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>{errorMessage}</div>
              </div>
            )}

            {successMessage && (
              <div className="message success" role="status">
                <CheckCircle2 size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                <div>{successMessage}</div>
              </div>
            )}

            <button type="submit" className="btn full cyan" disabled={submitting} style={{ marginTop: 8 }}>
              {submitting ? (
                "Processing…"
              ) : mode === "login" ? (
                <>
                  Sign In <ArrowRight size={15} />
                </>
              ) : (
                "Send Password Reset Email"
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              fontSize: 13
            }}
          >
            <button
              type="button"
              onClick={() => {
                setMode(mode === "login" ? "reset" : "login");
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              style={{ border: 0, background: "transparent", color: "var(--cyan)", fontWeight: 600, padding: 0 }}
            >
              {mode === "login" ? "Forgot password?" : "Back to sign in"}
            </button>

            <Link href="/register" style={{ color: "var(--muted)" }}>
              New student? <strong style={{ color: "var(--text)" }}>Register for free</strong>
            </Link>
          </div>
        </section>
      </div>

      <PublicFooter />
    </div>
  );
}
