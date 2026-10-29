"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Flag, RefreshCw, Share2, ShieldAlert, XCircle } from "lucide-react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/UiStates";
import { authenticatedFetch } from "@/lib/supabase";

interface EnrichedAttribution {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referral_code_used: string;
  status: "pending" | "qualified" | "flagged" | "rejected";
  qualified_at: string | null;
  suspicious_flag: boolean;
  suspicious_reason: string | null;
  review_action: string | null;
  review_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  referrer: { full_name: string; email: string; college: string | null; referral_code: string } | null;
  referred_student: { full_name: string; email: string; college: string | null } | null;
}

interface ReferrerSummary {
  referrer_id: string;
  full_name: string;
  email: string;
  college: string | null;
  referral_code: string;
  qualified_count: number;
  pending_count: number;
  flagged_count: number;
  rejected_count: number;
}

export default function AdminReferralsPage() {
  const [attributions, setAttributions] = useState<EnrichedAttribution[]>([]);
  const [referrers, setReferrers] = useState<ReferrerSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviewTarget, setReviewTarget] = useState<EnrichedAttribution | null>(null);
  const [reviewAction, setReviewAction] = useState<"approve" | "flag" | "reject">("approve");
  const [reviewReason, setReviewReason] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadReferrals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : "";
      const res = await authenticatedFetch(`/api/admin/referrals${qs}`);
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to load referral records.");
      }
      setAttributions(payload.attributions ?? []);
      setReferrers(payload.referrers ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load referrals.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadReferrals();
  }, [loadReferrals]);

  async function handleReviewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewTarget || submittingReview) return;
    setSubmittingReview(true);
    setFeedback(null);

    try {
      const res = await authenticatedFetch("/api/admin/referrals", {
        method: "PATCH",
        body: JSON.stringify({
          attribution_id: reviewTarget.id,
          action: reviewAction,
          reason: reviewReason
        })
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Referral review update failed.");
      }

      setFeedback({
        type: "success",
        text: `Referral decision (${reviewAction}) saved and recorded in the immutable audit log.`
      });
      setReviewTarget(null);
      setReviewReason("");
      await loadReferrals();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save review."
      });
    } finally {
      setSubmittingReview(false);
    }
  }

  return (
    <div>
      <header className="shell-header">
        <div>
          <h1>
            <Share2 size={22} style={{ display: "inline", marginRight: 8, color: "var(--cyan)" }} />
            Referral Attribution & Abuse Review
          </h1>
          <span className="small">
            Every manual referral review requires a written reason and creates an immutable audit record.
          </span>
        </div>
        <div className="inline-actions">
          <select
            className="input"
            style={{ width: 190 }}
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="qualified">Qualified</option>
            <option value="pending">Pending</option>
            <option value="flagged">Flagged / Suspicious</option>
            <option value="rejected">Rejected</option>
          </select>
          <button type="button" className="btn sm secondary" onClick={() => void loadReferrals()}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </header>

      {feedback && (
        <div className={`message ${feedback.type}`}>
          {feedback.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
          <div>{feedback.text}</div>
        </div>
      )}

      {/* Manual Review Modal / Drawer */}
      {reviewTarget && (
        <form
          onSubmit={handleReviewSubmit}
          className="card"
          style={{ marginBottom: 20, borderColor: "var(--amber)" }}
        >
          <div className="dash-head">
            <h3>
              <ShieldAlert size={17} style={{ display: "inline", marginRight: 6, color: "var(--amber)" }} />
              Audited Referral Review Decision
            </h3>
            <button type="button" className="btn sm ghost" onClick={() => setReviewTarget(null)}>
              Cancel
            </button>
          </div>
          <p className="small">
            Reviewing referral from <strong>{reviewTarget.referrer?.full_name || reviewTarget.referrer_id}</strong> (
            <code>{reviewTarget.referral_code_used}</code>) →{" "}
            <strong>{reviewTarget.referred_student?.email || reviewTarget.referred_user_id}</strong>.
          </p>

          <div className="two">
            <label className="field">
              <span>Action *</span>
              <select
                value={reviewAction}
                onChange={e => setReviewAction(e.target.value as "approve" | "flag" | "reject")}
              >
                <option value="approve">Approve (Mark Qualified & Evaluate Rewards)</option>
                <option value="flag">Flag as Suspicious (Hold Rewards)</option>
                <option value="reject">Reject Referral (Do Not Count)</option>
              </select>
            </label>

            <label className="field">
              <span>Mandatory Audit Reason (5–500 chars) *</span>
              <input
                required
                minLength={5}
                value={reviewReason}
                onChange={e => setReviewReason(e.target.value)}
                placeholder="e.g., Verified distinct student campus email / Duplicate test signup"
              />
            </label>
          </div>

          <button type="submit" className="btn cyan sm" disabled={submittingReview}>
            {submittingReview ? "Recording Audit Decision…" : "Confirm & Record Audit Log"}
          </button>
        </form>
      )}

      {loading ? (
        <LoadingSkeleton lines={5} height={110} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadReferrals()} />
      ) : (
        <>
          {/* Referrer Summary Table */}
          <section className="card" style={{ marginBottom: 18 }}>
            <h3>Top Student Referrers Summary</h3>
            {referrers.length === 0 ? (
              <div style={{ marginTop: 12 }}>
                <EmptyState
                  title="No Referrer Activity Recorded Yet"
                  description="When students invite peers using their ?ref=GROW-XXXXXX links, referrer totals will appear here."
                />
              </div>
            ) : (
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Referrer</th>
                      <th>Email</th>
                      <th>Code</th>
                      <th>Qualified</th>
                      <th>Pending</th>
                      <th>Flagged</th>
                      <th>Rejected</th>
                      <th>Reward Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {referrers.map(r => (
                      <tr key={r.referrer_id}>
                        <td>
                          <strong>{r.full_name}</strong>
                          <div className="small">{r.college || "—"}</div>
                        </td>
                        <td>{r.email}</td>
                        <td>
                          <span className="badge">{r.referral_code}</span>
                        </td>
                        <td>
                          <strong style={{ color: "var(--green)" }}>{r.qualified_count}</strong>
                        </td>
                        <td>{r.pending_count}</td>
                        <td style={{ color: r.flagged_count > 0 ? "var(--danger)" : undefined }}>
                          {r.flagged_count}
                        </td>
                        <td>{r.rejected_count}</td>
                        <td>
                          <span className="badge unlocked">
                            {r.qualified_count >= 5
                              ? "Tier 5 Bundle"
                              : r.qualified_count >= 3
                                ? "Tier 3 Templates"
                                : r.qualified_count >= 1
                                  ? "Tier 1 Prompt Pack"
                                  : "Starter Kit"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Individual Attribution Events Table */}
          <section className="card">
            <h3>Individual Referral Attribution Events ({attributions.length})</h3>
            {attributions.length === 0 ? (
              <div style={{ marginTop: 12 }}>
                <EmptyState
                  title="No Referral Attribution Events"
                  description="Individual referral attribution records will populate here as referred students register."
                />
              </div>
            ) : (
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Referrer</th>
                      <th>Referred Student</th>
                      <th>Code Used</th>
                      <th>Status</th>
                      <th>Qualified At</th>
                      <th>Suspicious Indicator</th>
                      <th>Audit Review</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attributions.map(attr => (
                      <tr key={attr.id}>
                        <td>
                          <strong>{attr.referrer?.full_name || "Unknown"}</strong>
                          <div className="small">{attr.referrer?.email}</div>
                        </td>
                        <td>
                          <strong>{attr.referred_student?.full_name || "Unknown"}</strong>
                          <div className="small">{attr.referred_student?.email}</div>
                        </td>
                        <td>
                          <span className="badge">{attr.referral_code_used}</span>
                        </td>
                        <td>
                          <span
                            className={`pill ${
                              attr.status === "qualified"
                                ? "green"
                                : attr.status === "pending"
                                  ? "amber"
                                  : "danger"
                            }`}
                          >
                            {attr.status}
                          </span>
                        </td>
                        <td>
                          {attr.qualified_at ? new Date(attr.qualified_at).toLocaleString() : "—"}
                        </td>
                        <td>
                          {attr.suspicious_flag ? (
                            <span className="pill danger" title={attr.suspicious_reason || ""}>
                              <Flag size={11} /> {attr.suspicious_reason || "Flagged"}
                            </span>
                          ) : (
                            <span className="small">Clean</span>
                          )}
                          {attr.review_reason && (
                            <div className="small" style={{ marginTop: 3 }}>
                              Audit note: {attr.review_reason}
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="inline-actions">
                            <button
                              type="button"
                              className="btn sm secondary"
                              onClick={() => {
                                setReviewTarget(attr);
                                setReviewAction("approve");
                              }}
                            >
                              Review
                            </button>
                            <button
                              type="button"
                              className="btn sm danger"
                              onClick={() => {
                                setReviewTarget(attr);
                                setReviewAction("reject");
                              }}
                            >
                              <XCircle size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

