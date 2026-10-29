"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Megaphone, Save } from "lucide-react";
import { ErrorState, LoadingSkeleton } from "@/components/UiStates";
import { authenticatedFetch } from "@/lib/supabase";
import type { Campaign } from "@/lib/types";

export default function AdminCampaignsPage() {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [registrationGoal, setRegistrationGoal] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [budgetCapInr, setBudgetCapInr] = useState(0);
  const [actualSpendInr, setActualSpendInr] = useState(0);
  const [utmCampaign, setUtmCampaign] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [clubsTarget, setClubsTarget] = useState(0);
  const [waTarget, setWaTarget] = useState(0);
  const [socialTarget, setSocialTarget] = useState(0);
  const [refTarget, setRefTarget] = useState(0);

  const loadCampaign = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/admin/campaigns");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to load campaign configuration.");
      const c: Campaign | undefined = payload.campaigns?.[0];
      if (c) {
        setCampaign(c);
        setName(c.name);
        setDescription(c.description || "");
        setRegistrationGoal(c.registration_goal);
        setStartDate(c.start_date);
        setEndDate(c.end_date);
        setBudgetCapInr(Number(c.budget_cap_inr));
        setActualSpendInr(Number(c.actual_spend_inr));
        setUtmCampaign(c.utm_campaign);
        setIsActive(c.is_active);
        setClubsTarget(c.channel_targets?.college_clubs ?? 0);
        setWaTarget(c.channel_targets?.whatsapp_communities ?? 0);
        setSocialTarget(c.channel_targets?.social_posts ?? 0);
        setRefTarget(c.channel_targets?.referral_conversions ?? 0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load campaign settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaign();
  }, [loadCampaign]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await authenticatedFetch("/api/admin/campaigns", {
        method: "PUT",
        body: JSON.stringify({
          id: campaign?.id,
          slug: campaign?.slug || "ai-project-60m-sprint",
          name,
          description,
          registration_goal: Number(registrationGoal),
          start_date: startDate,
          end_date: endDate,
          budget_cap_inr: Number(budgetCapInr),
          actual_spend_inr: Number(actualSpendInr),
          utm_campaign: utmCampaign,
          is_active: isActive,
          channel_targets: {
            college_clubs: Number(clubsTarget),
            whatsapp_communities: Number(waTarget),
            social_posts: Number(socialTarget),
            referral_conversions: Number(refTarget)
          }
        })
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to update campaign configuration.");
      }

      setCampaign(payload.campaign as Campaign);
      setFeedback({
        type: "success",
        text: "Campaign configuration saved to PostgreSQL and recorded in the audit log."
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save campaign settings."
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSkeleton lines={5} height={110} />;
  if (error) return <ErrorState message={error} onRetry={() => void loadCampaign()} />;

  return (
    <div>
      <header className="shell-header">
        <div>
          <h1>
            <Megaphone size={22} style={{ display: "inline", marginRight: 8, color: "var(--cyan)" }} />
            Campaign Plan & Budget Configuration
          </h1>
          <span className="small">
            {campaign
              ? "Loaded directly from public.campaigns in PostgreSQL."
              : "No campaign record in database yet. Fill out the form below to create one."}
          </span>
        </div>
      </header>

      {feedback && (
        <div className={`message ${feedback.type}`}>
          {feedback.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <div>{feedback.text}</div>
        </div>
      )}

      <form onSubmit={handleSave} className="dash-grid">
        <section className="card">
          <h3>Core Campaign Parameters</h3>

          <label className="field">
            <span>Campaign Name *</span>
            <input
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter campaign name"
            />
          </label>

          <label className="field">
            <span>Campaign Description</span>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Enter campaign objective and description"
            />
          </label>

          <div className="two">
            <label className="field">
              <span>Registration Goal (Target Students) *</span>
              <input
                type="number"
                min={1}
                required
                value={registrationGoal || ""}
                onChange={e => setRegistrationGoal(Number(e.target.value))}
                placeholder="e.g., 500"
              />
            </label>

            <label className="field">
              <span>UTM Campaign Identifier *</span>
              <input
                required
                value={utmCampaign}
                onChange={e => setUtmCampaign(e.target.value)}
                placeholder="e.g., ai_project_60m"
              />
            </label>
          </div>

          <div className="two">
            <label className="field">
              <span>Start Date *</span>
              <input type="date" required value={startDate} onChange={e => setStartDate(e.target.value)} />
            </label>
            <label className="field">
              <span>End Date *</span>
              <input type="date" required value={endDate} onChange={e => setEndDate(e.target.value)} />
            </label>
          </div>

          <div className="two">
            <label className="field">
              <span>Budget Cap (₹ INR) *</span>
              <input
                type="number"
                min={0}
                step="1"
                required
                value={budgetCapInr}
                onChange={e => setBudgetCapInr(Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span>Actual Recorded Spend (₹ INR) *</span>
              <input
                type="number"
                min={0}
                step="0.01"
                required
                value={actualSpendInr}
                onChange={e => setActualSpendInr(Number(e.target.value))}
              />
            </label>
          </div>

          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, margin: "12px 0" }}>
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            Campaign Active
          </label>

          <button type="submit" className="btn cyan full" disabled={saving}>
            <Save size={15} /> {saving ? "Saving Campaign Settings…" : "Save Campaign Configuration"}
          </button>
        </section>

        <section className="card">
          <h3>Channel Mix Targets (Stored in PostgreSQL)</h3>
          <p className="small">
            Configure your target registration hypotheses per channel:
          </p>

          <div className="two">
            <label className="field">
              <span>College Clubs & Ambassadors Target</span>
              <input
                type="number"
                min={0}
                value={clubsTarget}
                onChange={e => setClubsTarget(Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span>WhatsApp & Student Communities Target</span>
              <input
                type="number"
                min={0}
                value={waTarget}
                onChange={e => setWaTarget(Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span>Instagram & LinkedIn Target</span>
              <input
                type="number"
                min={0}
                value={socialTarget}
                onChange={e => setSocialTarget(Number(e.target.value))}
              />
            </label>
            <label className="field">
              <span>Referral Conversions Target</span>
              <input
                type="number"
                min={0}
                value={refTarget}
                onChange={e => setRefTarget(Number(e.target.value))}
              />
            </label>
          </div>
        </section>
      </form>
    </div>
  );
}
