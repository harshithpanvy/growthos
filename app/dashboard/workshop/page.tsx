"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Calendar,
  CheckSquare,
  Clock,
  ExternalLink,
  FolderGit2,
  Sparkles,
  Square
} from "lucide-react";
import { useStudentDashboard } from "@/components/StudentDashboardContext";
import { EmptyState } from "@/components/UiStates";

export default function StudentWorkshopPage() {
  const { data } = useStudentDashboard();
  const workshop = data?.workshop;
  const attendance = data?.attendance;

  const [completedChecklistIds, setCompletedChecklistIds] = useState<string[]>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem("growthos_prep_checklist");
    if (saved) {
      try {
        setCompletedChecklistIds(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  function toggleChecklist(id: string) {
    setCompletedChecklistIds(prev => {
      const next = prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id];
      window.localStorage.setItem("growthos_prep_checklist", JSON.stringify(next));
      return next;
    });
  }

  if (!workshop) {
    return (
      <EmptyState
        title="No Workshop Record Configured in Database"
        description="The administrator has not published a workshop configuration in /admin/workshop yet."
      />
    );
  }

  const agenda = Array.isArray(workshop.agenda) ? workshop.agenda : [];
  const checklist = Array.isArray(workshop.preparation_checklist) ? workshop.preparation_checklist : [];

  return (
    <div>
      <div className="dash-grid">
        {/* Left: Workshop Schedule, Joining Link & Attendance Status */}
        <section className="card">
          <div className="dash-head">
            <span className="pill">
              <Calendar size={13} /> LIVE WORKSHOP DETAILS
            </span>
            <span className="badge">
              Attendance:{" "}
              {attendance?.status === "attended"
                ? "Verified Present"
                : attendance?.status === "absent"
                  ? "Marked Absent"
                  : "Registered"}
            </span>
          </div>

          <h2 style={{ marginTop: 12 }}>{workshop.title}</h2>
          <p className="small">{workshop.description}</p>

          <div className="two" style={{ marginTop: 16 }}>
            <div className="stat">
              <strong style={{ fontSize: 16 }}>
                {workshop.scheduled_at
                  ? new Date(workshop.scheduled_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short"
                    })
                  : "To Be Announced"}
              </strong>
              <span>Scheduled Date & Time ({workshop.timezone})</span>
            </div>
            <div className="stat">
              <strong style={{ fontSize: 16 }}>{workshop.duration_minutes} Minutes</strong>
              <span>Guided Live Build Sprint</span>
            </div>
          </div>

          <div className="notice" style={{ marginTop: 16 }}>
            <strong style={{ color: "var(--text)", display: "block", marginBottom: 6 }}>
              Workshop Joining Link:
            </strong>
            {workshop.joining_url ? (
              <a
                href={workshop.joining_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn cyan"
              >
                <ExternalLink size={15} /> Join Live Workshop Session
              </a>
            ) : (
              <span className="small">
                The live joining link has not been configured by the administrator yet. Once configured in{" "}
                <code>/admin/workshop</code>, the join button will activate here automatically.
              </span>
            )}
          </div>

          <h3 style={{ marginTop: 22 }}>
            <Clock size={16} style={{ display: "inline", marginRight: 6, color: "var(--cyan)" }} />
            Session Agenda
          </h3>
          {agenda.length === 0 ? (
            <p className="small">No agenda steps have been added yet.</p>
          ) : (
            <div>
              {agenda.map(item => (
                <div
                  key={item.time + item.title}
                  style={{
                    display: "flex",
                    gap: 12,
                    padding: "11px 0",
                    borderBottom: "1px solid var(--line)"
                  }}
                >
                  <span className="badge" style={{ height: "fit-content", minWidth: 82, textAlign: "center" }}>
                    {item.time}
                  </span>
                  <div>
                    <strong style={{ fontSize: 13.5, display: "block" }}>{item.title}</strong>
                    <span className="small">{item.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right: Preparation Checklist & Project Submission CTA */}
        <section className="card">
          <div className="dash-head">
            <h3>Pre-Workshop Preparation Checklist</h3>
            <span className="pill green">
              {completedChecklistIds.length} / {checklist.length} Completed
            </span>
          </div>
          <p className="small">
            Complete these preparation tasks before the workshop starts:
          </p>

          {checklist.length === 0 ? (
            <div style={{ marginTop: 14 }}>
              <EmptyState
                title="No Preparation Checklist Items"
                description="Checklist items configured in /admin/workshop will appear here."
              />
            </div>
          ) : (
            <div style={{ marginTop: 14 }}>
              {checklist.map(item => {
                const checked = completedChecklistIds.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleChecklist(item.id)}
                    className={`resource ${checked ? "unlocked-card" : ""}`}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {checked ? (
                        <CheckSquare size={17} style={{ color: "var(--green)", flexShrink: 0 }} />
                      ) : (
                        <Square size={17} style={{ color: "var(--muted)", flexShrink: 0 }} />
                      )}
                      <span
                        style={{
                          fontSize: 13.5,
                          textDecoration: checked ? "line-through" : "none",
                          color: checked ? "var(--muted)" : "var(--text)"
                        }}
                      >
                        {item.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <div className="notice" style={{ marginTop: 20 }}>
            <strong style={{ color: "var(--text)", display: "block", marginBottom: 6 }}>
              <Sparkles size={14} style={{ display: "inline", marginRight: 5, color: "var(--cyan)" }} />
              Finished Building Your 60-Minute AI Project?
            </strong>
            Submit your repository or live demo link in the Project Submissions tab for instructor review.
            <div style={{ marginTop: 12 }}>
              <Link href="/dashboard/projects" className="btn cyan sm">
                <FolderGit2 size={14} /> Go to Project Submissions
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
