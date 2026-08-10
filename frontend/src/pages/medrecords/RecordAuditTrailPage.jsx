import { useEffect, useState } from "react";
import { getRecordAuditTrail, getPatients } from "../../services/api";
import { formatDateTime } from "../../utils/formatters";

export default function RecordAuditTrailPage() {
  const [entries, setEntries] = useState([]);
  const [actionFilter, setActionFilter] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [actionFilter, selectedPatient]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 200 };
      if (actionFilter) params.action = actionFilter;
      if (selectedPatient) params.patient = selectedPatient.id;
      const data = await getRecordAuditTrail(params);
      setEntries(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const getActionBadge = (action) => {
    const actionMap = {
      "VIEWED": "badge-info",
      "EXPORTED": "badge-success",
      "PRINTED": "badge-primary",
      "DOCUMENT_UPLOADED": "badge-warning",
      "FILE_CHECKED_OUT": "badge-danger",
      "FILE_RETURNED": "badge-success",
    };
    return actionMap[action] || "badge-neutral";
  };

  if (loading && entries.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading audit trail...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Medical Records</div>
          <h1 className="page-title">Record Audit Trail</h1>
          <p className="page-subtitle">Immutable log of all medical record access</p>
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
            <i className="bi bi-funnel  me-1"></i>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>Filter by Action</label>
              <select
                className="select"
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                style={{ width: "190px" }}
              >
                <option value="">All Actions</option>
                <option value="VIEWED">Viewed</option>
                <option value="EXPORTED">Exported</option>
                <option value="PRINTED">Printed</option>
                <option value="DOCUMENT_UPLOADED">Document Uploaded</option>
                <option value="FILE_CHECKED_OUT">File Checked Out</option>
                <option value="FILE_RETURNED">File Returned</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0, flex: 1 }}>
              <form onSubmit={handlePatientSearch} className="flex gap-2" style={{ flex: 1 }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Filter by patient..."
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button type="submit" className="btn btn-primary btn-sm">
                  <i className="bi bi-search  me-1"></i> Search
                </button>
                {selectedPatient && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => { setSelectedPatient(null); setPatientQuery(""); }}
                  >
                    <i className="bi bi-x  me-1"></i> Clear
                  </button>
                )}
              </form>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
            </span>
          </div>
        </div>
        <div className="card-body">
          {patientResults.length > 0 && !selectedPatient && (
            <div style={{ marginBottom: "var(--space-3)" }}>
              <div className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)" }}>
                Search Results ({patientResults.length})
              </div>
              <div className="table-scroll" style={{ maxHeight: "200px" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Hospital #</th>
                      <th className="cell-actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientResults.map((p) => (
                      <tr key={p.id}>
                        <td className="cell-primary">{p.full_name}</td>
                        <td className="cell-mono">{p.hospital_number}</td>
                        <td className="cell-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => { setSelectedPatient(p); setPatientResults([]); }}
                          >
                            <i className="bi bi-check  me-1"></i> Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedPatient && (
            <div className="card" style={{ borderColor: "var(--primary)", background: "var(--primary-soft)", marginBottom: "var(--space-3)" }}>
              <div className="card-body" style={{ padding: "var(--space-2) var(--space-3)" }}>
                <div className="flex items-center gap-2">
                  <i className="bi bi-filter-circle" style={{ color: "var(--primary)" }}></i>
                  <span className="text-sm">Filtering by patient:</span>
                  <span className="font-semibold text-sm">{selectedPatient.full_name}</span>
                  <span className="text-2xs text-tertiary">{selectedPatient.hospital_number}</span>
                </div>
              </div>
            </div>
          )}

          <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            <i className="bi bi-info-circle  me-1"></i>
            Immutable log of every access to a patient's medical record — view, export, print, upload, file checkout/return.
          </div>

          {entries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No audit entries found</h3>
              <p className="empty-state__desc">
                {actionFilter || selectedPatient 
                  ? "No entries match your filters." 
                  : "Audit entries will appear here as records are accessed."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Action</th>
                    <th>By</th>
                    <th>Detail</th>
                    <th>IP</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="cell-primary">{e.patient_name}</td>
                      <td>
                        <span className={`badge ${getActionBadge(e.action)}`}>
                          <span className="badge-dot"></span>
                          {e.action.replace("_", " ")}
                        </span>
                      </td>
                      <td>{e.performed_by_name}</td>
                      <td>{e.detail || "—"}</td>
                      <td className="cell-mono">{e.ip_address || "—"}</td>
                      <td>{formatDateTime(e.occurred_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {entries.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {entries.length} audit entr{entries.length !== 1 ? "ies" : "y"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                Viewed
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Exported / Returned
              </span>
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                Printed
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Uploaded
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Checked Out
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}