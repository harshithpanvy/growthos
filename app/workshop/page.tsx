"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BookOpen, Calendar, CheckSquare, Clock, Lock, Sparkles, Unlock } from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/Navigation";
import { EmptyState, LoadingSkeleton } from "@/components/UiStates";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { LearningResource, Workshop } from "@/lib/types";

export default function PublicWorkshopPage() {
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [resources, setResources] = useState<LearningResource[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFromDatabase() {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }

      const [wsRes, resData] = await Promise.all([
        supabase.from("workshops").select("*").eq("is_published", true).limit(1).maybeSingle(),
        supabase
          .from("resources")
          .select("id,slug,title,description,resource_type,unlock_threshold,is_published,is_archived,created_at,updated_at")
          .eq("is_published", true)
          .eq("is_archived", false)
          .order("unlock_threshold", { ascending: true })
      ]);

      if (wsRes.data) setWorkshop(wsRes.data as Workshop);
      if (Array.isArray(resData.data)) setResources(resData.data as LearningResource[]);
      setLoading(false);
    }

    void loadFromDatabase();
  }, []);

  return (
    <div className="container">
      <PublicHeader />

      {loading ? (
        <div style={{ marginTop: 28 }}>
          <LoadingSkeleton lines={4} height={110} />
        </div>
      ) : !workshop ? (
        <div style={{ marginTop: 28 }}>
          <EmptyState
            title="Workshop Details Not Published Yet"
            description="No published workshop record was found in the database. Configure and publish the workshop in /admin/workshop."
            actionLabel="Register for Updates"
            actionHref="/register"
          />
        </div>
      ) : (
        <>
          <section style={{ marginTop: 28 }}>
            <span className="eyebrow">
              <Calendar size={13} /> WORKSHOP CURRICULUM & PREPARATION
            </span>
            <h1 style={{ font: "700 clamp(30px, 4vw, 44px) 'Space Grotesk', sans-serif", margin: "12px 0 8px" }}>
              {workshop.title}
            </h1>
            <p className="lead">{workshop.description}</p>

            <div className="three" style={{ marginTop: 22 }}>
              <div className="card">
                <span className="pill">Duration</span>
                <h3 style={{ marginTop: 10 }}>{workshop.duration_minutes} Minutes Live Build</h3>
                <p className="small">Guided build session from problem scoping to deployment.</p>
              </div>
              <div className="card">
                <span className="pill">Schedule & Timezone</span>
                <h3 style={{ marginTop: 10 }}>
                  {workshop.scheduled_at
                    ? new Date(workshop.scheduled_at).toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short"
                      })
                    : "Schedule To Be Announced"}
                </h3>
                <p className="small">Timezone: {workshop.timezone}</p>
              </div>
              <div className="card">
                <span className="pill green">Registration</span>
                <h3 style={{ marginTop: 10 }}>Free for Students</h3>
                <p className="small">Includes immediate access to starter preparation resources.</p>
              </div>
            </div>
          </section>

          <section className="dash-grid" style={{ marginTop: 32 }}>
            <div className="card">
              <div className="dash-head">
                <h2>
                  <Clock size={18} style={{ display: "inline", marginRight: 7, color: "var(--cyan)" }} />
                  Workshop Agenda
                </h2>
              </div>

              {!Array.isArray(workshop.agenda) || workshop.agenda.length === 0 ? (
                <div style={{ marginTop: 14 }}>
                  <EmptyState
                    title="Agenda Not Configured"
                    description="The administrator has not added agenda steps to this workshop yet."
                  />
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  {workshop.agenda.map(step => (
                    <div
                      key={step.time + step.title}
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: "13px 0",
                        borderBottom: "1px solid var(--line)"
                      }}
                    >
                      <span className="badge" style={{ height: "fit-content", minWidth: 84, textAlign: "center" }}>
                        {step.time}
                      </span>
                      <div>
                        <strong style={{ display: "block", fontSize: 14.5 }}>{step.title}</strong>
                        <span className="small">{step.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h3 style={{ marginTop: 24 }}>
                <CheckSquare size={16} style={{ display: "inline", marginRight: 6, color: "var(--green)" }} />
                Pre-Workshop Preparation Checklist
              </h3>
              {!Array.isArray(workshop.preparation_checklist) || workshop.preparation_checklist.length === 0 ? (
                <p className="small">No preparation checklist items configured yet.</p>
              ) : (
                <ul style={{ paddingLeft: 18, fontSize: 13.5, color: "var(--muted)", lineHeight: 1.8 }}>
                  {workshop.preparation_checklist.map(item => (
                    <li key={item.id}>{item.label}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Database-Backed Learning Resources Overview */}
            <div className="card">
              <div className="dash-head">
                <h2>
                  <BookOpen size={18} style={{ display: "inline", marginRight: 7, color: "var(--cyan)" }} />
                  Published Learning Resources
                </h2>
                <span className="pill">Database Catalog</span>
              </div>
              <p className="small">
                Register to access starter resources immediately and unlock bonus resources through qualified referrals:
              </p>

              {resources.length === 0 ? (
                <div style={{ marginTop: 14 }}>
                  <EmptyState
                    title="No Resources Published Yet"
                    description="Learning resources will appear here once published in /admin/resources."
                  />
                </div>
              ) : (
                <div style={{ marginTop: 12 }}>
                  {resources.map(res => (
                    <div
                      key={res.id}
                      className={`resource ${res.unlock_threshold === 0 ? "unlocked-card" : ""}`}
                    >
                      <div>
                        <strong style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
                          {res.unlock_threshold === 0 ? (
                            <Unlock size={14} style={{ color: "var(--green)" }} />
                          ) : (
                            <Lock size={14} style={{ color: "var(--cyan)" }} />
                          )}
                          {res.title}
                        </strong>
                        <p className="small" style={{ margin: "4px 0 0" }}>
                          {res.description}
                        </p>
                      </div>
                      <span className={`badge ${res.unlock_threshold === 0 ? "unlocked" : ""}`}>
                        {res.unlock_threshold === 0
                          ? "Starter (0 Refs)"
                          : `${res.unlock_threshold} Referral${res.unlock_threshold === 1 ? "" : "s"}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 18 }}>
                <Link href="/register" className="btn full cyan">
                  <Sparkles size={15} /> Register to Access Student Dashboard <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </section>
        </>
      )}

      <PublicFooter />
    </div>
  );
}
