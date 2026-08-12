import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getICUAdmission, getICUBilling, recordICUVitals, recordVentilatorSettings,
  getICUProcedureCatalog, orderICUProcedure, dischargeFromICU,
} from "../../services/api";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/formatters";
import medicoreLogo from "../../assets/logo.png";

// Design constants — kept in sync with the Emergency / Mortuary reports
const BRAND_COLOR = [30, 64, 175]; // #1e40af
const DARK_TEXT = [17, 24, 39]; // #111827
const MUTED_COLOR = [107, 114, 128]; // #6b7280
const LIGHT_BORDER = [229, 231, 235]; // #e5e7eb
const LIGHT_FILL = [249, 250, 251]; // #f9fafb

export default function ICUAdmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [admission, setAdmission] = useState(null);
  const [billing, setBilling] = useState(null);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [vitalsForm, setVitalsForm] = useState({
    heart_rate: "", bp_systolic: "", bp_diastolic: "", mean_arterial_pressure: "",
    respiratory_rate: "", oxygen_saturation: "", temperature_c: "", gcs_score: "",
    urine_output_ml: "", central_venous_pressure: "", notes: "",
  });

  const [ventForm, setVentForm] = useState({
    mode: "NONE", fio2_percent: "", peep_cmh2o: "", tidal_volume_ml: "",
    respiratory_rate_set: "", peak_pressure: "", notes: "",
  });

  const [procedureForm, setProcedureForm] = useState({ procedure: "", notes: "" });
  const [dischargeForm, setDischargeForm] = useState({ status: "STEPPED_DOWN", discharge_summary: "" });

  useEffect(() => { load(); loadBilling(); loadProcedures(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getICUAdmission(id);
      setAdmission(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadBilling = async () => {
    try {
      const data = await getICUBilling(id);
      setBilling(data);
    } catch (err) { setError(err.message); }
  };

  const loadProcedures = async () => {
    try {
      const data = await getICUProcedureCatalog();
      setProcedures(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleVitalsChange = (f) => (e) => setVitalsForm((p) => ({ ...p, [f]: e.target.value }));
  const submitVitals = async (e) => {
    e.preventDefault();
    try {
      await recordICUVitals(id, vitalsForm);
      setVitalsForm({ heart_rate: "", bp_systolic: "", bp_diastolic: "", mean_arterial_pressure: "", respiratory_rate: "", oxygen_saturation: "", temperature_c: "", gcs_score: "", urine_output_ml: "", central_venous_pressure: "", notes: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleVentChange = (f) => (e) => setVentForm((p) => ({ ...p, [f]: e.target.value }));
  const submitVent = async (e) => {
    e.preventDefault();
    try {
      await recordVentilatorSettings(id, ventForm);
      setVentForm({ mode: "NONE", fio2_percent: "", peep_cmh2o: "", tidal_volume_ml: "", respiratory_rate_set: "", peak_pressure: "", notes: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitProcedure = async (e) => {
    e.preventDefault();
    try {
      await orderICUProcedure(id, procedureForm);
      setProcedureForm({ procedure: "", notes: "" });
      load();
      loadBilling();
    } catch (err) { setError(err.message); }
  };

  // --- DISCHARGE / CLOSE-EPISODE FREEZE CHECK ---
  // If there is an outstanding balance, the episode can only be closed when the
  // discharge status is DECEASED. All other dispositions require the bill to be cleared first.
  const hasOutstandingBalance = Number(billing?.balance || 0) > 0;
  const dischargeBlocked = hasOutstandingBalance && dischargeForm.status !== "DECEASED";

  const submitDischarge = async (e) => {
    e.preventDefault();

    if (hasOutstandingBalance && dischargeForm.status !== "DECEASED") {
      setError(
        `Cannot close this ICU episode. Outstanding balance: ${formatCurrency(
          billing.balance
        )}. Please clear the balance first, or select "Deceased" as the status.`
      );
      return;
    }

    if (!window.confirm("Discharge/close this ICU episode?")) return;
    try {
      await dischargeFromICU(id, dischargeForm);
      load();
      loadBilling();
    } catch (err) { setError(err.message); }
  };

  const goToBillingPayment = () => {
    const unpaidInvoice = billing?.invoices?.find((inv) => Number(inv.balance) > 0);
    if (unpaidInvoice) navigate(`/billing/payments?invoice=${unpaidInvoice.id}`);
    else navigate("/billing/payments");
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "ADMITTED": "badge-primary",
      "STEPPED_DOWN": "badge-success",
      "DISCHARGED_HOME": "badge-success",
      "DECEASED": "badge-danger",
      "TRANSFERRED_OUT": "badge-info",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getStatusLabel = (status) => (status || "").replace("_", " ");

  const getModeLabel = (mode) => {
    const labels = {
      "NONE": "Not Ventilated",
      "CPAP": "CPAP",
      "BIPAP": "BiPAP",
      "AC": "Assist Control (AC)",
      "SIMV": "SIMV",
      "PSV": "Pressure Support (PSV)",
    };
    return labels[mode] || mode;
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

  /**
   * Generates a professional PDF report for the ICU/HDU admission, styled to
   * match the Emergency and Mortuary reports: branded header, structured
   * label/value tables, itemized billing, clinical history tables, and a
   * sign-off block.
   */
  const generateICUReportPdf = async (adm, billingData) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 12;

    const logoImg = await loadImage(medicoreLogo);

    // 1. Header
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
    doc.text("MEDICORE HOSPITAL ICU / HDU", brandX, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text("Healthcare Management Information System", brandX, 19);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_COLOR);
    doc.text("ICU / HDU ADMISSION REPORT", pageWidth - margin, 15, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(`Generated: ${formatDateTime(new Date())}`, pageWidth - margin, 19, { align: "right" });

    doc.setDrawColor(...BRAND_COLOR);
    doc.setLineWidth(0.4);
    doc.line(margin, 24, pageWidth - margin, 24);

    let startY = 28;

    // 2. Patient & Admission Summary
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text("1. Patient & Admission Summary", margin, startY);
    startY += 3;

    autoTable(doc, {
      startY,
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
        ["Admission Number:", adm.icu_admission_number || "N/A", "Patient Name:", adm.patient_name || "N/A"],
        ["Hospital Number:", adm.hospital_number || "N/A", "Status:", getStatusLabel(adm.status)],
        ["Bed:", adm.bed_number || "N/A", "Unit Type:", adm.unit_type || "N/A"],
        ["Admitted At:", formatDateTime(adm.admitted_at), "Length of Stay:", `${adm.length_of_stay_days} day(s)`],
        ["Severity Score:", adm.severity_score ?? "—", "Attending Physician:", adm.attending_physician_name || "—"],
        ["Admission Reason:", adm.admission_reason || "—", "", ""],
        ["Admission Diagnosis:", adm.admission_diagnosis || "—", "", ""],
        ...(adm.discharged_at ? [["Discharged At:", formatDateTime(adm.discharged_at), "", ""]] : []),
        ...(adm.discharge_summary ? [["Discharge Summary:", adm.discharge_summary, "", ""]] : []),
      ],
    });

    startY = doc.lastAutoTable.finalY + 5;

    // 3. Billing Summary
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text("2. Financial & Billing Summary", margin, startY);
    startY += 3;

    autoTable(doc, {
      startY,
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
        startY,
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

    // 4. Vitals History
    if (startY > 250) { doc.addPage(); startY = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text("3. Vitals History", margin, startY);
    startY += 3;

    const vitalsList = adm.vitals || [];
    if (vitalsList.length > 0) {
      autoTable(doc, {
        startY,
        head: [["Time", "HR", "BP", "SpO2", "GCS", "Urine Output"]],
        body: vitalsList.map((v) => [
          formatDateTime(v.recorded_at),
          v.heart_rate,
          `${v.bp_systolic}/${v.bp_diastolic}`,
          `${v.oxygen_saturation}%`,
          v.gcs_score,
          `${v.urine_output_ml} ml`,
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
      doc.text("No vitals recorded.", margin, startY + 2);
      startY += 8;
    }

    // 5. Ventilator Settings History
    if (startY > 250) { doc.addPage(); startY = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text("4. Ventilator Settings History", margin, startY);
    startY += 3;

    const ventList = adm.ventilator_settings || [];
    if (ventList.length > 0) {
      autoTable(doc, {
        startY,
        head: [["Time", "Mode", "FiO2", "PEEP", "Tidal Volume"]],
        body: ventList.map((v) => [
          formatDateTime(v.recorded_at),
          getModeLabel(v.mode),
          `${v.fio2_percent}%`,
          v.peep_cmh2o,
          v.tidal_volume_ml,
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
      doc.text("No ventilator settings recorded.", margin, startY + 2);
      startY += 8;
    }

    // 6. Procedures
    if (startY > 250) { doc.addPage(); startY = 20; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text("5. Procedures", margin, startY);
    startY += 3;

    const procList = adm.procedures || [];
    if (procList.length > 0) {
      autoTable(doc, {
        startY,
        head: [["Procedure", "Performed By", "Time"]],
        body: procList.map((p) => [p.procedure_name || "-", p.performed_by_name || "-", formatDateTime(p.performed_at)]),
        margin: { left: margin, right: margin },
        styles: { fontSize: 8, cellPadding: 2, textColor: DARK_TEXT },
        headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: "bold" },
      });
      startY = doc.lastAutoTable.finalY + 6;
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED_COLOR);
      doc.text("No procedures recorded.", margin, startY + 2);
      startY += 10;
    }

    // 7. Sign-off block
    if (startY > 255) { doc.addPage(); startY = 20; }

    doc.setDrawColor(...LIGHT_BORDER);
    doc.setFillColor(...LIGHT_FILL);
    doc.rect(margin, startY, pageWidth - margin * 2, 30, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...DARK_TEXT);
    doc.text("CLINICAL RECORD SIGN-OFF", margin + 4, startY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(
      "This report reflects the ICU/HDU admission record at the time of generation.",
      margin + 4,
      startY + 12
    );

    doc.line(margin + 4, startY + 24, margin + 84, startY + 24);
    doc.text("Attending Physician / Nurse Signature", margin + 4, startY + 28);

    doc.line(margin + 100, startY + 24, margin + 180, startY + 24);
    doc.text("Date", margin + 100, startY + 28);

    // Footer on every page
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      const pageHeight = doc.internal.pageSize.getHeight();
      doc.setDrawColor(...LIGHT_BORDER);
      doc.setLineWidth(0.2);
      doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...MUTED_COLOR);
      doc.text("Generated by ICU/HDU HMIS • Confidential Medical Report", margin, pageHeight - 9);
      doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 9, { align: "right" });
    }

    doc.save(`ICU_Admission_Report_${adm.icu_admission_number}.pdf`);
  };

  const handleDownloadPdfReport = async () => {
    if (!admission) return;
    setGeneratingPdf(true);
    try {
      await generateICUReportPdf(admission, billing);
    } catch (err) {
      setError(err.message || "Failed to generate PDF report.");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading ICU admission...</span>
      </div>
    );
  }

  if (!admission) return null;

  const isActive = admission.status === "ADMITTED";

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">ICU / HDU</div>
          <h1 className="page-title">{admission.icu_admission_number}</h1>
          <p className="page-subtitle">{admission.patient_name}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/icu")}>
            <i className="bi bi-arrow-left  me-1"></i> Back to Board
          </button>
          <button className="btn btn-primary" onClick={handleDownloadPdfReport} disabled={generatingPdf}>
            <i className="bi bi-file-earmark-pdf me-1"></i>
            {generatingPdf ? "Generating..." : "PDF Report"}
          </button>
          <button className="btn btn-secondary" onClick={load}>
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

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-hospital fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{admission.patient_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash  me-1"></i> {admission.hospital_number}
                </span>
                <span>•</span>
                <span>Bed: {admission.bed_number} ({admission.unit_type})</span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(admission.status)}`}>
                  <span className="badge-dot"></span>
                  {getStatusLabel(admission.status)}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-clock  me-1"></i> LOS: {admission.length_of_stay_days} days
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Admission Reason</div>
              <div className="info-item__value">{admission.admission_reason}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Severity Score</div>
              <div className="info-item__value">{admission.severity_score ?? "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Attending Physician</div>
              <div className="info-item__value">{admission.attending_physician_name || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Admitted</div>
              <div className="info-item__value">{formatDateTime(admission.admitted_at)}</div>
            </div>
            <div className="info-item" style={{ gridColumn: "span 2" }}>
              <div className="info-item__label">Diagnosis</div>
              <div className="info-item__value">{admission.admission_diagnosis || "—"}</div>
            </div>
            {admission.discharged_at && (
              <div className="info-item">
                <div className="info-item__label">Discharged</div>
                <div className="info-item__value">{formatDateTime(admission.discharged_at)}</div>
              </div>
            )}
            {admission.discharge_summary && (
              <div className="info-item" style={{ gridColumn: "span 2" }}>
                <div className="info-item__label">Discharge Summary</div>
                <div className="info-item__value">{admission.discharge_summary}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-currency-dollar  me-1"></i> Billing
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
                    <div className={`stat-card__icon ${hasOutstandingBalance ? "tone-danger" : "tone-warning"}`}>
                      <i className="bi bi-currency-dollar"></i>
                    </div>
                  </div>
                  <div className="stat-card__value">{formatCurrency(billing.balance)}</div>
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

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={goToBillingPayment}
                  disabled={Number(billing.balance) <= 0}
                >
                  <i className="bi bi-credit-card  me-1"></i> Go to Billing / Take Payment
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {isActive && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-heart-pulse  me-1"></i> Record Vitals
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitVitals}>
              <div className="vitals-grid">
                <div className="field">
                  <label className="field-label">Heart Rate</label>
                  <input type="number" className="input" placeholder="HR" value={vitalsForm.heart_rate} onChange={handleVitalsChange("heart_rate")} />
                </div>
                <div className="field">
                  <label className="field-label">BP Systolic</label>
                  <input type="number" className="input" placeholder="Systolic" value={vitalsForm.bp_systolic} onChange={handleVitalsChange("bp_systolic")} />
                </div>
                <div className="field">
                  <label className="field-label">BP Diastolic</label>
                  <input type="number" className="input" placeholder="Diastolic" value={vitalsForm.bp_diastolic} onChange={handleVitalsChange("bp_diastolic")} />
                </div>
                <div className="field">
                  <label className="field-label">MAP</label>
                  <input type="number" className="input" placeholder="MAP" value={vitalsForm.mean_arterial_pressure} onChange={handleVitalsChange("mean_arterial_pressure")} />
                </div>
                <div className="field">
                  <label className="field-label">Respiratory Rate</label>
                  <input type="number" className="input" placeholder="RR" value={vitalsForm.respiratory_rate} onChange={handleVitalsChange("respiratory_rate")} />
                </div>
                <div className="field">
                  <label className="field-label">SpO2 (%)</label>
                  <input type="number" className="input" placeholder="SpO2" value={vitalsForm.oxygen_saturation} onChange={handleVitalsChange("oxygen_saturation")} />
                </div>
                <div className="field">
                  <label className="field-label">Temp (°C)</label>
                  <input type="number" className="input" placeholder="Temp" value={vitalsForm.temperature_c} onChange={handleVitalsChange("temperature_c")} />
                </div>
                <div className="field">
                  <label className="field-label">GCS Score</label>
                  <input type="number" className="input" placeholder="GCS" value={vitalsForm.gcs_score} onChange={handleVitalsChange("gcs_score")} />
                </div>
                <div className="field">
                  <label className="field-label">Urine Output (ml/hr)</label>
                  <input type="number" className="input" placeholder="Urine" value={vitalsForm.urine_output_ml} onChange={handleVitalsChange("urine_output_ml")} />
                </div>
                <div className="field">
                  <label className="field-label">CVP</label>
                  <input type="number" className="input" placeholder="CVP" value={vitalsForm.central_venous_pressure} onChange={handleVitalsChange("central_venous_pressure")} />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Notes</label>
                <textarea className="textarea" placeholder="Notes" value={vitalsForm.notes} onChange={handleVitalsChange("notes")} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                <i className="bi bi-floppy  me-1"></i> Record Vitals
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history  me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Vitals History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {admission.vitals.length} record{admission.vitals.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {admission.vitals.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No vitals recorded</h3>
              <p className="empty-state__desc">Record vitals using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th className="cell-numeric">HR</th>
                    <th>BP</th>
                    <th className="cell-numeric">SpO2</th>
                    <th className="cell-numeric">GCS</th>
                    <th className="cell-numeric">Urine Output</th>
                  </tr>
                </thead>
                <tbody>
                  {admission.vitals.map((v) => (
                    <tr key={v.id}>
                      <td>{formatDateTime(v.recorded_at)}</td>
                      <td className="cell-numeric">{v.heart_rate}</td>
                      <td>{v.bp_systolic}/{v.bp_diastolic}</td>
                      <td className="cell-numeric">{v.oxygen_saturation}%</td>
                      <td className="cell-numeric">{v.gcs_score}</td>
                      <td className="cell-numeric">{v.urine_output_ml} ml</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isActive && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-plus-circle  me-1"></i> Record Ventilator Settings
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitVent}>
              <div className="field">
                <label className="field-label">Mode</label>
                <select className="select" value={ventForm.mode} onChange={handleVentChange("mode")}>
                  <option value="NONE">Not Ventilated</option>
                  <option value="CPAP">CPAP</option>
                  <option value="BIPAP">BiPAP</option>
                  <option value="AC">Assist Control (AC)</option>
                  <option value="SIMV">SIMV</option>
                  <option value="PSV">Pressure Support (PSV)</option>
                </select>
              </div>

              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">FiO2 (%)</label>
                  <input type="number" className="input" placeholder="FiO2" value={ventForm.fio2_percent} onChange={handleVentChange("fio2_percent")} />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">PEEP (cmH2O)</label>
                  <input type="number" className="input" placeholder="PEEP" value={ventForm.peep_cmh2o} onChange={handleVentChange("peep_cmh2o")} />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Tidal Volume (ml)</label>
                  <input type="number" className="input" placeholder="Tidal Vol" value={ventForm.tidal_volume_ml} onChange={handleVentChange("tidal_volume_ml")} />
                </div>
              </div>

              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Set Respiratory Rate</label>
                  <input type="number" className="input" placeholder="RR set" value={ventForm.respiratory_rate_set} onChange={handleVentChange("respiratory_rate_set")} />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Peak Pressure</label>
                  <input type="number" className="input" placeholder="Peak Pressure" value={ventForm.peak_pressure} onChange={handleVentChange("peak_pressure")} />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Notes</label>
                <textarea className="textarea" placeholder="Notes" value={ventForm.notes} onChange={handleVentChange("notes")} />
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                <i className="bi bi-floppy  me-1"></i> Record Settings
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history  me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Ventilator Settings History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {admission.ventilator_settings.length} record{admission.ventilator_settings.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {admission.ventilator_settings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No ventilator settings recorded</h3>
              <p className="empty-state__desc">Record ventilator settings using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Mode</th>
                    <th className="cell-numeric">FiO2</th>
                    <th className="cell-numeric">PEEP</th>
                    <th className="cell-numeric">Tidal Volume</th>
                  </tr>
                </thead>
                <tbody>
                  {admission.ventilator_settings.map((v) => (
                    <tr key={v.id}>
                      <td>{formatDateTime(v.recorded_at)}</td>
                      <td>{getModeLabel(v.mode)}</td>
                      <td className="cell-numeric">{v.fio2_percent}%</td>
                      <td className="cell-numeric">{v.peep_cmh2o}</td>
                      <td className="cell-numeric">{v.tidal_volume_ml}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isActive && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-plus-circle  me-1"></i> Order Procedure
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitProcedure}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Procedure <span className="required">*</span></label>
                  <select className="select" value={procedureForm.procedure} onChange={(e) => setProcedureForm((p) => ({ ...p, procedure: e.target.value }))} required>
                    <option value="">Select procedure</option>
                    {procedures.map((p) => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price)})</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Notes</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Notes"
                    value={procedureForm.notes}
                    onChange={(e) => setProcedureForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                <i className="bi bi-plus-circle  me-1"></i> Order & Bill Procedure
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul  me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Procedures</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {admission.procedures.length} procedure{admission.procedures.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {admission.procedures.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-list-ul"></i>
              </div>
              <h3 className="empty-state__title">No procedures recorded</h3>
              <p className="empty-state__desc">Order procedures using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Procedure</th>
                    <th>Performed By</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {admission.procedures.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-primary">{p.procedure_name}</td>
                      <td>{p.performed_by_name}</td>
                      <td>{formatDateTime(p.performed_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isActive && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-door-open  me-1"></i> Discharge / Close Episode
            </h5>
          </div>
          <div className="card-body">
            {hasOutstandingBalance && (
              <div
                className="alert"
                style={{
                  marginBottom: "var(--space-3)",
                  padding: "var(--space-3)",
                  borderRadius: "6px",
                  color: "#991b1b",
                  backgroundColor: "#fef2f2",
                  border: "1px solid #fecaca",
                }}
              >
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                <strong>Closure Restricted:</strong> This admission has an outstanding balance of{" "}
                <strong>{formatCurrency(billing?.balance)}</strong>. The episode can only be closed while a
                balance remains if the status is set to <strong>Deceased</strong>. All other dispositions
                require the balance to be cleared first.
              </div>
            )}

            <form onSubmit={submitDischarge}>
              <div className="field">
                <label className="field-label">Status <span className="required">*</span></label>
                <select className="select" value={dischargeForm.status} onChange={(e) => setDischargeForm((p) => ({ ...p, status: e.target.value }))}>
                  <option value="STEPPED_DOWN">Stepped Down to Ward</option>
                  <option value="DISCHARGED_HOME">Discharged Home</option>
                  <option value="DECEASED">Deceased</option>
                  <option value="TRANSFERRED_OUT">Transferred to Another Facility</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">Discharge Summary</label>
                <textarea
                  className="textarea"
                  placeholder="Discharge summary"
                  value={dischargeForm.discharge_summary}
                  onChange={(e) => setDischargeForm((p) => ({ ...p, discharge_summary: e.target.value }))}
                />
              </div>
              <button
                type="submit"
                className="btn btn-danger"
                disabled={dischargeBlocked}
                title={dischargeBlocked ? "Clear outstanding balance, or set status to Deceased, to close this episode" : ""}
              >
                <i className={`bi ${dischargeBlocked ? "bi-lock-fill" : "bi-door-open"}  me-1`}></i> Close ICU Episode
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}