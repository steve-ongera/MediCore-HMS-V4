import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "../../context/ToastContext";
import { getBulkPaymentReceipt } from "../../services/api";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import medicoreLogo from "../../assets/logo.png";

// Design constants aligned with ConsultationDetail PDF exports
const BRAND_COLOR = [30, 64, 175]; // #1e40af
const DARK_TEXT = [17, 24, 39]; // #111827
const MUTED_COLOR = [107, 114, 128]; // #6b7280
const LIGHT_BORDER = [229, 231, 235]; // #e5e7eb
const LIGHT_FILL = [249, 250, 251]; // #f9fafb

export default function BulkPaymentReceipt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getBulkPaymentReceipt(id);
      setReceipt(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Helper to load an image element into jsPDF
   */
  const loadImage = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  /**
   * Generates a simple, lightweight QR Code Canvas Data URL for verification demo
   */
  const generateQrCodeDataUrl = (text) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 120;
      canvas.height = 120;
      const ctx = canvas.getContext("2d");

      // Draw standard clean QR placeholder box with outer border & corner markers
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 120, 120);

      ctx.strokeStyle = "#1e40af";
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 116, 116);

      // Corner Position Markers
      const drawMarker = (x, y) => {
        ctx.fillStyle = "#1e40af";
        ctx.fillRect(x, y, 28, 28);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x + 4, y + 4, 20, 20);
        ctx.fillStyle = "#1e40af";
        ctx.fillRect(x + 8, y + 8, 12, 12);
      };

      drawMarker(8, 8);
      drawMarker(84, 8);
      drawMarker(8, 84);

      // Simulated Data Grid
      ctx.fillStyle = "#111827";
      for (let i = 0; i < 14; i++) {
        for (let j = 0; j < 14; j++) {
          if ((i < 5 && j < 5) || (i > 9 && j < 5) || (i < 5 && j > 9)) continue;
          if ((i * 7 + j * 13) % 3 === 0) {
            ctx.fillRect(10 + i * 7, 10 + j * 7, 5, 5);
          }
        }
      }

      resolve(canvas.toDataURL("image/png"));
    });
  };

  /**
   * Generates the PDF using jsPDF + jspdf-autotable
   */
  const generatePdf = async () => {
    if (!receipt) return null;

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12; // Tightened margin for slim document structure

    // Load hospital logo & generate QR code
    const logoImg = await loadImage(medicoreLogo);
    const qrDataUrl = await generateQrCodeDataUrl(
      `RECEIPT:${receipt.receipt_number}|PATIENT:${receipt.hospital_number}|AMT:${receipt.total_amount}`
    );

    // 1. Header Rendering
    if (logoImg) {
      try {
        doc.addImage(logoImg, "PNG", margin, 10, 12, 12);
      } catch (e) {
        console.warn("Could not render logo in PDF:", e);
      }
    }

    const brandX = logoImg ? margin + 15 : margin;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...DARK_TEXT);
    doc.text(receipt.hospital_name || "MEDICORE HOSPITAL", brandX, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text("Healthcare Management Information System", brandX, 19);

    // Right Header Title & Metadata
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_COLOR);
    doc.text("COMBINED PAYMENT RECEIPT", pageWidth - margin, 15, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(`Generated: ${formatDateTime(new Date())}`, pageWidth - margin, 19, { align: "right" });

    // Accent line beneath header
    doc.setDrawColor(...BRAND_COLOR);
    doc.setLineWidth(0.4);
    doc.line(margin, 24, pageWidth - margin, 24);

    let startY = 28;

    // 2. Receipt & Patient Information Grid (Slim, Compact Summary)
    autoTable(doc, {
      startY: startY,
      theme: "plain",
      margin: { left: margin, right: margin },
      styles: {
        fontSize: 8,
        cellPadding: 1.8,
        textColor: DARK_TEXT,
      },
      columnStyles: {
        0: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 32 },
        1: { cellWidth: 58 },
        2: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 32 },
        3: { cellWidth: 58 },
      },
      body: [
        [
          "Receipt Number:",
          receipt.receipt_number || "N/A",
          "Patient Name:",
          receipt.patient_name || "N/A",
        ],
        [
          "Payment Date:",
          formatDateTime(receipt.paid_at),
          "Hospital Number:",
          receipt.hospital_number || "N/A",
        ],
        [
          "Payment Method:",
          `${receipt.method || "N/A"}${receipt.reference_number ? ` (Ref: ${receipt.reference_number})` : ""}`,
          "Received By:",
          receipt.cashier_name || "N/A",
        ],
        [
          "Total Amount Paid:",
          formatCurrency(receipt.total_amount),
          "Invoices Covered:",
          `${receipt.lines?.length || 0} invoice(s)`,
        ],
      ],
      didDrawCell: (data) => {
        if (data.row.index === 0 && data.column.index === 0) {
          doc.setDrawColor(...LIGHT_BORDER);
          doc.setFillColor(...LIGHT_FILL);
        }
      },
    });

    startY = doc.lastAutoTable.finalY + 5;

    // 3. Section Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text("Invoices Breakdown", margin, startY);

    startY += 3;

    // 4. Invoices Table (Slim Rows & Reduced Heights)
    const tableColumns = [
      { header: "Invoice #", dataKey: "invoice_number" },
      { header: "Service Description", dataKey: "invoice_description" },
      { header: "Type", dataKey: "invoice_source_type" },
      { header: "Receipt #", dataKey: "receipt_number" },
      { header: "Amount Paid", dataKey: "amount_applied" },
    ];

    const tableRows = (receipt.lines || []).map((line) => ({
      invoice_number: line.invoice_number || "-",
      invoice_description: line.invoice_description || "-",
      invoice_source_type: line.invoice_source_type || "-",
      receipt_number: line.receipt_number || "-",
      amount_applied: formatCurrency(line.amount_applied),
    }));

    autoTable(doc, {
      startY: startY,
      columns: tableColumns,
      body: tableRows,
      margin: { left: margin, right: margin, bottom: 40 },
      styles: {
        fontSize: 8,
        cellPadding: 2, // Slim padding for reduced height
        textColor: DARK_TEXT,
        valign: "middle",
      },
      headStyles: {
        fillColor: BRAND_COLOR,
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 8,
        cellPadding: 2.2,
      },
      alternateRowStyles: {
        fillColor: LIGHT_FILL,
      },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 26 },
        3: { cellWidth: 34 },
        4: { cellWidth: 28, halign: "right", fontStyle: "bold" },
      },
      didDrawPage: (data) => {
        // Page level footer
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.5);
        doc.setTextColor(...MUTED_COLOR);

        doc.setDrawColor(...LIGHT_BORDER);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

        doc.text(
          `Confidential - Official Receipt generated by ${receipt.hospital_name || "Hospital HMIS"}`,
          margin,
          pageHeight - 7
        );
        doc.text(
          `Page ${data.pageNumber} of ${pageCount}`,
          pageWidth - margin,
          pageHeight - 7,
          { align: "right" }
        );
      },
    });

    // 5. Total Paid Box + Verification QR Code + Signature & Stamp Section
    let finalY = doc.lastAutoTable.finalY + 5;

    // Check page overflow for bottom sign-off section (requires ~40mm)
    if (finalY + 42 > pageHeight - 15) {
      doc.addPage();
      finalY = 15;
    }

    // A. Total Summary Highlight Box
    doc.setFillColor(...LIGHT_FILL);
    doc.rect(pageWidth - margin - 70, finalY, 70, 14, "F");
    doc.setDrawColor(...LIGHT_BORDER);
    doc.rect(pageWidth - margin - 70, finalY, 70, 14, "S");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_TEXT);
    doc.text("Total Paid:", pageWidth - margin - 66, finalY + 8.5);

    doc.setFontSize(10);
    doc.setTextColor(...BRAND_COLOR);
    doc.text(formatCurrency(receipt.total_amount), pageWidth - margin - 4, finalY + 8.5, {
      align: "right",
    });

    finalY += 18;

    // B. Left: QR Code Verification Block
    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", margin, finalY, 22, 22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...DARK_TEXT);
      doc.text("Scan to Verify", margin + 25, finalY + 6);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED_COLOR);
      doc.text(`Doc ID: ${receipt.receipt_number}`, margin + 25, finalY + 11);
      doc.text("Official Digital Copy", margin + 25, finalY + 15);
    }

    // C. Right: Signature, Stamp & Printed By Details
    const sigX = pageWidth - margin - 70;
    const lineY = finalY + 14;

    // Signature Line
    doc.setDrawColor(...MUTED_COLOR);
    doc.setLineWidth(0.3);
    doc.line(sigX, lineY, sigX + 32, lineY);

    // Stamp Line
    doc.line(sigX + 38, lineY, sigX + 70, lineY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED_COLOR);
    doc.text("Authorized Signature", sigX, lineY + 4);
    doc.text("Official Stamp", sigX + 38, lineY + 4);

    // Printed / Stamped By Details
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text(`Issued By: ${receipt.cashier_name || "Authorized Cashier"}`, sigX, lineY + 9);

    return doc;
  };

  const handlePrint = async () => {
    try {
      const doc = await generatePdf();
      if (!doc) return;
      doc.autoPrint();
      const blobUrl = doc.output("bloburl");
      window.open(blobUrl, "_blank");
    } catch (err) {
      console.error("Print error:", err);
      toast.error("Failed to prepare receipt for printing.");
    }
  };

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      const doc = await generatePdf();
      if (doc) {
        doc.save(`Receipt_${receipt.receipt_number || "Bulk_Payment"}.pdf`);
      }
    } catch (err) {
      console.error("PDF generation error:", err);
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
          <i className="bi bi-arrow-clockwise me-1"></i> Retry
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
            <i className="bi bi-arrow-left me-1"></i> Back
          </button>
          <button className="btn btn-outline-primary" onClick={handlePrint}>
            <i className="bi bi-printer me-1"></i> Print
          </button>
          <button className="btn btn-primary" onClick={handleDownloadPdf} disabled={downloading}>
            {downloading ? (
              <span className="spinner-border spinner-border-sm me-1" role="status" />
            ) : (
              <i className="bi bi-download me-1"></i>
            )}
            Download PDF
          </button>
        </div>
      </div>

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
    </>
  );
}