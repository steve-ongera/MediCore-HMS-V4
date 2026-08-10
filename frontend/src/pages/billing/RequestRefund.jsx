import { useEffect, useState } from "react";
import { getPayments, requestRefund, getRefunds } from "../../services/api";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatCurrency, formatDateTime } from "../../utils/formatters";

export default function RequestRefund() {
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  useEffect(() => {
    loadMyRequests();
  }, []);

  const loadMyRequests = async () => {
    setLoadingRequests(true);
    try {
      const data = await getRefunds({ page_size: 100 });
      const all = data.results ?? data;
      setMyRequests(all.filter((r) => r.requested_by === user?.id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!search.trim()) return;
    setError("");
    try {
      const data = await getPayments({ search, page_size: 20 });
      setPayments(data.results ?? data);
    } catch (err) {
      setError(err.message);
    }
  };

  const selectPayment = (payment) => {
    setSelectedPayment(payment);
    setPayments([]);
    setSearch("");
    setAmount(payment.amount);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!selectedPayment) {
      setError("Select the payment you're requesting a refund for.");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Enter a valid refund amount.");
      return;
    }
    if (parseFloat(amount) > parseFloat(selectedPayment.amount)) {
      setError(`Refund amount cannot exceed the original payment (KES ${selectedPayment.amount}).`);
      return;
    }
    if (!reason.trim()) {
      setError("Please explain why this refund is needed.");
      return;
    }
    setSubmitting(true);
    try {
      await requestRefund({
        payment: selectedPayment.id,
        amount: parseFloat(amount),
        reason,
      });
      setSuccess("Refund request submitted. An accountant or super admin must approve it before it's processed.");
      setSelectedPayment(null);
      setAmount("");
      setReason("");
      loadMyRequests();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "REQUESTED": "badge-warning",
      "APPROVED": "badge-primary",
      "PROCESSED": "badge-success",
      "REJECTED": "badge-danger",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loadingRequests && myRequests.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading refund requests...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1 className="page-title">Request Refund</h1>
          <p className="page-subtitle">Request a refund for a payment</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => { loadMyRequests(); }}>
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

      {success && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--success)", background: "var(--success-soft)" }}>
          <div className="card-body">
            <div className="text-success">
              <i className="bi bi-check-circle  me-1"></i> {success}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-search  me-1"></i> Step 1: Find the Payment
          </h5>
        </div>
        <div className="card-body">
          <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            <i className="bi bi-info-circle  me-1"></i>
            Search for the original payment by receipt number, invoice number, or patient name.
          </div>
          <form onSubmit={handleSearch}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Search</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Search by receipt #, invoice #, or patient name"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                  <i className="bi bi-search  me-1"></i> Search
                </button>
              </div>
            </div>
          </form>

          {payments.length > 0 && (
            <div style={{ marginTop: "var(--space-4)" }}>
              <div className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)" }}>
                Search Results ({payments.length})
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Invoice #</th>
                      <th>Patient</th>
                      <th className="cell-numeric">Amount</th>
                      <th>Method</th>
                      <th>Paid At</th>
                      <th className="cell-actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="cell-mono">{p.receipt_number}</td>
                        <td className="cell-mono">{p.invoice_number}</td>
                        <td className="cell-primary">{p.patient_name}</td>
                        <td className="cell-numeric">{formatCurrency(p.amount)}</td>
                        <td>
                          <span className="tag">{p.method}</span>
                        </td>
                        <td>{formatDateTime(p.paid_at)}</td>
                        <td className="cell-actions">
                          <button className="btn btn-primary btn-sm" onClick={() => selectPayment(p)}>
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
        </div>
      </div>

      {selectedPayment && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-clipboard-plus  me-1"></i> Step 2: Refund Details
            </h5>
          </div>
          <div className="card-body">
            <div className="card" style={{ borderColor: "var(--primary)", background: "var(--primary-soft)", marginBottom: "var(--space-4)" }}>
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="avatar avatar-sm">
                    <i className="bi bi-receipt fs-xl"></i>
                  </div>
                  <div>
                    <div className="text-sm text-primary font-semibold">
                      <i className="bi bi-check-circle  me-1"></i> Selected Payment
                    </div>
                    <div className="font-bold">{selectedPayment.receipt_number}</div>
                    <div className="text-sm text-muted">
                      {selectedPayment.patient_name} • {formatCurrency(selectedPayment.amount)} ({selectedPayment.method})
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm ml-auto"
                    onClick={() => setSelectedPayment(null)}
                  >
                    <i className="bi bi-x  me-1"></i> Change
                  </button>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="field">
                <label className="field-label">Refund Amount <span className="required">*</span></label>
                <div className="text-2xs text-tertiary" style={{ marginBottom: "var(--space-1)" }}>
                  Max {formatCurrency(selectedPayment.amount)}
                </div>
                <input
                  type="number"
                  className="input"
                  max={selectedPayment.amount}
                  placeholder="Enter refund amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div className="field">
                <label className="field-label">Reason for Refund <span className="required">*</span></label>
                <textarea
                  className="textarea"
                  placeholder="e.g. Overcharged, service not rendered, duplicate payment, patient dispute"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedPayment(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send  me-1"></i> Submit Refund Request
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history  me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>My Refund Requests</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {myRequests.length} request{myRequests.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {myRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No refund requests</h3>
              <p className="empty-state__desc">You haven't requested any refunds yet.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Refund #</th>
                    <th>Receipt #</th>
                    <th>Patient</th>
                    <th className="cell-numeric">Amount</th>
                    <th>Reason</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-mono">{r.refund_number}</td>
                      <td className="cell-mono">{r.receipt_number}</td>
                      <td className="cell-primary">{r.patient_name}</td>
                      <td className="cell-numeric">{formatCurrency(r.amount)}</td>
                      <td>{r.reason}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(r.status)}`}>
                          <span className="badge-dot"></span>
                          {r.status}
                        </span>
                        {r.status === "REJECTED" && r.rejection_reason && (
                          <div className="text-2xs text-danger mt-1">{r.rejection_reason}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {myRequests.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {myRequests.length} request{myRequests.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Requested
              </span>
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                Approved
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Processed
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