import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "../../context/ToastContext";
import { getBulkPaymentReceipt } from "../../services/api";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import medicoreLogo from "../../assets/medicore_logo.png";

// Styles for the off-screen receipt-doc used ONLY for print + PDF output.
// Not applied to the visible page — the visible page keeps its own card/
// info-grid styling untouched.
const RECEIPT_DOC_STYLES = `
  * { box-sizing: border-box; }
  .receipt-preview {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #1f2937;
    width: 480px;
  }
  .receipt-doc { border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff; overflow: hidden; }
  .receipt-doc__header {
    display: flex; justify-content: space-between; align-items: flex-start;
    gap: 18px; padding: 28px 28px 20px;
  }
  .receipt-doc__brand { display: flex; align-items: center; gap: 14px; min-width: 0; }
  .receipt-doc__logo {
    width: 60px; height: 60px; display: flex; align-items: center; justify-content: center;
    flex-shrink: 0; overflow: hidden; padding: 4px;
  }
  .receipt-doc__logo img { width: 100%; height: 100%; object-fit: contain; }
  .receipt-doc__hospital-name { font-size: 20px; font-weight: 600; color: #111827; line-height: 1.3; }
  .receipt-doc__hospital-tag {
    font-size: 11px; color: #6b7280; margin-top: 2px;
    letter-spacing: 0.5px; text-transform: uppercase; font-weight: 500;
  }
  .receipt-doc__meta { text-align: right; flex-shrink: 0; margin-left: auto; }
  .receipt-doc__meta-row {
    display: flex; justify-content: flex-end; align-items: baseline;
    gap: 12px; font-size: 13px; padding: 3px 0; white-space: nowrap;
  }
  .receipt-doc__meta-row span:first-child { color: #6b7280; }
  .receipt-doc__meta-row span:last-child { font-weight: 600; font-variant-numeric: tabular-nums; color: #111827; }
  .receipt-doc__parties {
    display: flex; border-top: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb; background: #fafafa;
  }
  .receipt-doc__party { flex: 1; padding: 16px 28px; }
  .receipt-doc__party + .receipt-doc__party { border-left: 1px solid #e5e7eb; }
  .receipt-doc__party-label {
    font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.7px;
    color: #6b7280; font-weight: 600; display: block; margin-bottom: 4px;
  }
  .receipt-doc__party-name { font-size: 14.5px; font-weight: 500; line-height: 1.4; color: #111827; }
  .receipt-doc__party-sub { font-size: 12px; color: #6b7280; margin-top: 2px; }
  .receipt-doc__table { width: 100%; border-collapse: collapse; }
  .receipt-doc__table thead th {
    background: #f9fafb; color: #6b7280; font-size: 10.5px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 0.5px; text-align: left;
    padding: 12px 28px; border-bottom: 1px solid #e5e7eb;
    margin-right: 12px;
  }
  .receipt-doc__table thead th.text-right { text-align: right; }
  .receipt-doc__table tbody td {
    font-size: 13.5px; padding: 13px 28px; border-bottom: 1px solid #f3f4f6;
    vertical-align: middle; color: #111827;
  }
  .receipt-doc__table tbody td.text-right {
    text-align: right; font-variant-numeric: tabular-nums; font-weight: 500;
  }
  .receipt-doc__method {
    display: inline-block; background: #f3f4f6; color: #374151;
    padding: 3px 12px; border-radius: 12px; font-size: 11.5px; font-weight: 500;
  }
  .receipt-doc__totals { padding: 8px 28px 20px; }
  .receipt-doc__totals-row {
    display: flex; justify-content: space-between; align-items: baseline;
    font-size: 14px; padding: 7px 0; border-bottom: 1px solid #f3f4f6;
  }
  .receipt-doc__totals-row span:first-child { color: #6b7280; }
  .receipt-doc__totals-row span:last-child { font-variant-numeric: tabular-nums; font-weight: 500; }
  .receipt-doc__totals-row--main {
    font-size: 18px; font-weight: 700; color: #111827;
    border-bottom: 2px solid #111827; padding: 12px 0 10px; margin-top: 4px;
  }
  .receipt-doc__totals-row--main span:first-child { color: #111827; }
  .receipt-doc__totals-row--main span:last-child { font-weight: 700; }
  .receipt-doc__note {
    font-size: 11.5px; color: #6b7280; text-align: center; line-height: 1.6;
    padding: 16px 32px 20px; border-top: 1px solid #f3f4f6;
  }
  .receipt-doc__footer {
    text-align: center; font-size: 13px; font-weight: 600; color: #6b7280;
    padding: 14px; border-top: 1px solid #e5e7eb; letter-spacing: 0.3px;
  }
  .cell-mono { font-family: 'SF Mono', 'Courier New', monospace; font-variant-numeric: tabular-nums; }
`;

// Print window wraps the same styles inside an A4 page.
const PRINT_STYLES = `
  ${RECEIPT_DOC_STYLES}
  @page { size: A4; margin: 0; }
  body {
    margin: 0;
    padding: 40px 20px;
    display: flex;
    justify-content: center;
    background: #ffffff;
    -webkit-font-smoothing: antialiased;
  }
`;

