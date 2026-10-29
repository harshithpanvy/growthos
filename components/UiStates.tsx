"use client";

import Link from "next/link";
import { AlertTriangle, Inbox, Lock, RefreshCw, ShieldAlert } from "lucide-react";

export function LoadingSkeleton({ lines = 3, height = 96 }: { lines?: number; height?: number }) {
  return (
    <div className="card" aria-busy="true" aria-label="Loading content">
      <div className="skeleton" style={{ height: 22, width: "42%", marginBottom: 14 }} />
      {Array.from({ length: lines }).map((_, idx) => (
        <div
          key={idx}
          className="skeleton"
          style={{
            height: idx === 0 ? height : 18,
            width: idx === lines - 1 ? "68%" : "100%",
            marginBottom: 10
          }}
        />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}) {
  return (
    <div className="empty-state">
      <Inbox size={28} style={{ color: "var(--cyan)" }} />
      <h3>{title}</h3>
      <p className="small" style={{ maxWidth: 480, margin: "0 auto 14px" }}>
        {description}
      </p>
      {actionLabel && actionHref && (
        <Link href={actionHref} className="btn sm secondary">
          {actionLabel}
        </Link>
      )}
      {actionLabel && onAction && (
        <button type="button" className="btn sm secondary" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorState({
  title = "Unable to load data",
  message,
  onRetry
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card" style={{ borderColor: "#7a2e3d" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <AlertTriangle size={22} style={{ color: "var(--danger)", flexShrink: 0, marginTop: 2 }} />
        <div>
          <h3 style={{ margin: "0 0 6px" }}>{title}</h3>
          <p className="small" style={{ margin: "0 0 12px" }}>
            {message}
          </p>
          {onRetry && (
            <button type="button" className="btn sm secondary" onClick={onRetry}>
              <RefreshCw size={13} /> Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function UnauthorizedState({
  title = "Authorization Required",
  message,
  showLoginLink = true,
  showAdminBootstrapNote = false
}: {
  title?: string;
  message: string;
  showLoginLink?: boolean;
  showAdminBootstrapNote?: boolean;
}) {
  return (
    <div className="card" style={{ maxWidth: 640, margin: "40px auto", borderColor: "#6d3b47" }}>
      <div className="inline-actions" style={{ marginBottom: 10 }}>
        <span className="pill danger">
          <ShieldAlert size={13} /> ACCESS RESTRICTED
        </span>
      </div>
      <h2>{title}</h2>
      <p className="muted" style={{ fontSize: 14 }}>
        {message}
      </p>

      {showAdminBootstrapNote && (
        <div className="notice" style={{ marginTop: 14 }}>
          <strong>How to grant Administrator access safely:</strong>
          <br />
          Admin privileges can never be granted from the browser. Run the following SQL query in your{" "}
          <strong>Supabase Dashboard → SQL Editor</strong>:
          <pre className="code-block" style={{ marginTop: 8 }}>
            {`UPDATE public.profiles\nSET role = 'admin'\nWHERE lower(email) = 'your-admin-email@example.com';`}
          </pre>
        </div>
      )}

      <div className="inline-actions" style={{ marginTop: 18 }}>
        {showLoginLink && (
          <Link href="/login" className="btn">
            <Lock size={14} /> Sign In
          </Link>
        )}
        <Link href="/dashboard" className="btn secondary">
          Student Dashboard
        </Link>
        <Link href="/" className="btn ghost">
          Back to Home
        </Link>
      </div>
    </div>
  );
}

