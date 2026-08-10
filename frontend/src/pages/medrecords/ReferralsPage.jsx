import { useEffect, useState } from "react";
import { getReferrals, createReferral, updateReferralStatus, getPatients, getUsers } from "../../services/api";

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [directionFilter, setDirectionFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [form, setForm] = useState({
    direction: "OUTGOING", facility_name: "", facility_contact: "", reason: "",
    clinical_summary: "", referring_doctor: "", receiving_doctor: "",
  });

  useEffect(() => { loadDoctors(); }, []);
  useEffect(() => { load(); }, [directionFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (directionFilter) params.direction = directionFilter;
      const data = await getReferrals(params);
      setReferrals(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    try { const data = await getUsers({ role: "DOCTOR" }); setDoctors(data.results ?? data); } catch (err) { setError(err.message); }
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
      await createReferral({
        ...form,
        patient: selectedPatient.id,
        receiving_doctor: form.receiving_doctor || undefined,
      });
      setSelectedPatient(null);
      setPatientQuery("");
      setForm({ direction: "OUTGOING", facility_name: "", facility_contact: "", reason: "", clinical_summary: "", referring_doctor: "", receiving_doctor: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateReferralStatus(id, { status });
      load();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "PENDING": "badge-warning",
      "ACCEPTED": "badge-success",
      "DECLINED": "badge-danger",
      "COMPLETED": "badge-info",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getDirectionBadge = (direction) => {
    const directionMap = {
      "INCOMING": "badge-primary",
      "OUTGOING": "badge-info",
    };
    return directionMap[direction] || "badge-neutral";
  };

  if (loading && referrals.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading referrals...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Medical Records</div>
          <h1 className="page-title">Referral Management</h1>
          <p className="page-subtitle">Manage patient referrals</p>
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
            <i className="bi bi-plus-circle  me-1"></i> New Referral
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
                <label className="field-label">Direction <span className="required">*</span></label>
                <select className="select" value={form.direction} onChange={(e) => setForm((p) => ({ ...p, direction: e.target.value }))}>
                  <option value="OUTGOING">Outgoing (to another facility)</option>
                  <option value="INCOMING">Incoming (from another facility)</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Facility Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Other facility name"
                  value={form.facility_name}
                  onChange={(e) => setForm((p) => ({ ...p, facility_name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Facility Contact</label>
              <input
                type="text"
                className="input"
                placeholder="Facility contact"
                value={form.facility_contact}
                onChange={(e) => setForm((p) => ({ ...p, facility_contact: e.target.value }))}
              />
            </div>

            <div className="field">
              <label className="field-label">Reason for Referral <span className="required">*</span></label>
              <textarea
                className="textarea"
                placeholder="Reason for referral"
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
                required
              />
            </div>

            <div className="field">
              <label className="field-label">Clinical Summary</label>
              <textarea
                className="textarea"
                placeholder="Clinical summary"
                value={form.clinical_summary}
                onChange={(e) => setForm((p) => ({ ...p, clinical_summary: e.target.value }))}
              />
            </div>

            <div className="field-row">
              {form.direction === "INCOMING" && (
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Referring Doctor (outside)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Referring doctor (outside)"
                    value={form.referring_doctor}
                    onChange={(e) => setForm((p) => ({ ...p, referring_doctor: e.target.value }))}
                  />
                </div>
              )}
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Receiving Doctor</label>
                <select className="select" value={form.receiving_doctor} onChange={(e) => setForm((p) => ({ ...p, receiving_doctor: e.target.value }))}>
                  <option value="">Receiving doctor (optional)</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!selectedPatient}
              >
                <i className="bi bi-plus-circle  me-1"></i> Create Referral
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
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>Filter by Direction</label>
              <select
                className="select"
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                style={{ width: "180px" }}
              >
                <option value="">All</option>
                <option value="INCOMING">Incoming</option>
                <option value="OUTGOING">Outgoing</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {referrals.length} referral{referrals.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {referrals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-arrow-left-right"></i>
              </div>
              <h3 className="empty-state__title">No referrals found</h3>
              <p className="empty-state__desc">
                {directionFilter 
                  ? `No ${directionFilter.toLowerCase()} referrals found.` 
                  : "Create a new referral using the form above."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Referral #</th>
                    <th>Patient</th>
                    <th>Direction</th>
                    <th>Facility</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-mono">{r.referral_number}</td>
                      <td className="cell-primary">{r.patient_name}</td>
                      <td>
                        <span className={`badge ${getDirectionBadge(r.direction)}`}>
                          <span className="badge-dot"></span>
                          {r.direction}
                        </span>
                      </td>
                      <td>{r.facility_name}</td>
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
                              <button className="btn btn-success btn-sm" onClick={() => handleStatusChange(r.id, "ACCEPTED")}>
                                <i className="bi bi-check  me-1"></i> Accept
                              </button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange(r.id, "DECLINED")}>
                                <i className="bi bi-x  me-1"></i> Decline
                              </button>
                            </>
                          )}
                          {r.status === "ACCEPTED" && (
                            <button className="btn btn-primary btn-sm" onClick={() => handleStatusChange(r.id, "COMPLETED")}>
                              <i className="bi bi-check-circle  me-1"></i> Complete
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
        {referrals.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {referrals.length} referral{referrals.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Pending
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Accepted
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Declined
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                Completed
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}