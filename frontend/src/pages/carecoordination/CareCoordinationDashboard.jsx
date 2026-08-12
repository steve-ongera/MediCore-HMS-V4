import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { getFollowUpDashboard, getMyFollowUpTasks, getOverdueFollowUps } from "../../services/api";

const COLORS = ["#2962FF", "#FFAB00", "#FF5252", "#00C48C", "#9333EA", "#64748b"];

export default function CareCoordinationDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [d, mt, ov] = await Promise.all([
        getFollowUpDashboard(),
        getMyFollowUpTasks(),
        getOverdueFollowUps()
      ]);
      setDashboard(d);
      setMyTasks(mt);
      setOverdue(ov);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "PENDING": "badge-warning",
      "IN_PROGRESS": "badge-info",
      "COMPLETED": "badge-success",
      "OVERDUE": "badge-danger",
      "ESCALATED": "badge-danger",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getStatusLabel = (status) => {
    return status?.replace("_", " ") || status;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading dashboard...</span>
      </div>
    );
  }

  if (!dashboard) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Clinical</div>
          <h1 className="page-title">Care Coordination</h1>
          <p className="page-subtitle">
            Patient follow-up tracking, chronic disease monitoring, and missed-appointment escalation across the whole hospital.
          </p>
        </div>
        <div className="page-header__actions">
          <Link to="/care-coordination/care-plans" className="btn btn-primary btn-sm">
            <i className="bi bi-file-text me-1"></i>
            All Care Plans
          </Link>
          <Link to="/care-coordination/all-tasks" className="btn btn-secondary btn-sm">
            <i className="bi bi-list-check me-1"></i>
            All Follow-up Tasks
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

      {/* Stats Grid */}
      <div className="stat-grid" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card">
          <div className="stat-card__top">
            <div className="stat-card__label">Due Today</div>
            <div className="stat-card__icon tone-info">
              <i className="bi bi-calendar-check"></i>
            </div>
          </div>
          <div className="stat-card__value">{dashboard.due_today || 0}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <div className="stat-card__label">Overdue</div>
            <div className="stat-card__icon tone-warning">
              <i className="bi bi-clock-alert"></i>
            </div>
          </div>
          <div className="stat-card__value" style={{ color: "var(--warning-strong)" }}>
            {dashboard.overdue || 0}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <div className="stat-card__label">Escalated</div>
            <div className="stat-card__icon tone-danger">
              <i className="bi bi-exclamation-triangle"></i>
            </div>
          </div>
          <div className="stat-card__value" style={{ color: "var(--danger-strong)" }}>
            {dashboard.escalated || 0}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <div className="stat-card__label">Missed This Month</div>
            <div className="stat-card__icon tone-warning">
              <i className="bi bi-x-circle"></i>
            </div>
          </div>
          <div className="stat-card__value">{dashboard.missed_this_month || 0}</div>
        </div>
      </div>

      {/* Chart */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">Follow-up Status Distribution</h5>
        </div>
        <div className="card-body">
          <div style={{ width: "100%", height: "280px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dashboard.by_status || []}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {(dashboard.by_status || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* My Tasks */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">My Follow-up Tasks</h5>
          <div>
            <span className="text-tertiary text-sm">
              {myTasks.length} task{myTasks.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {myTasks.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-6)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <div className="empty-state__title">No tasks assigned</div>
              <div className="empty-state__desc">No follow-up tasks assigned to you.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Task</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myTasks.map((t) => (
                      <tr
                        key={t.id}
                        className="is-clickable"
                        style={{
                          background: t.status === "OVERDUE" || t.status === "ESCALATED"
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
                        <td>{t.description}</td>
                        <td className="text-sm text-muted">{t.due_date}</td>
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
      </div>

      {/* Overdue / Escalated */}
      <div className="card">
        <div className="card-header">
          <h5 className="card-title">Overdue / Escalated (All)</h5>
          <div>
            <span className="text-tertiary text-sm">
              {overdue.length} task{overdue.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {overdue.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-6)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <div className="empty-state__title">Nothing overdue</div>
              <div className="empty-state__desc">No overdue or escalated tasks right now.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Task</th>
                      <th>Due</th>
                      <th>Assigned To</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdue.map((t) => (
                      <tr
                        key={t.id}
                        className="is-clickable"
                        style={{ background: "var(--danger-soft)" }}
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
                        <td>{t.description}</td>
                        <td className="text-sm text-muted">{t.due_date}</td>
                        <td>{t.assigned_to_name || "Unassigned"}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(t.status)}`}>
                            <span className="badge-dot"></span>
                            {getStatusLabel(t.status)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}