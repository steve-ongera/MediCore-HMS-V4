import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPatients, getInsurers, getInsurancePolicies, createInsurancePolicy, verifyEligibility } from "../../services/api";

export default function PatientPolicies() {
  const [policies, setPolicies] = useState([]);
  const [insurers, setInsurers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifyResults, setVerifyResults] = useState({});

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [form, setForm] = useState({
    insurer: "", member_number: "", scheme_name: "", principal_member_name: "",
    relationship: "PRINCIPAL", valid_from: "", valid_to: "",
  });

  useEffect(() => { load(); loadInsurers(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getInsurancePolicies({ page_size: 100 });
      setPolicies(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadInsurers = async () => {
    try {
      const data = await getInsurers();
      setInsurers(data.results ?? data);
    } catch (err) { setError(err.message); }
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
    if (!selectedPatient) { setError("Select a patient first."); return; }
    try {
      await createInsurancePolicy({ patient: selectedPatient.id, ...form });
      setSelectedPatient(null);
      setPatientQuery("");
      setPatientResults([]);
      setForm({ insurer: "", member_number: "", scheme_name: "", principal_member_name: "", relationship: "PRINCIPAL", valid_from: "", valid_to: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleVerify = async (policyId) => {
    try {
      const result = await verifyEligibility(policyId);
      setVerifyResults((p) => ({ ...p, [policyId]: result }));
    } catch (err) { setError(err.message); }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading policies...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Billing & Insurance</div>
          <h1 className="page-title">Patient Insurance Policies</h1>
          <p className="page-subtitle">Manage patient insurance coverage</p>
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
            <i className="bi bi-plus-circle me-2"></i> Register Policy
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
                <label className="field-label">Insurer <span className="required">*</span></label>
                <select className="select" value={form.insurer} onChange={handleChange("insurer")} required>
                  <option value="">Select insurer</option>
                  {insurers.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.insurer_type})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Member/SHA Number <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Member number"
                  value={form.member_number}
                  onChange={handleChange("member_number")}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Scheme Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Scheme name"
                  value={form.scheme_name}
                  onChange={handleChange("scheme_name")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Principal Member Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Principal member name"
                  value={form.principal_member_name}
                  onChange={handleChange("principal_member_name")}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Relationship</label>
                <select className="select" value={form.relationship} onChange={handleChange("relationship")}>
                  <option value="PRINCIPAL">Principal</option>
                  <option value="SPOUSE">Spouse</option>
                  <option value="CHILD">Child</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Valid From</label>
                <input
                  type="date"
                  className="input"
                  value={form.valid_from}
                  onChange={handleChange("valid_from")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Valid To</label>
                <input
                  type="date"
                  className="input"
                  value={form.valid_to}
                  onChange={handleChange("valid_to")}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!selectedPatient}
              >
                <i className="bi bi-plus-circle me-2"></i> Register Policy
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-grid me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>All Policies</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {policies.length} polic{policies.length !== 1 ? "ies" : "y"}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {policies.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-file-earmark-text"></i>
              </div>
              <h3 className="empty-state__title">No policies registered</h3>
              <p className="empty-state__desc">Start by registering a policy for a patient above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Insurer</th>
                    <th>Member #</th>
                    <th>Validity</th>
                    <th>Eligibility</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-primary">
                        {p.patient_name}
                        <div className="text-2xs text-tertiary">{p.hospital_number}</div>
                      </td>
                      <td>
                        {p.insurer_name}
                        <div className="text-2xs text-tertiary">{p.insurer_type}</div>
                      </td>
                      <td className="cell-mono">{p.member_number}</td>
                      <td>
                        <span className={`badge ${p.is_currently_valid ? "badge-success" : "badge-danger"}`}>
                          <span className="badge-dot"></span>
                          {p.is_currently_valid ? "Valid" : "Invalid/Expired"}
                        </span>
                      </td>
                      <td>
                        {verifyResults[p.id] ? (
                          <span className={`badge ${verifyResults[p.id].is_eligible ? "badge-success" : "badge-danger"}`}>
                            <span className="badge-dot"></span>
                            {verifyResults[p.id].is_eligible ? "ELIGIBLE" : "NOT ELIGIBLE"}
                            <span className="text-2xs" style={{ display: "block", fontWeight: "normal" }}>
                              {verifyResults[p.id].member_status}
                            </span>
                          </span>
                        ) : (
                          <span className="text-muted text-sm">Not verified</span>
                        )}
                      </td>
                      <td className="cell-actions">
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => handleVerify(p.id)}
                        >
                          <i className="bi bi-check-circle me-1"></i> Verify
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {policies.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {policies.length} polic{policies.length !== 1 ? "ies" : "y"}
            </span>
          </div>
        )}
      </div>
    </>
  );
}