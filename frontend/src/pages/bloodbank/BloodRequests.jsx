import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBloodRequests, createBloodRequest, getPatients } from "../../services/api";

export default function BloodRequests() {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [form, setForm] = useState({
    patient_blood_group: "O+", component_type: "WHOLE_BLOOD", units_requested: "1",
    priority: "ROUTINE", clinical_indication: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getBloodRequests(params);
      setRequests(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError("Select a patient first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await createBloodRequest({
        patient: selectedPatient.id,
        ...form,
        units_requested: Number(form.units_requested),
      });
      setSelectedPatient(null);
      setPatientQuery("");
      setPatientResults([]);
      setForm({ patient_blood_group: "O+", component_type: "WHOLE_BLOOD", units_requested: "1", priority: "ROUTINE", clinical_indication: "" });
      load();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "PENDING": "badge-warning",
      "CROSS_MATCHED": "badge-primary",
      "ISSUED": "badge-success",
      "CANCELLED": "badge-neutral",
      "REJECTED": "badge-danger",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      "EMERGENCY": "badge-danger",
      "URGENT": "badge-warning",
      "ROUTINE": "badge-info",
    };
    return priorityMap[priority] || "badge-neutral";
  };

  const getBloodGroupBadge = (group) => {
    const groupMap = {
      "A+": "badge-danger",
      "A-": "badge-danger",
      "B+": "badge-primary",
      "B-": "badge-primary",
      "AB+": "badge-info",
      "AB-": "badge-info",
      "O+": "badge-success",
      "O-": "badge-success",
    };
    return groupMap[group] || "badge-neutral";
  };

  if (loading && requests.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading blood requests...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Blood Bank</div>
          <h1 className="page-title">Blood Requests</h1>
          <p className="page-subtitle">Manage blood transfusion requests</p>
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
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> New Request
          </h5>
        </div>
        <div className="card-body">
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
                  <i className="bi bi-search me-2"></i> Search
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
                            <i className="bi bi-check me-1"></i> Select
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
                      <i className="bi bi-check-circle me-1"></i> Selected Patient
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
                    <i className="bi bi-x me-1"></i> Change
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Patient Blood Group <span className="required">*</span></label>
                <select className="select" value={form.patient_blood_group} onChange={handleChange("patient_blood_group")}>
                  {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Component Type <span className="required">*</span></label>
                <select className="select" value={form.component_type} onChange={handleChange("component_type")}>
                  <option value="WHOLE_BLOOD">Whole Blood</option>
                  <option value="PACKED_RED_CELLS">Packed Red Cells</option>
                  <option value="PLATELETS">Platelets</option>
                  <option value="FRESH_FROZEN_PLASMA">Fresh Frozen Plasma</option>
                  <option value="CRYOPRECIPITATE">Cryoprecipitate</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 0.7 }}>
                <label className="field-label">Units Requested <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  min="1"
                  placeholder="Units"
                  value={form.units_requested}
                  onChange={handleChange("units_requested")}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Priority <span className="required">*</span></label>
                <select className="select" value={form.priority} onChange={handleChange("priority")}>
                  <option value="EMERGENCY">Emergency</option>
                  <option value="URGENT">Urgent</option>
                  <option value="ROUTINE">Routine</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                <label className="field-label">Clinical Indication</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Clinical indication"
                  value={form.clinical_indication}
                  onChange={handleChange("clinical_indication")}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !selectedPatient}
              >
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle me-2"></i> Submit Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

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
                <option value="PENDING">Pending</option>
                <option value="CROSS_MATCHED">Cross-Matched</option>
                <option value="ISSUED">Issued</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="REJECTED">Rejected</option>
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
                <i className="bi bi-droplet"></i>
              </div>
              <h3 className="empty-state__title">No blood requests found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No requests with status "${statusFilter}" found.` 
                  : "Submit your first blood request using the form above."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Request #</th>
                    <th>Patient</th>
                    <th>Blood Group</th>
                    <th>Component</th>
                    <th className="cell-numeric">Units</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-mono">{r.request_number}</td>
                      <td className="cell-primary">{r.patient_name}</td>
                      <td>
                        <span className={`badge ${getBloodGroupBadge(r.patient_blood_group)}`}>
                          <span className="badge-dot"></span>
                          {r.patient_blood_group}
                        </span>
                      </td>
                      <td>{r.component_type}</td>
                      <td className="cell-numeric">{r.units_requested}</td>
                      <td>
                        <span className={`badge ${getPriorityBadge(r.priority)}`}>
                          <span className="badge-dot"></span>
                          {r.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(r.status)}`}>
                          <span className="badge-dot"></span>
                          {r.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <Link to={`/bloodbank/requests/${r.id}`} className="btn btn-secondary btn-sm">
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
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                Cross-Matched
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Issued
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Rejected
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}