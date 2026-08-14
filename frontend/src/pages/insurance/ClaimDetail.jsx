import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { 
  getInsuranceClaim, 
  submitInsuranceClaim, 
  applyClaimResponse, 
  settleInsuranceClaim, 
  cancelInsuranceClaim 
} from "../../services/api";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import medicoreLogo from "../../assets/logo.png";

// Design constants aligned with BulkPaymentReceipt / HMIS Standard
const BRAND_COLOR = [30, 64, 175]; // #1e40af
const DARK_TEXT = [17, 24, 39]; // #111827
const MUTED_COLOR = [107, 114, 128]; // #6b7280
const LIGHT_BORDER = [229, 231, 235]; // #e5e7eb
const LIGHT_FILL = [249, 250, 251]; // #f9fafb
const SUCCESS_COLOR = [21, 128, 61]; // #15803d

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportingReceipt, setExportingReceipt] = useState(false);

  const [responseForm, setResponseForm] = useState({ status: "APPROVED", approved_amount: "", rejection_reason: "" });
  const [itemApprovals, setItemApprovals] = useState({});

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getInsuranceClaim(id);
      setClaim(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleSubmitClaim = async () => {
    try {
      await submitInsuranceClaim(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleCancel = async () => {
    try {
      await cancelInsuranceClaim(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleItemApprovalChange = (itemId) => (e) => {
    setItemApprovals((p) => ({ ...p, [itemId]: e.target.value }));
  };

  // Fills every claim item's approved amount with its full claimed amount,
  // sets the total to match, and flips status to APPROVED — one click for
  // the common "insurer paid the whole claim" case instead of typing each
  // item's amount by hand.
  const handleMarkFullyPaid = () => {
    if (!claim?.items?.length) return;

    const fullApprovals = {};
    claim.items.forEach((item) => {
      fullApprovals[item.id] = String(item.amount_claimed);
    });

    setItemApprovals(fullApprovals);
    setResponseForm((p) => ({
      ...p,
      status: "APPROVED",
      approved_amount: String(claim.total_claimed),
      rejection_reason: "",
    }));
  };

  const handleApplyResponse = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        status: responseForm.status,
        rejection_reason: responseForm.rejection_reason,
      };
      const filledItems = Object.fromEntries(
        Object.entries(itemApprovals).filter(([, v]) => v !== "" && v !== undefined)
      );
      if (Object.keys(filledItems).length > 0) {
        payload.item_approvals = filledItems;
      } else if (responseForm.approved_amount) {
        payload.approved_amount = parseFloat(responseForm.approved_amount);
      }
      await applyClaimResponse(id, payload);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleSettle = async () => {
    try {
      const result = await settleInsuranceClaim(id);
      alert(`Settled — ${result.payments_created} payment(s) created.`);
      load();
    } catch (err) { setError(err.message); }
  };

  /**
   * Helper to load logo image into jsPDF
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
   * Export detailed Claim PDF
   */
  const handleExportPdf = async () => {
    if (!claim) return;
    setExporting(true);

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;

      // 1. Header Logo & Branding
      const logoImg = await loadImage(medicoreLogo);
      if (logoImg) {
        try {
          doc.addImage(logoImg, "PNG", margin, 10, 12, 12);
        } catch (e) {
          console.warn("Could not render logo in PDF:", e);
        }
      }

      const brandX = logoImg ? margin + 15 : margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...DARK_TEXT);
      doc.text("MEDICORE HOSPITAL", brandX, 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED_COLOR);
      doc.text("Healthcare Management Information System", brandX, 19);

      // Document Header Right
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...BRAND_COLOR);
      doc.text("INSURANCE CLAIM DETAILS", pageWidth - margin, 15, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED_COLOR);
      doc.text(`Generated: ${formatDateTime(new Date())}`, pageWidth - margin, 19, { align: "right" });

      // Separator Line
      doc.setDrawColor(...BRAND_COLOR);
      doc.setLineWidth(0.4);
      doc.line(margin, 23, pageWidth - margin, 23);

      let startY = 27;

      // 2. Claim Summary Header Block
      autoTable(doc, {
        startY: startY,
        theme: "plain",
        margin: { left: margin, right: margin },
        styles: {
          fontSize: 8,
          cellPadding: 1.5,
          textColor: DARK_TEXT,
        },
        columnStyles: {
          0: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 32 },
          1: { fontStyle: "bold", textColor: BRAND_COLOR, cellWidth: 60 },
          2: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 32 },
          3: { cellWidth: 62 },
        },
        body: [
          [
            "Claim Number:",
            claim.claim_number || "-",
            "Claim Status:",
            (claim.status || "-").replace(/_/g, " "),
          ],
          [
            "Patient Name:",
            claim.patient_name || "-",
            "Hospital #:",
            claim.hospital_number || "-",
          ],
          [
            "Insurer Name:",
            claim.insurer_name || "-",
            "Member Number:",
            claim.member_number || "-",
          ],
          ...(claim.gateway_reference ? [[
            "Gateway Ref:",
            claim.gateway_reference,
            "",
            "",
          ]] : []),
          ...(claim.rejection_reason ? [[
            "Rejection Reason:",
            claim.rejection_reason,
            "",
            "",
          ]] : []),
        ],
        didDrawCell: (data) => {
          if (data.row.index === 0 && data.column.index === 0) {
            doc.setFillColor(...LIGHT_FILL);
          }
        },
      });

      startY = doc.lastAutoTable.finalY + 5;

      // Section Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...DARK_TEXT);
      doc.text("Claim Breakdown Items", margin, startY);

      startY += 3;

      // 3. Claim Items Table
      const itemColumns = [
        { header: "Invoice #", dataKey: "invoice_number" },
        { header: "Description", dataKey: "invoice_description" },
        { header: "Source Type", dataKey: "invoice_source_type" },
        { header: "Claimed (KES)", dataKey: "amount_claimed" },
        { header: "Approved (KES)", dataKey: "amount_approved" },
      ];

      const itemRows = (claim.items || []).map((item) => ({
        invoice_number: item.invoice_number || "-",
        invoice_description: item.invoice_description || "-",
        invoice_source_type: item.invoice_source_type || "-",
        amount_claimed: formatCurrency(item.amount_claimed || 0),
        amount_approved: formatCurrency(item.amount_approved || 0),
      }));

      autoTable(doc, {
        startY: startY,
        columns: itemColumns,
        body: itemRows,
        margin: { left: margin, right: margin, bottom: 18 },
        styles: {
          fontSize: 7.5,
          cellPadding: 1.5,
          textColor: DARK_TEXT,
          valign: "middle",
        },
        headStyles: {
          fillColor: BRAND_COLOR,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          cellPadding: 1.8,
        },
        alternateRowStyles: {
          fillColor: LIGHT_FILL,
        },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: "bold" },
          1: { cellWidth: 65 },
          2: { cellWidth: 30 },
          3: { cellWidth: 28, halign: "right" },
          4: { cellWidth: 28, halign: "right", fontStyle: "bold" },
        },
        didDrawPage: (data) => {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(...MUTED_COLOR);

          doc.setDrawColor(...LIGHT_BORDER);
          doc.setLineWidth(0.3);
          doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

          doc.text(
            `Confidential - Claim Details for ${claim.claim_number}`,
            margin,
            pageHeight - 6
          );
          doc.text(
            `Page ${data.pageNumber} of ${pageCount}`,
            pageWidth - margin,
            pageHeight - 6,
            { align: "right" }
          );
        },
      });

      // 4. Totals Box
      let finalY = doc.lastAutoTable.finalY + 5;
      if (finalY + 60 > pageHeight - 15) {
        doc.addPage();
        finalY = 15;
      }

      doc.setFillColor(...LIGHT_FILL);
      doc.rect(pageWidth - margin - 85, finalY, 85, 18, "F");
      doc.setDrawColor(...LIGHT_BORDER);
      doc.rect(pageWidth - margin - 85, finalY, 85, 18, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...DARK_TEXT);
      doc.text("Total Amount Claimed:", pageWidth - margin - 81, finalY + 6);
      doc.setTextColor(...BRAND_COLOR);
      doc.text(`KES ${formatCurrency(claim.total_claimed)}`, pageWidth - margin - 4, finalY + 6, { align: "right" });

      doc.setTextColor(...DARK_TEXT);
      doc.text("Total Amount Approved:", pageWidth - margin - 81, finalY + 12);
      doc.setTextColor(...BRAND_COLOR);
      doc.text(`KES ${formatCurrency(claim.total_approved)}`, pageWidth - margin - 4, finalY + 12, { align: "right" });

      // 5. Dual Signatures & Stamp Section
      let sigY = finalY + 26;
      if (sigY + 38 > pageHeight - 15) {
        doc.addPage();
        sigY = 20;
      }

      const blockWidth = (pageWidth - (margin * 2) - 12) / 2;
      const leftX = margin;
      const rightX = margin + blockWidth + 12;

      // Hospital / Provider Signature Block
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK_TEXT);
      doc.text("HOSPITAL AUTHORIZED SIGNATORY", leftX, sigY);

      doc.setDrawColor(...LIGHT_BORDER);
      doc.setLineWidth(0.3);

      // Signature line
      doc.line(leftX, sigY + 16, leftX + blockWidth, sigY + 16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED_COLOR);
      doc.text("Authorized Officer Signature & Seal", leftX, sigY + 20);

      // Printed Name & Date
      doc.line(leftX, sigY + 30, leftX + (blockWidth * 0.62), sigY + 30);
      doc.text("Name:", leftX, sigY + 34);

      doc.line(leftX + (blockWidth * 0.67), sigY + 30, leftX + blockWidth, sigY + 30);
      doc.text("Date:", leftX + (blockWidth * 0.67), sigY + 34);

      // Insurance Representative & Stamp Block
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK_TEXT);
      doc.text("INSURANCE AUTHORIZATION & STAMP", rightX, sigY);

      // Stamp area box (dashed outline hint)
      doc.setDrawColor(...LIGHT_BORDER);
      doc.line(rightX, sigY + 16, rightX + blockWidth, sigY + 16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED_COLOR);
      doc.text("Insurer Signature & Official Stamp", rightX, sigY + 20);

      // Printed Name & Date
      doc.line(rightX, sigY + 30, rightX + (blockWidth * 0.62), sigY + 30);
      doc.text("Name:", rightX, sigY + 34);

      doc.line(rightX + (blockWidth * 0.67), sigY + 30, rightX + blockWidth, sigY + 30);
      doc.text("Date:", rightX + (blockWidth * 0.67), sigY + 34);

      // Save PDF
      doc.save(`Claim_${claim.claim_number}.pdf`);
    } catch (err) {
      setError(err.message || "Failed to generate claim PDF");
    } finally {
      setExporting(false);
    }
  };

  /**
   * Export Payment/Settlement Receipt PDF for a SETTLED claim.
   * Uses the claim's own settled_at + created_by fields as the source of
   * truth (there's no separate per-payment record surfaced to this page),
   * so "Processed By" reflects who owns the claim record in the system
   * rather than a distinct "settled by" actor.
   */
  const handleExportReceipt = async () => {
    if (!claim) return;
    setExportingReceipt(true);

    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 12;

      // 1. Header Logo & Branding
      const logoImg = await loadImage(medicoreLogo);
      if (logoImg) {
        try {
          doc.addImage(logoImg, "PNG", margin, 10, 12, 12);
        } catch (e) {
          console.warn("Could not render logo in PDF:", e);
        }
      }

      const brandX = logoImg ? margin + 15 : margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...DARK_TEXT);
      doc.text("MEDICORE HOSPITAL", brandX, 15);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED_COLOR);
      doc.text("Healthcare Management Information System", brandX, 19);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...SUCCESS_COLOR);
      doc.text("INSURANCE PAYMENT RECEIPT", pageWidth - margin, 15, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED_COLOR);
      doc.text(`Printed: ${formatDateTime(new Date())}`, pageWidth - margin, 19, { align: "right" });

      doc.setDrawColor(...SUCCESS_COLOR);
      doc.setLineWidth(0.4);
      doc.line(margin, 23, pageWidth - margin, 23);

      let startY = 27;

      // 2. Settlement Summary Block
      const settledDate = claim.settled_at ? formatDateTime(claim.settled_at) : "-";

      autoTable(doc, {
        startY,
        theme: "plain",
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 1.5, textColor: DARK_TEXT },
        columnStyles: {
          0: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 32 },
          1: { fontStyle: "bold", textColor: BRAND_COLOR, cellWidth: 60 },
          2: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 32 },
          3: { cellWidth: 62 },
        },
        body: [
          ["Claim Number:", claim.claim_number || "-", "Settled On:", settledDate],
          ["Patient Name:", claim.patient_name || "-", "Hospital #:", claim.hospital_number || "-"],
          ["Insurer Name:", claim.insurer_name || "-", "Member Number:", claim.member_number || "-"],
          ...(claim.gateway_reference ? [["Gateway Ref:", claim.gateway_reference, "", ""]] : []),
        ],
      });

      startY = doc.lastAutoTable.finalY + 5;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...DARK_TEXT);
      doc.text("Invoices Paid Under This Claim", margin, startY);
      startY += 3;

      // 3. Paid Invoices Table
      const itemColumns = [
        { header: "Invoice #", dataKey: "invoice_number" },
        { header: "Description", dataKey: "invoice_description" },
        { header: "Source Type", dataKey: "invoice_source_type" },
        { header: "Claimed (KES)", dataKey: "amount_claimed" },
        { header: "Paid (KES)", dataKey: "amount_approved" },
      ];

      const itemRows = (claim.items || []).map((item) => ({
        invoice_number: item.invoice_number || "-",
        invoice_description: item.invoice_description || "-",
        invoice_source_type: item.invoice_source_type || "-",
        amount_claimed: formatCurrency(item.amount_claimed || 0),
        amount_approved: formatCurrency(item.amount_approved || 0),
      }));

      autoTable(doc, {
        startY,
        columns: itemColumns,
        body: itemRows,
        margin: { left: margin, right: margin, bottom: 18 },
        styles: { fontSize: 7.5, cellPadding: 1.5, textColor: DARK_TEXT, valign: "middle" },
        headStyles: {
          fillColor: SUCCESS_COLOR,
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8,
          cellPadding: 1.8,
        },
        alternateRowStyles: { fillColor: LIGHT_FILL },
        columnStyles: {
          0: { cellWidth: 35, fontStyle: "bold" },
          1: { cellWidth: 65 },
          2: { cellWidth: 30 },
          3: { cellWidth: 28, halign: "right" },
          4: { cellWidth: 28, halign: "right", fontStyle: "bold" },
        },
        didDrawPage: (data) => {
          const pageCount = doc.internal.getNumberOfPages();
          doc.setFont("helvetica", "normal");
          doc.setFontSize(7);
          doc.setTextColor(...MUTED_COLOR);
          doc.setDrawColor(...LIGHT_BORDER);
          doc.setLineWidth(0.3);
          doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);
          doc.text(`Official Receipt - ${claim.claim_number}`, margin, pageHeight - 6);
          doc.text(`Page ${data.pageNumber} of ${pageCount}`, pageWidth - margin, pageHeight - 6, { align: "right" });
        },
      });

      // 4. Amount Paid Box
      let finalY = doc.lastAutoTable.finalY + 5;
      if (finalY + 65 > pageHeight - 15) {
        doc.addPage();
        finalY = 15;
      }

      doc.setFillColor(240, 253, 244); // light green fill
      doc.rect(pageWidth - margin - 85, finalY, 85, 18, "F");
      doc.setDrawColor(...SUCCESS_COLOR);
      doc.rect(pageWidth - margin - 85, finalY, 85, 18, "S");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...DARK_TEXT);
      doc.text("Total Amount Paid:", pageWidth - margin - 81, finalY + 8);
      doc.setFontSize(11);
      doc.setTextColor(...SUCCESS_COLOR);
      doc.text(`KES ${formatCurrency(claim.total_approved)}`, pageWidth - margin - 4, finalY + 8.5, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED_COLOR);
      doc.text(`Settled: ${settledDate}`, pageWidth - margin - 81, finalY + 14);

      // 5. Processed-by details
      let detailsY = finalY + 26;
      if (detailsY + 10 > pageHeight - 60) {
        doc.addPage();
        detailsY = 20;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK_TEXT);
      doc.text("Processed By:", margin, detailsY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED_COLOR);
      doc.text(claim.created_by_name || "-", margin + 28, detailsY);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(...DARK_TEXT);
      doc.text("Date & Time Settled:", margin, detailsY + 6);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED_COLOR);
      doc.text(settledDate, margin + 40, detailsY + 6);

      // 6. Cashier Signature & Hospital Stamp
      let sigY = detailsY + 18;
      if (sigY + 38 > pageHeight - 15) {
        doc.addPage();
        sigY = 20;
      }

      const blockWidth = (pageWidth - (margin * 2) - 12) / 2;
      const leftX = margin;
      const rightX = margin + blockWidth + 12;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK_TEXT);
      doc.text("CASHIER SIGNATURE", leftX, sigY);

      doc.setDrawColor(...LIGHT_BORDER);
      doc.setLineWidth(0.3);
      doc.line(leftX, sigY + 16, leftX + blockWidth, sigY + 16);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED_COLOR);
      doc.text("Signature", leftX, sigY + 20);

      doc.line(leftX, sigY + 30, leftX + (blockWidth * 0.62), sigY + 30);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.text("Name:", leftX, sigY + 34);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...DARK_TEXT);
      doc.text(claim.created_by_name || "-", leftX + 12, sigY + 34);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED_COLOR);
      doc.line(leftX + (blockWidth * 0.67), sigY + 30, leftX + blockWidth, sigY + 30);
      doc.text("Date:", leftX + (blockWidth * 0.67), sigY + 34);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK_TEXT);
      doc.text("HOSPITAL OFFICIAL STAMP", rightX, sigY);

      doc.setDrawColor(...LIGHT_BORDER);
      doc.setLineWidth(0.4);
      doc.rect(rightX, sigY + 3, blockWidth, 28, "S");
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED_COLOR);
      doc.text("Stamp Here", rightX + blockWidth / 2, sigY + 18, { align: "center" });

      // Footer note
      const footerY = Math.max(sigY + 40, pageHeight - 18);
      doc.setDrawColor(...LIGHT_BORDER);
      doc.line(margin, footerY, pageWidth - margin, footerY);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(...MUTED_COLOR);
      doc.text(
        "This receipt confirms settlement of the above insurance claim and creation of corresponding payment record(s) against the listed invoices.",
        margin,
        footerY + 4,
        { maxWidth: pageWidth - margin * 2 }
      );

      doc.save(`Receipt_${claim.claim_number}.pdf`);
    } catch (err) {
      setError(err.message || "Failed to generate payment receipt");
    } finally {
      setExportingReceipt(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "DRAFT": "badge-neutral",
      "SUBMITTED": "badge-primary",
      "UNDER_REVIEW": "badge-info",
      "APPROVED": "badge-success",
      "PARTIALLY_APPROVED": "badge-warning",
      "REJECTED": "badge-danger",
      "SETTLED": "badge-success",
      "CANCELLED": "badge-neutral"
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading claim details...</span>
      </div>
    );
  }

  if (!claim) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Billing & Insurance</div>
          <h1 className="page-title">{claim.claim_number}</h1>
          <p className="page-subtitle">
            {claim.patient_name} • {claim.insurer_name}
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/insurance/claims")}>
            <i className="bi bi-arrow-left me-1"></i> Back to Claims
          </button>
          
          <button 
            className="btn btn-secondary" 
            onClick={handleExportPdf}
            disabled={exporting}
          >
            {exporting ? (
              <>
                <span className="spinner-border spinner-border-sm me-1" role="status" />
                Exporting...
              </>
            ) : (
              <>
                <i className="bi bi-file-earmark-pdf me-1"></i> Export PDF
              </>
            )}
          </button>

          {claim.status === "SETTLED" && (
            <button
              className="btn btn-success"
              onClick={handleExportReceipt}
              disabled={exportingReceipt}
            >
              {exportingReceipt ? (
                <>
                  <span className="spinner-border spinner-border-sm me-1" role="status" />
                  Generating...
                </>
              ) : (
                <>
                  <i className="bi bi-receipt me-1"></i> Download Receipt
                </>
              )}
            </button>
          )}

          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
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

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-file-earmark-text fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name" style={{ wordBreak: "break-all" }}>
                {claim.claim_number}
              </div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-person me-1"></i> {claim.patient_name}
                </span>
                <span>•</span>
                <span>{claim.hospital_number}</span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(claim.status)}`}>
                  <span className="badge-dot"></span>
                  {claim.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-building me-1"></i> {claim.insurer_name}
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Insurer</div>
              <div className="info-item__value">{claim.insurer_name}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Member Number</div>
              <div className="info-item__value">{claim.member_number}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Total Claimed</div>
              <div className="info-item__value font-bold">KES {claim.total_claimed}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Total Approved</div>
              <div className="info-item__value font-bold">KES {claim.total_approved}</div>
            </div>
            {claim.settled_at && (
              <div className="info-item">
                <div className="info-item__label">Settled At</div>
                <div className="info-item__value">{formatDateTime(claim.settled_at)}</div>
              </div>
            )}
            {claim.gateway_reference && (
              <div className="info-item">
                <div className="info-item__label">Gateway Reference</div>
                <div className="info-item__value cell-mono">{claim.gateway_reference}</div>
              </div>
            )}
            {claim.rejection_reason && (
              <div className="info-item" style={{ gridColumn: "span 2" }}>
                <div className="info-item__label">Rejection Reason</div>
                <div className="info-item__value" style={{ color: "var(--danger)" }}>{claim.rejection_reason}</div>
              </div>
            )}
          </div>

          {claim.notes && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <div className="text-sm text-muted">Notes</div>
              <div className="diagnosis-chip">
                <span className="diagnosis-chip__code">📝</span>
                {claim.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Claim Items</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {claim.items.length} item{claim.items.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th className="cell-numeric">Claimed</th>
                  <th className="cell-numeric">Approved</th>
                </tr>
              </thead>
              <tbody>
                {claim.items.map((item) => (
                  <tr key={item.id}>
                    <td className="cell-mono">{item.invoice_number}</td>
                    <td>{item.invoice_description}</td>
                    <td>
                      <span className="tag">{item.invoice_source_type}</span>
                    </td>
                    <td className="cell-numeric">KES {item.amount_claimed}</td>
                    <td className="cell-numeric">KES {item.amount_approved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {claim.status === "DRAFT" && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-send me-1"></i> Actions
            </h5>
          </div>
          <div className="card-body">
            <div className="flex gap-3 flex-wrap">
              <button className="btn btn-primary" onClick={handleSubmitClaim}>
                <i className="bi bi-send me-1"></i> Submit Claim
              </button>
              <button className="btn btn-danger" onClick={handleCancel}>
                <i className="bi bi-x-circle me-1"></i> Cancel Claim
              </button>
            </div>
          </div>
        </div>
      )}

      {(claim.status === "SUBMITTED" || claim.status === "UNDER_REVIEW") && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-pencil-square me-1"></i> Record Insurer Response
            </h5>
          </div>
          <div className="card-body">
            <div style={{ marginBottom: "var(--space-4)" }}>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleMarkFullyPaid}
              >
                <i className="bi bi-check2-all me-1"></i> Mark as Fully Paid
              </button>
              <p className="text-sm text-muted" style={{ marginTop: "var(--space-2)", marginBottom: 0 }}>
                Auto-fills every item's approved amount to match its claimed amount and sets status to Approved. Review below, then click Record Response to save.
              </p>
            </div>

            <form onSubmit={handleApplyResponse}>
              <div className="field">
                <label className="field-label">Response Status <span className="required">*</span></label>
                <select 
                  className="select" 
                  value={responseForm.status} 
                  onChange={(e) => setResponseForm((p) => ({ ...p, status: e.target.value }))}
                  required
                >
                  <option value="APPROVED">Approved</option>
                  <option value="PARTIALLY_APPROVED">Partially Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {responseForm.status !== "REJECTED" && (
                <>
                  <div className="field">
                    <label className="field-label">Per-item Approved Amounts (optional)</label>
                    <div className="table-scroll" style={{ marginBottom: "var(--space-3)" }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Invoice #</th>
                            <th>Claimed</th>
                            <th>Approved Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {claim.items.map((item) => (
                            <tr key={item.id}>
                              <td className="cell-mono">{item.invoice_number}</td>
                              <td className="cell-numeric">KES {item.amount_claimed}</td>
                              <td>
                                <input
                                  type="number"
                                  className="input"
                                  placeholder="Approved amount"
                                  value={itemApprovals[item.id] || ""}
                                  onChange={handleItemApprovalChange(item.id)}
                                  style={{ width: "150px" }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Or Total Approved Amount</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Total approved amount"
                      value={responseForm.approved_amount}
                      onChange={(e) => setResponseForm((p) => ({ ...p, approved_amount: e.target.value }))}
                      style={{ maxWidth: "300px" }}
                    />
                  </div>
                </>
              )}

              {responseForm.status === "REJECTED" && (
                <div className="field">
                  <label className="field-label">Rejection Reason <span className="required">*</span></label>
                  <textarea
                    className="textarea"
                    placeholder="Enter rejection reason..."
                    value={responseForm.rejection_reason}
                    onChange={(e) => setResponseForm((p) => ({ ...p, rejection_reason: e.target.value }))}
                    required
                  />
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                  <i className="bi bi-check-circle me-1"></i> Record Response
                </button>
                <button type="button" className="btn btn-danger" onClick={handleCancel}>
                  <i className="bi bi-x-circle me-1"></i> Cancel Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(claim.status === "APPROVED" || claim.status === "PARTIALLY_APPROVED") && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-cash-stack me-1"></i> Settlement
            </h5>
          </div>
          <div className="card-body">
            <div className="flex gap-3 flex-wrap">
              <button className="btn btn-success" onClick={handleSettle}>
                <i className="bi bi-cash-stack me-1"></i> Settle Claim (Create Payments)
              </button>
            </div>
          </div>
        </div>
      )}

      {claim.status === "SETTLED" && (
        <div className="card" style={{ borderColor: "var(--success)", background: "var(--success-soft)" }}>
          <div className="card-body">
            <div className="flex items-center gap-3 flex-wrap">
              <i className="bi bi-check-circle-fill fs-xl" style={{ color: "var(--success-strong)" }}></i>
              <div>
                <div className="font-bold text-success">Claim Settled</div>
                <div className="text-sm text-muted">
                  Settled on {claim.settled_at ? formatDateTime(claim.settled_at) : "-"}
                  {claim.created_by_name ? ` • Processed by ${claim.created_by_name}` : ""}
                </div>
              </div>
              <button
                className="btn btn-success ml-auto"
                onClick={handleExportReceipt}
                disabled={exportingReceipt}
              >
                {exportingReceipt ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-1" role="status" />
                    Generating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-receipt me-1"></i> Download Receipt
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}