import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getICUBeds, getActiveICUAdmissions } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";

export default function ICUBoard() {
  const [beds, setBeds] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [b, a] = await Promise.all([getICUBeds(), getActiveICUAdmissions()]);
      setBeds(b.results ?? b);
      setAdmissions(a);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "AVAILABLE": "badge-success",
      "OCCUPIED": "badge-danger",
      "CLEANING": "badge-warning",
      "OUT_OF_SERVICE": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getUnitTypeBadge = (type) => {
    const typeMap = {
      "ICU": "badge-danger",
      "HDU": "badge-warning",
    };
    return typeMap[type] || "badge-neutral";
  };

  const getSeverityBadge = (score) => {
    if (score === undefined || score === null) return "badge-neutral";
    if (score >= 20) return "badge-danger";
    if (score >= 10) return "badge-warning";
    return "badge-success";
  };

  if (loading && beds.length === 0 && admissions.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading ICU board...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">ICU / HDU</div>
          <h1 className="page-title">ICU / HDU Board</h1>
          <p className="page-subtitle">Real-time ICU/HDU bed occupancy</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
          <Link to="/icu/admit" className="btn btn-primary">
            <i className="bi bi-person-plus me-2"></i> Admit to ICU
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

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-grid me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Beds</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {beds.length} bed{beds.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {beds.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-grid"></i>
              </div>
              <h3 className="empty-state__title">No beds configured</h3>
              <p className="empty-state__desc">ICU/HDU beds need to be set up.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Bed</th>
                    <th>Unit Type</th>
                    <th className="cell-numeric">Daily Rate</th>
                    <th>Ventilator</th>
                    <th>Status</th>
                    <th>Current Patient</th>
                  </tr>
                </thead>
                <tbody>
                  {beds.map((b) => (
                    <tr key={b.id}>
                      <td className="cell-primary">{b.bed_number}</td>
                      <td>
                        <span className={`badge ${getUnitTypeBadge(b.unit_type)}`}>
                          <span className="badge-dot"></span>
                          {b.unit_type}
                        </span>
                      </td>
                      <td className="cell-numeric">{formatCurrency(b.daily_rate)}</td>
                      <td>
                        <span className={`badge ${b.has_ventilator ? "badge-success" : "badge-neutral"}`}>
                          <span className="badge-dot"></span>
                          {b.has_ventilator ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(b.status)}`}>
                          <span className="badge-dot"></span>
                          {b.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        {b.current_patient ? (
                          <Link to={`/icu/${b.current_patient.icu_admission_id}`} className="btn btn-secondary btn-sm">
                            <i className="bi bi-eye me-1"></i>
                            {b.current_patient.patient_name}
                          </Link>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {beds.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {beds.length} bed{beds.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Available
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Occupied
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Cleaning
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Active ICU/HDU Admissions</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {admissions.length} admission{admissions.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {admissions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No active admissions</h3>
              <p className="empty-state__desc">No patients currently admitted to ICU/HDU.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Admission #</th>
                    <th>Patient</th>
                    <th>Bed</th>
                    <th>Reason</th>
                    <th>Severity Score</th>
                    <th className="cell-numeric">LOS (days)</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {admissions.map((a) => (
                    <tr key={a.id}>
                      <td className="cell-mono">{a.icu_admission_number}</td>
                      <td className="cell-primary">{a.patient_name}</td>
                      <td>
                        {a.bed_number}
                        <div className="text-2xs text-tertiary">{a.unit_type}</div>
                      </td>
                      <td>{a.admission_reason}</td>
                      <td>
                        <span className={`badge ${getSeverityBadge(a.severity_score)}`}>
                          <span className="badge-dot"></span>
                          {a.severity_score ?? "—"}
                        </span>
                      </td>
                      <td className="cell-numeric">{a.length_of_stay_days}</td>
                      <td className="cell-actions">
                        <Link to={`/icu/${a.id}`} className="btn btn-secondary btn-sm">
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
        {admissions.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {admissions.length} active admission{admissions.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Low Severity
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Moderate Severity
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                High Severity
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}