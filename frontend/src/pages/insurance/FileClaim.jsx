import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getInsurancePolicies, getInvoices, createInsuranceClaim } from "../../services/api";

export default function FileClaim() {
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState("");

  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedPatient) {
      loadPolicies(selectedPatient.id);
      loadInvoices(selectedPatient.id);
    }
  }, [selectedPatient]);

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadPolicies = async (patientId) => {
    try {
      const data = await getInsurancePolicies({ patient: patientId });
      setPolicies(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadInvoices = async (patientId) => {
    try {
      const data = await getInvoices({ patient: patientId, page_size: 100 });
      const results = (data.results ?? data).filter((inv) => Number(inv.balance) > 0);
      setInvoices(results);
    } catch (err) { setError(err.message); }
  };

  const toggleInvoice = (id) => {
    setSelectedInvoiceIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const totalSelected = invoices
    .filter((inv) => selectedInvoiceIds.includes(inv.id))
    .reduce((sum, inv) => sum + Number(inv.balance), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !selectedPolicy || selectedInvoiceIds.length === 0) {
      setError("Select a patient, policy, and at least one invoice.");
      return;
    }
    setSubmitting(true);
    try {
      const claim = await createInsuranceClaim({
        patient: selectedPatient.id, policy: selectedPolicy,
        invoice_ids: selectedInvoiceIds, notes,
      });
      navigate(`/insurance/claims/${claim.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Billing & Insurance</div>
          <h1 className="page-title">File Insurance Claim</h1>
          <p className="page-subtitle">Submit an insurance claim for a patient</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/insurance/claims")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Claims
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
            <i className="bi bi-search me-2"></i> Step 1: Find Patient
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handlePatientSearch}>
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
            <div style={{ marginTop: "var(--space-4)" }}>
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
            <div className="card" style={{ borderColor: "var(--success)", background: "var(--success-soft)", marginTop: "var(--space-4)" }}>
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
        </div>
      </div>

      {selectedPatient && (
        <>
          <div className="card" style={{ marginBottom: "var(--space-6)" }}>
            <div className="card-header">
              <h5 className="card-title">
                <i className="bi bi-file-earmark-text me-2"></i> Step 2: Select Policy
              </h5>
            </div>
            <div className="card-body">
              <div className="field">
                <label className="field-label">Insurance Policy <span className="required">*</span></label>
                <select
                  className="select"
                  value={selectedPolicy}
                  onChange={(e) => setSelectedPolicy(e.target.value)}
                  required
                >
                  <option value="">Select policy</option>
                  {policies.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.insurer_name} — {p.member_number} 
                      {!p.is_currently_valid && " (EXPIRED)"}
                    </option>
                  ))}
                </select>
                {policies.length === 0 && (
                  <div className="text-sm text-muted" style={{ marginTop: "var(--space-2)" }}>
                    <i className="bi bi-info-circle me-1"></i> No active insurance policies found for this patient.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "var(--space-6)" }}>
            <div className="card-header">
              <div className="flex items-center gap-3 flex-wrap">
                <i className="bi bi-receipt me-1"></i>
                <h5 className="card-title" style={{ marginBottom: 0 }}>Step 3: Select Invoices to Claim</h5>
              </div>
              <div>
                <span className="text-tertiary text-sm">
                  {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} available
                </span>
              </div>
            </div>
            <div className="card-body">
              {invoices.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-receipt"></i>
                  </div>
                  <h3 className="empty-state__title">No outstanding invoices</h3>
                  <p className="empty-state__desc">This patient has no invoices with outstanding balances.</p>
                </div>
              ) : (
                <>
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: "40px" }}>
                            <input
                              type="checkbox"
                              checked={selectedInvoiceIds.length === invoices.length && invoices.length > 0}
                              onChange={() => {
                                if (selectedInvoiceIds.length === invoices.length) {
                                  setSelectedInvoiceIds([]);
                                } else {
                                  setSelectedInvoiceIds(invoices.map((inv) => inv.id));
                                }
                              }}
                            />
                          </th>
                          <th>Invoice #</th>
                          <th>Description</th>
                          <th>Type</th>
                          <th className="cell-numeric">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td>
                              <input
                                type="checkbox"
                                checked={selectedInvoiceIds.includes(inv.id)}
                                onChange={() => toggleInvoice(inv.id)}
                              />
                            </td>
                            <td className="cell-mono">{inv.invoice_number}</td>
                            <td>{inv.description}</td>
                            <td>
                              <span className="tag">{inv.source_type}</span>
                            </td>
                            <td className="cell-numeric">KES {inv.balance}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="stat-grid" style={{ marginTop: "var(--space-4)" }}>
                    <div className="stat-card">
                      <div className="stat-card__top">
                        <span className="stat-card__label">Selected Invoices</span>
                        <div className="stat-card__icon tone-info">
                          <i className="bi bi-check-circle"></i>
                        </div>
                      </div>
                      <div className="stat-card__value">{selectedInvoiceIds.length}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card__top">
                        <span className="stat-card__label">Total to Claim</span>
                        <div className="stat-card__icon tone-primary">
                          <i className="bi bi-currency-dollar"></i>
                        </div>
                      </div>
                      <div className="stat-card__value">KES {totalSelected}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5 className="card-title">
                <i className="bi bi-file-check me-2"></i> Step 4: Submit Claim
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="field-label">Notes (optional)</label>
                  <textarea
                    className="textarea"
                    placeholder="Additional notes for the claim..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => navigate("/insurance/claims")}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting || !selectedPatient || !selectedPolicy || selectedInvoiceIds.length === 0}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                        Filing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-check me-2"></i> File Claim
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </>
  );
}