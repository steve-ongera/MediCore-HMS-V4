import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAssetMaintenanceRecords, completeAssetMaintenance } from "../../services/api";

export default function AssetMaintenance() {
  const [records, setRecords] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getAssetMaintenanceRecords(params);
      setRecords(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleComplete = async (id) => {
    try {
      await completeAssetMaintenance(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "SCHEDULED": "badge-warning",
      "IN_PROGRESS": "badge-info",
      "COMPLETED": "badge-success",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      "PREVENTIVE": "badge-primary",
      "CORRECTIVE": "badge-danger",
      "CALIBRATION": "badge-info",
      "INSPECTION": "badge-success",
    };
    return typeMap[type] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "—";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading && records.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading maintenance records...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Asset Management</div>
          <h1 className="page-title">Asset Maintenance</h1>
          <p className="page-subtitle">Manage all asset maintenance records</p>
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

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-funnel me-1"></i>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>Filter by Status</label>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "180px" }}
              >
                <option value="">All</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {records.length} record{records.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {records.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-tools"></i>
              </div>
              <h3 className="empty-state__title">No maintenance records found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No records with status "${statusFilter}" found.` 
                  : "Maintenance records will appear here once logged."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Asset</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Scheduled</th>
                    <th>Vendor</th>
                    <th className="cell-numeric">Cost</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((m) => (
                    <tr key={m.id}>
                      <td className="cell-primary">
                        <Link to={`/assets/${m.asset}`} className="table-row-avatar table-row-avatar--link">
                          <div>
                            <div className="cell-primary">{m.asset_name}</div>
                            <div className="text-2xs text-tertiary">{m.asset_tag}</div>
                          </div>
                        </Link>
                      </td>
                      <td>
                        <span className={`badge ${getTypeBadge(m.maintenance_type)}`}>
                          <span className="badge-dot"></span>
                          {m.maintenance_type}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(m.status)}`}>
                          <span className="badge-dot"></span>
                          {m.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{m.scheduled_date || "—"}</td>
                      <td>{m.vendor || "—"}</td>
                      <td className="cell-numeric">{formatCurrency(m.cost)}</td>
                      <td className="cell-actions">
                        {(m.status === "SCHEDULED" || m.status === "IN_PROGRESS") && (
                          <button className="btn btn-success btn-sm" onClick={() => handleComplete(m.id)}>
                            <i className="bi bi-check me-1"></i> Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {records.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {records.length} record{records.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Scheduled
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                In Progress
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Completed
              </span>
              <span className="badge badge-neutral">
                <span className="badge-dot"></span>
                Cancelled
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}