export default function BulkPaymentReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const receiptRef = useRef(null); // off-screen node, used for print + PDF only

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
    if (!receiptRef.current) return;
    const printWindow = window.open("", "_blank", "width=900,height=1100");
    if (!printWindow) {
      toast.error("Please allow pop-ups to print the receipt");
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${receipt?.receipt_number || ""}</title>
          <style>${PRINT_STYLES}</style>
        </head>
        <body>
          <div class="receipt-preview">${receiptRef.current.innerHTML}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 350);
    };
  };

  const handleDownloadPdf = async () => {
    if (!receiptRef.current || !receipt) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(receiptRef.current, {
        scale: 3,
        backgroundColor: "#ffffff",
        useCORS: true,
      });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = Math.min(pageWidth - margin * 2, 170);
      const contentHeight = (canvas.height * contentWidth) / canvas.width;
      const x = (pageWidth - contentWidth) / 2;
      const y = margin;

      pdf.addImage(imgData, "PNG", x, y, contentWidth, contentHeight);
      pdf.save(`Receipt_${receipt.receipt_number}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF.");
    } finally {
      setDownloading(false);
    }
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
      {/* ---- Your original page, unchanged ---- */}
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
          <button className="btn btn-outline-primary" onClick={handlePrint}>
            <i className="bi bi-printer me-2"></i> Print
          </button>
          <button className="btn btn-primary" onClick={handleDownloadPdf} disabled={downloading}>
            {downloading ? (
              <span className="spinner-border spinner-border-sm me-2" role="status" />
            ) : (
              <i className="bi bi-download me-2"></i>
            )}
            Download PDF
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

      {/* ---- Off-screen receipt-doc: used ONLY for print + PDF, never shown on the page ---- */}
      <div
        aria-hidden="true"
        style={{ position: "fixed", top: 0, left: "-10000px", zIndex: -1 }}
      >
        <style>{RECEIPT_DOC_STYLES}</style>
        <div className="receipt-preview" ref={receiptRef}>
          <div className="receipt-doc">
            <div className="receipt-doc__header">
              <div className="receipt-doc__brand">
                <div className="receipt-doc__logo">
                  <img src={medicoreLogo} alt="Hospital logo" />
                </div>
                <div>
                  <div className="receipt-doc__hospital-name">{receipt.hospital_name}</div>
                  <div className="receipt-doc__hospital-tag">Combined Payment Receipt</div>
                </div>
              </div>
              <div className="receipt-doc__meta">
                <div className="receipt-doc__meta-row">
                  <span>Receipt No.</span>
                  <span className="cell-mono">{receipt.receipt_number}</span>
                </div>
                <div className="receipt-doc__meta-row">
                  <span>Date</span>
                  <span>{formatDateTime(receipt.paid_at)}</span>
                </div>
              </div>
            </div>

            <div className="receipt-doc__parties">
              <div className="receipt-doc__party">
                <span className="receipt-doc__party-label">Patient</span>
                <div className="receipt-doc__party-name">{receipt.patient_name}</div>
                <div className="receipt-doc__party-sub">{receipt.hospital_number}</div>
              </div>
              <div className="receipt-doc__party">
                <span className="receipt-doc__party-label">Received By</span>
                <div className="receipt-doc__party-name">{receipt.cashier_name}</div>
              </div>
              <div className="receipt-doc__party">
                <span className="receipt-doc__party-label">Method</span>
                <div className="receipt-doc__party-name">
                  <span className="receipt-doc__method">{receipt.method}</span>
                </div>
                {receipt.reference_number && (
                  <div className="receipt-doc__party-sub">Ref: {receipt.reference_number}</div>
                )}
              </div>
            </div>

            <table className="receipt-doc__table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Service</th>
                  <th>Type</th>
                  <th className="text-right">Amount Paid</th>
                  <th>Receipt #</th>
                </tr>
              </thead>
              <tbody>
                {receipt.lines.map((line) => (
                  <tr key={line.id}>
                    <td className="cell-mono">{line.invoice_number}</td>
                    <td>{line.invoice_description}</td>
                    <td><span className="receipt-doc__method">{line.invoice_source_type}</span></td>
                    <td className="text-right">{formatCurrency(line.amount_applied)}</td>
                    <td className="cell-mono">{line.receipt_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="receipt-doc__totals">
              <div className="receipt-doc__totals-row receipt-doc__totals-row--main">
                <span>Total Paid</span>
                <span>{formatCurrency(receipt.total_amount)}</span>
              </div>
              <div className="receipt-doc__totals-row">
                <span>Invoices Covered</span>
                <span>{receipt.lines.length}</span>
              </div>
            </div>

            <div className="receipt-doc__note">
              This is an automated combined receipt generated by the {receipt.hospital_name} Hospital
              Management Information System (HMIS), covering payments applied across {receipt.lines.length}{" "}
              invoice{receipt.lines.length !== 1 ? "s" : ""} in a single transaction.
            </div>

            <div className="receipt-doc__footer">Thank you for choosing {receipt.hospital_name}</div>
          </div>
        </div>
      </div>
    </>
  );
}