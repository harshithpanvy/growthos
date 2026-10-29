"use client";

import { useCallback, useEffect, useState } from "react";
import { FileSpreadsheet, RefreshCw } from "lucide-react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/UiStates";
import { authenticatedFetch } from "@/lib/supabase";
import type { AdminAuditLog } from "@/lib/types";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [entityFilter, setEntityFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          page: String(targetPage),
          page_size: "25"
        });
        if (entityFilter) params.set("entity_type", entityFilter);

        const res = await authenticatedFetch(`/api/admin/audit-logs?${params.toString()}`);
        const payload = await res.json();
        if (!res.ok) throw new Error(payload.error || "Failed to load audit logs.");
        setLogs(payload.logs ?? []);
        setPage(payload.pagination?.page ?? 1);
        setTotalPages(payload.pagination?.total_pages ?? 1);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audit logs.");
      } finally {
        setLoading(false);
      }
    },
    [entityFilter, page]
  );

  useEffect(() => {
    void loadLogs(1);
  }, [loadLogs]);

  return (
    <div>
      <header className="shell-header">
        <div>
          <h1>
            <FileSpreadsheet size={22} style={{ display: "inline", marginRight: 8, color: "var(--cyan)" }} />
            Immutable Administrator Audit Logs
          </h1>
          <span className="small">
            Every privileged operation (resource updates, campaign changes, attendance marking, referral review, and CSV
            exports) is logged here.
          </span>
        </div>
        <div className="inline-actions">
          <select
            className="input"
            style={{ width: 200 }}
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
          >
            <option value="">All Entities</option>
            <option value="resources">Resources</option>
            <option value="reward_rules">Reward Rules</option>
            <option value="campaigns">Campaigns</option>
            <option value="workshops">Workshops</option>
            <option value="attendance_records">Attendance Records</option>
            <option value="referral_attributions">Referral Reviews</option>
            <option value="project_submissions">Project Reviews</option>
            <option value="profiles">Student Data Exports</option>
          </select>
          <button type="button" className="btn sm secondary" onClick={() => void loadLogs(page)}>
            <RefreshCw size={13} /> Refresh
          </button>
        </div>
      </header>

      {loading ? (
        <LoadingSkeleton lines={5} height={110} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadLogs(page)} />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No Audit Log Entries Yet"
          description="Privileged administrator mutations and CSV exports will automatically append immutable records here."
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor Email</th>
                  <th>Action</th>
                  <th>Entity Type</th>
                  <th>Entity ID</th>
                  <th>Metadata</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id}>
                    <td>{new Date(log.created_at).toLocaleString()}</td>
                    <td>
                      <strong>{log.actor_email || log.actor_id || "System"}</strong>
                    </td>
                    <td>
                      <span className="badge">{log.action}</span>
                    </td>
                    <td>{log.entity_type}</td>
                    <td style={{ fontFamily: "monospace", fontSize: 12 }}>{log.entity_id || "—"}</td>
                    <td>
                      <code style={{ fontSize: 11.5, color: "var(--muted)" }}>
                        {JSON.stringify(log.metadata)}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="dash-head" style={{ marginTop: 14 }}>
            <span className="small">
              Page {page} of {totalPages}
            </span>
            <div className="inline-actions">
              <button
                type="button"
                className="btn sm secondary"
                disabled={page <= 1}
                onClick={() => void loadLogs(page - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn sm secondary"
                disabled={page >= totalPages}
                onClick={() => void loadLogs(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

