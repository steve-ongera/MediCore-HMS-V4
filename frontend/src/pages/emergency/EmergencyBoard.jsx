import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getActiveEmergencyVisits } from "../../services/api";

const TRIAGE_META = {
  1: { label: "Resuscitation", badge: "badge-danger" },
  2: { label: "Emergent", badge: "badge-warning" },
  3: { label: "Urgent", badge: "badge-primary" },
  4: { label: "Less Urgent", badge: "badge-info" },
  5: { label: "Non-Urgent", badge: "badge-neutral" },
};

export default function EmergencyBoard() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getActiveEmergencyVisits();
      setVisits(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading emergency board...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Emergency Department</div>
          <h1 className="page-title">Emergency Board</h1>
          <p className="page-subtitle">Active emergency patients</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
          <Link to="/emergency/register" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i> Register Emergency
          </Link>
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

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-grid me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Active Patients</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {visits.length} patient{visits.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {visits.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-hospital"></i>
              </div>
              <h3 className="empty-state__title">No active emergency patients</h3>
              <p className="empty-state__desc">The emergency department is currently empty.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Visit #</th>
                    <th>Patient</th>
                    <th>Bay</th>
                    <th>Triage</th>
                    <th>Arrival Mode</th>
                    <th className="cell-numeric">Duration (hrs)</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => {
                    const triage = TRIAGE_META[v.triage_level] || { label: "—", badge: "badge-neutral" };
                    const duration = Number(v.duration_hours) || 0;
                    const durationColor = duration > 4 ? "var(--danger-strong)" :
                                         duration > 2 ? "var(--warning-strong)" :
                                         "var(--text-primary)";

                    return (
                      <tr key={v.id}>
                        <td className="cell-mono">{v.visit_number}</td>
                        <td className="cell-primary">{v.patient_name}</td>
                        <td>{v.bay_number || "—"}</td>
                        <td>
                          <span className={`badge ${triage.badge}`}>
                            <span className="badge-dot"></span>
                            {triage.label}
                          </span>
                        </td>
                        <td>
                          <span className="tag">{v.arrival_mode}</span>
                        </td>
                        <td className="cell-numeric" style={{ color: durationColor, fontWeight: 600 }}>
                          {duration.toFixed(1)}
                        </td>
                        <td className="cell-actions">
                          <Link to={`/emergency/${v.id}`} className="btn btn-secondary btn-sm">
                            <i className="bi bi-eye me-1"></i> View
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {visits.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {visits.length} active patient{visits.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-danger"><span className="badge-dot"></span>Resuscitation</span>
              <span className="badge badge-warning"><span className="badge-dot"></span>Emergent</span>
              <span className="badge badge-primary"><span className="badge-dot"></span>Urgent</span>
              <span className="badge badge-info"><span className="badge-dot"></span>Less Urgent</span>
              <span className="badge badge-neutral"><span className="badge-dot"></span>Non-Urgent</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}