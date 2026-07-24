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

  const handlePrint = () => {
    window.print();
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
      <div className="page-header" id="print-header">
        <div>
          <div className="page-eyebrow">Billing</div>
          <h1 className="page-title">Combined Receipt</h1>
          <p className="page-subtitle">{receipt.receipt_number}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/billing/bulk-payment")}>
            <i className="bi bi-arrow-left me-2"></i> Back
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            <i className="bi bi-printer me-2"></i> Print / Download PDF
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

      {/* Receipt Content - This will be printed */}
      <div className="receipt-container" id="receipt-content">
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
      </div>

      <style>{`
        @media print {
          #print-header {
            display: none !important;
          }
          .receipt-container {
            margin: 0 !important;
            padding: 20px !important;
          }
          .receipt-container .card {
            border: none !important;
            box-shadow: none !important;
          }
          .receipt-container .card-body {
            padding: 0 !important;
          }
          .receipt-container .patient-header {
            margin-bottom: 16px !important;
          }
          .receipt-container .info-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 12px !important;
          }
          .receipt-container .table-scroll {
            overflow: visible !important;
          }
          .receipt-container .data-table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .receipt-container .data-table th,
          .receipt-container .data-table td {
            padding: 8px !important;
            border-bottom: 1px solid #ddd !important;
            text-align: left !important;
          }
          .receipt-container .data-table th {
            background-color: #f5f5f5 !important;
          }
          .receipt-container .cell-numeric {
            text-align: right !important;
          }
          .receipt-container .cell-mono {
            font-family: monospace !important;
          }
          .receipt-container .badge {
            display: none !important;
          }
          .receipt-container .tag {
            background: #f0f0f0 !important;
            padding: 2px 8px !important;
            border-radius: 4px !important;
            font-size: 12px !important;
          }
          .receipt-container .avatar {
            display: none !important;
          }
          .receipt-container .text-2xs {
            font-size: 10px !important;
          }
          .receipt-container .text-tertiary {
            color: #666 !important;
          }
          .receipt-container .text-sm {
            font-size: 12px !important;
          }
          .receipt-container .font-bold {
            font-weight: bold !important;
          }
          .receipt-container .info-item {
            margin-bottom: 8px !important;
          }
          .receipt-container .info-item__label {
            font-size: 11px !important;
            color: #666 !important;
          }
          .receipt-container .info-item__value {
            font-size: 13px !important;
          }
          .receipt-container .card-header {
            background: transparent !important;
            border-bottom: 2px solid #333 !important;
            padding: 8px 0 !important;
          }
          .receipt-container .card-footer {
            border-top: 2px solid #333 !important;
            padding: 8px 0 !important;
          }
          .receipt-container .flex {
            display: flex !important;
          }
          .receipt-container .items-center {
            align-items: center !important;
          }
          .receipt-container .gap-3 {
            gap: 12px !important;
          }
        }
      `}</style>
    </>
  );
}