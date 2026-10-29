"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ClipboardCheck, RefreshCw } from "lucide-react";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/UiStates";
import { authenticatedFetch } from "@/lib/supabase";
import type { AttendanceRecord, Workshop } from "@/lib/types";

interface StudentBasic {
  id: string;
  full_name: string;
  email: string;
  college: string | null;
  graduation_year: string | null;
}

export default function AdminAttendancePage() {
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [students, setStudents] = useState<StudentBasic[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceRecord>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadAttendanceData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authenticatedFetch("/api/admin/workshop");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to load attendance data.");
      setWorkshop(payload.workshop ?? null);
      setStudents(payload.students ?? []);
      const map: Record<string, AttendanceRecord> = {};
      for (const rec of (payload.attendance_records ?? []) as AttendanceRecord[]) {
        map[rec.user_id] = rec;
      }
      setAttendanceMap(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load attendance records.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAttendanceData();
  }, [loadAttendanceData]);

  async function markAttendance(userId: string, status: "registered" | "attended" | "absent") {
    setUpdatingId(userId);
    setFeedback(null);
    try {
      const res = await authenticatedFetch("/api/admin/workshop", {
        method: "POST",
        body: JSON.stringify({
          workshop_id: workshop?.id,
          user_id: userId,
          status
        })
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Failed to update attendance.");
      setAttendanceMap(prev => ({
        ...prev,
        [userId]: payload.attendance as AttendanceRecord
      }));
      setFeedback({
        type: "success",
        text: `Attendance updated to '${status}' and recorded in the audit log.`
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to update attendance."
      });
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <LoadingSkeleton lines={5} height={100} />;
  if (error) return <ErrorState message={error} onRetry={() => void loadAttendanceData()} />;

  return (
    <div>
      <header className="shell-header">
        <div>
          <h1>
            <ClipboardCheck size={22} style={{ display: "inline", marginRight: 8, color: "var(--cyan)" }} />
            Workshop Attendance Management
          </h1>
          <span className="small">
            Mark student attendance manually. Every change records the administrator actor and timestamp in PostgreSQL.
          </span>
        </div>
        <button type="button" className="btn sm secondary" onClick={() => void loadAttendanceData()}>
          <RefreshCw size={13} /> Refresh
        </button>
      </header>

      {feedback && (
        <div className={`message ${feedback.type}`}>
          {feedback.type === "error" ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <div>{feedback.text}</div>
        </div>
      )}

      {students.length === 0 ? (
        <EmptyState
          title="No Registered Students Yet"
          description="Once students register for the workshop, you can mark their live session attendance here."
        />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Email</th>
                  <th>College</th>
                  <th>Current Status</th>
                  <th>Last Marked At</th>
                  <th>Mark Attendance</th>
                </tr>
              </thead>
              <tbody>
                {students.map(s => {
                  const rec = attendanceMap[s.id];
                  const status = rec?.status || "not_marked";
                  return (
                    <tr key={s.id}>
                      <td>
                        <strong>{s.full_name}</strong>
                      </td>
                      <td>{s.email}</td>
                      <td>{s.college || "—"}</td>
                      <td>
                        <span
                          className={`pill ${
                            status === "attended"
                              ? "green"
                              : status === "absent"
                                ? "danger"
                                : "amber"
                          }`}
                        >
                          {status}
                        </span>
                      </td>
                      <td>{rec?.marked_at ? new Date(rec.marked_at).toLocaleString() : "—"}</td>
                      <td>
                        <div className="inline-actions">
                          <button
                            type="button"
                            className={`btn sm ${status === "attended" ? "cyan" : "secondary"}`}
                            disabled={updatingId === s.id}
                            onClick={() => void markAttendance(s.id, "attended")}
                          >
                            Attended
                          </button>
                          <button
                            type="button"
                            className={`btn sm ${status === "absent" ? "danger" : "ghost"}`}
                            disabled={updatingId === s.id}
                            onClick={() => void markAttendance(s.id, "absent")}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

