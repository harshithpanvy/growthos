"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ExternalLink, FolderGit2, RefreshCw } from "lucide-react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/UiStates";
import { authenticatedFetch } from "@/lib/supabase";
import type { ProjectReviewStatus, ProjectSubmission } from "@/lib/types";

interface AdminProjectRow extends ProjectSubmission {
  student?: { full_name: string; email: string; college: string | null } | null;
}

export default function AdminProjectsPage() {
  const [submissions, setSubmissions] = useState<AdminProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selected, setSelected] = useState<AdminProjectRow | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ProjectReviewStatus>("approved");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/admin/projects");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to load project submissions.");
      setSubmissions(payload.submissions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load submissions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  async function handleSaveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || saving) return;
    setSaving(true);
    setFeedback(null);

    try {
      const res = await authenticatedFetch("/api/admin/projects", {
        method: "PATCH",
        body: JSON.stringify({
          id: selected.id,
          review_status: reviewStatus,
          reviewer_notes: reviewerNotes
        })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to update project review.");
      setFeedback({
        type: "success",
        text: `Updated review status for "${selected.title}" and recorded audit log.`
      });
      setSelected(null);
      setReviewerNotes("");
      await loadProjects();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save review."
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSkeleton lines={4} height={110} />;
  if (error) return <ErrorState message={error} onRetry={() => void loadProjects()} />;

  return (
    <div>
      <header className="shell-header">
        <div>
          <h1>
            <FolderGit2 size={22} style={{ display: "inline", marginRight: 8, color: "var(--cyan)" }} />
            Student Project Submissions ({submissions.length})
          </h1>
          <span className="small">
            Review student builds and provide instructor feedback. Automated text scores are clearly labelled heuristics.
          </span>
        </div>
        <button type="button" className="btn sm secondary" onClick={() => void loadProjects()}>
          <RefreshCw size={13} /> Refresh
        </button>
      </header>

      {feedback && (
        <div className={`message ${feedback.type}`}>
          {feedback.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <div>{feedback.text}</div>
        </div>
      )}

      {selected && (
        <form onSubmit={handleSaveReview} className="card" style={{ marginBottom: 18, borderColor: "var(--cyan)" }}>
          <div className="dash-head">
            <h3>Reviewing: {selected.title}</h3>
            <button type="button" className="btn sm ghost" onClick={() => setSelected(null)}>
              Cancel
            </button>
          </div>
          <p className="small">
            Submitted by <strong>{selected.student?.full_name || "Student"}</strong> ({selected.student?.email})
          </p>

          <div className="two">
            <label className="field">
              <span>Review Status *</span>
              <select
                value={reviewStatus}
                onChange={e => setReviewStatus(e.target.value as ProjectReviewStatus)}
              >
                <option value="approved">Approved</option>
                <option value="under_review">Under Review</option>
                <option value="needs_work">Needs Work</option>
                <option value="submitted">Submitted</option>
              </select>
            </label>

            <label className="field">
              <span>Instructor Reviewer Notes</span>
              <input
                value={reviewerNotes}
                onChange={e => setReviewerNotes(e.target.value)}
                placeholder="Constructive feedback for the student..."
              />
            </label>
          </div>

          <button type="submit" className="btn cyan sm" disabled={saving}>
            {saving ? "Saving Review…" : "Save Review & Audit Log"}
          </button>
        </form>
      )}

      {submissions.length === 0 ? (
        <EmptyState
          title="No Project Submissions Yet"
          description="When students submit their 60-minute AI builds from /dashboard/projects, they will appear here for review."
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Project Title & Problem</th>
                  <th>Tech Stack</th>
                  <th>Links</th>
                  <th>Text Heuristic</th>
                  <th>Review Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map(sub => (
                  <tr key={sub.id}>
                    <td>
                      <strong>{sub.student?.full_name || "Student"}</strong>
                      <div className="small">{sub.student?.email}</div>
                    </td>
                    <td>
                      <strong>{sub.title}</strong>
                      <div className="small">{sub.problem_statement.slice(0, 110)}</div>
                    </td>
                    <td>
                      <span className="small">{sub.tech_stack}</span>
                    </td>
                    <td>
                      <div className="inline-actions">
                        {sub.repo_url && (
                          <a
                            href={sub.repo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn sm secondary"
                          >
                            <ExternalLink size={12} /> Repo
                          </a>
                        )}
                        {sub.demo_url && (
                          <a
                            href={sub.demo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn sm ghost"
                          >
                            <ExternalLink size={12} /> Demo
                          </a>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge" title="Automated text-based rubric heuristic (not code execution)">
                        {sub.ai_rubric_score ?? "—"}/100 (Heuristic)
                      </span>
                    </td>
                    <td>
                      <span
                        className={`pill ${
                          sub.review_status === "approved"
                            ? "green"
                            : sub.review_status === "needs_work"
                              ? "danger"
                              : "amber"
                        }`}
                      >
                        {sub.review_status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn sm cyan"
                        onClick={() => {
                          setSelected(sub);
                          setReviewStatus(sub.review_status);
                          setReviewerNotes(sub.reviewer_notes || "");
                        }}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

