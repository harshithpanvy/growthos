"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BookOpen,
  Calendar,
  FolderGit2,
  Home,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Share2,
  Shield,
  User
} from "lucide-react";
import {
  StudentDashboardProvider,
  useStudentDashboard
} from "@/components/StudentDashboardContext";
import { ErrorState, LoadingSkeleton, UnauthorizedState } from "@/components/UiStates";

const STUDENT_NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/referrals", label: "Referrals & Rewards", icon: Share2 },
  { href: "/dashboard/resources", label: "Learning Resources", icon: BookOpen },
  { href: "/dashboard/workshop", label: "Workshop & Scoper", icon: Calendar },
  { href: "/dashboard/projects", label: "Project Submissions", icon: FolderGit2 },
  { href: "/dashboard/profile", label: "Profile Settings", icon: User }
];

function StudentShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { loading, configured, authenticated, error, data, refresh, signOut } = useStudentDashboard();

  if (loading) {
    return (
      <div className="container" style={{ marginTop: 32 }}>
        <LoadingSkeleton lines={4} height={120} />
      </div>
    );
  }

  if (!configured) {
    return (
      <div className="container">
        <UnauthorizedState
          title="Supabase Environment Not Configured"
          message="To access the authenticated Student Dashboard, copy .env.example to .env.local, add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, and run supabase/schema.sql in your Supabase SQL Editor."
          showLoginLink={false}
        />
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="container">
        <UnauthorizedState
          title="Student Sign-In Required"
          message="Please sign in with your registered student account to access your dashboard, referral link, and learning resources."
          showLoginLink={true}
        />
      </div>
    );
  }

  const profile = data?.profile;

  return (
    <div className="shell-layout">
      <aside className="shell-sidebar" aria-label="Student dashboard navigation">
        <div>
          <div className="brand-wrap" style={{ justifyContent: "space-between" }}>
            <Link href="/" className="brand">
              Growth<span>OS</span>
            </Link>
            <span className="badge">Student</span>
          </div>

          <div style={{ marginTop: 14, padding: "10px 12px", background: "#101b2f", borderRadius: 10 }}>
            <strong style={{ fontSize: 13, display: "block" }}>
              {profile?.full_name || "Registered Student"}
            </strong>
            <span className="small" style={{ fontSize: 11.5 }}>
              {profile?.college || "Engineering Campus"} • {profile?.referral_code || "GROW"}
            </span>
          </div>

          <nav className="shell-nav-list">
            {STUDENT_NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shell-nav-item ${isActive ? "active" : ""}`}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}

            {profile?.role === "admin" && (
              <Link href="/admin" className="shell-nav-item" style={{ color: "var(--amber)" }}>
                <Shield size={16} /> Admin Console
              </Link>
            )}
          </nav>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 24 }}>
          <Link href="/" className="btn sm ghost full">
            <Home size={14} /> Public Landing Page
          </Link>
          <button type="button" className="btn sm secondary full" onClick={() => void signOut()}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="shell-main">
        <header className="shell-header">
          <div>
            <h1>Student Growth & Learning Hub</h1>
            <span className="small">
              Workshop: <strong>{data?.workshop?.title || "Build Your First AI Project in 60 Minutes"}</strong>
            </span>
          </div>
          <div className="inline-actions">
            <span className="pill green">
              {data?.referrals.qualified_count ?? 0} Qualified Referral
              {(data?.referrals.qualified_count ?? 0) === 1 ? "" : "s"}
            </span>
            <button type="button" className="btn sm secondary" onClick={() => void refresh()}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </header>

        {error ? (
          <ErrorState message={error} onRetry={() => void refresh()} />
        ) : (
          children
        )}
      </main>
    </div>
  );
}

export default function StudentDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <StudentDashboardProvider>
      <StudentShellInner>{children}</StudentShellInner>
    </StudentDashboardProvider>
  );
}

