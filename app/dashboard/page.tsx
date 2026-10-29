"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  Award,
  BookOpen,
  Calendar,
  CheckCircle2,
  Copy,
  FolderGit2,
  Lock,
  MessageCircle,
  Sparkles,
  Unlock
} from "lucide-react";
import { useStudentDashboard } from "@/components/StudentDashboardContext";
import { buildReferralUrl } from "@/lib/referral-engine";

export default function StudentOverviewPage() {
  const { data } = useStudentDashboard();
  const [copied, setCopied] = useState(false);

  const profile = data?.profile;
  const qualifiedCount = data?.referrals.qualified_count ?? 0;
  const pendingCount = data?.referrals.pending_count ?? 0;
  const resources = data?.resources ?? [];
  const workshop = data?.workshop;
  const submissions = data?.project_submissions ?? [];

  const unlockedResourcesCount = resources.filter(r => r.unlocked).length;

  const referralUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    return buildReferralUrl(profile?.referral_code || "GROW-000000", origin, "/register");
  }, [profile?.referral_code]);

  const whatsappShareHref = useMemo(() => {
    const message = `Hey! I registered for the free hands-on workshop "${workshop?.title || "Build Your First AI Project in 60 Minutes"}". Register using my invite link to get the AI Project Starter Kit:\n${referralUrl}`;
    return `https://wa.me/?text=${encodeURIComponent(message)}`;
  }, [referralUrl, workshop?.title]);

  async function handleCopyReferral() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <div>
      {/* Top KPI Cards */}
      <div className="kpis">
        <div className="kpi">
          <strong style={{ color: "var(--green)" }}>Confirmed</strong>
          <span>Workshop Registration Status</span>
        </div>
        <div className="kpi">
          <strong style={{ color: "var(--cyan)" }}>{qualifiedCount}</strong>
          <span>Qualified Referrals ({pendingCount} Pending)</span>
        </div>
        <div className="kpi">
          <strong>
            {unlockedResourcesCount} / {resources.length}
          </strong>
          <span>Learning Resources Unlocked</span>
        </div>
        <div className="kpi">
          <strong>{submissions.length}</strong>
          <span>Project Submissions</span>
        </div>
      </div>

      <div className="dash-grid" style={{ marginTop: 20 }}>
        {/* Left: Greeting, Profile Summary & Quick Actions */}
        <section className="card">
          <div className="dash-head">
            <span className="pill green">
              <CheckCircle2 size={13} /> REGISTERED STUDENT
            </span>
            <span className="badge">Code: {profile?.referral_code}</span>
          </div>

          <h2 style={{ marginTop: 12 }}>Welcome, {profile?.full_name || "Student"}</h2>
          <p className="small">
            Campus: <strong>{profile?.college || "Not specified"}</strong> • Graduation Batch:{" "}
            <strong>{profile?.graduation_year || "Not specified"}</strong>
          </p>

          <div className="notice" style={{ marginTop: 14 }}>
            <strong style={{ color: "var(--text)", display: "block", marginBottom: 4 }}>
              Workshop Schedule & Access:
            </strong>
            {workshop?.scheduled_at ? (
              <div>
                Scheduled for{" "}
                <strong>
                  {new Date(workshop.scheduled_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short"
                  })}
                </strong>{" "}
                ({workshop.timezone}).
              </div>
            ) : (
              <div>
                The workshop date and live joining link have not been published by the administrator yet. You can start
                preparing immediately using your unlocked AI Project Starter Kit.
              </div>
            )}
          </div>

          <h3 style={{ marginTop: 18 }}>Quick Actions</h3>
          <div className="two" style={{ marginTop: 10 }}>
            <Link href="/dashboard/resources" className="btn cyan">
              <BookOpen size={15} /> Open Starter Kit & Resources
            </Link>
            <Link href="/dashboard/workshop" className="btn secondary">
              <Calendar size={15} /> Workshop & Project Scoper
            </Link>
            <Link href="/dashboard/referrals" className="btn secondary">
              <Award size={15} /> View Referral Milestones
            </Link>
            <Link href="/dashboard/projects" className="btn ghost">
              <FolderGit2 size={15} /> Submit Workshop Project
            </Link>
          </div>
        </section>

        {/* Right: Referral Summary Card */}
        <section className="card">
          <div className="dash-head">
            <h3>Your Personal Referral Link</h3>
            <span className="pill">
              <Sparkles size={12} /> {Math.min(5, qualifiedCount)} / 5 Milestone Progress
            </span>
          </div>
          <p className="small">
            Share your unique referral link with classmates. When a friend registers and confirms their account, your
            qualified referral count updates automatically on the server.
          </p>

          <div className="referral-link" style={{ marginTop: 12 }}>
            <input className="input" readOnly value={referralUrl} aria-label="Personal referral URL" />
            <button type="button" className="btn" onClick={handleCopyReferral}>
              <Copy size={15} /> {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          <div className="two" style={{ marginTop: 10 }}>
            <a
              href={whatsappShareHref}
              target="_blank"
              rel="noopener noreferrer"
              className="btn whatsapp"
            >
              <MessageCircle size={15} /> Share on WhatsApp
            </a>
            <Link href="/dashboard/referrals" className="btn secondary">
              Full Referral Hub <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ marginTop: 18 }}>
            <div className="dash-head">
              <span className="small" style={{ fontWeight: 600, color: "var(--text)" }}>
                Reward Milestone Progress (0 → 1 → 3 → 5 Referrals)
              </span>
              <span className="badge unlocked">{qualifiedCount} Qualified</span>
            </div>
            <div className="progress">
              <div style={{ width: `${Math.min(100, (qualifiedCount / 5) * 100)}%` }} />
            </div>

            {data?.reward_rules.map(rule => {
              const unlocked = qualifiedCount >= rule.required_referrals;
              return (
                <div
                  key={rule.id}
                  className={`resource ${unlocked ? "unlocked-card" : "locked"}`}
                  style={{ padding: "10px 13px", margin: "7px 0" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {unlocked ? (
                      <Unlock size={14} style={{ color: "var(--green)" }} />
                    ) : (
                      <Lock size={14} style={{ color: "var(--muted)" }} />
                    )}
                    <strong style={{ fontSize: 13 }}>{rule.milestone_name}</strong>
                  </div>
                  <span className={`badge ${unlocked ? "unlocked" : ""}`}>
                    {unlocked
                      ? "Unlocked"
                      : `${rule.required_referrals} Referral${rule.required_referrals === 1 ? "" : "s"}`}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

