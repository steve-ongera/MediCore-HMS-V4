import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBulkPaymentReceipt } from "../../services/api";
import { formatCurrency, formatDateTime } from "../../utils/formatters";

export default function BulkPaymentReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getBulkPaymentReceipt(id);
      setReceipt(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading receipt...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: "var(--space-6)", textAlign: "center" }}>
        <div className="text-danger font-semibold">Error loading receipt</div>
        <p className="text-sm text-muted" style={{ marginTop: "var(--space-2)" }}>{error}</p>
        <button className="btn btn-primary mt-4" onClick={load}>
          <i className="bi bi-arrow-clockwise me-2"></i> Retry
        </button>
      </div>
    );
  }

  if (!receipt) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Billing</div>
          <h1 className="page-title">Combined Receipt</h1>
          <p className="page-subtitle">{receipt.receipt_number}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/billing/bulk-payment")}>
            <i className="bi bi-arrow-left me-2"></i> Back
          </button>
          <button className="btn btn-primary" onClick={() => window.print()}>
            <i className="bi bi-printer me-2"></i> Print Receipt
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
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-receipt fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{receipt.patient_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {receipt.hospital_number}
                </span>
                <span>•</span>
                <span>{receipt.receipt_number}</span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm font-bold">{formatCurrency(receipt.total_amount)}</span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Total Paid</div>
              <div className="info-item__value font-bold">{formatCurrency(receipt.total_amount)}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Method</div>
              <div className="info-item__value">
                {receipt.method}
                {receipt.reference_number && (
                  <div className="text-2xs text-tertiary">Ref: {receipt.reference_number}</div>
                )}
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Cashier</div>
              <div className="info-item__value">{receipt.cashier_name}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Date</div>
              <div className="info-item__value">{formatDateTime(receipt.paid_at)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Invoices Covered</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {receipt.lines.length} invoice{receipt.lines.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Service</th>
                  <th>Type</th>
                  <th className="cell-numeric">Amount Paid</th>
                  <th>Individual Receipt #</th>
                </tr>
              </thead>
              <tbody>
                {receipt.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="cell-mono">{line.invoice_number}</td>
                    <td>{line.invoice_description}</td>
                    <td>
                      <span className="tag">{line.invoice_source_type}</span>
                    </td>
                    <td className="cell-numeric">{formatCurrency(line.amount_applied)}</td>
                    <td className="cell-mono">{line.receipt_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {receipt.lines.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {receipt.lines.length} invoice{receipt.lines.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}