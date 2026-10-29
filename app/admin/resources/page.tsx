"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertCircle, BookOpen, CheckCircle2, Edit3, Plus, Save } from "lucide-react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/UiStates";
import { authenticatedFetch } from "@/lib/supabase";
import type { LearningResource, ResourceType, RewardRule } from "@/lib/types";

interface AdminResourceRow extends LearningResource {
  access_count?: number;
}

interface AdminRewardRuleRow extends RewardRule {
  unlock_count?: number;
}

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<AdminResourceRow[]>([]);
  const [rewardRules, setRewardRules] = useState<AdminRewardRuleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Resource Editor State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [resourceType, setResourceType] = useState<ResourceType>("guide");
  const [unlockThreshold, setUnlockThreshold] = useState(0);
  const [contentMarkdown, setContentMarkdown] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [storageBucket, setStorageBucket] = useState("");
  const [storagePath, setStoragePath] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [isArchived, setIsArchived] = useState(false);
  const [saving, setSaving] = useState(false);

  // New Reward Rule Creator State
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleDesc, setNewRuleDesc] = useState("");
  const [newRuleThreshold, setNewRuleThreshold] = useState(0);
  const [savingRule, setSavingRule] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/admin/resources");
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to load resources.");
      }
      setResources(payload.resources ?? []);
      setRewardRules(payload.reward_rules ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load resources.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function resetForm() {
    setEditingId(null);
    setSlug("");
    setTitle("");
    setDescription("");
    setResourceType("guide");
    setUnlockThreshold(0);
    setContentMarkdown("");
    setExternalUrl("");
    setStorageBucket("");
    setStoragePath("");
    setIsPublished(true);
    setIsArchived(false);
  }

  function startEdit(res: AdminResourceRow) {
    setEditingId(res.id);
    setSlug(res.slug);
    setTitle(res.title);
    setDescription(res.description);
    setResourceType(res.resource_type);
    setUnlockThreshold(res.unlock_threshold);
    setContentMarkdown(res.content_markdown || "");
    setExternalUrl(res.external_url || "");
    setStorageBucket(res.storage_bucket || "");
    setStoragePath(res.storage_path || "");
    setIsPublished(res.is_published);
    setIsArchived(res.is_archived);
  }

  async function handleSaveResource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback(null);

    try {
      const method = editingId ? "PATCH" : "POST";
      const res = await authenticatedFetch("/api/admin/resources", {
        method,
        body: JSON.stringify({
          id: editingId ?? undefined,
          slug,
          title,
          description,
          resource_type: resourceType,
          unlock_threshold: Number(unlockThreshold),
          content_markdown: contentMarkdown || null,
          external_url: externalUrl || null,
          storage_bucket: storageBucket || null,
          storage_path: storagePath || null,
          is_published: isPublished,
          is_archived: isArchived
        })
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error || "Failed to save resource.");
      }

      setFeedback({
        type: "success",
        text: editingId
          ? "Resource updated and audit log recorded."
          : "New resource created and audit log recorded."
      });
      resetForm();
      await loadData();
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save resource."
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateRewardRule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingRule) return;
    setSavingRule(true);
    setFeedback(null);

    try {
      const res = await authenticatedFetch("/api/admin/resources", {
        method: "POST",
        body: JSON.stringify({
          entity: "reward_rule",
          milestone_name: newRuleName,
          description: newRuleDesc,
          required_referrals: Number(newRuleThreshold)
        })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to create milestone rule.");
      setNewRuleName("");
      setNewRuleDesc("");
      setNewRuleThreshold(0);
      setFeedback({ type: "success", text: "New reward milestone rule saved in PostgreSQL." });
      await loadData();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Failed to create rule." });
    } finally {
      setSavingRule(false);
    }
  }

  async function handleUpdateRuleThreshold(rule: AdminRewardRuleRow, newThreshold: number) {
    setFeedback(null);
    try {
      const res = await authenticatedFetch("/api/admin/resources", {
        method: "PATCH",
        body: JSON.stringify({
          entity: "reward_rule",
          id: rule.id,
          milestone_name: rule.milestone_name,
          description: rule.description,
          required_referrals: newThreshold,
          is_active: rule.is_active
        })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to update milestone rule.");
      setFeedback({ type: "success", text: `Updated threshold for "${rule.milestone_name}" to ${newThreshold} referrals.` });
      await loadData();
    } catch (err) {
      setFeedback({ type: "error", text: err instanceof Error ? err.message : "Update failed." });
    }
  }

  if (loading) return <LoadingSkeleton lines={5} height={110} />;
  if (error) return <ErrorState message={error} onRetry={() => void loadData()} />;

  return (
    <div>
      <header className="shell-header">
        <div>
          <h1>
            <BookOpen size={22} style={{ display: "inline", marginRight: 8, color: "var(--cyan)" }} />
            Learning Resources & Reward Milestones
          </h1>
          <span className="small">
            Manage database-backed resources, publish status, private storage paths, and unlock thresholds.
          </span>
        </div>
        {editingId && (
          <button type="button" className="btn sm secondary" onClick={resetForm}>
            <Plus size={14} /> Create New Resource Instead
          </button>
        )}
      </header>

      {feedback && (
        <div className={`message ${feedback.type}`}>
          {feedback.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <div>{feedback.text}</div>
        </div>
      )}

      <div className="dash-grid">
        {/* Left: Create / Edit Resource Form */}
        <section className="card">
          <h3>{editingId ? `Edit Resource: ${title}` : "Create New Learning Resource"}</h3>
          <form onSubmit={handleSaveResource}>
            <label className="field">
              <span>Resource Title *</span>
              <input
                required
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Enter resource title"
              />
            </label>

            <div className="two">
              <label className="field">
                <span>Resource Type *</span>
                <select
                  value={resourceType}
                  onChange={e => setResourceType(e.target.value as ResourceType)}
                >
                  <option value="guide">Guide</option>
                  <option value="prompt_pack">Prompt Pack</option>
                  <option value="template">Project Template</option>
                  <option value="roadmap">Learning Roadmap</option>
                  <option value="checklist">Checklist</option>
                  <option value="link">Curated External Link</option>
                </select>
              </label>

              <label className="field">
                <span>Unlock Threshold (Qualified Referrals) *</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  required
                  value={unlockThreshold}
                  onChange={e => setUnlockThreshold(Number(e.target.value))}
                />
              </label>
            </div>

            <label className="field">
              <span>Short Description *</span>
              <input
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Explain what students learn or unlock with this resource..."
              />
            </label>

            <label className="field">
              <span>Protected Markdown Content (Served only to eligible students)</span>
              <textarea
                value={contentMarkdown}
                onChange={e => setContentMarkdown(e.target.value)}
                placeholder="Write markdown content..."
              />
            </label>

            <label className="field">
              <span>External Resource URL (Optional)</span>
              <input
                type="url"
                value={externalUrl}
                onChange={e => setExternalUrl(e.target.value)}
                placeholder="https://..."
              />
            </label>

            <div className="two">
              <label className="field">
                <span>Private Storage Bucket (Optional)</span>
                <input
                  value={storageBucket}
                  onChange={e => setStorageBucket(e.target.value)}
                  placeholder="e.g., growthos-resources"
                />
              </label>
              <label className="field">
                <span>Private Storage File Path (Optional)</span>
                <input
                  value={storagePath}
                  onChange={e => setStoragePath(e.target.value)}
                  placeholder="e.g., guides/starter-kit.pdf"
                />
              </label>
            </div>

            <div className="two" style={{ margin: "12px 0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={e => setIsPublished(e.target.checked)}
                />
                Published (Visible to students)
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input
                  type="checkbox"
                  checked={isArchived}
                  onChange={e => setIsArchived(e.target.checked)}
                />
                Archived
              </label>
            </div>

            <button type="submit" className="btn cyan full" disabled={saving}>
              <Save size={15} /> {saving ? "Saving…" : editingId ? "Save Resource Updates" : "Create Resource"}
            </button>
          </form>
        </section>

        {/* Right: Existing Resources & Milestone Rules from PostgreSQL */}
        <div>
          <section className="card" style={{ marginBottom: 18 }}>
            <h3>Database Resources ({resources.length})</h3>
            {resources.length === 0 ? (
              <EmptyState
                title="No Resources in Database"
                description="Use the form on the left to add your first learning resource to PostgreSQL."
              />
            ) : (
              resources.map(res => (
                <div key={res.id} className="resource unlocked-card" style={{ margin: "10px 0" }}>
                  <div>
                    <div className="inline-actions" style={{ marginBottom: 4 }}>
                      <strong>{res.title}</strong>
                      <span className="badge">{res.unlock_threshold} Referrals</span>
                      <span className={`pill ${res.is_published && !res.is_archived ? "green" : "amber"}`}>
                        {res.is_archived ? "Archived" : res.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                    <p className="small" style={{ margin: 0 }}>
                      {res.description} • Access events: <strong>{res.access_count ?? 0}</strong>
                    </p>
                  </div>
                  <button type="button" className="btn sm secondary" onClick={() => startEdit(res)}>
                    <Edit3 size={13} /> Edit
                  </button>
                </div>
              ))
            )}
          </section>

          <section className="card">
            <h3>Reward Milestone Rules ({rewardRules.length})</h3>
            {rewardRules.length === 0 ? (
              <p className="small">No reward milestone rules in database yet. Create one below:</p>
            ) : (
              rewardRules.map(rule => (
                <div key={rule.id} className="resource" style={{ margin: "8px 0" }}>
                  <div>
                    <strong>{rule.milestone_name}</strong>
                    <div className="small">
                      Required referrals: <strong>{rule.required_referrals}</strong> • Total student unlocks:{" "}
                      <strong>{rule.unlock_count ?? 0}</strong>
                    </div>
                  </div>
                  <div className="inline-actions">
                    {[0, 1, 2, 3, 5, 8].map(val => (
                      <button
                        key={val}
                        type="button"
                        className={`btn sm ${rule.required_referrals === val ? "cyan" : "ghost"}`}
                        onClick={() => void handleUpdateRuleThreshold(rule, val)}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}

            <form onSubmit={handleCreateRewardRule} className="notice" style={{ marginTop: 14 }}>
              <strong style={{ color: "var(--text)", display: "block", marginBottom: 8 }}>
                Add Reward Milestone Rule
              </strong>
              <div className="two">
                <input
                  className="input"
                  required
                  placeholder="Milestone Name"
                  value={newRuleName}
                  onChange={e => setNewRuleName(e.target.value)}
                />
                <input
                  className="input"
                  type="number"
                  min={0}
                  required
                  placeholder="Required Referrals"
                  value={newRuleThreshold}
                  onChange={e => setNewRuleThreshold(Number(e.target.value))}
                />
              </div>
              <input
                className="input"
                style={{ marginTop: 8 }}
                required
                placeholder="Description"
                value={newRuleDesc}
                onChange={e => setNewRuleDesc(e.target.value)}
              />
              <button type="submit" className="btn sm cyan" disabled={savingRule} style={{ marginTop: 8 }}>
                <Plus size={13} /> {savingRule ? "Adding…" : "Add Milestone Rule"}
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
