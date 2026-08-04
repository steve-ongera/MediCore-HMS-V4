import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getOutstandingInvoicesForPatient, createBulkPayment } from "../../services/api";
import { formatCurrency, formatDate } from "../../utils/formatters";

export default function BulkPayment() {
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const selectPatient = async (patient) => {
    setSelectedPatient(patient);
    setPatientResults([]);
    setSelectedInvoiceIds([]);
    setAmount("");
    setResult(null);
    setLoadingInvoices(true);
    setError("");
    try {
      const data = await getOutstandingInvoicesForPatient(patient.id);
      setInvoices(data.invoices);
    } catch (err) { setError(err.message); } finally { setLoadingInvoices(false); }
  };

  const toggleInvoice = (id) => {
    setSelectedInvoiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectAll = () => setSelectedInvoiceIds(invoices.map((inv) => inv.id));
  const clearAll = () => setSelectedInvoiceIds([]);

  const selectedTotal = invoices
    .filter((inv) => selectedInvoiceIds.includes(inv.id))
    .reduce((sum, inv) => sum + Number(inv.balance), 0);

  const payFullSelected = () => setAmount(selectedTotal.toString());

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (selectedInvoiceIds.length === 0) {
      setError("Select at least one invoice to pay against.");
      return;
    }
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    if (amountNum > selectedTotal) {
      setError(`Amount (KES ${amountNum}) exceeds the total balance of selected invoices (KES ${selectedTotal}).`);
      return;
    }
    setSubmitting(true);
    try {
      const payment = await createBulkPayment({
        patient: selectedPatient.id,
        invoice_ids: selectedInvoiceIds,
        amount: amountNum,
        method,
        reference_number: referenceNumber,
      });
      setResult(payment);
      const refreshed = await getOutstandingInvoicesForPatient(selectedPatient.id);
      setInvoices(refreshed.invoices);
      setSelectedInvoiceIds([]);
      setAmount("");
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Billing</div>
          <h1 className="page-title">Bulk Payment</h1>
          <p className="page-subtitle">Pay multiple invoices at once</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/billing/payments")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Payments
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

      {!selectedPatient && (
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
                  <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
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
                              onClick={() => selectPatient(p)}
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
                  onClick={() => { setSelectedPatient(null); setInvoices([]); setSelectedInvoiceIds([]); }}
                >
                  <i className="bi bi-x me-1"></i> Change Patient
                </button>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "var(--space-6)" }}>
            <div className="card-header">
              <div className="flex items-center gap-3 flex-wrap">
                <i className="bi bi-receipt me-1"></i>
                <h5 className="card-title" style={{ marginBottom: 0 }}>Step 2: Select Invoices to Pay</h5>
              </div>
              <div>
                <span className="text-tertiary text-sm">
                  {invoices.length} invoice{invoices.length !== 1 ? "s" : ""} outstanding
                </span>
              </div>
            </div>
            <div className="card-body">
              {loadingInvoices ? (
                <div className="loading-screen" style={{ padding: "var(--space-4)" }}>
                  <div className="spinner"></div>
                  <span className="loading-screen__label">Loading invoices...</span>
                </div>
              ) : invoices.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-receipt"></i>
                  </div>
                  <h3 className="empty-state__title">No outstanding invoices</h3>
                  <p className="empty-state__desc">This patient has no outstanding balance.</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-2" style={{ marginBottom: "var(--space-3)" }}>
                    <button className="btn btn-secondary btn-sm" onClick={selectAll}>
                      <i className="bi bi-check-all me-1"></i> Select All
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={clearAll}>
                      <i className="bi bi-x-circle me-1"></i> Clear Selection
                    </button>
                  </div>

                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th style={{ width: "40px" }}></th>
                          <th>Invoice #</th>
                          <th>Description</th>
                          <th>Type</th>
                          <th>Date</th>
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
                                style={{ width: "auto", margin: 0 }}
                                checked={selectedInvoiceIds.includes(inv.id)}
                                onChange={() => toggleInvoice(inv.id)}
                              />
                            </td>
                            <td className="cell-mono">{inv.invoice_number}</td>
                            <td>{inv.description}</td>
                            <td>
                              <span className="tag">{inv.source_type}</span>
                            </td>
                            <td>{formatDate(inv.created_at)}</td>
                            <td className="cell-numeric">{formatCurrency(inv.balance)}</td>
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
                        <span className="stat-card__label">Total Selected Balance</span>
                        <div className="stat-card__icon tone-primary">
                          <i className="bi bi-currency-dollar"></i>
                        </div>
                      </div>
                      <div className="stat-card__value">{formatCurrency(selectedTotal)}</div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {invoices.length > 0 && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">
                  <i className="bi bi-cash-stack me-2"></i> Step 3: Payment
                </h5>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="field-row">
                    <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                      <label className="field-label">Amount to Pay <span className="required">*</span></label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          className="input"
                          placeholder="Amount"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          required
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={payFullSelected}
                          disabled={selectedInvoiceIds.length === 0}
                        >
                          Pay Full Selected
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                      <label className="field-label">Payment Method <span className="required">*</span></label>
                      <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
                        <option value="CASH">Cash</option>
                        <option value="MPESA">M-Pesa</option>
                        <option value="CARD">Card</option>
                        <option value="INSURANCE">Insurance</option>
                      </select>
                    </div>
                    <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                      <label className="field-label">Reference Number</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Reference number (optional)"
                        value={referenceNumber}
                        onChange={(e) => setReferenceNumber(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => navigate("/billing/payments")}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={submitting || selectedInvoiceIds.length === 0}
                    >
                      {submitting ? (
                        <>
                          <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-cash-stack me-2"></i> Process Payment
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {result && (
        <div className="card" style={{ borderColor: "var(--success)", background: "var(--success-soft)", marginTop: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-check-circle me-2" style={{ color: "var(--success-strong)" }}></i>
              Payment Processed Successfully
            </h5>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <div className="info-item__label">Receipt #</div>
                <div className="info-item__value cell-mono">{result.receipt_number}</div>
              </div>
              <div className="info-item">
                <div className="info-item__label">Total Paid</div>
                <div className="info-item__value font-bold">{formatCurrency(result.total_amount)}</div>
              </div>
            </div>

            <div className="table-scroll" style={{ marginTop: "var(--space-3)" }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Service</th>
                    <th className="cell-numeric">Amount Applied</th>
                    <th>Individual Receipt #</th>
                  </tr>
                </thead>
                <tbody>
                  {result.lines.map((line) => (
                    <tr key={line.id}>
                      <td className="cell-mono">{line.invoice_number}</td>
                      <td>{line.invoice_description}</td>
                      <td className="cell-numeric">{formatCurrency(line.amount_applied)}</td>
                      <td className="cell-mono">{line.receipt_number}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="form-actions" style={{ marginTop: "var(--space-3)" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setResult(null)}
              >
                <i className="bi bi-arrow-left me-2"></i> Back
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate(`/billing/bulk-payment/${result.id}/receipt`)}
              >
                <i className="bi bi-receipt me-2"></i> View Full Combined Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}