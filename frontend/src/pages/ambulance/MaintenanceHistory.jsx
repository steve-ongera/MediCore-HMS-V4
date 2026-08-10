import { useEffect, useState } from "react";
import { getAmbulanceMaintenanceLogs } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";

export default function MaintenanceHistory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAmbulanceMaintenanceLogs({ page_size: 100 });
      setLogs(data.results ?? data);
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
        <span className="loading-screen__label">Loading maintenance history...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Ambulance Services</div>
          <h1 className="page-title">Ambulance Maintenance History</h1>
          <p className="page-subtitle">Track all maintenance records</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise  me-1"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle  me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history  me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Maintenance Records</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {logs.length} record{logs.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-tools"></i>
              </div>
              <h3 className="empty-state__title">No maintenance records</h3>
              <p className="empty-state__desc">No maintenance logs have been recorded yet.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vehicle</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Vendor</th>
                    <th className="cell-numeric">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td className="cell-primary">{l.ambulance_registration}</td>
                      <td>
                        <span className="tag">{l.maintenance_type}</span>
                      </td>
                      <td>{l.service_date}</td>
                      <td>{l.vendor || "—"}</td>
                      <td className="cell-numeric">{l.cost ? formatCurrency(l.cost) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {logs.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {logs.length} maintenance record{logs.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}