import { useEffect, useState } from "react";
import {
  getPrescriptions, prepareDispense, getPendingCompletionDispenses,
  completeDispense, getDispenses,
} from "../../services/api";
import { formatCurrency, formatDateTime } from "../../utils/formatters";

const TABS = [
  { key: "pending", label: "Pending Prescriptions" },
  { key: "awaiting", label: "Awaiting Payment" },
  { key: "ready", label: "Ready to Complete" },
  { key: "history", label: "Dispense History" },
];

export default function Pharmacy() {
  const [activeTab, setActiveTab] = useState("pending");

  const [prescriptions, setPrescriptions] = useState([]);
  const [awaitingPayment, setAwaitingPayment] = useState([]);
  const [readyToComplete, setReadyToComplete] = useState([]);
  const [history, setHistory] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [prepareForm, setPrepareForm] = useState({});
  const [preparingId, setPreparingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [completingId, setCompletingId] = useState(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const [presData, dispData, historyData] = await Promise.all([
        getPrescriptions({ is_dispensed: false, page_size: 100 }),
        getPendingCompletionDispenses(),
        getDispenses({ page_size: 100 }),
      ]);

      const allHistory = historyData.results ?? historyData;
      setHistory(allHistory);
      setReadyToComplete(dispData);
      setAwaitingPayment(allHistory.filter((d) => d.status === "PENDING_PAYMENT" && d.invoice_status !== "PAID"));

      const preparedPrescriptionIds = new Set(allHistory.map((d) => d.prescription));
      const allPrescriptions = presData.results ?? presData;
      setPrescriptions(allPrescriptions.filter((p) => !preparedPrescriptionIds.has(p.id)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openPrepareForm = (prescriptionId) => {
    setPreparingId(prescriptionId);
    setPrepareForm({ quantity_dispensed: 1, payment_method: "CASH" });
  };

  const handlePrepareChange = (field) => (e) => {
    setPrepareForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const submitPrepare = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await prepareDispense({
        prescription: preparingId,
        quantity_dispensed: Number(prepareForm.quantity_dispensed),
        payment_method: prepareForm.payment_method,
      });
      setPreparingId(null);
      setPrepareForm({});
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (dispenseId) => {
    setCompletingId(dispenseId);
    setError("");
    try {
      await completeDispense(dispenseId);
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setCompletingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "PENDING": "badge-warning",
      "PENDING_PAYMENT": "badge-primary",
      "READY": "badge-info",
      "COMPLETED": "badge-success",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading pharmacy...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Pharmacy</div>
          <h1 className="page-title">Pharmacy</h1>
          <p className="page-subtitle">Manage prescriptions and dispensations</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={loadAll}>
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

      <div className="card">
        <div className="card-header" style={{ padding: 0 }}>
          <div className="tabs" style={{ padding: "0 var(--space-4)" }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`tabs__item ${activeTab === tab.key ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
                {tab.key === "pending" && prescriptions.length > 0 && (
                  <span className="pill-count">{prescriptions.length}</span>
                )}
                {tab.key === "awaiting" && awaitingPayment.length > 0 && (
                  <span className="pill-count">{awaitingPayment.length}</span>
                )}
                {tab.key === "ready" && readyToComplete.length > 0 && (
                  <span className="pill-count">{readyToComplete.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          {/* Pending Prescriptions */}
          {activeTab === "pending" && (
            <div className="tab-content">
              <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: "var(--space-2)" }}>
                <h5 className="card-title" style={{ marginBottom: 0 }}>
                  Pending Prescriptions ({prescriptions.length})
                </h5>
              </div>
              <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
                <i className="bi bi-info-circle me-1"></i>
                Select a payment method before preparing — the invoice raised will use the price matching
                that method (cash/M-Pesa/card vs insurance). Stock is <strong>not</strong> deducted at this step.
              </div>
              {prescriptions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-capsule"></i>
                  </div>
                  <h3 className="empty-state__title">No pending prescriptions</h3>
                  <p className="empty-state__desc">All prescriptions have been processed.</p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Medicine</th>
                        <th>Dosage</th>
                        <th className="cell-numeric">Prescribed Qty</th>
                        <th className="cell-actions"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {prescriptions.map((p) => (
                        <tr key={p.id}>
                          <td className="cell-primary">{p.patient_name}</td>
                          <td>{p.medicine_name}</td>
                          <td>{p.dosage}</td>
                          <td className="cell-numeric">{p.quantity}</td>
                          <td className="cell-actions">
                            {preparingId === p.id ? (
                              <form onSubmit={submitPrepare} className="flex gap-1" style={{ flexWrap: "wrap" }}>
                                <input
                                  type="number"
                                  className="input"
                                  min="1"
                                  value={prepareForm.quantity_dispensed}
                                  onChange={handlePrepareChange("quantity_dispensed")}
                                  style={{ width: "70px" }}
                                  required
                                />
                                <select
                                  className="select"
                                  value={prepareForm.payment_method}
                                  onChange={handlePrepareChange("payment_method")}
                                  style={{ width: "110px" }}
                                >
                                  <option value="CASH">Cash</option>
                                  <option value="MPESA">M-Pesa</option>
                                  <option value="CARD">Card</option>
                                  <option value="INSURANCE">Insurance</option>
                                </select>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={submitting}>
                                  {submitting ? "..." : "Confirm"}
                                </button>
                                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPreparingId(null)}>
                                  <i className="bi bi-x"></i>
                                </button>
                              </form>
                            ) : (
                              <button className="btn btn-primary btn-sm" onClick={() => openPrepareForm(p.id)}>
                                <i className="bi bi-plus-circle me-1"></i> Prepare
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Awaiting Payment */}
          {activeTab === "awaiting" && (
            <div className="tab-content">
              <h5 className="card-title" style={{ marginBottom: "var(--space-2)" }}>
                Awaiting Payment ({awaitingPayment.length})
              </h5>
              <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
                <i className="bi bi-info-circle me-1"></i>
                Prepared, invoiced, but not yet paid in full — direct the patient to Billing to settle before this can be completed.
              </div>
              {awaitingPayment.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-credit-card"></i>
                  </div>
                  <h3 className="empty-state__title">Nothing awaiting payment</h3>
                  <p className="empty-state__desc">All prepared dispensations have been paid.</p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Medicine</th>
                        <th className="cell-numeric">Qty</th>
                        <th>Method</th>
                        <th>Invoice Status</th>
                        <th className="cell-numeric">Balance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {awaitingPayment.map((d) => (
                        <tr key={d.id}>
                          <td className="cell-primary">{d.patient_name}</td>
                          <td>{d.medicine_name}</td>
                          <td className="cell-numeric">{d.quantity_dispensed}</td>
                          <td>{d.payment_method}</td>
                          <td>
                            <span className={`badge ${d.invoice_status === "PAID" ? "badge-success" : "badge-warning"}`}>
                              <span className="badge-dot"></span>
                              {d.invoice_status}
                            </span>
                          </td>
                          <td className="cell-numeric">{formatCurrency(d.invoice_balance)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Ready to Complete */}
          {activeTab === "ready" && (
            <div className="tab-content">
              <h5 className="card-title" style={{ marginBottom: "var(--space-2)" }}>
                Ready to Complete ({readyToComplete.length})
              </h5>
              <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
                <i className="bi bi-info-circle me-1"></i>
                Invoice confirmed paid — completing here deducts stock via FEFO batch selection.
              </div>
              {readyToComplete.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-check-circle"></i>
                  </div>
                  <h3 className="empty-state__title">Nothing ready to complete</h3>
                  <p className="empty-state__desc">All paid dispensations have been completed.</p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Medicine</th>
                        <th className="cell-numeric">Qty</th>
                        <th>Method</th>
                        <th className="cell-actions"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {readyToComplete.map((d) => (
                        <tr key={d.id}>
                          <td className="cell-primary">{d.patient_name}</td>
                          <td>{d.medicine_name}</td>
                          <td className="cell-numeric">{d.quantity_dispensed}</td>
                          <td>{d.payment_method}</td>
                          <td className="cell-actions">
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleComplete(d.id)}
                              disabled={completingId === d.id}
                            >
                              {completingId === d.id ? (
                                <>
                                  <span className="spinner spinner-sm" style={{ display: "inline-block", width: "12px", height: "12px", marginRight: "var(--space-1)" }}></span>
                                  Completing...
                                </>
                              ) : (
                                <>
                                  <i className="bi bi-check-circle me-1"></i> Complete
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* History */}
          {activeTab === "history" && (
            <div className="tab-content">
              <h5 className="card-title" style={{ marginBottom: "var(--space-2)" }}>Dispense History</h5>
              {history.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-clock-history"></i>
                  </div>
                  <h3 className="empty-state__title">No dispense history</h3>
                  <p className="empty-state__desc">No dispensations have been completed yet.</p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Medicine</th>
                        <th className="cell-numeric">Qty</th>
                        <th>Method</th>
                        <th>Status</th>
                        <th>Dispensed</th>
                        <th>Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {history.map((d) => (
                        <tr key={d.id}>
                          <td className="cell-primary">{d.patient_name}</td>
                          <td>{d.medicine_name}</td>
                          <td className="cell-numeric">{d.quantity_dispensed}</td>
                          <td>{d.payment_method}</td>
                          <td>
                            <span className={`badge ${getStatusBadge(d.status)}`}>
                              <span className="badge-dot"></span>
                              {d.status.replace("_", " ")}
                            </span>
                          </td>
                          <td>{d.dispensed_at ? formatDateTime(d.dispensed_at) : "—"}</td>
                          <td>{d.completed_at ? formatDateTime(d.completed_at) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}