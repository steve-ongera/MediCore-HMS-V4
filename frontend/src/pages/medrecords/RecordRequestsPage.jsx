import { useEffect, useState } from "react";
import { getRecordRequests, createRecordRequest, approveRecordRequest, denyRecordRequest, fulfillRecordRequest, getPatients } from "../../services/api";

export default function RecordRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [purpose, setPurpose] = useState("CLINICAL_CARE");
  const [purposeDetails, setPurposeDetails] = useState("");

  const [denyingId, setDenyingId] = useState(null);
  const [denyReason, setDenyReason] = useState("");

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getRecordRequests(params);
      setRequests(data.results ?? data);
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

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) { setError("Select a patient first."); return; }
    try {
      await createRecordRequest({ patient: selectedPatient.id, purpose, purpose_details: purposeDetails });
      setSelectedPatient(null);
      setPatientQuery("");
      setPurposeDetails("");
      load();
    } catch (err) { setError(err.message); }
  };

  const handleApprove = async (id) => {
    try { await approveRecordRequest(id); load(); } catch (err) { setError(err.message); }
  };

  const submitDeny = async (id) => {
    try {
      await denyRecordRequest(id, { denial_reason: denyReason });
      setDenyingId(null);
      setDenyReason("");
      load();
    } catch (err) { setError(err.message); }
  };

  const handleFulfill = async (id) => {
    try { await fulfillRecordRequest(id); load(); } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "PENDING": "badge-warning",
      "APPROVED": "badge-success",
      "DENIED": "badge-danger",
      "FULFILLED": "badge-info",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getPurposeLabel = (purpose) => {
    const labels = {
      "CLINICAL_CARE": "Clinical Care",
      "INSURANCE": "Insurance Claim",
      "LEGAL": "Legal Proceedings",
      "PATIENT_COPY": "Patient's Copy",
      "RESEARCH": "Research",
      "OTHER": "Other",
    };
    return labels[purpose] || purpose;
  };

  if (loading && requests.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading record requests...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Medical Records</div>
          <h1 className="page-title">Record Requests</h1>
          <p className="page-subtitle">Manage medical record access requests</p>
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

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle  me-1"></i> New Request
          </h5>
        </div>
        <div className="card-body">
          <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            <i className="bi bi-info-circle  me-1"></i>
            Anyone requesting a patient's medical records must file a request here. HIM reviews and approves/denies before it can be fulfilled.
          </div>

          <form onSubmit={handlePatientSearch} style={{ marginBottom: "var(--space-4)" }}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Search Patient</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Search by name / phone / hospital number"
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-search  me-1"></i> Search
                </button>
              </div>
            </div>
          </form>

          {patientResults.length > 0 && (
            <div style={{ marginBottom: "var(--space-4)" }}>
              <div className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)" }}>
                Search Results ({patientResults.length})
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Hospital #</th>
                      <th>Phone</th>
                      <th className="cell-actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientResults.map((p) => (
                      <tr key={p.id}>
                        <td className="cell-primary">{p.full_name}</td>
                        <td className="cell-mono">{p.hospital_number}</td>
                        <td>{p.phone}</td>
                        <td className="cell-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setSelectedPatient(p)}
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
            <div className="card" style={{ borderColor: "var(--success)", background: "var(--success-soft)", marginBottom: "var(--space-4)" }}>
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="avatar avatar-sm">
                    <i className="bi bi-person-check fs-xl"></i>
                  </div>
                  <div>
                    <div className="text-sm text-success font-semibold">
                      <i className="bi bi-check-circle  me-1"></i> Selected Patient
                    </div>
                    <div className="font-bold">{selectedPatient.full_name}</div>
                    <div className="text-sm text-muted">
                      {selectedPatient.hospital_number} • {selectedPatient.phone}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm ml-auto"
                    onClick={() => setSelectedPatient(null)}
                  >
                    <i className="bi bi-x  me-1"></i> Change
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={submit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Purpose <span className="required">*</span></label>
                <select className="select" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
                  <option value="CLINICAL_CARE">Continued Clinical Care</option>
                  <option value="INSURANCE">Insurance Claim</option>
                  <option value="LEGAL">Legal Proceedings</option>
                  <option value="PATIENT_COPY">Patient's Own Copy</option>
                  <option value="RESEARCH">Research</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Additional Details</label>
                <textarea
                  className="textarea"
                  placeholder="Additional details"
                  value={purposeDetails}
                  onChange={(e) => setPurposeDetails(e.target.value)}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!selectedPatient}
              >
                <i className="bi bi-plus-circle  me-1"></i> Submit Request
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-funnel  me-1"></i>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>Filter by Status</label>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "180px" }}
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="DENIED">Denied</option>
                <option value="FULFILLED">Fulfilled</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {requests.length} request{requests.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-file-earmark-text"></i>
              </div>
              <h3 className="empty-state__title">No record requests found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No requests with status "${statusFilter}" found.` 
                  : "Create a new record request using the form above."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Request #</th>
                    <th>Patient</th>
                    <th>Requested By</th>
                    <th>Purpose</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-mono">{r.request_number}</td>
                      <td className="cell-primary">{r.patient_name}</td>
                      <td>{r.requested_by_name}</td>
                      <td>{getPurposeLabel(r.purpose)}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(r.status)}`}>
                          <span className="badge-dot"></span>
                          {r.status}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <div className="flex gap-1 justify-end">
                          {r.status === "PENDING" && (
                            <>
                              <button className="btn btn-success btn-sm" onClick={() => handleApprove(r.id)}>
                                <i className="bi bi-check  me-1"></i> Approve
                              </button>
                              {denyingId === r.id ? (
                                <>
                                  <input
                                    type="text"
                                    className="input"
                                    placeholder="Reason"
                                    value={denyReason}
                                    onChange={(e) => setDenyReason(e.target.value)}
                                    style={{ width: "120px" }}
                                  />
                                  <button className="btn btn-danger btn-sm" onClick={() => submitDeny(r.id)}>
                                    <i className="bi bi-check  me-1"></i> Confirm
                                  </button>
                                  <button className="btn btn-secondary btn-sm" onClick={() => setDenyingId(null)}>
                                    <i className="bi bi-x"></i>
                                  </button>
                                </>
                              ) : (
                                <button className="btn btn-danger btn-sm" onClick={() => setDenyingId(r.id)}>
                                  <i className="bi bi-x  me-1"></i> Deny
                                </button>
                              )}
                            </>
                          )}
                          {r.status === "APPROVED" && (
                            <button className="btn btn-primary btn-sm" onClick={() => handleFulfill(r.id)}>
                              <i className="bi bi-check-circle  me-1"></i> Fulfill
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {requests.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {requests.length} request{requests.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Pending
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Approved
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Denied
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                Fulfilled
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}