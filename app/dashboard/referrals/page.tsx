"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Award,
  CheckCircle2,
  Clock,
  Copy,
  Gift,
  Lock,
  MessageCircle,
  Share2,
  ShieldCheck,
  Unlock
} from "lucide-react";
import { useStudentDashboard } from "@/components/StudentDashboardContext";
import { EmptyState } from "@/components/UiStates";
import { buildReferralUrl } from "@/lib/referral-engine";

export default function StudentReferralsPage() {
  const { data } = useStudentDashboard();
  const profile = data?.profile;
  const qualifiedCount = data?.referrals.qualified_count ?? 0;
  const pendingCount = data?.referrals.pending_count ?? 0;
  const history = data?.referrals.history ?? [];
  const rewardRules = data?.reward_rules ?? [];

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [templateIdx, setTemplateIdx] = useState(0);

  const referralUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    return buildReferralUrl(profile?.referral_code || "GROW-000000", origin, "/register");
  }, [profile?.referral_code]);

  const shareTemplates = useMemo(() => {
    const firstName = profile?.full_name?.split(" ")[0] || "Hey";
    return [
      {
        label: "Class Group Invite",
        text: `Hey everyone! I registered for the hands-on workshop "Build Your First AI Project in 60 Minutes". It's free for engineering students and includes an AI Project Starter Kit on signup.\n\nRegister with my referral link here:\n${referralUrl}`
      },
      {
        label: "1-on-1 Study Partner DM",
        text: `Hey! Want to build a 60-minute AI project together for our portfolio? Use my invite link to register for free so we unlock the Prompt Pack and Guided Project Templates:\n${referralUrl}`
      },
      {
        label: "Coding Club Broadcast",
        text: `[Workshop Invite: Build Your First AI Project in 60 Minutes]\nLearn how to scope and build a working AI application with structured JSON outputs. Free registration + Starter Kit:\n${referralUrl}\n— ${firstName} (Code: ${profile?.referral_code || "GROW"})`
      }
    ];
  }, [profile?.full_name, profile?.referral_code, referralUrl]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
      fetch("/api/attribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "referral_shared",
          referral_code: profile?.referral_code ?? null
        })
      }).catch(() => null);
    } catch {
      // ignore
    }
  }

  async function copyTemplateText() {
    try {
      await navigator.clipboard.writeText(shareTemplates[templateIdx].text);
      setCopiedMsg(true);
      setTimeout(() => setCopiedMsg(false), 1800);
    } catch {
      // ignore
    }
  }

  return (
    <div>
      {/* Referral Summary KPIs */}
      <div className="kpis">
        <div className="kpi">
          <strong style={{ color: "var(--cyan)" }}>{profile?.referral_code || "—"}</strong>
          <span>Your Unique Referral Code</span>
        </div>
        <div className="kpi">
          <strong style={{ color: "var(--green)" }}>{qualifiedCount}</strong>
          <span>Qualified Referrals (Verified Accounts)</span>
        </div>
        <div className="kpi">
          <strong style={{ color: "var(--amber)" }}>{pendingCount}</strong>
          <span>Pending Referrals (Awaiting Email Confirmation)</span>
        </div>
        <div className="kpi">
          <strong>
            {rewardRules.filter(r => qualifiedCount >= r.required_referrals).length} / {rewardRules.length}
          </strong>
          <span>Reward Milestones Unlocked</span>
        </div>
      </div>

      <div className="dash-grid" style={{ marginTop: 20 }}>
        {/* Left: Share Link & Peer Message Templates */}
        <section className="card">
          <div className="dash-head">
            <h2>
              <Share2 size={18} style={{ display: "inline", marginRight: 7, color: "var(--cyan)" }} />
              Share Your Personal Referral Link
            </h2>
            <span className="badge unlocked">Server-Tracked</span>
          </div>
          <p className="small">
            When a classmate visits your link, your referral code is preserved through registration and email
            confirmation.
          </p>

          <div className="referral-link" style={{ marginTop: 12 }}>
            <input className="input" readOnly value={referralUrl} aria-label="Referral link" />
            <button type="button" className="btn cyan" onClick={copyLink}>
              <Copy size={15} /> {copiedLink ? "Copied Link!" : "Copy Link"}
            </button>
          </div>

          <div className="wa-box">
            <div className="dash-head">
              <strong style={{ fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
                <MessageCircle size={15} style={{ color: "var(--whatsapp)" }} /> Pre-Filled WhatsApp & Peer Messages
              </strong>
              <span className="badge">1-Click Share</span>
            </div>

            <div className="inline-actions" style={{ marginTop: 10 }}>
              {shareTemplates.map((tpl, idx) => (
                <button
                  key={tpl.label}
                  type="button"
                  className={`btn sm ${templateIdx === idx ? "cyan" : "secondary"}`}
                  onClick={() => setTemplateIdx(idx)}
                >
                  {tpl.label}
                </button>
              ))}
            </div>

            <div className="wa-preview">{shareTemplates[templateIdx].text}</div>

            <div className="two">
              <a
                className="btn whatsapp"
                href={`https://wa.me/?text=${encodeURIComponent(shareTemplates[templateIdx].text)}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageCircle size={15} /> Open in WhatsApp
              </a>
              <button type="button" className="btn secondary" onClick={copyTemplateText}>
                <Copy size={14} /> {copiedMsg ? "Copied Message!" : "Copy Message Text"}
              </button>
            </div>
          </div>

          <div className="notice">
            <strong>Qualification Policy:</strong> A referral counts as <strong>Qualified</strong> when a new, distinct
            student registers using your code and confirms their email address. Self-referrals and duplicate accounts
            are automatically excluded.
          </div>
        </section>

        {/* Right: Milestone Unlocks */}
        <section className="card">
          <div className="dash-head">
            <h2>
              <Award size={18} style={{ display: "inline", marginRight: 7, color: "var(--cyan)" }} />
              Reward Milestones
            </h2>
            <Link href="/dashboard/resources" className="btn sm secondary">
              Open Resources
            </Link>
          </div>
          <p className="small">
            Your reward eligibility is evaluated automatically on the backend whenever a referral qualifies:
          </p>

          <div className="progress" style={{ margin: "14px 0" }}>
            <div style={{ width: `${Math.min(100, (qualifiedCount / 5) * 100)}%` }} />
          </div>

          {rewardRules.map(rule => {
            const unlocked = qualifiedCount >= rule.required_referrals;
            const remaining = Math.max(0, rule.required_referrals - qualifiedCount);
            return (
              <div
                key={rule.id}
                className={`resource ${unlocked ? "unlocked-card" : "locked"}`}
              >
                <div>
                  <strong style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14 }}>
                    {unlocked ? (
                      <Unlock size={15} style={{ color: "var(--green)" }} />
                    ) : (
                      <Lock size={15} style={{ color: "var(--muted)" }} />
                    )}
                    {rule.milestone_name}
                  </strong>
                  <p className="small" style={{ margin: "4px 0 0" }}>
                    {rule.description}
                  </p>
                </div>
                <span className={`badge ${unlocked ? "unlocked" : ""}`}>
                  {unlocked
                    ? "Unlocked"
                    : `${remaining} more (${rule.required_referrals} req)`}
                </span>
              </div>
            );
          })}
        </section>
      </div>

      {/* Privacy-Safe Referral History */}
      <section className="card" style={{ marginTop: 20 }}>
        <div className="dash-head">
          <div>
            <h3>
              <Gift size={17} style={{ display: "inline", marginRight: 6, color: "var(--cyan)" }} />
              Personal Referral History (Privacy-Safe)
            </h3>
            <p className="small" style={{ margin: "4px 0 0" }}>
              To protect student privacy, email addresses of referred classmates are never exposed.
            </p>
          </div>
          <span className="pill green">
            <ShieldCheck size={12} /> Privacy Masked
          </span>
        </div>

        {history.length === 0 ? (
          <div style={{ marginTop: 14 }}>
            <EmptyState
              title="No Referrals Recorded Yet"
              description="Share your personal referral link above with classmates. When they register using your link, their anonymized status will appear here."
            />
          </div>
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Referred Classmate (Masked)</th>
                  <th>Campus / College</th>
                  <th>Qualification Status</th>
                  <th>Registered Date</th>
                  <th>Qualified Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map(item => (
                  <tr key={item.attribution_id}>
                    <td>
                      <strong>{item.referred_display_name}</strong>
                    </td>
                    <td>{item.referred_college}</td>
                    <td>
                      {item.status === "qualified" ? (
                        <span className="pill green">
                          <CheckCircle2 size={12} /> Qualified
                        </span>
                      ) : item.status === "pending" ? (
                        <span className="pill amber">
                          <Clock size={12} /> Pending Email Confirmation
                        </span>
                      ) : (
                        <span className="pill danger">{item.status}</span>
                      )}
                    </td>
                    <td>{new Date(item.created_at).toLocaleDateString()}</td>
                    <td>{item.qualified_at ? new Date(item.qualified_at).toLocaleDateString() : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

