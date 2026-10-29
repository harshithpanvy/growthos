"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  Calendar,
  ClipboardCheck,
  FileSpreadsheet,
  FolderGit2,
  Home,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Settings,
  Share2,
  ShieldCheck,
  Users
} from "lucide-react";
import { LoadingSkeleton, UnauthorizedState } from "@/components/UiStates";
import {
  authenticatedFetch,
  isSupabaseConfigured,
  supabase,
  syncServerSessionCookie
} from "@/lib/supabase";

const ADMIN_NAV_ITEMS = [
  { href: "/admin", label: "Overview & Analytics", icon: BarChart3 },
  { href: "/admin/students", label: "Students", icon: Users },
  { href: "/admin/referrals", label: "Referrals & Abuse Review", icon: Share2 },
  { href: "/admin/resources", label: "Resources & Milestones", icon: BookOpen },
  { href: "/admin/campaigns", label: "Campaign & Budget", icon: Megaphone },
  { href: "/admin/workshop", label: "Workshop Config", icon: Calendar },
  { href: "/admin/attendance", label: "Attendance Records", icon: ClipboardCheck },
  { href: "/admin/projects", label: "Project Submissions", icon: FolderGit2 },
  { href: "/admin/audit-logs", label: "Audit Logs", icon: FileSpreadsheet },
  { href: "/admin/settings", label: "Security & Settings", icon: Settings }
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [checking, setChecking] = useState(true);
  const [authState, setAuthState] = useState<"authorized" | "unauthenticated" | "forbidden" | "unconfigured">(
    "unauthenticated"
  );
  const [statusMessage, setStatusMessage] = useState("");

  const verifyAdminAccess = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setAuthState("unconfigured");
      setStatusMessage(
        "Supabase environment variables are not configured. Configure .env.local and run supabase/schema.sql to enable the Admin Console."
      );
      setChecking(false);
      return;
    }

    setChecking(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setAuthState("unauthenticated");
        setStatusMessage("You must sign in with an authorized administrator account to access /admin.");
        setChecking(false);
        return;
      }

      await syncServerSessionCookie(sessionData.session);
      const res = await authenticatedFetch("/api/admin/overview");
      if (res.status === 401) {
        setAuthState("unauthenticated");
        setStatusMessage("Your session has expired. Please sign in again.");
      } else if (res.status === 403) {
        setAuthState("forbidden");
        setStatusMessage(
          "Your account has the 'student' role. Only accounts with role = 'admin' in public.profiles can access the Admin Console."
        );
      } else if (res.ok) {
        setAuthState("authorized");
      } else {
        const err = await res.json().catch(() => ({}));
        setAuthState("forbidden");
        setStatusMessage(err.error || "Unable to verify administrator privileges.");
      }
    } catch {
      setAuthState("forbidden");
      setStatusMessage("Network error while verifying administrator privileges.");
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void verifyAdminAccess();
  }, [verifyAdminAccess]);

  async function handleSignOut() {
    if (supabase) {
      await supabase.auth.signOut();
    }
    await syncServerSessionCookie(null);
    router.push("/login");
  }

  if (checking) {
    return (
      <div className="container" style={{ marginTop: 32 }}>
        <LoadingSkeleton lines={5} height={140} />
      </div>
    );
  }

  if (authState !== "authorized") {
    return (
      <div className="container">
        <UnauthorizedState
          title={
            authState === "forbidden"
              ? "403 Forbidden — Administrator Role Required"
              : authState === "unconfigured"
                ? "Supabase Environment Not Configured"
                : "Administrator Sign-In Required"
          }
          message={statusMessage}
          showLoginLink={authState === "unauthenticated"}
          showAdminBootstrapNote={true}
        />
      </div>
    );
  }

  return (
    <div className="shell-layout">
      <aside className="shell-sidebar" aria-label="Administrator console navigation">
        <div>
          <div className="brand-wrap" style={{ justifyContent: "space-between" }}>
            <Link href="/admin" className="brand">
              Growth<span>OS</span>
            </Link>
            <span className="pill amber">
              <ShieldCheck size={12} /> Admin
            </span>
          </div>

          <nav className="shell-nav-list">
            {ADMIN_NAV_ITEMS.map(item => {
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
          </nav>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 24 }}>
          <Link href="/dashboard" className="btn sm secondary full">
            <LayoutDashboard size={14} /> Student View
          </Link>
          <Link href="/" className="btn sm ghost full">
            <Home size={14} /> Public Site
          </Link>
          <button type="button" className="btn sm danger full" onClick={() => void handleSignOut()}>
            <LogOut size={14} /> Sign Out
          </button>
        </div>
      </aside>

      <main className="shell-main">{children}</main>
    </div>
  );
}

