import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTodaysDialysisSessions, getDialysisMachines } from "../../services/api";

export default function DialysisSessionsToday() {
  const [sessions, setSessions] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [s, m] = await Promise.all([getTodaysDialysisSessions(), getDialysisMachines()]);
      setSessions(s);
      setMachines(m.results ?? m);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "AVAILABLE": "badge-success",
      "IN_USE": "badge-danger",
      "UNDER_MAINTENANCE": "badge-warning",
      "OUT_OF_SERVICE": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getSessionStatusBadge = (status) => {
    const statusMap = {
      "SCHEDULED": "badge-warning",
      "IN_PROGRESS": "badge-primary",
      "COMPLETED": "badge-success",
      "CANCELLED": "badge-neutral",
      "NO_SHOW": "badge-danger",
    };
    return statusMap[status] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading && sessions.length === 0 && machines.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading dialysis data...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Dialysis</div>
          <h1 className="page-title">Today's Dialysis Sessions</h1>
          <p className="page-subtitle">Real-time dialysis schedule</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-2"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-grid me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Machines</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {machines.length} machine{machines.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {machines.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-grid"></i>
              </div>
              <h3 className="empty-state__title">No machines configured</h3>
              <p className="empty-state__desc">Dialysis machines need to be set up.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Machine</th>
                    <th className="cell-numeric">Rate/Session</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {machines.map((m) => (
                    <tr key={m.id}>
                      <td className="cell-primary">{m.machine_number}</td>
                      <td className="cell-numeric">{formatCurrency(m.rate_per_session)}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(m.status)}`}>
                          <span className="badge-dot"></span>
                          {m.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {machines.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {machines.length} machine{machines.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Available
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                In Use
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Maintenance
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Sessions</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {sessions.length} session{sessions.length !== 1 ? "s" : ""} today
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No sessions scheduled today</h3>
              <p className="empty-state__desc">The dialysis schedule is empty for today.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Session #</th>
                    <th>Patient</th>
                    <th>Machine</th>
                    <th>Scheduled</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="cell-mono">{s.session_number}</td>
                      <td className="cell-primary">{s.patient_name}</td>
                      <td>{s.machine_number || "Unassigned"}</td>
                      <td>{new Date(s.scheduled_date).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${getSessionStatusBadge(s.status)}`}>
                          <span className="badge-dot"></span>
                          {s.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <Link to={`/dialysis/sessions/${s.id}`} className="btn btn-secondary btn-sm">
                          <i className="bi bi-eye me-1"></i> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {sessions.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {sessions.length} session{sessions.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Scheduled
              </span>
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                In Progress
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Completed
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                No Show
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}