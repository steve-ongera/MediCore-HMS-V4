import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDoctorProfiles, getDoctorTreatmentHistory } from "../../services/api";

export default function TreatmentHistoryAll() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { 
        const data = await getDoctorProfiles(); 
        setDoctors(data.results ?? data); 
      } catch (err) { 
        setError(err.message); 
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const loadHistory = async (id) => {
    setSelectedDoctor(id);
    if (!id) { 
      setHistory([]); 
      return; 
    }
    setLoadingHistory(true);
    setError("");
    try { 
      const data = await getDoctorTreatmentHistory(id); 
      setHistory(data); 
    } catch (err) { 
      setError(err.message); 
    } finally {
      setLoadingHistory(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "ACTIVE": "badge-success",
      "IN_PROGRESS": "badge-warning",
      "COMPLETED": "badge-info",
      "CANCELLED": "badge-neutral",
      "DISCHARGED": "badge-success",
      "PENDING": "badge-warning",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getStatusLabel = (status) => {
    return status?.replace("_", " ") || status;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Clinical / Doctors</div>
          <h1 className="page-title">Treatment History</h1>
          <p className="page-subtitle">View treatment history by doctor</p>
        </div>
        <div className="page-header__actions">
          <Link to="/doctors" className="btn btn-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>
            Back to Doctors
          </Link>
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
          <div className="flex items-center gap-3 flex-wrap">
            <label className="field-label" style={{ marginBottom: 0 }} htmlFor="doctorSelect">
              Select Doctor
            </label>
            <select
              id="doctorSelect"
              className="select"
              value={selectedDoctor}
              onChange={(e) => loadHistory(e.target.value)}
              style={{ minWidth: "250px" }}
              disabled={loading}
            >
              <option value="">Select a doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.full_name} {d.specialty ? `(${d.specialty})` : ""}
                </option>
              ))}
            </select>
            {loading && <div className="spinner" style={{ width: "16px", height: "16px" }}></div>}
          </div>
          <div>
            {selectedDoctor && (
              <span className="text-tertiary text-sm">
                {history.length} treatment{history.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="card-body p-0">
          {loadingHistory ? (
            <div className="loading-screen" style={{ minHeight: "200px" }}>
              <div className="spinner spinner-lg"></div>
              <span className="loading-screen__label">Loading treatment history...</span>
            </div>
          ) : !selectedDoctor ? (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-clipboard2-pulse"></i>
              </div>
              <div className="empty-state__title">Select a doctor</div>
              <div className="empty-state__desc">Choose a doctor from the dropdown above to view their treatment history.</div>
            </div>
          ) : history.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-clipboard"></i>
              </div>
              <div className="empty-state__title">No treatment history</div>
              <div className="empty-state__desc">This doctor has no treatment records yet.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Chief Complaint</th>
                      <th>Status</th>
                      <th>Started</th>
                      <th>Completed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className="is-clickable">
                        <td>
                          <div className="table-row-avatar">
                            <span className="avatar avatar-sm">
                              {(h.patient_name || "?").charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <div className="cell-primary">{h.patient_name}</div>
                              <div className="text-2xs text-muted">{h.hospital_number || ""}</div>
                            </div>
                          </div>
                        </td>
                        <td>{h.chief_complaint || "—"}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(h.status)}`}>
                            <span className="badge-dot"></span>
                            {getStatusLabel(h.status)}
                          </span>
                        </td>
                        <td className="text-sm text-muted">
                          {h.started_at ? new Date(h.started_at).toLocaleString() : "—"}
                        </td>
                        <td className="text-sm text-muted">
                          {h.completed_at ? new Date(h.completed_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {!loadingHistory && history.length > 0 && (
          <div className="table-footer">
            <span className="table-footer__meta">
              Showing {history.length} treatment{history.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}