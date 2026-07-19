import { useEffect, useState } from "react";
import { getSupplierInvoices, createSupplierPayment } from "../../services/api";

export default function SupplierInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [payingId, setPayingId] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "BANK_TRANSFER", reference_number: "" });

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getSupplierInvoices(params);
      setInvoices(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const openPaymentForm = (invoice) => {
    setPayingId(invoice.id);
    setPaymentForm({ amount: invoice.balance, method: "BANK_TRANSFER", reference_number: "" });
  };

  const submitPayment = async (invoiceId) => {
    try {
      await createSupplierPayment({
        supplier_invoice: invoiceId,
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        reference_number: paymentForm.reference_number,
      });
      setPayingId(null);
      load();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "UNPAID": "badge-danger",
      "PARTIAL": "badge-warning",
      "PAID": "badge-success",
      "DISPUTED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading && invoices.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading supplier invoices...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Procurement</div>
          <h1 className="page-title">Supplier Invoices</h1>
          <p className="page-subtitle">Manage supplier invoices and payments</p>
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
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIAL">Partially Paid</option>
                <option value="PAID">Paid</option>
                <option value="DISPUTED">Disputed</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {invoices.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-file-earmark-text"></i>
              </div>
              <h3 className="empty-state__title">No supplier invoices found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No invoices with status "${statusFilter}" found.` 
                  : "Supplier invoices will appear here once recorded."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Supplier Ref</th>
                    <th>Supplier</th>
                    <th>PO #</th>
                    <th className="cell-numeric">Amount</th>
                    <th className="cell-numeric">Paid</th>
                    <th className="cell-numeric">Balance</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id}>
                      <td className="cell-mono">{inv.invoice_number}</td>
                      <td>{inv.supplier_invoice_ref || "—"}</td>
                      <td>{inv.supplier_name}</td>
                      <td className="cell-mono">{inv.po_number}</td>
                      <td className="cell-numeric">{formatCurrency(inv.amount)}</td>
                      <td className="cell-numeric">{formatCurrency(inv.amount_paid)}</td>
                      <td className="cell-numeric">
                        <span className={Number(inv.balance) > 0 ? "text-danger fw-semibold" : "text-success"}>
                          {formatCurrency(inv.balance)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(inv.status)}`}>
                          <span className="badge-dot"></span>
                          {inv.status}
                        </span>
                      </td>
                      <td>{inv.due_date || "—"}</td>
                      <td className="cell-actions">
                        {inv.status !== "PAID" && (
                          payingId === inv.id ? (
                            <div className="flex gap-1" style={{ minWidth: "300px", flexWrap: "wrap" }}>
                              <input
                                type="number"
                                className="input"
                                placeholder="Amount"
                                value={paymentForm.amount}
                                onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))}
                                style={{ width: "100px" }}
                              />
                              <select
                                className="select"
                                value={paymentForm.method}
                                onChange={(e) => setPaymentForm((p) => ({ ...p, method: e.target.value }))}
                                style={{ width: "120px" }}
                              >
                                <option value="CASH">Cash</option>
                                <option value="BANK_TRANSFER">Bank Transfer</option>
                                <option value="MPESA">M-Pesa</option>
                                <option value="CHEQUE">Cheque</option>
                              </select>
                              <input
                                type="text"
                                className="input"
                                placeholder="Reference #"
                                value={paymentForm.reference_number}
                                onChange={(e) => setPaymentForm((p) => ({ ...p, reference_number: e.target.value }))}
                                style={{ width: "120px" }}
                              />
                              <button className="btn btn-success btn-sm" onClick={() => submitPayment(inv.id)}>
                                <i className="bi bi-check me-1"></i> Confirm
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setPayingId(null)}>
                                <i className="bi bi-x"></i>
                              </button>
                            </div>
                          ) : (
                            <button className="btn btn-primary btn-sm" onClick={() => openPaymentForm(inv)}>
                              <i className="bi bi-cash me-1"></i> Pay
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {invoices.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Unpaid
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Partial
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Paid
              </span>
              <span className="badge badge-neutral">
                <span className="badge-dot"></span>
                Disputed
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}