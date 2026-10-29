"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Download, Eye, Filter, Search, Users, X } from "lucide-react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/UiStates";
import { authenticatedFetch } from "@/lib/supabase";
import type { Profile } from "@/lib/types";

interface AdminStudentRow extends Profile {
  qualified_referrals_count: number;
  attendance_status: string;
}

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<AdminStudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [college, setCollege] = useState("");
  const [acquisitionSource, setAcquisitionSource] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [selectedStudent, setSelectedStudent] = useState<AdminStudentRow | null>(null);
  const [exporting, setExporting] = useState(false);

  const buildQueryString = useCallback(
    (targetPage: number, exportCsv = false) => {
      const params = new URLSearchParams();
      params.set("page", String(targetPage));
      params.set("page_size", "20");
      if (search.trim()) params.set("search", search.trim());
      if (graduationYear) params.set("graduation_year", graduationYear);
      if (college.trim()) params.set("college", college.trim());
      if (acquisitionSource) params.set("acquisition_source", acquisitionSource);
      if (dateFrom) params.set("date_from", dateFrom);
      if (dateTo) params.set("date_to", dateTo);
      if (exportCsv) params.set("export", "csv");
      return params.toString();
    },
    [search, graduationYear, college, acquisitionSource, dateFrom, dateTo]
  );

  const loadStudents = useCallback(
    async (targetPage = page) => {
      setLoading(true);
      setError(null);
      try {
        const qs = buildQueryString(targetPage, false);
        const res = await authenticatedFetch(`/api/admin/students?${qs}`);
        const payload = await res.json();
        if (!res.ok) {
          throw new Error(payload.error || "Failed to load student registrations.");
        }
        setStudents(payload.students ?? []);
        setPage(payload.pagination?.page ?? 1);
        setTotalPages(payload.pagination?.total_pages ?? 1);
        setTotalCount(payload.pagination?.total ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load students.");
      } finally {
        setLoading(false);
      }
    },
    [buildQueryString, page]
  );

  useEffect(() => {
    void loadStudents(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadStudents(1);
  }

  async function handleExportCsv() {
    setExporting(true);
    try {
      const qs = buildQueryString(1, true);
      const res = await authenticatedFetch(`/api/admin/students?${qs}`);
      if (!res.ok) {
        throw new Error("CSV export failed.");
      }
      const csvText = await res.text();
      const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `growthos-students-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <header className="shell-header">
        <div>
          <h1>
            <Users size={22} style={{ display: "inline", marginRight: 8, color: "var(--cyan)" }} />
            Student Registrations ({totalCount})
          </h1>
          <span className="small">
            Server-paginated student records. Exporting to CSV is recorded in the administrator audit log.
          </span>
        </div>
        <button
          type="button"
          className="btn sm cyan"
          disabled={exporting || totalCount === 0}
          onClick={() => void handleExportCsv()}
        >
          <Download size={14} /> {exporting ? "Exporting CSV…" : "Export Filtered CSV"}
        </button>
      </header>

      {/* Search & Filter Form */}
      <form onSubmit={handleSearchSubmit} className="card" style={{ marginBottom: 18 }}>
        <div className="dash-head" style={{ marginBottom: 8 }}>
          <strong style={{ fontSize: 13.5, display: "flex", alignItems: "center", gap: 6 }}>
            <Filter size={14} style={{ color: "var(--cyan)" }} /> Search & Filter Students
          </strong>
          <button
            type="button"
            className="btn sm ghost"
            onClick={() => {
              setSearch("");
              setGraduationYear("");
              setCollege("");
              setAcquisitionSource("");
              setDateFrom("");
              setDateTo("");
              setTimeout(() => void loadStudents(1), 0);
            }}
          >
            Reset Filters
          </button>
        </div>

        <div className="three">
          <label className="field">
            <span>Search Name, Email, or Referral Code</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="e.g., Aarav, @college.edu, GROW-"
            />
          </label>

          <label className="field">
            <span>College / University Filter</span>
            <input
              value={college}
              onChange={e => setCollege(e.target.value)}
              placeholder="e.g., JNTU, VIT, SRM"
            />
          </label>

          <label className="field">
            <span>Graduation Year</span>
            <select value={graduationYear} onChange={e => setGraduationYear(e.target.value)}>
              <option value="">All Years</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
              <option value="2027">2027</option>
              <option value="2028">2028</option>
              <option value="2029">2029</option>
            </select>
          </label>
        </div>

        <div className="three">
          <label className="field">
            <span>Acquisition Source</span>
            <select value={acquisitionSource} onChange={e => setAcquisitionSource(e.target.value)}>
              <option value="">All Sources</option>
              <option value="College club / CR ambassador">College club / CR ambassador</option>
              <option value="WhatsApp peer referral">WhatsApp peer referral</option>
              <option value="WhatsApp / student community group">WhatsApp / student community group</option>
              <option value="Instagram / LinkedIn post">Instagram / LinkedIn post</option>
              <option value="Direct / Landing Page">Direct / Landing Page</option>
            </select>
          </label>

          <label className="field">
            <span>Registered From Date</span>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          </label>

          <label className="field">
            <span>Registered To Date</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          </label>
        </div>

        <button type="submit" className="btn sm cyan">
          <Search size={14} /> Apply Filters
        </button>
      </form>

      {loading ? (
        <LoadingSkeleton lines={5} height={100} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void loadStudents(page)} />
      ) : students.length === 0 ? (
        <EmptyState
          title="No Matching Student Registrations"
          description="No student profiles matched your current filters, or no students have registered yet."
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email (Admin Only)</th>
                  <th>College</th>
                  <th>Batch</th>
                  <th>Registered</th>
                  <th>Source</th>
                  <th>Referral Status</th>
                  <th>Qualified Refs</th>
                  <th>Attendance</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.id}>
                    <td>
                      <strong>{s.full_name || "Unnamed"}</strong>
                      {s.role === "admin" && (
                        <span className="badge amber" style={{ marginLeft: 6 }}>
                          Admin
                        </span>
                      )}
                    </td>
                    <td>{s.email}</td>
                    <td>{s.college || "—"}</td>
                    <td>{s.graduation_year || "—"}</td>
                    <td>{new Date(s.created_at).toLocaleDateString()}</td>
                    <td>{s.acquisition_source || "Direct"}</td>
                    <td>
                      {s.referred_by ? (
                        <span className="pill green">Referred</span>
                      ) : (
                        <span className="badge">Direct</span>
                      )}
                    </td>
                    <td>
                      <strong>{s.qualified_referrals_count}</strong>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          s.attendance_status === "attended"
                            ? "unlocked"
                            : s.attendance_status === "absent"
                              ? "danger"
                              : ""
                        }`}
                      >
                        {s.attendance_status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn sm secondary"
                        onClick={() => setSelectedStudent(s)}
                      >
                        <Eye size={12} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="dash-head" style={{ marginTop: 16 }}>
            <span className="small">
              Page {page} of {totalPages} ({totalCount} total students)
            </span>
            <div className="inline-actions">
              <button
                type="button"
                className="btn sm secondary"
                disabled={page <= 1}
                onClick={() => void loadStudents(page - 1)}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn sm secondary"
                disabled={page >= totalPages}
                onClick={() => void loadStudents(page + 1)}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Student Detail Drawer / Modal */}
      {selectedStudent && (
        <div
          className="card"
          style={{
            marginTop: 18,
            borderColor: "var(--cyan)"
          }}
        >
          <div className="dash-head">
            <h3>Student Record Inspector: {selectedStudent.full_name}</h3>
            <button
              type="button"
              className="btn sm ghost"
              onClick={() => setSelectedStudent(null)}
            >
              <X size={14} /> Close
            </button>
          </div>
          <div className="three" style={{ marginTop: 12 }}>
            <div>
              <span className="small">User UUID</span>
              <div style={{ fontSize: 12.5, fontFamily: "monospace" }}>{selectedStudent.id}</div>
            </div>
            <div>
              <span className="small">Email Address</span>
              <div>{selectedStudent.email}</div>
            </div>
            <div>
              <span className="small">Referral Code</span>
              <div>
                <span className="badge unlocked">{selectedStudent.referral_code}</span>
              </div>
            </div>
            <div>
              <span className="small">UTM Source / Medium / Campaign</span>
              <div style={{ fontSize: 13 }}>
                {selectedStudent.utm_source || "—"} / {selectedStudent.utm_medium || "—"} /{" "}
                {selectedStudent.utm_campaign || "—"}
              </div>
            </div>
            <div>
              <span className="small">Referred By User ID</span>
              <div style={{ fontSize: 12.5, fontFamily: "monospace" }}>
                {selectedStudent.referred_by || "None (Direct signup)"}
              </div>
            </div>
            <div>
              <span className="small">Qualified Referrals Generated</span>
              <div>
                <strong>{selectedStudent.qualified_referrals_count}</strong>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

