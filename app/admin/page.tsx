"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Target,
  TrendingUp
} from "lucide-react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/UiStates";
import { authenticatedFetch } from "@/lib/supabase";
import type { AdminAnalyticsOverview } from "@/lib/types";

export default function AdminOverviewPage() {
  const [overview, setOverview] = useState<AdminAnalyticsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/admin/overview");
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to load admin overview.");
      }
      setOverview(payload as AdminAnalyticsOverview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load overview metrics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  if (loading) {
    return <LoadingSkeleton lines={5} height={140} />;
  }

  if (error || !overview) {
    return <ErrorState message={error || "Overview unavailable"} onRetry={() => void loadOverview()} />;
  }

  const { actuals, campaign } = overview;
  const goalProgressPercent = campaign
    ? Math.min(
        100,
        Math.round((actuals.total_registrations / Math.max(1, campaign.registration_goal)) * 100)
      )
    : 0;

  return (
    <div>
      <header className="shell-header">
        <div>
          <div className="inline-actions" style={{ marginBottom: 6 }}>
            <span className="pill green">LIVE POSTGRESQL ANALYTICS</span>
            {campaign && <span className="badge">Campaign: {campaign.name}</span>}
          </div>
          <h1>Campaign Command & Analytics Overview</h1>
        </div>
        <div className="inline-actions">
          <Link href="/admin/campaigns" className="btn sm secondary">
            Configure Campaign
          </Link>
          <button type="button" className="btn sm cyan" onClick={() => void loadOverview()}>
            <RefreshCw size={13} /> Refresh Actuals
          </button>
        </div>
      </header>

      {/* Primary Actual Metrics from PostgreSQL */}
      <div className="kpis">
        <div className="kpi">
          <div className="dash-head">
            <span className="badge unlocked">ACTUAL</span>
            {campaign && <span className="small">Target: {campaign.registration_goal}</span>}
          </div>
          <strong style={{ color: "var(--cyan)", marginTop: 6 }}>{actuals.total_registrations}</strong>
          <span>Total Unique Registered Students ({actuals.registrations_today} Today)</span>
        </div>

        <div className="kpi">
          <div className="dash-head">
            <span className="badge unlocked">ACTUAL</span>
            <span className="small">Pending: {actuals.pending_referrals}</span>
          </div>
          <strong style={{ color: "var(--green)", marginTop: 6 }}>{actuals.qualified_referrals}</strong>
          <span>
            Qualified Referrals ({actuals.referral_attributed_registrations} Referral-Attributed Signups)
          </span>
        </div>

        <div className="kpi">
          <div className="dash-head">
            <span className="badge unlocked">ACTUAL</span>
            <span className="small">Formula: Ref / Total</span>
          </div>
          <strong style={{ marginTop: 6 }}>
            {actuals.referral_conversion_rate_percent !== null
              ? `${actuals.referral_conversion_rate_percent}%`
              : "N/A (0 Signups)"}
          </strong>
          <span>Referral Share of Total Registrations</span>
        </div>

        <div className="kpi">
          <div className="dash-head">
            <span className="badge unlocked">ACTUAL SPEND</span>
            {campaign && <span className="small">Cap: ₹{campaign.budget_cap_inr}</span>}
          </div>
          <strong style={{ marginTop: 6 }}>
            {campaign ? `₹${Number(campaign.actual_spend_inr).toFixed(0)}` : "Not Configured"}{" "}
            {campaign && (
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--muted)" }}>
                (CPR:{" "}
                {actuals.cost_per_registration_inr !== null
                  ? `₹${actuals.cost_per_registration_inr}`
                  : "N/A"}
                )
              </span>
            )}
          </strong>
          <span>Recorded Spend & Cost Per Registration</span>
        </div>
      </div>

      {/* Secondary Funnel Actuals */}
      <div className="four" style={{ marginTop: 14 }}>
        <div className="card">
          <span className="badge unlocked">ACTUAL</span>
          <h3 style={{ marginTop: 8 }}>{actuals.landing_views} Landing Views</h3>
          <p className="small" style={{ margin: 0 }}>
            Visitor → Registration Rate:{" "}
            <strong>
              {actuals.landing_conversion_rate_percent !== null
                ? `${actuals.landing_conversion_rate_percent}%`
                : "No visitor views recorded yet"}
            </strong>
          </p>
        </div>

        <div className="card">
          <span className="badge unlocked">ACTUAL</span>
          <h3 style={{ marginTop: 8 }}>{actuals.total_reward_unlocks} Reward Unlocks</h3>
          <p className="small" style={{ margin: 0 }}>
            Total starter & milestone unlocks granted by the backend.
          </p>
        </div>

        <div className="card">
          <span className="badge unlocked">ACTUAL</span>
          <h3 style={{ marginTop: 8 }}>
            {actuals.attendance_present_count} / {actuals.attendance_tracked_count} Attended
          </h3>
          <p className="small" style={{ margin: 0 }}>
            Attendance Rate:{" "}
            <strong>
              {actuals.attendance_rate_percent !== null
                ? `${actuals.attendance_rate_percent}%`
                : "Not tracked yet"}
            </strong>
          </p>
        </div>

        <div className="card">
          <span className="badge unlocked">ACTUAL</span>
          <h3 style={{ marginTop: 8 }}>{actuals.project_submissions_count} Projects Submitted</h3>
          <p className="small" style={{ margin: 0 }}>
            Submission Rate:{" "}
            <strong>
              {actuals.project_submission_rate_percent !== null
                ? `${actuals.project_submission_rate_percent}%`
                : "N/A"}
            </strong>
          </p>
        </div>
      </div>

      {actuals.flagged_referrals > 0 && (
        <div className="message error" style={{ marginTop: 16 }}>
          <AlertTriangle size={18} />
          <div>
            <strong>{actuals.flagged_referrals} Suspicious Referral(s) Flagged for Review:</strong> Visit{" "}
            <Link href="/admin/referrals" style={{ textDecoration: "underline", fontWeight: 700 }}>
              Referral Management
            </Link>{" "}
            to inspect and record an audit decision.
          </div>
        </div>
      )}

      {/* Campaign Target Progress Bar (From Database `campaigns` table) */}
      <section className="card" style={{ marginTop: 18 }}>
        {campaign ? (
          <>
            <div className="dash-head">
              <div>
                <h3>
                  <Target size={17} style={{ display: "inline", marginRight: 6, color: "var(--cyan)" }} />
                  Campaign Progress Toward Configured Target ({campaign.start_date} to {campaign.end_date})
                </h3>
                <p className="small" style={{ margin: "4px 0 0" }}>
                  Compares live PostgreSQL registrations ({actuals.total_registrations}) against the configured campaign
                  goal ({campaign.registration_goal}).
                </p>
              </div>
              <span className="pill">
                {actuals.total_registrations} / {campaign.registration_goal} ({goalProgressPercent}%)
              </span>
            </div>
            <div className="progress" style={{ height: 12, marginTop: 12 }}>
              <div style={{ width: `${goalProgressPercent}%` }} />
            </div>
          </>
        ) : (
          <EmptyState
            title="No Campaign Configured in Database Yet"
            description="Create a campaign in /admin/campaigns to track registration targets, dates, and budget."
            actionLabel="Configure Campaign"
            actionHref="/admin/campaigns"
          />
        )}
      </section>

      {/* Registration Trend & Source Breakdown */}
      <div className="dash-grid" style={{ marginTop: 18 }}>
        <section className="card">
          <div className="dash-head">
            <h3>
              <TrendingUp size={17} style={{ display: "inline", marginRight: 6, color: "var(--cyan)" }} />
              Registration Trend Over Time (Actuals)
            </h3>
            <span className="badge unlocked">Database Query</span>
          </div>

          {actuals.registrations_by_day.length === 0 ? (
            <div style={{ marginTop: 14 }}>
              <EmptyState
                title="No Student Registrations Yet"
                description="Daily registration bars will populate automatically as real students complete registration."
              />
            </div>
          ) : (
            <div style={{ marginTop: 14 }}>
              {actuals.registrations_by_day.map(day => {
                const maxCount = Math.max(...actuals.registrations_by_day.map(d => d.count), 1);
                const widthPct = Math.max(6, Math.round((day.count / maxCount) * 100));
                return (
                  <div key={day.date} style={{ marginBottom: 10 }}>
                    <div className="dash-head" style={{ fontSize: 12.5, marginBottom: 4 }}>
                      <span>{day.date}</span>
                      <strong>{day.count} registrations</strong>
                    </div>
                    <div className="progress" style={{ height: 8, margin: 0 }}>
                      <div style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card">
          <div className="dash-head">
            <h3>
              <BarChart3 size={17} style={{ display: "inline", marginRight: 6, color: "var(--cyan)" }} />
              Registrations by Primary Acquisition Source
            </h3>
            <span className="badge unlocked">No Double-Counting</span>
          </div>
          <p className="small">
            Each student has one primary acquisition source. Referral attribution ({actuals.referral_attributed_registrations})
            is tracked separately so channel totals never double-count the same student.
          </p>

          {actuals.registrations_by_source.length === 0 ? (
            <div style={{ marginTop: 14 }}>
              <EmptyState
                title="No Attribution Data Yet"
                description="Source breakdown will appear once students register."
              />
            </div>
          ) : (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Primary Acquisition Source</th>
                    <th>Registrations</th>
                    <th>Share</th>
                  </tr>
                </thead>
                <tbody>
                  {actuals.registrations_by_source.map(item => (
                    <tr key={item.source}>
                      <td>{item.source}</td>
                      <td>
                        <strong>{item.count}</strong>
                      </td>
                      <td>
                        {actuals.total_registrations > 0
                          ? `${Math.round((item.count / actuals.total_registrations) * 100)}%`
                          : "0%"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
