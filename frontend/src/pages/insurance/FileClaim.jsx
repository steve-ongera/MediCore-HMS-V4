import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import {
  getPatient, getPatients, getInsurancePolicies, getInvoices, createInsuranceClaim,
  verifyPolicyEligibility,
} from "../../services/api";
import SearchableSelect from "../../components/SearchableSelect.jsx";

const STATUS_LABEL = {
  ELIGIBLE: "✅ Eligible",
  NOT_ELIGIBLE: "❌ Not Eligible",
  NOT_VERIFIED: "⚠ Not Verified",
};
const STATUS_COLOR = {
  ELIGIBLE: "var(--success-strong)",
  NOT_ELIGIBLE: "var(--danger-strong)",
  NOT_VERIFIED: "var(--warning-strong)",
};

export default function FileClaim() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const patientIdParam = searchParams.get("patient");
  const invoiceIdParam = searchParams.get("invoice");

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState("");
  const [verifying, setVerifying] = useState(false);

  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [initializing, setInitializing] = useState(!!patientIdParam);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (patientIdParam) {
      loadPatientFromParam(patientIdParam);
    }
  }, [patientIdParam]);

  const loadPatientFromParam = async (patientId) => {
    setLoading(true);
    try {
      const patient = await getPatient(patientId);
      setSelectedPatient(patient);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setInitializing(false);
    }
  };

  useEffect(() => {
    if (selectedPatient) {
      loadPolicies(selectedPatient.id);
      loadInvoices(selectedPatient.id);
    }
  }, [selectedPatient]);

  useEffect(() => {
    if (invoiceIdParam && invoices.some((inv) => inv.id === invoiceIdParam)) {
      setSelectedInvoiceIds((prev) => (prev.includes(invoiceIdParam) ? prev : [...prev, invoiceIdParam]));
    }
  }, [invoices, invoiceIdParam]);

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    setLoading(true);
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
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

  const currentPolicy = policies.find((p) => p.id === selectedPolicy);

  const handleVerifyNow = async () => {
    if (!selectedPolicy) return;
    setVerifying(true);
    setError("");
    try {
      await verifyPolicyEligibility(selectedPolicy);
      await loadPolicies(selectedPatient.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !selectedPolicy || selectedInvoiceIds.length === 0) {
      setError("Select a patient, policy, and at least one invoice.");
      return;
    }
    if (currentPolicy?.latest_eligibility_status === "NOT_VERIFIED") {
      const proceed = window.confirm(
        "This policy has never been verified with the insurer. File the claim anyway?"
      );
      if (!proceed) return;
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

  if (initializing || loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading patient...</span>
      </div>
    );
  }

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
            <i className="bi bi-arrow-left me-1"></i> Back to Claims
          </button>
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

      {!patientIdParam && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-search me-1"></i> Step 1: Find Patient
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
                  <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                    <i className="bi bi-search me-1"></i> Search
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
          </div>
        </div>
      )}

      {selectedPatient && (
        <>
          <div className="card" style={{ borderColor: "var(--success)", background: "var(--success-soft)", marginBottom: "var(--space-6)" }}>
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
                  onClick={() => { navigate("/insurance/claims/new"); setSelectedPatient(null); }}
                >
                  <i className="bi bi-x me-1"></i> Change Patient
                </button>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "var(--space-6)" }}>
            <div className="card-header">
              <h5 className="card-title">
                <i className="bi bi-file-earmark-text me-1"></i> Step 2: Select Policy
              </h5>
            </div>
            <div className="card-body">
              {policies.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-file-earmark-text"></i>
                  </div>
                  <h3 className="empty-state__title">No insurance policy found</h3>
                  <p className="empty-state__desc">
                    This patient has no registered insurance policy yet.
                  </p>
                  <Link to="/insurance/policies" className="btn btn-primary">
                    <i className="bi bi-plus-circle me-1"></i> Register Policy
                  </Link>
                </div>
              ) : (
                <>
                  <div className="field">
                    <label className="field-label">Insurance Policy <span className="required">*</span></label>
                    <SearchableSelect
                      options={policies}
                      value={selectedPolicy}
                      onChange={setSelectedPolicy}
                      getKey={(p) => p.id}
                      getSearchText={(p) => `${p.insurer_name} ${p.member_number} ${p.patient_name}`}
                      placeholder="Search by insurer or member number..."
                      getLabel={(p) => (
                        <div>
                          <div>
                            <strong>{p.patient_name}</strong> — {p.insurer_name} ({p.member_number})
                          </div>
                          <div style={{ fontSize: "0.85em" }}>
                            <span style={{ color: STATUS_COLOR[p.latest_eligibility_status] }}>
                              {STATUS_LABEL[p.latest_eligibility_status]}
                            </span>
                            {" · "}
                            {p.is_currently_valid ? "Policy Active" : "Policy Expired"}
                            {p.last_verified_at && ` · Last checked ${new Date(p.last_verified_at).toLocaleDateString()}`}
                          </div>
                        </div>
                      )}
                    />
                  </div>

                  {currentPolicy && (
                    <div className="flex items-center gap-3 flex-wrap" style={{ marginTop: "var(--space-3)" }}>
                      <span style={{ color: STATUS_COLOR[currentPolicy.latest_eligibility_status] }}>
                        {STATUS_LABEL[currentPolicy.latest_eligibility_status]}
                      </span>
                      <span className="text-sm text-muted">—</span>
                      <span className="text-sm">
                        {currentPolicy.is_currently_valid ? "Policy dates are active" : "Policy dates have expired"}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleVerifyNow}
                        disabled={verifying}
                      >
                        {verifying ? (
                          <>
                            <span className="spinner" style={{ width: "14px", height: "14px", borderWidth: "2px", marginRight: "var(--space-1)" }}></span>
                            Verifying...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-shield-check me-1"></i>
                            Verify Eligibility Now
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </>
              )}
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
                              className="checkbox"
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
                                className="checkbox"
                                checked={selectedInvoiceIds.includes(inv.id)}
                                onChange={() => toggleInvoice(inv.id)}
                              />
                            </td>
                            <td className="cell-mono">{inv.invoice_number}</td>
                            <td>{inv.description}</td>
                            <td>
                              <span className="tag">{inv.source_type}</span>
                            </td>
                            <td className="cell-numeric">KES {Number(inv.balance).toLocaleString()}</td>
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
                      <div className="stat-card__value">KES {totalSelected.toLocaleString()}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5 className="card-title">
                <i className="bi bi-file-check me-1"></i> Step 4: Submit Claim
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
                    rows={3}
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
                    disabled={submitting || !selectedPatient || !selectedPolicy || selectedInvoiceIds.length === 0 || policies.length === 0}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                        Filing...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-file-check me-1"></i> File Claim
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