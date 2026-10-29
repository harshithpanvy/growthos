"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Clock,
  Code2,
  Cpu,
  Gift,
  GraduationCap,
  HelpCircle,
  Layers,
  Lock,
  Share2,
  ShieldCheck,
  Sparkles,
  Terminal,
  Unlock,
  Users
} from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/Navigation";
import { EmptyState, LoadingSkeleton } from "@/components/UiStates";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { RewardRule, Workshop } from "@/lib/types";

const FAQ_ITEMS = [
  {
    q: "Do I need prior AI or Machine Learning experience to attend?",
    a: "No. This workshop is designed for final-year engineering students who know basic programming (JavaScript/TypeScript or Python) and want to build their first structured AI application from scratch."
  },
  {
    q: "Is the workshop or starter resource kit gated behind referrals?",
    a: "Never. Workshop registration and the Starter Kit (0 referrals) are 100% free and accessible immediately after registration. Referrals unlock optional bonus resources."
  },
  {
    q: "Do I need a paid API key or credit card during the 60-minute build?",
    a: "No. The Starter Kit documents how to use free-tier developer APIs and how to structure server-side environment variables safely without exposing secrets in the browser."
  },
  {
    q: "How does referral attribution work when I invite classmates?",
    a: "Every registered student receives a unique referral link. When a classmate registers a distinct account through your link and verifies their email, your qualified referral count updates automatically on the server."
  },
  {
    q: "Can other students see my email address if I register using their referral link?",
    a: "No. GrowthOS enforces strict Row Level Security (RLS) and privacy masking. Referrers only see a masked display name, college, and qualification status—never your email address."
  }
];

