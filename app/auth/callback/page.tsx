"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ShieldAlert } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/Navigation";
import { isSupabaseConfigured, supabase, syncServerSessionCookie } from "@/lib/supabase";
import { sanitizeRedirectPath } from "@/lib/validation";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function processCallback() {
      if (!isSupabaseConfigured || !supabase) {
        setStatus("error");
        setErrorMessage("Supabase is not configured in this environment.");
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const nextPath = sanitizeRedirectPath(params.get("next"), "/dashboard");

      try {
        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          if (data.session) {
            await syncServerSessionCookie(data.session);
          }
        } else {
          const { data, error } = await supabase.auth.getSession();
          if (error) throw error;
          if (data.session) {
            await syncServerSessionCookie(data.session);
          }
        }

        setStatus("success");
        setTimeout(() => {
          router.replace(nextPath);
        }, 700);
      } catch (err) {
        setStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Email verification link expired or could not be validated. Please sign in directly."
        );
      }
    }

    void processCallback();
  }, [router]);

  return (
    <div className="container">
      <PublicHeader />

      <div style={{ maxWidth: 500, margin: "56px auto" }}>
        <div className="card" style={{ textAlign: "center" }}>
          {status === "verifying" && (
            <>
              <Loader2 size={28} style={{ color: "var(--cyan)", marginBottom: 12 }} />
              <h2>Verifying Your Authentication Session…</h2>
              <p className="small">Confirming your account and activating your GrowthOS Student Dashboard.</p>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 size={28} style={{ color: "var(--green)", marginBottom: 12 }} />
              <h2>Authentication Confirmed</h2>
              <p className="small">Redirecting you to your Student Dashboard…</p>
            </>
          )}

          {status === "error" && (
            <>
              <ShieldAlert size={28} style={{ color: "var(--danger)", marginBottom: 12 }} />
              <h2>Verification Issue</h2>
              <p className="small">{errorMessage}</p>
              <div className="inline-actions" style={{ justifyContent: "center", marginTop: 16 }}>
                <Link href="/login" className="btn cyan">
                  Go to Sign In
                </Link>
                <Link href="/register" className="btn secondary">
                  Register
                </Link>
              </div>
            </>
          )}
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}

