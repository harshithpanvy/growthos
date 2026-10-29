"use client";

import Link from "next/link";
import { useState } from "react";
import {
  AlertCircle,
  BookOpen,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Lock,
  Share2,
  Unlock
} from "lucide-react";
import { useStudentDashboard } from "@/components/StudentDashboardContext";
import { EmptyState } from "@/components/UiStates";
import { authenticatedFetch } from "@/lib/supabase";

interface AuthorizedResourceDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  resource_type: string;
  unlock_threshold: number;
  content_markdown: string | null;
  external_url: string | null;
  signed_download_url: string | null;
}

export default function StudentResourcesPage() {
  const { data } = useStudentDashboard();
  const resources = data?.resources ?? [];
  const qualifiedCount = data?.referrals.qualified_count ?? 0;

  const [activeResource, setActiveResource] = useState<AuthorizedResourceDetail | null>(null);
  const [loadingResource, setLoadingResource] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedContent, setCopiedContent] = useState(false);

  async function handleInspectResource(resourceId: string) {
    setLoadingResource(resourceId);
    setErrorMessage(null);
    try {
      const res = await authenticatedFetch(`/api/student/resources/${encodeURIComponent(resourceId)}/download`);
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "You do not have access to this resource yet.");
      }
      setActiveResource(payload.resource as AuthorizedResourceDetail);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unable to load resource content.");
    } finally {
      setLoadingResource(null);
    }
  }

  async function handleCopyMarkdown(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedContent(true);
      setTimeout(() => setCopiedContent(false), 1800);
    } catch {
      // ignore
    }
  }

  function handleDownloadMarkdownFile(resource: AuthorizedResourceDetail) {
    if (!resource.content_markdown) return;
    const blob = new Blob([resource.content_markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resource.slug || "growthos-resource"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="dash-head" style={{ marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, font: "700 22px 'Space Grotesk', sans-serif" }}>
            <BookOpen size={19} style={{ display: "inline", marginRight: 8, color: "var(--cyan)" }} />
            Starter Kit & Milestone Learning Resources
          </h2>
          <p className="small" style={{ margin: "4px 0 0" }}>
            Your Starter Kit is unlocked immediately (0 referrals). Bonus resources unlock automatically as your
            verified referral count grows.
          </p>
        </div>
        <Link href="/dashboard/referrals" className="btn sm secondary">
          <Share2 size={14} /> Invite Classmates ({qualifiedCount} Qualified)
        </Link>
      </div>

      {errorMessage && (
        <div className="message error" role="alert">
          <AlertCircle size={17} />
          <div>{errorMessage}</div>
        </div>
      )}

      {resources.length === 0 ? (
        <EmptyState
          title="No Learning Resources Published Yet"
          description="The workshop administrator has not published any learning resources yet."
        />
      ) : (
        <div className="dash-grid">
          {/* Left: Resource List */}
          <div className="card">
            <h3>Available & Milestone-Gated Resources</h3>
            <p className="small">
              Access is verified on the server against your qualified referral count ({qualifiedCount}):
            </p>

            {resources.map(res => {
              const unlocked = Boolean(res.unlocked || qualifiedCount >= res.unlock_threshold);
              const isSelected = activeResource?.id === res.id || activeResource?.slug === res.slug;
              return (
                <div
                  key={res.id}
                  className={`resource ${unlocked ? "unlocked-card" : "locked"}`}
                  style={{
                    borderColor: isSelected ? "var(--cyan)" : undefined
                  }}
                >
                  <div>
                    <div className="inline-actions" style={{ marginBottom: 4 }}>
                      {unlocked ? (
                        <Unlock size={14} style={{ color: "var(--green)" }} />
                      ) : (
                        <Lock size={14} style={{ color: "var(--muted)" }} />
                      )}
                      <strong style={{ fontSize: 14 }}>{res.title}</strong>
                      <span className="badge">{res.resource_type}</span>
                    </div>
                    <p className="small" style={{ margin: 0 }}>
                      {res.description}
                    </p>
                  </div>

                  <div>
                    {unlocked ? (
                      <button
                        type="button"
                        className="btn sm cyan"
                        disabled={loadingResource === res.id}
                        onClick={() => void handleInspectResource(res.id)}
                      >
                        <Eye size={13} />{" "}
                        {loadingResource === res.id ? "Loading…" : "Access Resource"}
                      </button>
                    ) : (
                      <span className="badge">
                        Requires {res.unlock_threshold} Referral{res.unlock_threshold === 1 ? "" : "s"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right: Authorized Resource Viewer / Downloader */}
          <div className="card">
            {activeResource ? (
              <>
                <div className="dash-head">
                  <div>
                    <span className="pill green">
                      <Unlock size={12} /> Server-Authorized Access
                    </span>
                    <h3 style={{ marginTop: 8 }}>{activeResource.title}</h3>
                  </div>
                  <div className="inline-actions">
                    {activeResource.content_markdown && (
                      <>
                        <button
                          type="button"
                          className="btn sm secondary"
                          onClick={() => void handleCopyMarkdown(activeResource.content_markdown!)}
                        >
                          <Copy size={13} /> {copiedContent ? "Copied!" : "Copy"}
                        </button>
                        <button
                          type="button"
                          className="btn sm cyan"
                          onClick={() => handleDownloadMarkdownFile(activeResource)}
                        >
                          <Download size={13} /> Download .md
                        </button>
                      </>
                    )}
                  </div>
                </div>

                <p className="small">{activeResource.description}</p>

                {activeResource.signed_download_url && (
                  <div style={{ marginTop: 12 }}>
                    <a
                      href={activeResource.signed_download_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn cyan"
                    >
                      <Download size={15} /> Download Protected File (Signed URL)
                    </a>
                  </div>
                )}

                {activeResource.external_url && (
                  <div style={{ marginTop: 12 }}>
                    <a
                      href={activeResource.external_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn secondary"
                    >
                      <ExternalLink size={15} /> Open External Resource Link
                    </a>
                  </div>
                )}

                {activeResource.content_markdown && (
                  <pre className="code-block" style={{ marginTop: 14, maxHeight: 460, overflowY: "auto" }}>
                    {activeResource.content_markdown}
                  </pre>
                )}
              </>
            ) : (
              <EmptyState
                title="Select an Unlocked Resource"
                description="Click 'Access Resource' on any unlocked item on the left (starting with the AI Project Starter Kit) to view or download its contents."
                actionLabel="Open Starter Kit"
                onAction={() => {
                  const starter = resources.find(r => r.unlock_threshold === 0) ?? resources[0];
                  if (starter) void handleInspectResource(starter.id);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

