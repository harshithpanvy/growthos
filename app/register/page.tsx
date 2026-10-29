"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Gift,
  GraduationCap,
  Lock,
  MailCheck
} from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/Navigation";
import { isSupabaseConfigured, supabase, syncServerSessionCookie } from "@/lib/supabase";
import { normalizeEmail, validateRegistrationInput } from "@/lib/validation";

const ACQUISITION_SOURCES = [
  "College club / CR ambassador",
  "WhatsApp peer referral",
  "WhatsApp / student community group",
  "Instagram / LinkedIn post",
  "Direct / Landing Page",
  "Other"
];

export default function RegisterPage() {
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [college, setCollege] = useState("");
  const [graduationYear, setGraduationYear] = useState("2026");
  const [acquisitionSource, setAcquisitionSource] = useState("College club / CR ambassador");
  const [referralCode, setReferralCode] = useState("");

  const [utmContext, setUtmContext] = useState<{
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    landing_page: string | null;
  }>({
    utm_source: null,
    utm_medium: null,
    utm_campaign: null,
    landing_page: "/register"
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationRequiredEmail, setConfirmationRequiredEmail] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get("ref")?.trim().toUpperCase();
    const savedRef = window.localStorage.getItem("growthos_captured_ref");

    if (refParam) {
      setReferralCode(refParam);
      window.localStorage.setItem("growthos_captured_ref", refParam);
      setAcquisitionSource("WhatsApp peer referral");
    } else if (savedRef) {
      setReferralCode(savedRef);
    }

    const utmSource = params.get("utm_source");
    const utmMedium = params.get("utm_medium");
    const utmCampaign = params.get("utm_campaign");

    if (utmSource || utmMedium || utmCampaign) {
      const ctx = {
        utm_source: utmSource?.slice(0, 80) ?? null,
        utm_medium: utmMedium?.slice(0, 80) ?? null,
        utm_campaign: utmCampaign?.slice(0, 80) ?? null,
        landing_page: window.location.pathname
      };
      setUtmContext(ctx);
      if (utmSource?.toLowerCase().includes("whatsapp")) {
        setAcquisitionSource("WhatsApp / student community group");
      } else if (utmSource?.toLowerCase().includes("club")) {
        setAcquisitionSource("College club / CR ambassador");
      } else if (
        utmSource?.toLowerCase().includes("linkedin") ||
        utmSource?.toLowerCase().includes("instagram")
      ) {
        setAcquisitionSource("Instagram / LinkedIn post");
      }
    } else {
      const savedUtm = window.localStorage.getItem("growthos_captured_utm");
      if (savedUtm) {
        try {
          const parsed = JSON.parse(savedUtm);
          setUtmContext({
            utm_source: parsed.utm_source ?? null,
            utm_medium: parsed.utm_medium ?? null,
            utm_campaign: parsed.utm_campaign ?? null,
            landing_page: parsed.landing_page ?? "/register"
          });
        } catch {
          // ignore invalid JSON
        }
      }
    }

    // Record registration_started funnel event once per session
    if (!window.sessionStorage.getItem("growthos_reg_started_logged")) {
      window.sessionStorage.setItem("growthos_reg_started_logged", "1");
      fetch("/api/attribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "registration_started",
          utm_source: utmSource ?? null,
          utm_medium: utmMedium ?? null,
          utm_campaign: utmCampaign ?? null,
          landing_page: "/register",
          referral_code: refParam ?? savedRef ?? null
        })
      }).catch(() => null);
    }
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setErrorMessage(null);
    setConfirmationRequiredEmail(null);

    const validation = validateRegistrationInput({
      full_name: fullName,
      email,
      password,
      college,
      graduation_year: graduationYear,
      acquisition_source: acquisitionSource,
      referral_code: referralCode || null,
      utm_source: utmContext.utm_source,
      utm_medium: utmContext.utm_medium,
      utm_campaign: utmContext.utm_campaign,
      landing_page: utmContext.landing_page
    });

    if (!validation.success) {
      setErrorMessage(validation.error);
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setErrorMessage(
        "Supabase credentials are not configured yet. Copy .env.example to .env.local and add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable live registration."
      );
      return;
    }

    setSubmitting(true);
    try {
      const clean = validation.data;
      const redirectUrl = `${window.location.origin}/auth/callback`;

      const { data, error } = await supabase.auth.signUp({
        email: normalizeEmail(clean.email),
        password: clean.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: clean.full_name,
            college: clean.college,
            graduation_year: clean.graduation_year,
            acquisition_source: clean.acquisition_source,
            referral_code: clean.referral_code,
            utm_source: clean.utm_source,
            utm_medium: clean.utm_medium,
            utm_campaign: clean.utm_campaign,
            landing_page: clean.landing_page
          }
        }
      });

      if (error) {
        throw error;
      }

      if (!data.user) {
        throw new Error("Registration could not be confirmed by the authentication server.");
      }

      // Clear stored referral code after successful account creation
      window.localStorage.removeItem("growthos_captured_ref");

      if (data.session) {
        await syncServerSessionCookie(data.session);
        router.push("/dashboard");
      } else {
        // Email confirmation is enabled on the Supabase project
        setConfirmationRequiredEmail(clean.email);
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to complete registration. Please check your details and try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="container">
      <PublicHeader />

      <div className="dash-grid" style={{ marginTop: 32, alignItems: "start" }}>
        <section className="card">
          <div className="dash-head">
            <span className="pill">
              <GraduationCap size={13} /> STUDENT REGISTRATION
            </span>
            {referralCode && (
              <span className="pill green">
                <Gift size={13} /> Referral Code: {referralCode}
              </span>
            )}
          </div>

          <h1 style={{ font: "700 26px 'Space Grotesk', sans-serif", margin: "14px 0 6px" }}>
            Register for &ldquo;Build Your First AI Project in 60 Minutes&rdquo;
          </h1>
          <p className="small">
            Create your student account to reserve your workshop seat, unlock the AI Project Starter Kit, and generate
            your personal referral link.
          </p>

          {confirmationRequiredEmail ? (
            <div className="message success" style={{ marginTop: 18 }}>
              <MailCheck size={20} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ display: "block", fontSize: 14, marginBottom: 4 }}>
                  Account Created — Please Confirm Your Email
                </strong>
                We sent a confirmation link to <strong>{confirmationRequiredEmail}</strong>. Click the link in your
                inbox to verify your email address and activate your Student Dashboard.
                {referralCode && (
                  <div style={{ marginTop: 6 }}>
                    Your referral attribution (<code>{referralCode}</code>) has been recorded and will qualify as soon
                    as your email is confirmed.
                  </div>
                )}
                <div style={{ marginTop: 12 }}>
                  <Link href="/login" className="btn sm cyan">
                    Proceed to Sign In <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <label className="field">
                <span>Full Name *</span>
                <input
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g., Aarav Reddy"
                  autoComplete="name"
                />
              </label>

              <label className="field">
                <span>College or Personal Email *</span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@college.edu"
                  autoComplete="email"
                />
              </label>

              <label className="field">
                <span>Password (minimum 8 characters) *</span>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
                />
              </label>

              <label className="field">
                <span>Engineering College or University *</span>
                <input
                  required
                  value={college}
                  onChange={e => setCollege(e.target.value)}
                  placeholder="e.g., JNTU Hyderabad / VIT Vellore / SRM"
                  autoComplete="organization"
                />
              </label>

              <div className="two">
                <label className="field">
                  <span>Graduation Year *</span>
                  <select value={graduationYear} onChange={e => setGraduationYear(e.target.value)}>
                    <option value="2026">2026 (Final Year)</option>
                    <option value="2027">2027 (Pre-Final Year)</option>
                    <option value="2025">2025 (Recent Graduate)</option>
                    <option value="2028">2028</option>
                    <option value="2029">2029</option>
                  </select>
                </label>

                <label className="field">
                  <span>How did you hear about this? *</span>
                  <select value={acquisitionSource} onChange={e => setAcquisitionSource(e.target.value)}>
                    {ACQUISITION_SOURCES.map(src => (
                      <option key={src} value={src}>
                        {src}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="field">
                <span>Referral Code (Optional)</span>
                <input
                  value={referralCode}
                  onChange={e => setReferralCode(e.target.value.toUpperCase())}
                  placeholder="e.g., GROW-7F2A9B"
                />
              </label>

              {errorMessage && (
                <div className="message error" role="alert">
                  <AlertCircle size={17} style={{ flexShrink: 0, marginTop: 2 }} />
                  <div>{errorMessage}</div>
                </div>
              )}

              <button type="submit" className="btn full cyan" disabled={submitting} style={{ marginTop: 8 }}>
                {submitting ? (
                  "Creating your account…"
                ) : (
                  <>
                    Complete Free Registration <ArrowRight size={15} />
                  </>
                )}
              </button>
            </form>
          )}

          <p className="small" style={{ textAlign: "center", marginTop: 16 }}>
            Already registered?{" "}
            <Link href="/login" style={{ color: "var(--cyan)", fontWeight: 700 }}>
              Sign in to your account
            </Link>
          </p>
        </section>

        <aside className="card">
          <h3>What Happens After You Register?</h3>
          <div style={{ marginTop: 14 }}>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <CheckCircle2 size={18} style={{ color: "var(--green)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ fontSize: 14, display: "block" }}>1. Starter Kit Unlocked Immediately</strong>
                <span className="small">
                  Access the AI Project Starter Kit (0 referrals required) with environment setup and API safety rules.
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <CheckCircle2 size={18} style={{ color: "var(--cyan)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ fontSize: 14, display: "block" }}>2. Unique Referral Code Generated</strong>
                <span className="small">
                  Receive your personal referral link (<code>GROW-XXXXXX</code>) to invite classmates and study partners.
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <CheckCircle2 size={18} style={{ color: "var(--cyan)", flexShrink: 0, marginTop: 2 }} />
              <div>
                <strong style={{ fontSize: 14, display: "block" }}>3. Unlock Milestone Bonus Packs</strong>
                <span className="small">
                  Unlock the Prompt Pack at 1 referral, Guided Project Templates at 3 referrals, and Advanced Learning
                  Bundle at 5 referrals.
                </span>
              </div>
            </div>
          </div>

          <div className="notice">
            <Lock size={14} style={{ display: "inline", marginRight: 5, color: "var(--cyan)" }} />
            <strong>Privacy Guarantee:</strong> Your email is normalized and protected by Supabase Row Level Security. We
            never share your email with other students.
          </div>
        </aside>
      </div>

      <PublicFooter />
    </div>
  );
}