export default function LandingPage() {
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [rewardRules, setRewardRules] = useState<RewardRule[]>([]);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [capturedRef, setCapturedRef] = useState<string | null>(null);
  const [registerHref, setRegisterHref] = useState("/register");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref")?.trim().toUpperCase() || null;
    const utmSource = params.get("utm_source")?.trim() || null;
    const utmMedium = params.get("utm_medium")?.trim() || null;
    const utmCampaign = params.get("utm_campaign")?.trim() || null;

    if (ref) {
      setCapturedRef(ref);
      window.localStorage.setItem("growthos_captured_ref", ref);
    } else {
      const savedRef = window.localStorage.getItem("growthos_captured_ref");
      if (savedRef) setCapturedRef(savedRef);
    }

    if (utmSource || utmMedium || utmCampaign) {
      window.localStorage.setItem(
        "growthos_captured_utm",
        JSON.stringify({
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          landing_page: window.location.pathname,
          captured_at: new Date().toISOString()
        })
      );
    }

    const queryStr = params.toString();
    if (queryStr) {
      setRegisterHref(`/register?${queryStr}`);
    } else if (ref) {
      setRegisterHref(`/register?ref=${encodeURIComponent(ref)}`);
    }

    const sessionLogged = window.sessionStorage.getItem("growthos_landing_logged");
    if (!sessionLogged) {
      window.sessionStorage.setItem("growthos_landing_logged", "1");
      fetch("/api/attribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "landing_view",
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          landing_page: window.location.pathname,
          referral_code: ref
        })
      }).catch(() => null);
    }

    async function loadDatabaseConfig() {
      if (!isSupabaseConfigured || !supabase) {
        setLoadingConfig(false);
        return;
      }

      const [wsRes, rulesRes] = await Promise.all([
        supabase.from("workshops").select("*").eq("is_published", true).limit(1).maybeSingle(),
        supabase
          .from("reward_rules")
          .select("*")
          .eq("is_active", true)
          .order("required_referrals", { ascending: true })
      ]);

      if (wsRes.data) setWorkshop(wsRes.data as Workshop);
      if (Array.isArray(rulesRes.data)) setRewardRules(rulesRes.data as RewardRule[]);
      setLoadingConfig(false);
    }

    void loadDatabaseConfig();
  }, []);

  return (
    <div className="container">
      <PublicHeader />

      {capturedRef && (
        <div className="message info" style={{ marginTop: 18 }}>
          <Gift size={18} style={{ color: "var(--cyan)", flexShrink: 0 }} />
          <div>
            <strong>Campus Referral Invite Active ({capturedRef}):</strong> Your registration will automatically preserve
            this referral code through signup and email verification.
          </div>
        </div>
      )}

      {/* 1. HERO SECTION */}
      <section className="hero">
        <div>
          <span className="eyebrow">
            <Sparkles size={13} /> HANDS-ON TECHNICAL BUILD WORKSHOP FOR ENGINEERING STUDENTS
          </span>
          <h1>
            60 Minutes. One AI Project.{" "}
            <span className="accent">Your First Step.</span>
          </h1>
          <p className="lead">
            Learn by building a working, beginner-friendly AI project in{" "}
            <strong>{workshop?.title || "Build Your First AI Project in 60 Minutes"}</strong>. Scope a focused problem,
            wire a server-side AI endpoint with structured JSON outputs, and package your project for your technical
            portfolio.
          </p>

          <div className="inline-actions" style={{ marginTop: 24, gap: 12 }}>
            <Link href={registerHref} className="btn cyan">
              Register for Free <ArrowRight size={16} />
            </Link>
            <Link href="/workshop" className="btn secondary">
              Explore the Workshop
            </Link>
          </div>

          <div className="stats">
            <div className="stat">
              <strong>{workshop ? `${workshop.duration_minutes} Mins` : "60 Mins"}</strong>
              <span>Guided end-to-end build workflow</span>
            </div>
            <div className="stat">
              <strong>Starter Kit</strong>
              <span>Unlocked immediately upon registration</span>
            </div>
            <div className="stat">
              <strong>Portfolio Ready</strong>
              <span>Structured JSON schema & guardrails</span>
            </div>
          </div>
        </div>

        {/* Right Hero Highlight Card (Database-Backed) */}
        <aside className="card" aria-label="Workshop summary card">
          {loadingConfig ? (
            <LoadingSkeleton lines={3} height={70} />
          ) : workshop ? (
            <>
              <div className="dash-head">
                <span className="pill green">
                  <CheckCircle2 size={13} /> FREE STUDENT REGISTRATION
                </span>
                <span className="badge">{workshop.timezone}</span>
              </div>
              <h2 style={{ marginTop: 14 }}>{workshop.title}</h2>
              <p className="small">{workshop.description}</p>

              <div className="notice" style={{ marginTop: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text)", fontWeight: 600 }}>
                  <Clock size={15} style={{ color: "var(--cyan)" }} />
                  Schedule Status:{" "}
                  {workshop.scheduled_at
                    ? new Date(workshop.scheduled_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short"
                      })
                    : "Schedule to be announced in Student Dashboard"}
                </div>
              </div>
            </>
          ) : (
            <div>
              <span className="pill">WORKSHOP DETAILS</span>
              <h2 style={{ marginTop: 12 }}>Build Your First AI Project in 60 Minutes</h2>
              <p className="small">
                Workshop details have not been published in the database yet. Administrators can configure the workshop
                schedule, description, and agenda in <code>/admin/workshop</code>.
              </p>
            </div>
          )}

          <div style={{ marginTop: 16 }}>
            <div className="resource unlocked-card" style={{ margin: "8px 0" }}>
              <div>
                <strong style={{ fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                  <Unlock size={14} style={{ color: "var(--green)" }} /> Starter Resource Access
                </strong>
                <p style={{ margin: "3px 0 0", fontSize: 12 }} className="muted">
                  Unlocked immediately upon registration (0 referrals required).
                </p>
              </div>
              <span className="badge unlocked">0 Referrals</span>
            </div>
            <div className="resource unlocked-card" style={{ margin: "8px 0" }}>
              <div>
                <strong style={{ fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                  <Share2 size={14} style={{ color: "var(--cyan)" }} /> Personal Referral Link & Milestone Tracker
                </strong>
                <p style={{ margin: "3px 0 0", fontSize: 12 }} className="muted">
                  Invite study partners to unlock bonus milestone resources.
                </p>
              </div>
              <span className="badge">Database-Backed</span>
            </div>
          </div>

          <Link href={registerHref} className="btn full cyan" style={{ marginTop: 14 }}>
            Register for Free <ArrowRight size={15} />
          </Link>
        </aside>
      </section>

      {/* 2. CLEAR BENEFITS & WHAT STUDENTS WILL BUILD */}
      <section style={{ marginTop: 42 }}>
        <div className="dash-head" style={{ marginBottom: 16 }}>
          <div>
            <span className="pill">
              <Code2 size={13} /> PRACTICAL ENGINEERING OUTCOMES
            </span>
            <h2 style={{ margin: "8px 0 0", font: "700 26px 'Space Grotesk', sans-serif" }}>
              What You Will Build & Learn
            </h2>
          </div>
        </div>

        <div className="three">
          <div className="card">
            <Terminal size={22} style={{ color: "var(--cyan)", marginBottom: 10 }} />
            <h3>1. Scoped Problem & Schema</h3>
            <p className="small">
              Define a focused workflow problem and a deterministic JSON response schema rather than an unstructured
              chat wrapper.
            </p>
          </div>
          <div className="card">
            <Cpu size={22} style={{ color: "var(--cyan)", marginBottom: 10 }} />
            <h3>2. Server-Side AI Route & Guardrails</h3>
            <p className="small">
              Keep API keys strictly on the server, validate user inputs before calling an LLM, and handle rate limits
              or malformed outputs gracefully.
            </p>
          </div>
          <div className="card">
            <Layers size={22} style={{ color: "var(--cyan)", marginBottom: 10 }} />
            <h3>3. Deployed Portfolio Submission</h3>
            <p className="small">
              Package your application with a clear technical README and live demo link, then submit it through your
              GrowthOS Student Dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* 3. WORKSHOP AGENDA (STRICTLY FROM DATABASE) & WHO SHOULD ATTEND */}
      <section className="dash-grid" style={{ marginTop: 36 }}>
        <div className="card">
          <div className="dash-head">
            <h3>Workshop Agenda</h3>
            {workshop && <span className="badge">{workshop.duration_minutes} Minutes Total</span>}
          </div>

          {loadingConfig ? (
            <LoadingSkeleton lines={3} height={50} />
          ) : !workshop || !Array.isArray(workshop.agenda) || workshop.agenda.length === 0 ? (
            <div style={{ marginTop: 12 }}>
              <EmptyState
                title="Workshop Agenda Not Configured Yet"
                description="The workshop agenda will appear here once published by an administrator in /admin/workshop."
              />
            </div>
          ) : (
            <div style={{ marginTop: 14 }}>
              {workshop.agenda.map(item => (
                <div
                  key={item.time + item.title}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "12px 0",
                    borderBottom: "1px solid var(--line)"
                  }}
                >
                  <span className="badge" style={{ height: "fit-content", minWidth: 82, textAlign: "center" }}>
                    {item.time}
                  </span>
                  <div>
                    <strong style={{ fontSize: 14, display: "block" }}>{item.title}</strong>
                    <span className="small">{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="dash-head">
            <h3>Who Should Attend & Learning Outcomes</h3>
            <span className="pill">
              <GraduationCap size={13} /> Final-Year Focus
            </span>
          </div>
          <p className="small">This session is tailored for:</p>
          <ul style={{ paddingLeft: 18, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.75 }}>
            <li>
              <strong style={{ color: "var(--text)" }}>Final-year & pre-final-year engineering students</strong>{" "}
              preparing for software and AI/data technical interviews.
            </li>
            <li>
              <strong style={{ color: "var(--text)" }}>Student developers & club leads</strong> who want a structured,
              reproducible framework for shipping AI applications.
            </li>
            <li>
              <strong style={{ color: "var(--text)" }}>Beginners to LLM APIs</strong> who know web fundamentals and want
              to build their first end-to-end AI project.
            </li>
          </ul>

          <div className="notice" style={{ marginTop: 16 }}>
            <strong style={{ color: "var(--text)", display: "block", marginBottom: 4 }}>
              Concrete Learning Outcomes:
            </strong>
            1. Design deterministic system prompts with JSON output validation.
            <br />
            2. Implement secure server-side API handlers in Next.js & TypeScript.
            <br />
            3. Document architectural trade-offs, latency, and error fallbacks.
          </div>
        </div>
      </section>

      {/* 4. RESOURCE & REFERRAL MILESTONE PROGRAM (STRICTLY FROM DATABASE) */}
      <section style={{ marginTop: 38 }}>
        <div className="dash-head" style={{ marginBottom: 14 }}>
          <div>
            <span className="pill green">
              <Award size={13} /> STUDY SQUAD REWARDS
            </span>
            <h2 style={{ margin: "8px 0 0", font: "700 25px 'Space Grotesk', sans-serif" }}>
              Learning Resource Kit & Referral Milestones
            </h2>
            <p className="small" style={{ marginTop: 4 }}>
              Configured reward milestones from the database:
            </p>
          </div>
          <Link href={registerHref} className="btn sm secondary">
            Get My Referral Link <ArrowRight size={14} />
          </Link>
        </div>

        {loadingConfig ? (
          <LoadingSkeleton lines={2} height={90} />
        ) : rewardRules.length === 0 ? (
          <EmptyState
            title="No Reward Milestones Configured in Database Yet"
            description="Run supabase/schema.sql or configure reward rules in /admin/resources to display reward milestones here."
          />
        ) : (
          <div className="four">
            {rewardRules.map(rule => (
              <div
                key={rule.id}
                className="card"
                style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
              >
                <div>
                  <div className="dash-head" style={{ marginBottom: 10 }}>
                    <span className={`badge ${rule.required_referrals === 0 ? "unlocked" : ""}`}>
                      {rule.required_referrals === 0
                        ? "0 Referrals (Instant)"
                        : `${rule.required_referrals} Qualified Referral${rule.required_referrals === 1 ? "" : "s"}`}
                    </span>
                    {rule.required_referrals === 0 ? (
                      <Unlock size={15} style={{ color: "var(--green)" }} />
                    ) : (
                      <Lock size={15} style={{ color: "var(--cyan)" }} />
                    )}
                  </div>
                  <h3>{rule.milestone_name}</h3>
                  <p className="small">{rule.description}</p>
                </div>
                <div style={{ marginTop: 12, fontSize: 11.5, color: "var(--cyan)", fontWeight: 600 }}>
                  {rule.required_referrals === 0
                    ? "✓ Included with registration"
                    : `Unlocks at ${rule.required_referrals} verified referral${
                        rule.required_referrals === 1 ? "" : "s"
                      }`}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 5. FAQ & TRUST / PRIVACY SECTION */}
      <section className="dash-grid" style={{ marginTop: 38 }}>
        <div className="card">
          <div className="dash-head">
            <h3>
              <HelpCircle size={17} style={{ display: "inline", marginRight: 6, color: "var(--cyan)" }} />
              Frequently Asked Questions
            </h3>
          </div>
          <div style={{ marginTop: 10 }}>
            {FAQ_ITEMS.map(item => (
              <div key={item.q} style={{ padding: "12px 0", borderBottom: "1px solid var(--line)" }}>
                <strong style={{ fontSize: 14, display: "block", marginBottom: 4 }}>{item.q}</strong>
                <p className="small" style={{ margin: 0 }}>
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div className="dash-head">
              <h3>
                <ShieldCheck size={17} style={{ display: "inline", marginRight: 6, color: "var(--green)" }} />
                Trust, Security & Privacy Commitments
              </h3>
              <span className="pill green">RLS Protected</span>
            </div>
            <p className="small" style={{ marginTop: 8 }}>
              GrowthOS is architected with strict data minimization and database-level access controls:
            </p>
            <ul style={{ paddingLeft: 18, fontSize: 13, color: "var(--muted)", lineHeight: 1.8 }}>
              <li>
                <strong style={{ color: "var(--text)" }}>Minimal Data Collection:</strong> We collect only your name,
                email, college, graduation year, and campaign attribution needed for workshop coordination.
              </li>
              <li>
                <strong style={{ color: "var(--text)" }}>Row Level Security (RLS):</strong> Students can read and update
                only their own profile. Private email addresses are never exposed to referrers.
              </li>
              <li>
                <strong style={{ color: "var(--text)" }}>Server-Verified Unlocks:</strong> Referral qualification and
                reward unlocks are calculated on the backend—never manipulated in the browser.
              </li>
              <li>
                <strong style={{ color: "var(--text)" }}>No Mandatory Sharing:</strong> Attending the workshop and
                accessing the Starter Kit never requires referring other students.
              </li>
            </ul>
          </div>

          <div className="notice" style={{ marginTop: 18 }}>
            Ready to build your first AI project?
            <div className="inline-actions" style={{ marginTop: 12 }}>
              <Link href={registerHref} className="btn cyan">
                <Users size={15} /> Register for Free
              </Link>
              <Link href="/privacy" className="btn ghost sm">
                Read Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
