"use client";

import { CheckCircle2, Lock, Settings, ShieldCheck } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase";

export default function AdminSettingsPage() {
  return (
    <div>
      <header className="shell-header">
        <div>
          <h1>
            <Settings size={22} style={{ display: "inline", marginRight: 8, color: "var(--cyan)" }} />
            Security Architecture & Admin Role Management
          </h1>
          <span className="small">
            Environment diagnostics, Row Level Security (RLS) boundaries, and safe administrator bootstrap procedures.
          </span>
        </div>
      </header>

      <div className="dash-grid">
        <section className="card">
          <h3>
            <ShieldCheck size={17} style={{ display: "inline", marginRight: 6, color: "var(--green)" }} />
            Active Security Controls Checklist
          </h3>
          <ul style={{ paddingLeft: 18, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.85 }}>
            <li>
              <CheckCircle2 size={14} style={{ display: "inline", marginRight: 6, color: "var(--green)" }} />
              <strong>Supabase Auth & Server Verification:</strong>{" "}
              {isSupabaseConfigured ? "Configured" : "Not configured"}
            </li>
            <li>
              <CheckCircle2 size={14} style={{ display: "inline", marginRight: 6, color: "var(--green)" }} />
              <strong>Row Level Security (RLS):</strong> Enabled across all 11 PostgreSQL tables in{" "}
              <code>supabase/schema.sql</code>.
            </li>
            <li>
              <CheckCircle2 size={14} style={{ display: "inline", marginRight: 6, color: "var(--green)" }} />
              <strong>Privilege Escalation Prevention:</strong> Both server validation and the PostgreSQL{" "}
              <code>prevent_profile_privilege_escalation()</code> trigger block students from updating{" "}
              <code>role</code>, <code>referral_code</code>, or <code>referred_by</code>.
            </li>
            <li>
              <CheckCircle2 size={14} style={{ display: "inline", marginRight: 6, color: "var(--green)" }} />
              <strong>Server-Side Resource Gating:</strong> Locked bonus resource markdown and signed download URLs are
              redacted on the server until the user&apos;s database referral count meets the threshold.
            </li>
            <li>
              <CheckCircle2 size={14} style={{ display: "inline", marginRight: 6, color: "var(--green)" }} />
              <strong>No Service-Role Keys in Client Bundles:</strong> Only <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
              <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> are accessible to browser code.
            </li>
          </ul>
        </section>

        <section className="card">
          <h3>
            <Lock size={17} style={{ display: "inline", marginRight: 6, color: "var(--cyan)" }} />
            Granting & Revoking Administrator Privileges
          </h3>
          <p className="small">
            GrowthOS deliberately provides <strong>no public endpoint</strong> and <strong>no first-user shortcut</strong>{" "}
            for assigning the <code>admin</code> role. Role changes must be executed by the project owner in the{" "}
            <strong>Supabase SQL Editor</strong>:
          </p>

          <strong style={{ fontSize: 12.5, color: "var(--cyan)", display: "block", marginTop: 12 }}>
            1. Grant Administrator Role to a Verified User:
          </strong>
          <pre className="code-block">
            {`UPDATE public.profiles
SET role = 'admin', updated_at = now()
WHERE lower(email) = 'admin@yourdomain.com';`}
          </pre>

          <strong style={{ fontSize: 12.5, color: "var(--amber)", display: "block", marginTop: 14 }}>
            2. Revoke Administrator Role (Demote to Student):
          </strong>
          <pre className="code-block">
            {`UPDATE public.profiles
SET role = 'student', updated_at = now()
WHERE lower(email) = 'admin@yourdomain.com';`}
          </pre>
        </section>
      </div>
    </div>
  );
}

