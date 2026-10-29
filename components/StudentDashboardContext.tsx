"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  authenticatedFetch,
  isSupabaseConfigured,
  supabase,
  syncServerSessionCookie
} from "@/lib/supabase";
import type {
  AttendanceRecord,
  LearningResource,
  PrivacySafeReferralHistoryItem,
  Profile,
  ProjectSubmission,
  RewardRule,
  RewardUnlock,
  Workshop
} from "@/lib/types";

export interface StudentOverviewData {
  profile: Profile | null;
  referrals: {
    qualified_count: number;
    pending_count: number;
    history: PrivacySafeReferralHistoryItem[];
  };
  reward_rules: RewardRule[];
  reward_unlocks: RewardUnlock[];
  resources: (LearningResource & { unlocked?: boolean })[];
  workshop: Workshop | null;
  attendance: AttendanceRecord | null;
  project_submissions: ProjectSubmission[];
}

interface StudentContextValue {
  loading: boolean;
  configured: boolean;
  authenticated: boolean;
  error: string | null;
  data: StudentOverviewData | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const StudentDashboardContext = createContext<StudentContextValue | null>(null);

export function StudentDashboardProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<StudentOverviewData | null>(null);

  const loadStudentOverview = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      setAuthenticated(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setAuthenticated(false);
        setData(null);
        setLoading(false);
        return;
      }

      await syncServerSessionCookie(sessionData.session);
      const res = await authenticatedFetch("/api/student/overview");
      if (res.status === 401) {
        setAuthenticated(false);
        setData(null);
        setLoading(false);
        return;
      }
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load student dashboard data.");
      }

      const payload = (await res.json()) as StudentOverviewData;
      setAuthenticated(true);
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error loading student data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStudentOverview();
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((_ev, session) => {
      if (session) {
        void loadStudentOverview();
      } else {
        setAuthenticated(false);
        setData(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, [loadStudentOverview]);

  const signOut = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
    await syncServerSessionCookie(null);
    setAuthenticated(false);
    setData(null);
    router.push("/login");
  }, [router]);

  return (
    <StudentDashboardContext.Provider
      value={{
        loading,
        configured: isSupabaseConfigured,
        authenticated,
        error,
        data,
        refresh: loadStudentOverview,
        signOut
      }}
    >
      {children}
    </StudentDashboardContext.Provider>
  );
}

export function useStudentDashboard(): StudentContextValue {
  const ctx = useContext(StudentDashboardContext);
  if (!ctx) {
    throw new Error("useStudentDashboard must be used within a StudentDashboardProvider.");
  }
  return ctx;
}

