import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDoctorProfiles, getDoctorVisits } from "../../services/api";

export default function DoctorVisitsAll() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [visits, setVisits] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingVisits, setLoadingVisits] = useState(false);

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

  const loadVisits = async (id) => {
    setSelectedDoctor(id);
    if (!id) {
      setVisits([]);
      return;
    }
    setLoadingVisits(true);
    setError("");
    try {
      const data = await getDoctorVisits(id);
      setVisits(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingVisits(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "WAITING": "badge-warning",
      "IN_CONSULTATION": "badge-info",
      "COMPLETED": "badge-success",
      "CANCELLED": "badge-neutral",
      "REGISTERED": "badge-info",
      "IN_QUEUE": "badge-warning",
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
          <h1 className="page-title">Doctor Visits</h1>
          <p className="page-subtitle">View visit history by doctor</p>
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
              onChange={(e) => loadVisits(e.target.value)}
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
                {visits.length} visit{visits.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="card-body p-0">
          {loadingVisits ? (
            <div className="loading-screen" style={{ minHeight: "200px" }}>
              <div className="spinner spinner-lg"></div>
              <span className="loading-screen__label">Loading visits...</span>
            </div>
          ) : !selectedDoctor ? (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-clipboard2-pulse"></i>
              </div>
              <div className="empty-state__title">Select a doctor</div>
              <div className="empty-state__desc">Choose a doctor from the dropdown above to view their visits.</div>
            </div>
          ) : visits.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-clipboard"></i>
              </div>
              <div className="empty-state__title">No visits found</div>
              <div className="empty-state__desc">This doctor has no visit records yet.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Visit #</th>
                      <th>Patient</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((v) => (
                      <tr key={v.id} className="is-clickable">
                        <td className="cell-mono">{v.visit_number}</td>
                        <td>
                          <div className="table-row-avatar">
                            <span className="avatar avatar-sm">
                              {(v.patient_name || "?").charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <div className="cell-primary">{v.patient_name}</div>
                              <div className="text-2xs text-muted">{v.hospital_number || ""}</div>
                            </div>
                          </div>
                        </td>
                        <td>{v.department_name || "—"}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(v.status)}`}>
                            <span className="badge-dot"></span>
                            {getStatusLabel(v.status)}
                          </span>
                        </td>
                        <td className="text-sm text-muted">
                          {new Date(v.visit_date).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {!loadingVisits && visits.length > 0 && (
          <div className="table-footer">
            <span className="table-footer__meta">
              Showing {visits.length} visit{visits.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}