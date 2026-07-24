import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { getReceipt } from "../services/api";
import Modal from "./Modal";
import LoadingSpinner from "./LoadingSpinner";
import { formatCurrency, formatDateTime } from "../utils/formatters";
import medicoreLogo from "../assets/medicore_logo.png";

// Standalone print stylesheet
const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    width: 460px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #1f2937;
    -webkit-font-smoothing: antialiased;
  }
  .receipt-doc { border: 1px solid #e5e7eb; border-radius: 8px; background: #ffffff; }
  .receipt-doc__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 18px;
    padding: 24px 24px 18px;
  }
  .receipt-doc__brand { display: flex; align-items: center; gap: 13px; min-width: 0; }
  .receipt-doc__logo {
    width: 56px;
    height: 56px;
    background: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
    padding: 4px;
  }
  .receipt-doc__logo img { 
    width: 100%; 
    height: 100%; 
    object-fit: contain;
  }
  .receipt-doc__hospital-name { 
    font-size: 18px; 
    font-weight: 600; 
    color: #111827;
    line-height: 1.3;
  }
  .receipt-doc__hospital-tag { 
    font-size: 10px; 
    color: #6b7280; 
    margin-top: 2px; 
    letter-spacing: 0.5px; 
    text-transform: uppercase; 
    font-weight: 500;
  }
  .receipt-doc__meta { 
    text-align: right; 
    flex-shrink: 0;
    margin-left: auto;
  }
  .receipt-doc__meta-row {
    display: flex;
    justify-content: flex-end;
    align-items: baseline;
    gap: 12px;
    font-size: 12px;
    padding: 2px 0;
    white-space: nowrap;
  }
  .receipt-doc__meta-row span:first-child { 
    color: #6b7280; 
    font-weight: 400;
  }
  .receipt-doc__meta-row span:last-child { 
    font-weight: 600; 
    font-variant-numeric: tabular-nums;
    color: #111827;
  }
  .receipt-doc__parties {
    display: flex;
    border-top: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
    background: #fafafa;
  }
  .receipt-doc__party { 
    flex: 1; 
    padding: 14px 24px; 
  }
  .receipt-doc__party + .receipt-doc__party { 
    border-left: 1px solid #e5e7eb; 
  }
  .receipt-doc__party-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.7px;
    color: #6b7280;
    font-weight: 600;
    display: block;
    margin-bottom: 4px;
  }
  .receipt-doc__party-name { 
    font-size: 14px; 
    font-weight: 500; 
    line-height: 1.4;
    color: #111827;
  }
  .receipt-doc__party-sub { 
    font-size: 11.5px; 
    color: #6b7280; 
    margin-top: 2px; 
  }
  .receipt-doc__table { 
    width: 100%; 
    border-collapse: collapse; 
  }
  .receipt-doc__table thead th {
    background: #f9fafb;
    color: #6b7280;
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    text-align: left;
    padding: 10px 24px;
    border-bottom: 1px solid #e5e7eb;
  }
  .receipt-doc__table thead th.text-right { text-align: right; }
  .receipt-doc__table tbody td {
    font-size: 13px;
    padding: 12px 24px;
    border-bottom: 1px solid #f3f4f6;
    vertical-align: middle;
    color: #111827;
  }
  .receipt-doc__table tbody td.text-right { 
    text-align: right; 
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }
  .receipt-doc__method {
    display: inline-block;
    background: #f3f4f6;
    color: #374151;
    padding: 3px 12px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 500;
  }
  .receipt-doc__totals { 
    padding: 6px 24px 18px; 
  }
  .receipt-doc__totals-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 13px;
    padding: 6px 0;
    border-bottom: 1px solid #f3f4f6;
  }
  .receipt-doc__totals-row span:first-child { 
    color: #6b7280; 
  }
  .receipt-doc__totals-row span:last-child { 
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }
  .receipt-doc__totals-row--main {
    font-size: 16px;
    font-weight: 700;
    color: #111827;
    border-bottom: 2px solid #111827;
    padding: 10px 0 8px;
    margin-top: 4px;
  }
  .receipt-doc__totals-row--main span:first-child { 
    color: #111827; 
  }
  .receipt-doc__totals-row--main span:last-child {
    font-weight: 700;
  }
  .receipt-doc__verify {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 30px;
    padding: 20px 24px;
    border-top: 1px solid #e5e7eb;
  }
  .receipt-doc__qr { text-align: center; }
  .receipt-doc__qr img { 
    width: 120px; 
    height: 120px; 
    display: block;
    border-radius: 4px;
  }
  .receipt-doc__qr-missing {
    width: 120px;
    height: 120px;
    border: 1.5px dashed #d1d5db;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    color: #9ca3af;
    text-align: center;
    padding: 8px;
  }
  .receipt-doc__qr-caption { 
    font-size: 10px; 
    color: #6b7280; 
    margin-top: 6px; 
    letter-spacing: 0.3px;
  }
  .receipt-doc__stamp-box {
    width: 120px;
    height: 120px;
    border: 1.5px dashed #d1d5db;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    font-size: 11px;
    color: #9ca3af;
    padding: 8px;
  }
  .receipt-doc__note {
    font-size: 10.5px;
    color: #6b7280;
    text-align: center;
    line-height: 1.6;
    padding: 14px 28px 18px;
    border-top: 1px solid #f3f4f6;
  }
  .receipt-doc__footer {
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    color: #6b7280;
    padding: 12px;
    border-top: 1px solid #e5e7eb;
    letter-spacing: 0.3px;
  }
  .cell-mono { 
    font-family: 'SF Mono', 'Courier New', monospace; 
    font-variant-numeric: tabular-nums; 
  }
  .fw-semibold { font-weight: 600; }
  .text-danger { color: #dc2626; }
  .text-success { color: #16a34a; }
  @media print {
    body { padding: 0; }
  }
`;

export default function ReceiptModal({ paymentId, show, onClose }) {
  const [receipt, setReceipt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [qrFailed, setQrFailed] = useState(false);
  const receiptRef = useRef(null);

  useEffect(() => {
    if (show && paymentId) {
      loadReceipt();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, paymentId]);

  const loadReceipt = async () => {
    setLoading(true);
    setReceipt(null);
    setQrFailed(false);
    try {
      const data = await getReceipt(paymentId);
      setReceipt(data);
    } catch (err) {
      toast.error(err.message || "Failed to load receipt");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    if (!receiptRef.current) return;
    const printWindow = window.open("", "_blank", "width=540,height=780");
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
        <body>${receiptRef.current.innerHTML}</body>
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

      const pdfWidth = 105;
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      });
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Receipt_${receipt.receipt_number}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF. If the QR code is on a different domain, it may need CORS enabled.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Modal
      show={show}
      onClose={onClose}
      title="Payment Receipt"
      size="modal-md"
      footer={
        !loading && receipt ? (
          <>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Close
            </button>
            <button type="button" className="btn btn-outline-primary" onClick={handlePrint}>
              <i className="bi bi-printer me-2"></i>
              Print
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownloadPdf}
              disabled={downloading}
            >
              {downloading ? (
                <span className="spinner-border spinner-border-sm me-2" role="status" />
              ) : (
                <i className="bi bi-download me-2"></i>
              )}
              Download PDF
            </button>
          </>
        ) : null
      }
    >
      {loading ? (
        <LoadingSpinner />
      ) : receipt ? (
        <>
          <style>{`
            .receipt-preview {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              color: #1f2937;
            }
            .receipt-preview .receipt-doc {
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              overflow: hidden;
              background: #ffffff;
            }
            .receipt-preview .receipt-doc__header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 16px;
              padding: 24px 24px 18px;
            }
            .receipt-preview .receipt-doc__brand {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .receipt-preview .receipt-doc__logo {
              width: 58px;
              height: 58px;
              border-radius: 2px;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
              overflow: hidden;
              padding: 4px;
            }
            .receipt-preview .receipt-doc__logo img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
            .receipt-preview .receipt-doc__hospital-name {
              font-size: 18px;
              font-weight: 600;
              color: #111827;
              line-height: 1.3;
            }
            .receipt-preview .receipt-doc__hospital-tag {
              font-size: 10px;
              color: #6b7280;
              margin-top: 2px;
              letter-spacing: 0.5px;
              text-transform: uppercase;
              font-weight: 500;
            }
            .receipt-preview .receipt-doc__meta {
              text-align: right;
              flex-shrink: 0;
              margin-left: auto;
            }
            .receipt-preview .receipt-doc__meta-row {
              display: flex;
              justify-content: flex-end;
              align-items: baseline;
              gap: 12px;
              font-size: 12px;
              padding: 2px 0;
              white-space: nowrap;
            }
            .receipt-preview .receipt-doc__meta-row span:first-child {
              color: #6b7280;
              font-weight: 400;
            }
            .receipt-preview .receipt-doc__meta-row span:last-child {
              font-weight: 600;
              font-variant-numeric: tabular-nums;
              color: #111827;
            }
            .receipt-preview .receipt-doc__parties {
              display: flex;
              border-top: 1px solid #e5e7eb;
              border-bottom: 1px solid #e5e7eb;
              background: #fafafa;
            }
            .receipt-preview .receipt-doc__party {
              flex: 1;
              padding: 14px 24px;
            }
            .receipt-preview .receipt-doc__party + .receipt-doc__party {
              border-left: 1px solid #e5e7eb;
            }
            .receipt-preview .receipt-doc__party-label {
              font-size: 10px;
              text-transform: uppercase;
              letter-spacing: 0.7px;
              color: #6b7280;
              font-weight: 600;
              display: block;
              margin-bottom: 4px;
            }
            .receipt-preview .receipt-doc__party-name {
              font-size: 14px;
              font-weight: 500;
              line-height: 1.4;
              color: #111827;
            }
            .receipt-preview .receipt-doc__party-sub {
              font-size: 11.5px;
              color: #6b7280;
              margin-top: 2px;
            }
            .receipt-preview .receipt-doc__table {
              width: 100%;
              border-collapse: collapse;
            }
            .receipt-preview .receipt-doc__table thead th {
              background: #f9fafb;
              color: #6b7280;
              font-size: 10px;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              text-align: left;
              padding: 10px 24px;
              border-bottom: 1px solid #e5e7eb;
            }
            .receipt-preview .receipt-doc__table thead th.text-right {
              text-align: right;
            }
            .receipt-preview .receipt-doc__table tbody td {
              font-size: 13px;
              padding: 12px 24px;
              border-bottom: 1px solid #f3f4f6;
              vertical-align: middle;
              color: #111827;
            }
            .receipt-preview .receipt-doc__table tbody td.text-right {
              text-align: right;
              font-variant-numeric: tabular-nums;
              font-weight: 500;
            }
            .receipt-preview .receipt-doc__method {
              display: inline-block;
              background: #f3f4f6;
              color: #374151;
              padding: 3px 12px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: 500;
            }
            .receipt-preview .receipt-doc__totals {
              padding: 6px 24px 18px;
            }
            .receipt-preview .receipt-doc__totals-row {
              display: flex;
              justify-content: space-between;
              align-items: baseline;
              font-size: 13px;
              padding: 6px 0;
              border-bottom: 1px solid #f3f4f6;
            }
            .receipt-preview .receipt-doc__totals-row span:first-child {
              color: #6b7280;
            }
            .receipt-preview .receipt-doc__totals-row span:last-child {
              font-variant-numeric: tabular-nums;
              font-weight: 500;
            }
            .receipt-preview .receipt-doc__totals-row--main {
              font-size: 16px;
              font-weight: 700;
              color: #111827;
              border-bottom: 2px solid #111827;
              padding: 10px 0 8px;
              margin-top: 4px;
            }
            .receipt-preview .receipt-doc__totals-row--main span:first-child {
              color: #111827;
            }
            .receipt-preview .receipt-doc__totals-row--main span:last-child {
              font-weight: 700;
            }
            .receipt-preview .receipt-doc__verify {
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 30px;
              padding: 20px 24px;
              border-top: 1px solid #e5e7eb;
            }
            .receipt-preview .receipt-doc__qr {
              text-align: center;
            }
            .receipt-preview .receipt-doc__qr img {
              width: 120px;
              height: 120px;
              display: block;
              border-radius: 4px;
            }
            .receipt-preview .receipt-doc__qr-missing {
              width: 120px;
              height: 120px;
              border: 1.5px dashed #d1d5db;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 10px;
              color: #9ca3af;
              text-align: center;
              padding: 8px;
            }
            .receipt-preview .receipt-doc__qr-caption {
              font-size: 10px;
              color: #6b7280;
              margin-top: 6px;
              letter-spacing: 0.3px;
            }
            .receipt-preview .receipt-doc__stamp-box {
              width: 120px;
              height: 120px;
              border: 1.5px dashed #d1d5db;
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              text-align: center;
              font-size: 11px;
              color: #9ca3af;
              padding: 8px;
            }
            .receipt-preview .receipt-doc__note {
              font-size: 10.5px;
              color: #6b7280;
              text-align: center;
              line-height: 1.6;
              padding: 14px 28px 18px;
              border-top: 1px solid #f3f4f6;
            }
            .receipt-preview .receipt-doc__footer {
              text-align: center;
              font-size: 12px;
              font-weight: 600;
              color: #6b7280;
              padding: 12px;
              border-top: 1px solid #e5e7eb;
              letter-spacing: 0.3px;
            }
            .receipt-preview .cell-mono {
              font-family: 'SF Mono', 'Courier New', monospace;
              font-variant-numeric: tabular-nums;
            }
            .receipt-preview .fw-semibold { font-weight: 600; }
            .receipt-preview .text-danger { color: #dc2626; }
            .receipt-preview .text-success { color: #16a34a; }
          `}</style>

          <div className="receipt-preview" ref={receiptRef} style={{ maxWidth: 480, margin: "0 auto" }}>
            <div className="receipt-doc">
              <div className="receipt-doc__header">
                <div className="receipt-doc__brand">
                  <div className="receipt-doc__logo">
                    <img
                      src={medicoreLogo}
                      alt="Medicore logo"
                    />
                  </div>
                  <div>
                    <div className="receipt-doc__hospital-name">{receipt.hospital_name}</div>
                    <div className="receipt-doc__hospital-tag">Official Payment Receipt</div>
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
                  {receipt.visit_number && (
                    <div className="receipt-doc__meta-row">
                      <span>Visit No.</span>
                      <span className="cell-mono">{receipt.visit_number}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="receipt-doc__parties">
                <div className="receipt-doc__party">
                  <span className="receipt-doc__party-label">Patient</span>
                  <div className="receipt-doc__party-name">{receipt.patient_name}</div>
                </div>
                <div className="receipt-doc__party">
                  <span className="receipt-doc__party-label">Received By</span>
                  <div className="receipt-doc__party-name">{receipt.cashier || "—"}</div>
                </div>
              </div>

              <table className="receipt-doc__table">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Method</th>
                    {receipt.reference_number && <th>Reference</th>}
                    <th className="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      Payment received{receipt.invoice_number ? ` — Invoice ${receipt.invoice_number}` : ""}
                    </td>
                    <td>
                      <span className="receipt-doc__method">{receipt.payment_method}</span>
                    </td>
                    {receipt.reference_number && (
                      <td className="cell-mono">{receipt.reference_number}</td>
                    )}
                    <td className="text-right fw-semibold">{formatCurrency(receipt.amount_paid)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="receipt-doc__totals">
                <div className="receipt-doc__totals-row receipt-doc__totals-row--main">
                  <span>Amount Paid</span>
                  <span>{formatCurrency(receipt.amount_paid)}</span>
                </div>
                <div className="receipt-doc__totals-row">
                  <span>Balance Remaining</span>
                  <span className={Number(receipt.invoice_balance) > 0 ? "text-danger fw-semibold" : "text-success"}>
                    {formatCurrency(receipt.invoice_balance)}
                  </span>
                </div>
              </div>

              <div className="receipt-doc__verify">
                <div className="receipt-doc__qr">
                  {receipt.qr_code_url && !qrFailed ? (
                    <img
                      src={receipt.qr_code_url}
                      alt="Receipt QR Code"
                      crossOrigin="anonymous"
                      onError={() => setQrFailed(true)}
                    />
                  ) : (
                    <div className="receipt-doc__qr-missing">QR code unavailable</div>
                  )}
                  <div className="receipt-doc__qr-caption">Scan to verify this receipt</div>
                </div>
                <div className="receipt-doc__stamp-box">Official Stamp / Signature</div>
              </div>

              <div className="receipt-doc__note">
                This is an automated receipt generated by the {receipt.hospital_name} Hospital Management
                Information System (HMIS). No handwritten signature is required for validity — authenticity
                can be verified by scanning the QR code above.
              </div>

              <div className="receipt-doc__footer">Thank you for choosing {receipt.hospital_name}</div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-muted text-center py-4">Receipt not found.</div>
      )}
    </Modal>
  );
}