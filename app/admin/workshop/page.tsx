"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertCircle, Calendar, CheckCircle2, Plus, Save, Trash2 } from "lucide-react";
import { ErrorState, LoadingSkeleton } from "@/components/UiStates";
import { authenticatedFetch } from "@/lib/supabase";
import type { Workshop, WorkshopAgendaItem, WorkshopChecklistItem } from "@/lib/types";

export default function AdminWorkshopPage() {
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [timezone, setTimezone] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [joiningUrl, setJoiningUrl] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [submissionsEnabled, setSubmissionsEnabled] = useState(true);

  const [agenda, setAgenda] = useState<WorkshopAgendaItem[]>([]);
  const [checklist, setChecklist] = useState<WorkshopChecklistItem[]>([]);

  const loadWorkshop = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/admin/workshop");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to load workshop configuration.");
      const w: Workshop | null = payload.workshop ?? null;
      if (w) {
        setWorkshop(w);
        setTitle(w.title);
        setSubtitle(w.subtitle);
        setDescription(w.description);
        setScheduledAt(w.scheduled_at ? w.scheduled_at.slice(0, 16) : "");
        setTimezone(w.timezone);
        setDurationMinutes(w.duration_minutes);
        setJoiningUrl(w.joining_url || "");
        setIsPublished(w.is_published);
        setSubmissionsEnabled(w.project_submissions_enabled);
        setAgenda(Array.isArray(w.agenda) ? w.agenda : []);
        setChecklist(Array.isArray(w.preparation_checklist) ? w.preparation_checklist : []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load workshop settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWorkshop();
  }, [loadWorkshop]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await authenticatedFetch("/api/admin/workshop", {
        method: "PUT",
        body: JSON.stringify({
          slug: workshop?.slug || "build-first-ai-project-60m",
          title,
          subtitle,
          description,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
          timezone,
          duration_minutes: Number(durationMinutes),
          joining_url: joiningUrl || null,
          agenda,
          preparation_checklist: checklist,
          is_published: isPublished,
          project_submissions_enabled: submissionsEnabled
        })
      });

      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to update workshop.");
      setWorkshop(payload.workshop as Workshop);
      setFeedback({
        type: "success",
        text: "Workshop configuration saved to PostgreSQL and recorded in the audit log."
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update workshop."
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSkeleton lines={4} height={110} />;
  if (error) return <ErrorState message={error} onRetry={() => void loadWorkshop()} />;

  return (
    <div>
      <header className="shell-header">
        <div>
          <h1>
            <Calendar size={22} style={{ display: "inline", marginRight: 8, color: "var(--cyan)" }} />
            Workshop Details, Agenda & Checklist Configuration
          </h1>
          <span className="small">
            {workshop
              ? "Loaded directly from public.workshops in PostgreSQL."
              : "No workshop record in database yet. Fill out the form below to create one."}
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
          <h3>Core Workshop Details</h3>
          <label className="field">
            <span>Workshop Title *</span>
            <input
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Build Your First AI Project in 60 Minutes"
            />
          </label>

          <label className="field">
            <span>Hero Subtitle *</span>
            <input
              required
              value={subtitle}
              onChange={e => setSubtitle(e.target.value)}
              placeholder="e.g., 60 Minutes. One AI Project. Your First Step."
            />
          </label>

          <label className="field">
            <span>Description *</span>
            <textarea
              required
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the workshop..."
            />
          </label>

          <div className="three">
            <label className="field">
              <span>Scheduled Date & Time</span>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
              />
            </label>

            <label className="field">
              <span>Timezone Label *</span>
              <input
                required
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                placeholder="e.g., Asia/Kolkata (IST)"
              />
            </label>

            <label className="field">
              <span>Duration (Minutes) *</span>
              <input
                type="number"
                min={15}
                required
                value={durationMinutes}
                onChange={e => setDurationMinutes(Number(e.target.value))}
              />
            </label>
          </div>

          <label className="field">
            <span>Live Joining URL</span>
            <input
              type="url"
              value={joiningUrl}
              onChange={e => setJoiningUrl(e.target.value)}
              placeholder="https://meet.google.com/..."
            />
          </label>

          <div className="two" style={{ margin: "14px 0" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input type="checkbox" checked={isPublished} onChange={e => setIsPublished(e.target.checked)} />
              Published
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <input
                type="checkbox"
                checked={submissionsEnabled}
                onChange={e => setSubmissionsEnabled(e.target.checked)}
              />
              Enable Student Project Submissions
            </label>
          </div>

          <button type="submit" className="btn cyan full" disabled={saving}>
            <Save size={15} /> {saving ? "Saving Workshop Settings…" : "Save Workshop Configuration"}
          </button>
        </section>

        <section className="card">
          <div className="dash-head">
            <h3>Agenda Steps ({agenda.length})</h3>
            <button
              type="button"
              className="btn sm secondary"
              onClick={() =>
                setAgenda(prev => [...prev, { time: "", title: "", detail: "" }])
              }
            >
              <Plus size={13} /> Add Agenda Step
            </button>
          </div>

          {agenda.map((step, idx) => (
            <div key={idx} className="notice" style={{ marginTop: 10 }}>
              <div className="two">
                <input
                  className="input"
                  placeholder="Time (e.g., 00–15 min)"
                  value={step.time}
                  onChange={e =>
                    setAgenda(prev =>
                      prev.map((item, i) => (i === idx ? { ...item, time: e.target.value } : item))
                    )
                  }
                />
                <input
                  className="input"
                  placeholder="Segment Title"
                  value={step.title}
                  onChange={e =>
                    setAgenda(prev =>
                      prev.map((item, i) => (i === idx ? { ...item, title: e.target.value } : item))
                    )
                  }
                />
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input
                  className="input"
                  placeholder="Segment Detail"
                  value={step.detail}
                  onChange={e =>
                    setAgenda(prev =>
                      prev.map((item, i) => (i === idx ? { ...item, detail: e.target.value } : item))
                    )
                  }
                />
                <button
                  type="button"
                  className="btn sm danger"
                  onClick={() => setAgenda(prev => prev.filter((_, i) => i !== idx))}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          <div className="dash-head" style={{ marginTop: 22 }}>
            <h3>Preparation Checklist ({checklist.length})</h3>
            <button
              type="button"
              className="btn sm secondary"
              onClick={() =>
                setChecklist(prev => [...prev, { id: `item-${Date.now()}`, label: "" }])
              }
            >
              <Plus size={13} /> Add Checklist Item
            </button>
          </div>

          {checklist.map((item, idx) => (
            <div key={item.id} style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <input
                className="input"
                placeholder="Preparation checklist instruction"
                value={item.label}
                onChange={e =>
                  setChecklist(prev =>
                    prev.map((c, i) => (i === idx ? { ...c, label: e.target.value } : c))
                  )
                }
              />
              <button
                type="button"
                className="btn sm danger"
                onClick={() => setChecklist(prev => prev.filter((_, i) => i !== idx))}
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </section>
      </form>
    </div>
  );
}
