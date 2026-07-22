import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDialysisPatients } from "../../services/api";

export default function DialysisPatients() {
  const [patients, setPatients] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getDialysisPatients(params);
      setPatients(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "ACTIVE": "badge-success",
      "TRANSFERRED": "badge-primary",
      "TRANSPLANTED": "badge-info",
      "DECEASED": "badge-danger",
      "DISCONTINUED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getAccessTypeBadge = (type) => {
    const typeMap = {
      "AV_FISTULA": "badge-primary",
      "AV_GRAFT": "badge-info",
      "CATHETER": "badge-warning",
    };
    return typeMap[type] || "badge-neutral";
  };

  if (loading && patients.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading dialysis patients...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Dialysis</div>
          <h1 className="page-title">Dialysis Patients</h1>
          <p className="page-subtitle">Manage dialysis patient records</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
          <Link to="/dialysis/register" className="btn btn-primary">
            <i className="bi bi-person-plus me-2"></i> Register Patient
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
                <option value="ACTIVE">Active</option>
                <option value="TRANSFERRED">Transferred</option>
                <option value="TRANSPLANTED">Transplanted</option>
                <option value="DECEASED">Deceased</option>
                <option value="DISCONTINUED">Discontinued</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {patients.length} patient{patients.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {patients.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-people"></i>
              </div>
              <h3 className="empty-state__title">No dialysis patients found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No patients with status "${statusFilter}" found.` 
                  : "Register a new dialysis patient to get started."}
              </p>
              {!statusFilter && (
                <Link to="/dialysis/register" className="btn btn-primary">
                  <i className="bi bi-person-plus me-2"></i> Register Patient
                </Link>
              )}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Profile #</th>
                    <th>Patient</th>
                    <th>Access Type</th>
                    <th className="cell-numeric">Sessions/Week</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-mono">{p.profile_number}</td>
                      <td className="cell-primary">
                        {p.patient_name}
                        <div className="text-2xs text-tertiary">{p.hospital_number}</div>
                      </td>
                      <td>
                        <span className={`badge ${getAccessTypeBadge(p.vascular_access_type)}`}>
                          <span className="badge-dot"></span>
                          {p.vascular_access_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="cell-numeric">{p.sessions_per_week}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(p.status)}`}>
                          <span className="badge-dot"></span>
                          {p.status}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <Link to={`/dialysis/patients/${p.id}`} className="btn btn-secondary btn-sm">
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
        {patients.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {patients.length} patient{patients.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Active
              </span>
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                Transferred
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                Transplanted
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Deceased
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}