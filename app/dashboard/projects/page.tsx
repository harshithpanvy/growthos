"use client";

import { FormEvent, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FolderGit2,
  Info,
  Send
} from "lucide-react";
import { useStudentDashboard } from "@/components/StudentDashboardContext";
import { EmptyState } from "@/components/UiStates";
import { authenticatedFetch } from "@/lib/supabase";

export default function StudentProjectsPage() {
  const { data, refresh } = useStudentDashboard();
  const submissions = data?.project_submissions ?? [];
  const submissionsEnabled = data?.workshop?.project_submissions_enabled ?? true;

  const [title, setTitle] = useState("");
  const [problemStatement, setProblemStatement] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setFeedback(null);

    try {
      const res = await authenticatedFetch("/api/student/projects", {
        method: "POST",
        body: JSON.stringify({
          title,
          problem_statement: problemStatement,
          description,
          tech_stack: techStack,
          repo_url: repoUrl || null,
          demo_url: demoUrl || null,
          notes: notes || null
        })
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Unable to submit project.");
      }

      setTitle("");
      setProblemStatement("");
      setDescription("");
      setTechStack("");
      setRepoUrl("");
      setDemoUrl("");
      setNotes("");

      await refresh();
      setFeedback({
        type: "success",
        text: "Your project has been submitted and recorded for instructor review."
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to submit project."
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="dash-grid">
      {/* Left: Submit New Project */}
      <section className="card">
        <div className="dash-head">
          <h2>
            <FolderGit2 size={18} style={{ display: "inline", marginRight: 7, color: "var(--cyan)" }} />
            Submit Your 60-Minute AI Project
          </h2>
          <span className={`pill ${submissionsEnabled ? "green" : "amber"}`}>
            {submissionsEnabled ? "Submissions Open" : "Closed"}
          </span>
        </div>
        <p className="small">
          Submit your workshop repository or live demo URL so instructors can review your build.
        </p>

        {!submissionsEnabled ? (
          <div className="notice">
            Project submissions are currently disabled by the workshop administrator.
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <label className="field">
              <span>Project Title *</span>
              <input
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g., AI Resume-to-JD Gap Analyzer"
              />
            </label>

            <label className="field">
              <span>Problem Statement (Who is the user & what workflow improves?) *</span>
              <textarea
                required
                value={problemStatement}
                onChange={e => setProblemStatement(e.target.value)}
                placeholder="Explain the specific problem your AI tool solves..."
              />
            </label>

            <label className="field">
              <span>Project Description & Architecture *</span>
              <textarea
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe how your input validation, prompt schema, and UI work together..."
              />
            </label>

            <label className="field">
              <span>Tech Stack, AI Model & Guardrails Used *</span>
              <input
                required
                value={techStack}
                onChange={e => setTechStack(e.target.value)}
                placeholder="e.g., Next.js, TypeScript, Gemini API with JSON schema validation & error fallback"
              />
            </label>

            <div className="two">
              <label className="field">
                <span>GitHub Repository URL</span>
                <input
                  type="url"
                  value={repoUrl}
                  onChange={e => setRepoUrl(e.target.value)}
                  placeholder="https://github.com/username/project"
                />
              </label>
              <label className="field">
                <span>Live Demo URL</span>
                <input
                  type="url"
                  value={demoUrl}
                  onChange={e => setDemoUrl(e.target.value)}
                  placeholder="https://your-project.vercel.app"
                />
              </label>
            </div>

            <label className="field">
              <span>Optional Notes for Reviewer</span>
              <input
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any test credentials or notes for the reviewer"
              />
            </label>

            {feedback && (
              <div className={`message ${feedback.type}`}>
                {feedback.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                <div>{feedback.text}</div>
              </div>
            )}

            <button type="submit" className="btn full cyan" disabled={submitting}>
              <Send size={15} /> {submitting ? "Submitting Project…" : "Submit Project for Review"}
            </button>
          </form>
        )}
      </section>

      {/* Right: Submitted Projects & Review Status */}
      <section className="card">
        <div className="dash-head">
          <h3>
            <ClipboardCheck size={17} style={{ display: "inline", marginRight: 6, color: "var(--cyan)" }} />
            Your Submitted Projects ({submissions.length})
          </h3>
        </div>

        <div className="notice" style={{ marginBottom: 14 }}>
          <Info size={14} style={{ display: "inline", marginRight: 5, color: "var(--cyan)" }} />
          <strong>Transparency Note:</strong> Any preliminary rubric score shown below is an automated text-heuristic
          check based on your written description. It does not execute external repository code or replace manual
          instructor review.
        </div>

        {submissions.length === 0 ? (
          <EmptyState
            title="No Projects Submitted Yet"
            description="Once you submit your 60-minute workshop project using the form on the left, its review status and instructor feedback will appear here."
          />
        ) : (
          <div>
            {submissions.map(sub => (
              <div key={sub.id} className="resource unlocked-card" style={{ display: "block", marginBottom: 12 }}>
                <div className="dash-head">
                  <strong style={{ fontSize: 15 }}>{sub.title}</strong>
                  <span
                    className={`pill ${
                      sub.review_status === "approved"
                        ? "green"
                        : sub.review_status === "needs_work"
                          ? "danger"
                          : "amber"
                    }`}
                  >
                    Status: {sub.review_status}
                  </span>
                </div>

                <p className="small" style={{ margin: "6px 0" }}>
                  <strong>Problem:</strong> {sub.problem_statement}
                </p>
                <p className="small" style={{ margin: "4px 0" }}>
                  <strong>Stack:</strong> {sub.tech_stack}
                </p>

                <div className="inline-actions" style={{ marginTop: 8 }}>
                  {sub.repo_url && (
                    <a
                      href={sub.repo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn sm secondary"
                    >
                      <ExternalLink size={12} /> Repository
                    </a>
                  )}
                  {sub.demo_url && (
                    <a
                      href={sub.demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn sm ghost"
                    >
                      <ExternalLink size={12} /> Live Demo
                    </a>
                  )}
                  {typeof sub.ai_rubric_score === "number" && (
                    <span className="badge">
                      Automated Text Heuristic: {sub.ai_rubric_score}/100
                    </span>
                  )}
                </div>

                {sub.reviewer_notes && (
                  <div className="notice" style={{ marginTop: 10 }}>
                    <strong style={{ color: "var(--green)" }}>Instructor Review Feedback:</strong>
                    <br />
                    {sub.reviewer_notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

