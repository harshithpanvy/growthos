"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Calendar, LayoutDashboard, LogIn, Shield, Sparkles, UserPlus } from "lucide-react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export function PublicHeader() {
  const pathname = usePathname();
  const [isSignedIn, setIsSignedIn] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setIsSignedIn(Boolean(data.session));
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      setIsSignedIn(Boolean(session));
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <header className="nav">
      <div className="brand-wrap">
        <Link href="/" className="brand">
          Growth<span>OS</span>
        </Link>
        <span className="pill">
          <Sparkles size={12} /> 60-Min AI Project Workshop
        </span>
      </div>

      <nav className="nav-links" aria-label="Primary navigation">
        <Link href="/" className={`nav-link ${pathname === "/" ? "active" : ""}`}>
          Overview
        </Link>
        <Link href="/workshop" className={`nav-link ${pathname === "/workshop" ? "active" : ""}`}>
          <Calendar size={14} /> Workshop & Scoper
        </Link>
        {isSignedIn ? (
          <>
            <Link href="/dashboard" className="btn sm cyan">
              <LayoutDashboard size={14} /> Student Dashboard
            </Link>
            <Link href="/admin" className="nav-link">
              <Shield size={14} /> Admin
            </Link>
          </>
        ) : (
          <>
            <Link href="/login" className={`nav-link ${pathname === "/login" ? "active" : ""}`}>
              <LogIn size={14} /> Sign In
            </Link>
            <Link href="/register" className="btn sm cyan">
              <UserPlus size={14} /> Register for Free <ArrowRight size={13} />
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="footer">
      <div>
        <strong>GrowthOS</strong> — Student Acquisition, Referral & Learning Resource Platform for{" "}
        <em>&ldquo;Build Your First AI Project in 60 Minutes&rdquo;</em>.
        {!isSupabaseConfigured && (
          <div style={{ marginTop: 4, color: "var(--amber)" }}>
            Environment note: Configure <code>NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
            <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> in <code>.env.local</code> to enable live database persistence.
          </div>
        )}
      </div>
      <div className="inline-actions" style={{ gap: 16 }}>
        <Link href="/workshop" className="muted">
          Workshop Agenda
        </Link>
        <Link href="/privacy" className="muted">
          Privacy Policy
        </Link>
        <Link href="/terms" className="muted">
          Terms of Use
        </Link>
        <Link href="/admin" className="muted">
          Admin Console
        </Link>
      </div>
    </footer>
  );
}

