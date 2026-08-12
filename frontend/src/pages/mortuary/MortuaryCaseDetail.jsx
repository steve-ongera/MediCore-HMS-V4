import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getMortuaryCase,
  getMortuaryBilling,
  addMortuaryCharge,
  getMortuaryServiceCatalog,
  orderMortuaryService,
  releaseBody,
} from "../../services/api";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import medicoreLogo from "../../assets/logo.png";

// Design constants
const BRAND_COLOR = [30, 64, 175]; // #1e40af
const DARK_TEXT = [17, 24, 39]; // #111827
const MUTED_COLOR = [107, 114, 128]; // #6b7280
const LIGHT_BORDER = [229, 231, 235]; // #e5e7eb
const LIGHT_FILL = [249, 250, 251]; // #f9fafb

export default function MortuaryCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [mortuaryCase, setMortuaryCase] = useState(null);
  const [billing, setBilling] = useState(null);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [releasing, setReleasing] = useState(false);

  const [chargeForm, setChargeForm] = useState({ description: "", amount: "" });
  const [serviceForm, setServiceForm] = useState({ service: "", notes: "" });
  const [releaseForm, setReleaseForm] = useState({
    collector_name: "",
    collector_id_number: "",
    collector_phone: "",
    relationship: "SPOUSE",
    funeral_home: "",
    burial_permit_number: "",
    notes: "",
  });

  useEffect(() => {
    load();
    loadBilling();
    loadServiceCatalog();
  }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMortuaryCase(id);
      setMortuaryCase(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBilling = async () => {
    try {
      const data = await getMortuaryBilling(id);
      setBilling(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadServiceCatalog = async () => {
    try {
      const data = await getMortuaryServiceCatalog();
      setServiceCatalog(data.results ?? data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadImage = (src) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  };

  const generateQrCodeDataUrl = (text) => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 120;
      canvas.height = 120;
      const ctx = canvas.getContext("2d");

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 120, 120);

      ctx.strokeStyle = "#1e40af";
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, 116, 116);

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
   * Generates a PDF containing complete case details:
   * - Deceased particulars & Admission data
   * - Body Collector / Claimant details & Funeral Home info
   * - Detailed Mortuary Services table
   * - Detailed Billing Statement & Invoices table
   */
  const generateDischargePdf = async (caseData, releaseDetails, billingData) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;

    const logoImg = await loadImage(medicoreLogo);
    const qrDataUrl = await generateQrCodeDataUrl(
      `CASE:${caseData.case_number}|COLLECTOR:${releaseDetails.collector_name}|PERMIT:${releaseDetails.burial_permit_number || "N/A"}`
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
    doc.text("MEDICORE HOSPITAL MORTUARY", brandX, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text("Healthcare Management Information System", brandX, 19);

    // Header Right Section
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_COLOR);
    doc.text("BODY DISCHARGE & CLEARANCE RECORD", pageWidth - margin, 15, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(`Generated: ${formatDateTime(new Date())}`, pageWidth - margin, 19, { align: "right" });

    // Header Divider Line
    doc.setDrawColor(...BRAND_COLOR);
    doc.setLineWidth(0.4);
    doc.line(margin, 24, pageWidth - margin, 24);

    let startY = 28;

    // 2. Particulars of Deceased
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text("1. Particulars of Deceased & Admission", margin, startY);

    startY += 3;

    autoTable(doc, {
      startY: startY,
      theme: "plain",
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 1.8, textColor: DARK_TEXT },
      columnStyles: {
        0: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 35 },
        1: { cellWidth: 55 },
        2: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 35 },
        3: { cellWidth: 55 },
      },
      body: [
        ["Case / Tag Number:", caseData.case_number || "N/A", "Deceased Name:", caseData.deceased_display_name || "N/A"],
        ["Gender:", caseData.gender || "N/A", "Estimated Age:", caseData.estimated_age || "Unknown"],
        ["Date of Death:", formatDateTime(caseData.date_of_death), "Cause of Death:", caseData.cause_of_death || "N/A"],
        ["Source / Hospital:", caseData.source || "N/A", "Police OB Number:", caseData.police_ob_number || "N/A"],
        ["Compartment #:", caseData.compartment_number || "Unassigned", "Brought By:", caseData.brought_by || "N/A"],
        ["Admitted At:", formatDateTime(caseData.admitted_at), "Admitted By:", caseData.admitted_by_name || "N/A"],
        ["Storage Duration:", `${caseData.days_in_storage || 0} Day(s)`, "Status:", caseData.status || "N/A"],
      ],
    });

    startY = doc.lastAutoTable.finalY + 5;

    // 3. Particulars of Collector / Body Claimant
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text("2. Collector & Body Release Information", margin, startY);

    startY += 3;

    autoTable(doc, {
      startY: startY,
      theme: "plain",
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 1.8, textColor: DARK_TEXT },
      columnStyles: {
        0: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 35 },
        1: { cellWidth: 55 },
        2: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 35 },
        3: { cellWidth: 55 },
      },
      body: [
        ["Collector Name:", releaseDetails.collector_name || "N/A", "ID / Passport No:", releaseDetails.collector_id_number || "N/A"],
        ["Phone Number:", releaseDetails.collector_phone || "N/A", "Relationship:", releaseDetails.relationship || "N/A"],
        ["Funeral Home:", releaseDetails.funeral_home || "N/A", "Burial Permit #:", releaseDetails.burial_permit_number || "N/A"],
        ["Released By Staff:", releaseDetails.released_by_name || "N/A", "Release Timestamp:", releaseDetails.released_at ? formatDateTime(releaseDetails.released_at) : formatDateTime(new Date())],
        ["Release Notes:", releaseDetails.notes || "None", "Financial Status:", "CLEARED / ZERO BALANCE"],
      ],
    });

    startY = doc.lastAutoTable.finalY + 5;

    // 4. Ordered Mortuary Services Breakdown
    const servicesList = caseData.services || [];
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text(`3. Mortuary Services Rendered (${servicesList.length})`, margin, startY);

    startY += 3;

    if (servicesList.length > 0) {
      autoTable(doc, {
        startY: startY,
        head: [["Service Name", "Status", "Ordered Date"]],
        body: servicesList.map((s) => [
          s.service_name || "N/A",
          (s.status || "").replace("_", " "),
          formatDateTime(s.ordered_at),
        ]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2, textColor: DARK_TEXT },
        headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: "bold" },
      });
      startY = doc.lastAutoTable.finalY + 5;
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED_COLOR);
      doc.text("No specific mortuary services ordered.", margin, startY + 2);
      startY += 8;
    }

    // 5. Mortuary Billing Statement & Invoices Breakdown
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text("4. Billing Summary & Invoices Breakdown", margin, startY);

    startY += 3;

    // Billing totals summary bar
    autoTable(doc, {
      startY: startY,
      theme: "plain",
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 1.8, textColor: DARK_TEXT },
      columnStyles: {
        0: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 30 },
        1: { cellWidth: 30 },
        2: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { fontStyle: "bold", textColor: MUTED_COLOR, cellWidth: 30 },
        5: { cellWidth: 30 },
      },
      body: [
        [
          "Grand Total:",
          formatCurrency(billingData?.grand_total || 0),
          "Amount Paid:",
          formatCurrency(billingData?.amount_paid || 0),
          "Balance:",
          formatCurrency(billingData?.balance || 0),
        ],
      ],
    });

    startY = doc.lastAutoTable.finalY + 2;

    const invoicesList = billingData?.invoices || [];
    if (invoicesList.length > 0) {
      autoTable(doc, {
        startY: startY,
        head: [["Invoice #", "Description", "Amount", "Balance", "Status"]],
        body: invoicesList.map((inv) => [
          inv.invoice_number || "-",
          inv.description || "-",
          formatCurrency(inv.amount),
          formatCurrency(inv.balance),
          inv.status || "-",
        ]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2, textColor: DARK_TEXT },
        headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: "bold" },
      });
      startY = doc.lastAutoTable.finalY + 6;
    } else {
      startY += 6;
    }

    // 6. Verification QR Box & Formal Signature Area
    doc.setDrawColor(...LIGHT_BORDER);
    doc.setFillColor(...LIGHT_FILL);
    doc.rect(margin, startY, pageWidth - margin * 2, 38, "FD");

    if (qrDataUrl) {
      doc.addImage(qrDataUrl, "PNG", margin + 4, startY + 4, 30, 30);
    }

    const sigX = margin + 38;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...DARK_TEXT);
    doc.text("OFFICIAL MORTUARY CLEARANCE & RELEASE ACKNOWLEDGMENT", sigX, startY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(
      "I confirm that I have received the body of the deceased in good condition along with the burial permit.",
      sigX,
      startY + 12
    );

    doc.line(sigX, startY + 28, sigX + 50, startY + 28);
    doc.text("Collector Signature", sigX, startY + 32);

    doc.line(sigX + 65, startY + 28, sigX + 115, startY + 28);
    doc.text("Mortuary In-Charge Signature", sigX + 65, startY + 32);

    // Save PDF file
    doc.save(`Mortuary_Discharge_Certificate_${caseData.case_number}.pdf`);
  };

  const submitCharge = async (e) => {
    e.preventDefault();
    try {
      await addMortuaryCharge(id, { description: chargeForm.description, amount: parseFloat(chargeForm.amount) });
      setChargeForm({ description: "", amount: "" });
      loadBilling();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitService = async (e) => {
    e.preventDefault();
    try {
      await orderMortuaryService(id, serviceForm);
      setServiceForm({ service: "", notes: "" });
      load();
      loadBilling();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitRelease = async (e) => {
    e.preventDefault();

    const currentBalance = Number(billing?.balance || 0);
    if (currentBalance > 0) {
      setError(`Cannot release body. Outstanding mortuary bill balance: ${formatCurrency(currentBalance)}. Please clear balance first.`);
      return;
    }

    if (!window.confirm("Confirm body release? This cannot be undone.")) return;

    setReleasing(true);
    try {
      await releaseBody(id, releaseForm);
      await load();
      await loadBilling();

      // Download PDF immediately upon release
      await generateDischargePdf(mortuaryCase, releaseForm, billing);
    } catch (err) {
      setError(err.message);
    } finally {
      setReleasing(false);
    }
  };

  const handleDownloadPdfAgain = () => {
    if (!mortuaryCase || !mortuaryCase.release) return;
    generateDischargePdf(mortuaryCase, mortuaryCase.release, billing);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      ADMITTED: "badge-primary",
      RELEASED: "badge-success",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getServiceStatusBadge = (status) => {
    const statusMap = {
      ORDERED: "badge-warning",
      IN_PROGRESS: "badge-info",
      COMPLETED: "badge-success",
      CANCELLED: "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading mortuary case...</span>
      </div>
    );
  }

  if (!mortuaryCase) return null;

  const isAdmitted = mortuaryCase.status === "ADMITTED";
  const hasOutstandingBalance = Number(billing?.balance || 0) > 0;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Mortuary Services</div>
          <h1 className="page-title">{mortuaryCase.case_number}</h1>
          <p className="page-subtitle">{mortuaryCase.deceased_display_name}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/mortuary")}>
            <i className="bi bi-arrow-left me-1"></i> Back to Register
          </button>
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
              <i className="bi bi-person fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{mortuaryCase.deceased_display_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {mortuaryCase.case_number}
                </span>
                <span>•</span>
                <span>{mortuaryCase.gender}</span>
                <span>•</span>
                <span>Age: {mortuaryCase.estimated_age || "Unknown"}</span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(mortuaryCase.status)}`}>
                  <span className="badge-dot"></span>
                  {mortuaryCase.status}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-clock me-1"></i> {mortuaryCase.days_in_storage} days
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Date of Death</div>
              <div className="info-item__value">{new Date(mortuaryCase.date_of_death).toLocaleString()}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Cause of Death</div>
              <div className="info-item__value">{mortuaryCase.cause_of_death || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Source</div>
              <div className="info-item__value">
                <span className="tag">{mortuaryCase.source}</span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Compartment</div>
              <div className="info-item__value cell-mono">{mortuaryCase.compartment_number || "Unassigned"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Brought By</div>
              <div className="info-item__value">{mortuaryCase.brought_by || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Police OB #</div>
              <div className="info-item__value">{mortuaryCase.police_ob_number || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Admitted</div>
              <div className="info-item__value">
                {new Date(mortuaryCase.admitted_at).toLocaleString()}
                <div className="text-2xs text-tertiary">by {mortuaryCase.admitted_by_name}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-currency-dollar me-1"></i> Billing
          </h5>
        </div>
        <div className="card-body">
          {!billing ? (
            <div className="loading-screen" style={{ padding: "var(--space-4)" }}>
              <div className="spinner"></div>
              <span className="loading-screen__label">Loading billing...</span>
            </div>
          ) : (
            <>
              <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span className="stat-card__label">Grand Total</span>
                    <div className="stat-card__icon tone-info">
                      <i className="bi bi-receipt"></i>
                    </div>
                  </div>
                  <div className="stat-card__value">{formatCurrency(billing.grand_total)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span className="stat-card__label">Amount Paid</span>
                    <div className="stat-card__icon tone-success">
                      <i className="bi bi-check-circle"></i>
                    </div>
                  </div>
                  <div className="stat-card__value">{formatCurrency(billing.amount_paid)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span className="stat-card__label">Balance</span>
                    <div className={`stat-card__icon ${hasOutstandingBalance ? "tone-danger" : "tone-success"}`}>
                      <i className={`bi ${hasOutstandingBalance ? "bi-exclamation-triangle" : "bi-currency-dollar"}`}></i>
                    </div>
                  </div>
                  <div className={`stat-card__value ${hasOutstandingBalance ? "text-danger" : ""}`}>{formatCurrency(billing.balance)}</div>
                </div>
              </div>

              <div className="table-scroll" style={{ marginBottom: "var(--space-4)" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Description</th>
                      <th className="cell-numeric">Amount</th>
                      <th className="cell-numeric">Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="cell-mono">{inv.invoice_number}</td>
                        <td>{inv.description}</td>
                        <td className="cell-numeric">{formatCurrency(inv.amount)}</td>
                        <td className="cell-numeric">{formatCurrency(inv.balance)}</td>
                        <td>
                          <span className={`badge ${inv.status === "PAID" ? "badge-success" : inv.status === "PARTIAL" ? "badge-warning" : "badge-danger"}`}>
                            <span className="badge-dot"></span>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {Number(billing.balance) > 0 && (
                <div className="form-actions" style={{ marginBottom: "var(--space-4)" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate(`/billing/payments?invoice=${billing.invoices.find((i) => Number(i.balance) > 0)?.id ?? ""}`)}
                  >
                    <i className="bi bi-credit-card me-1"></i> Go to Billing / Take Payment
                  </button>
                </div>
              )}

              {isAdmitted && (
                <>
                  <h6 className="text-sm font-semibold" style={{ marginTop: "var(--space-4)", marginBottom: "var(--space-2)" }}>
                    Add Charge
                  </h6>
                  <form onSubmit={submitCharge}>
                    <div className="field-row">
                      <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                        <input
                          type="text"
                          className="input"
                          placeholder="Description"
                          value={chargeForm.description}
                          onChange={(e) => setChargeForm((p) => ({ ...p, description: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                        <input
                          type="number"
                          className="input"
                          placeholder="Amount"
                          value={chargeForm.amount}
                          onChange={(e) => setChargeForm((p) => ({ ...p, amount: e.target.value }))}
                          required
                        />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                          <i className="bi bi-plus-circle me-1"></i> Add Charge
                        </button>
                      </div>
                    </div>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {isAdmitted && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-plus-circle me-1"></i> Order Service
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitService}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <select className="select" value={serviceForm.service} onChange={(e) => setServiceForm((p) => ({ ...p, service: e.target.value }))} required>
                    <option value="">Select service</option>
                    {serviceCatalog.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatCurrency(s.price)})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Notes"
                    value={serviceForm.notes}
                    onChange={(e) => setServiceForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                    <i className="bi bi-plus-circle me-1"></i> Order Service
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Services</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {(mortuaryCase.services || []).length} service{(mortuaryCase.services || []).length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {(mortuaryCase.services || []).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-list-ul"></i>
              </div>
              <h3 className="empty-state__title">No services ordered</h3>
              <p className="empty-state__desc">Order services for this case above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Ordered</th>
                  </tr>
                </thead>
                <tbody>
                  {(mortuaryCase.services || []).map((s) => (
                    <tr key={s.id}>
                      <td className="cell-primary">{s.service_name}</td>
                      <td>
                        <span className={`badge ${getServiceStatusBadge(s.status)}`}>
                          <span className="badge-dot"></span>
                          {s.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{new Date(s.ordered_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isAdmitted ? (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-door-open me-1"></i> Release Body
            </h5>
          </div>
          <div className="card-body">
            {hasOutstandingBalance && (
              <div
                className="card"
                style={{
                  marginBottom: "var(--space-4)",
                  borderColor: "var(--warning)",
                  background: "var(--warning-soft)",
                }}
              >
                <div className="card-body text-warning">
                  <i className="bi bi-lock-fill me-1"></i>
                  <strong>Release Restricted:</strong> This case has an outstanding mortuary balance of{" "}
                  <strong>{formatCurrency(billing.balance)}</strong>. All bills must be cleared before the body can be released.
                </div>
              </div>
            )}

            <form onSubmit={submitRelease}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">
                    Collector's Name <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Full name"
                    value={releaseForm.collector_name}
                    onChange={(e) => setReleaseForm((p) => ({ ...p, collector_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">ID Number</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="ID number"
                    value={releaseForm.collector_id_number}
                    onChange={(e) => setReleaseForm((p) => ({ ...p, collector_id_number: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Phone</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Phone number"
                    value={releaseForm.collector_phone}
                    onChange={(e) => setReleaseForm((p) => ({ ...p, collector_phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">
                    Relationship <span className="required">*</span>
                  </label>
                  <select className="select" value={releaseForm.relationship} onChange={(e) => setReleaseForm((p) => ({ ...p, relationship: e.target.value }))}>
                    <option value="SPOUSE">Spouse</option>
                    <option value="CHILD">Child</option>
                    <option value="PARENT">Parent</option>
                    <option value="SIBLING">Sibling</option>
                    <option value="OTHER_RELATIVE">Other Relative</option>
                    <option value="UNDERTAKER">Undertaker / Funeral Home</option>
                    <option value="POLICE">Police</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Funeral Home</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Funeral home (if applicable)"
                    value={releaseForm.funeral_home}
                    onChange={(e) => setReleaseForm((p) => ({ ...p, funeral_home: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Burial Permit #</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Permit number"
                    value={releaseForm.burial_permit_number}
                    onChange={(e) => setReleaseForm((p) => ({ ...p, burial_permit_number: e.target.value }))}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Notes</label>
                <textarea
                  className="textarea"
                  placeholder="Additional notes"
                  value={releaseForm.notes}
                  onChange={(e) => setReleaseForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <button
                type="submit"
                className="btn btn-danger"
                disabled={hasOutstandingBalance || releasing}
                title={hasOutstandingBalance ? "Clear outstanding balance to unlock release" : ""}
              >
                <i className={`bi ${hasOutstandingBalance ? "bi-lock-fill" : "bi-door-open"} me-1`}></i>
                {releasing ? "Releasing & Generating PDF..." : "Release Body"}
              </button>
            </form>
          </div>
        </div>
      ) : (
        mortuaryCase.release && (
          <div className="card">
            <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h5 className="card-title" style={{ marginBottom: 0 }}>
                <i className="bi bi-file-text me-1"></i> Release Record
              </h5>
              <button className="btn btn-secondary" onClick={handleDownloadPdfAgain}>
                <i className="bi bi-download me-1"></i> Download Discharge Certificate (PDF)
              </button>
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-item__label">Collected By</div>
                  <div className="info-item__value">
                    {mortuaryCase.release.collector_name}
                    <div className="text-2xs text-tertiary">{mortuaryCase.release.relationship}</div>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">ID Number</div>
                  <div className="info-item__value">{mortuaryCase.release.collector_id_number || "—"}</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Phone</div>
                  <div className="info-item__value">{mortuaryCase.release.collector_phone || "—"}</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Funeral Home</div>
                  <div className="info-item__value">{mortuaryCase.release.funeral_home || "—"}</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Burial Permit #</div>
                  <div className="info-item__value">{mortuaryCase.release.burial_permit_number || "—"}</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Released By</div>
                  <div className="info-item__value">
                    {mortuaryCase.release.released_by_name}
                    <div className="text-2xs text-tertiary">{new Date(mortuaryCase.release.released_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className="info-item" style={{ gridColumn: "span 2" }}>
                  <div className="info-item__label">Notes</div>
                  <div className="info-item__value">{mortuaryCase.release.notes || "—"}</div>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </>
  );
}