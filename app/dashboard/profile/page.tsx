"use client";

import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Lock, Save, User } from "lucide-react";
import { useStudentDashboard } from "@/components/StudentDashboardContext";
import { authenticatedFetch } from "@/lib/supabase";

export default function StudentProfilePage() {
  const { data, refresh } = useStudentDashboard();
  const profile = data?.profile;

  const [fullName, setFullName] = useState("");
  const [college, setCollege] = useState("");
  const [graduationYear, setGraduationYear] = useState("2026");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || "");
      setCollege(profile.college || "");
      setGraduationYear(profile.graduation_year || "2026");
    }
  }, [profile]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setMessage(null);

    try {
      const res = await authenticatedFetch("/api/student/profile", {
        method: "PATCH",
        body: JSON.stringify({
          full_name: fullName,
          college,
          graduation_year: graduationYear
        })
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Unable to update profile.");
      }

      await refresh();
      setMessage({ type: "success", text: "Your profile information has been updated." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update profile."
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="dash-grid">
      <section className="card">
        <div className="dash-head">
          <h2>
            <User size={18} style={{ display: "inline", marginRight: 7, color: "var(--cyan)" }} />
            Edit Permitted Profile Information
          </h2>
        </div>
        <p className="small">
          Update your name, college, or graduation year for workshop records and project certificates.
        </p>

        <form onSubmit={handleSave}>
          <label className="field">
            <span>Full Name *</span>
            <input
              required
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Your full name"
            />
          </label>

          <label className="field">
            <span>Engineering College / University *</span>
            <input
              required
              value={college}
              onChange={e => setCollege(e.target.value)}
              placeholder="Your college or university"
            />
          </label>

          <label className="field">
            <span>Graduation Year *</span>
            <select value={graduationYear} onChange={e => setGraduationYear(e.target.value)}>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2025">2025</option>
              <option value="2028">2028</option>
              <option value="2029">2029</option>
            </select>
          </label>

          {message && (
            <div className={`message ${message.type}`}>
              {message.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
              <div>{message.text}</div>
            </div>
          )}

          <button type="submit" className="btn cyan" disabled={saving}>
            <Save size={15} /> {saving ? "Saving Changes…" : "Save Profile Changes"}
          </button>
        </form>
      </section>

      <aside className="card">
        <div className="dash-head">
          <h3>
            <Lock size={16} style={{ display: "inline", marginRight: 6, color: "var(--cyan)" }} />
            System-Managed Account Attributes
          </h3>
          <span className="badge">Read-Only</span>
        </div>
        <p className="small">
          These fields are managed by Supabase Auth and database triggers and cannot be modified by client requests:
        </p>

        <label className="field">
          <span>Registered Email Address</span>
          <input readOnly value={profile?.email || ""} />
        </label>

        <div className="two">
          <label className="field">
            <span>Account Role</span>
            <input readOnly value={profile?.role || "student"} />
          </label>
          <label className="field">
            <span>Unique Referral Code</span>
            <input readOnly value={profile?.referral_code || ""} />
          </label>
        </div>

        <label className="field">
          <span>Recorded Acquisition Source</span>
          <input readOnly value={profile?.acquisition_source || "Direct / Landing Page"} />
        </label>

        <div className="notice">
          <strong>Security Policy:</strong> Attempting to send <code>role</code>, <code>referral_code</code>, or{" "}
          <code>referred_by</code> in profile update requests is blocked both by server validation and PostgreSQL
          triggers.
        </div>
      </aside>
    </div>
  );
}

