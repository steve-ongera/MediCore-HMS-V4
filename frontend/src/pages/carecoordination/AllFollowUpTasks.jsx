import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getFollowUpTasks } from "../../services/api";

export default function AllFollowUpTasks() {
  const [tasks, setTasks] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [statusFilter, typeFilter]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page_size: 200 };
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.task_type = typeFilter;
      const data = await getFollowUpTasks(params);
      setTasks(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "PENDING": "badge-warning",
      "DUE_TODAY": "badge-info",
      "OVERDUE": "badge-danger",
      "ESCALATED": "badge-danger",
      "COMPLETED": "badge-success",
      "MISSED": "badge-neutral",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getStatusLabel = (status) => {
    return status?.replace("_", " ") || status;
  };

  const getTaskTypeLabel = (type) => {
    return type?.replace("_", " ") || type;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Clinical / Care Coordination</div>
          <h1 className="page-title">All Follow-up Tasks</h1>
          <p className="page-subtitle">View and manage all follow-up tasks across the hospital</p>
        </div>
        <div className="page-header__actions">
          <Link to="/care-coordination" className="btn btn-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>
            Back to Dashboard
          </Link>
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap" style={{ flex: 1 }}>
            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: "160px" }}
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="DUE_TODAY">Due Today</option>
              <option value="OVERDUE">Overdue</option>
              <option value="ESCALATED">Escalated</option>
              <option value="COMPLETED">Completed</option>
              <option value="MISSED">Missed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <select
              className="select"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ width: "180px" }}
            >
              <option value="">All Types</option>
              <option value="CLINIC_REVIEW">Clinic Review</option>
              <option value="PENDING_INVESTIGATION">Pending Investigation</option>
              <option value="SPECIALIST_REVIEW">Specialist Review</option>
              <option value="REFERRAL_FOLLOWUP">Referral Follow-up</option>
              <option value="POST_DISCHARGE_CHECK">Post-Discharge Check</option>
              <option value="MEDICATION_REVIEW">Medication Review</option>
              <option value="OUTREACH_CALL">Outreach Call</option>
            </select>

            {(statusFilter || typeFilter) && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setStatusFilter("");
                  setTypeFilter("");
                }}
              >
                <i className="bi bi-x me-1"></i>
                Clear Filters
              </button>
            )}
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="loading-screen" style={{ minHeight: "200px" }}>
              <div className="spinner spinner-lg"></div>
              <span className="loading-screen__label">Loading tasks...</span>
            </div>
          ) : tasks.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-check2-circle"></i>
              </div>
              <div className="empty-state__title">No tasks found</div>
              <div className="empty-state__desc">
                {statusFilter || typeFilter
                  ? "No tasks match your filters."
                  : "No follow-up tasks have been created yet."}
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Care Plan</th>
                      <th>Task</th>
                      <th>Type</th>
                      <th>Due</th>
                      <th>Assigned</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasks.map((t) => (
                      <tr
                        key={t.id}
                        className="is-clickable"
                        style={{
                          background: ["OVERDUE", "ESCALATED"].includes(t.status)
                            ? "var(--danger-soft)"
                            : "inherit"
                        }}
                      >
                        <td>
                          <div className="table-row-avatar">
                            <span className="avatar avatar-sm">
                              {(t.patient_name || "?").charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <div className="cell-primary">{t.patient_name}</div>
                              <div className="text-2xs text-muted">{t.hospital_number || ""}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="text-sm">{t.care_plan_title}</span>
                        </td>
                        <td>{t.description}</td>
                        <td>
                          <span className="tag">{getTaskTypeLabel(t.task_type)}</span>
                        </td>
                        <td className="text-sm text-muted">{t.due_date}</td>
                        <td>{t.assigned_to_name || "—"}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(t.status)}`}>
                            <span className="badge-dot"></span>
                            {getStatusLabel(t.status)}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link
                            to={`/care-coordination/care-plans/${t.care_plan}`}
                            className="btn btn-secondary btn-sm"
                          >
                            <i className="bi bi-eye me-1"></i>
                            View Plan
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {!loading && tasks.length > 0 && (
          <div className="table-footer">
            <span className="table-footer__meta">
              Showing {tasks.length} task{tasks.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}