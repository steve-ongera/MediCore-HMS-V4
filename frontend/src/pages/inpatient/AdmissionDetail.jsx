import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getAdmission,
  getAdmissionBilling,
  dischargePatient,
  getAvailableBeds,
  getWards,
  transferBed,
  createWardRound,
  createNursingNote,
  saveInpatientVitals,
  getMedicines,
  createMedicationOrder,
  discontinueMedicationOrder,
  recordMedicationAdministration,
  getLabTestCatalog,
  getRadiologyTestCatalog,
  orderLabForAdmission,
  orderRadiologyForAdmission,
  getProcedureCatalog,
  orderProcedureForAdmission,
  completeProcedure,
} from "../../services/api";
import { formatCurrency, formatDateTime } from "../../utils/formatters";
import medicoreLogo from "../../assets/logo.png";

// Design constants (mirrors the mortuary discharge certificate)
const BRAND_COLOR = [30, 64, 175]; // #1e40af
const DARK_TEXT = [17, 24, 39]; // #111827
const MUTED_COLOR = [107, 114, 128]; // #6b7280
const LIGHT_BORDER = [229, 231, 235]; // #e5e7eb
const LIGHT_FILL = [249, 250, 251]; // #f9fafb

export default function AdmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [admission, setAdmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("patient");

  const [billing, setBilling] = useState(null);
  const [billingLoading, setBillingLoading] = useState(true);

  const [roundNotes, setRoundNotes] = useState("");
  const [roundPlan, setRoundPlan] = useState("");

  const [nnShift, setNnShift] = useState("MORNING");
  const [nnNote, setNnNote] = useState("");

  const [vitals, setVitals] = useState({
    weight_kg: "", height_cm: "", temperature_c: "", pulse_bpm: "",
    respiratory_rate: "", bp_systolic: "", bp_diastolic: "", oxygen_saturation: "", shift: "MORNING",
  });

  const [medicines, setMedicines] = useState([]);
  const [medOrder, setMedOrder] = useState({ medicine: "", dosage: "", route: "ORAL", frequency: "", quantity: 1 });

  const [wards, setWards] = useState([]);
  const [transferWard, setTransferWard] = useState("");
  const [transferBeds, setTransferBeds] = useState([]);
  const [transferBedId, setTransferBedId] = useState("");
  const [transferReason, setTransferReason] = useState("");

  const [dischargeType, setDischargeType] = useState("NORMAL");
  const [dischargeSummary, setDischargeSummary] = useState("");

  // Lab / Radiology / Procedure ordering
  const [labTests, setLabTests] = useState([]);
  const [selectedLabTest, setSelectedLabTest] = useState("");
  const [radiologyTests, setRadiologyTests] = useState([]);
  const [selectedRadiologyTest, setSelectedRadiologyTest] = useState("");
  const [procedureCatalog, setProcedureCatalog] = useState([]);
  const [selectedProcedure, setSelectedProcedure] = useState("");
  const [procedureNotes, setProcedureNotes] = useState("");
  const [orderSubmitting, setOrderSubmitting] = useState(false);

  // Admission report PDF
  const [generatingPdf, setGeneratingPdf] = useState(false);

  useEffect(() => {
    loadAdmission();
    loadBilling();
    loadWards();
    loadMedicines();
    loadLabTests();
    loadRadiologyTests();
    loadProcedureCatalog();
  }, [id]);

  const loadAdmission = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAdmission(id);
      setAdmission(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBilling = async () => {
    setBillingLoading(true);
    try {
      const data = await getAdmissionBilling(id);
      setBilling(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBillingLoading(false);
    }
  };

  const loadWards = async () => {
    try {
      const data = await getWards();
      setWards(data.results ?? data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadMedicines = async () => {
    try {
      const data = await getMedicines();
      setMedicines(data.results ?? data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadLabTests = async () => {
    try {
      const data = await getLabTestCatalog();
      setLabTests(data.results ?? data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadRadiologyTests = async () => {
    try {
      const data = await getRadiologyTestCatalog();
      setRadiologyTests(data.results ?? data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadProcedureCatalog = async () => {
    try {
      const data = await getProcedureCatalog();
      setProcedureCatalog(data.results ?? data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadTransferBeds = async (wardId) => {
    try {
      const data = await getAvailableBeds(wardId);
      setTransferBeds(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddWardRound = async (e) => {
    e.preventDefault();
    try {
      await createWardRound({ admission: id, notes: roundNotes, plan: roundPlan });
      setRoundNotes("");
      setRoundPlan("");
      loadAdmission();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddNursingNote = async (e) => {
    e.preventDefault();
    try {
      await createNursingNote({ admission: id, shift: nnShift, note: nnNote });
      setNnNote("");
      loadAdmission();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleVitalsChange = (field) => (e) => {
    setVitals((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSaveVitals = async (e) => {
    e.preventDefault();
    try {
      await saveInpatientVitals({ admission: id, ...vitals });
      loadAdmission();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMedOrderChange = (field) => (e) => {
    setMedOrder((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleCreateMedOrder = async (e) => {
    e.preventDefault();
    try {
      await createMedicationOrder({ admission: id, ...medOrder, quantity: Number(medOrder.quantity) || 1 });
      setMedOrder({ medicine: "", dosage: "", route: "ORAL", frequency: "", quantity: 1 });
      loadAdmission();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDiscontinueMed = async (orderId) => {
    try {
      await discontinueMedicationOrder(orderId);
      loadAdmission();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAdministerMed = async (orderId) => {
    try {
      await recordMedicationAdministration({ medication_order: orderId, status: "GIVEN" });
      loadAdmission();
      loadBilling();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTransferWardChange = (e) => {
    setTransferWard(e.target.value);
    setTransferBedId("");
    if (e.target.value) loadTransferBeds(e.target.value);
  };

  const handleTransferBed = async (e) => {
    e.preventDefault();
    try {
      await transferBed(id, { to_bed: transferBedId, reason: transferReason });
      setTransferWard("");
      setTransferBedId("");
      setTransferReason("");
      loadAdmission();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDischarge = async (e) => {
    e.preventDefault();

    // Normal discharge is blocked while there's an outstanding balance.
    // Every other discharge type (DAMA, Referred Out, Deceased, Absconded)
    // is allowed to proceed with a balance still owing.
    if (dischargeType === "NORMAL" && Number(billing?.balance || 0) > 0) {
      setError(
        `Cannot process a normal discharge. Outstanding balance: ${formatCurrency(billing?.balance || 0)}. ` +
        `Please clear the balance first, or select a different discharge type.`
      );
      return;
    }

    try {
      await dischargePatient(id, { discharge_type: dischargeType, discharge_summary: dischargeSummary });
      loadAdmission();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleOrderLab = async (e) => {
    e.preventDefault();
    if (!selectedLabTest) return;
    setOrderSubmitting(true);
    try {
      await orderLabForAdmission(id, { test: selectedLabTest });
      setSelectedLabTest("");
      loadAdmission();
      loadBilling();
    } catch (err) {
      setError(err.message);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleOrderRadiology = async (e) => {
    e.preventDefault();
    if (!selectedRadiologyTest) return;
    setOrderSubmitting(true);
    try {
      await orderRadiologyForAdmission(id, { test: selectedRadiologyTest });
      setSelectedRadiologyTest("");
      loadAdmission();
      loadBilling();
    } catch (err) {
      setError(err.message);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleOrderProcedure = async (e) => {
    e.preventDefault();
    if (!selectedProcedure) return;
    setOrderSubmitting(true);
    try {
      await orderProcedureForAdmission(id, { procedure: selectedProcedure, notes: procedureNotes });
      setSelectedProcedure("");
      setProcedureNotes("");
      loadAdmission();
      loadBilling();
    } catch (err) {
      setError(err.message);
    } finally {
      setOrderSubmitting(false);
    }
  };

  const handleCompleteProcedure = async (procId) => {
    try {
      await completeProcedure(procId);
      loadAdmission();
    } catch (err) {
      setError(err.message);
    }
  };

  const goToBillingPayment = () => {
    const unpaidInvoice = billing?.invoices?.find((inv) => Number(inv.balance) > 0);
    if (unpaidInvoice) {
      navigate(`/billing/payments?invoice=${unpaidInvoice.id}`);
    } else {
      navigate("/billing/payments");
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

  /**
   * Generates a full Admission Report PDF using tabulated sections:
   * - Patient & Admission particulars
   * - Billing summary & invoice breakdown
   * - Ward rounds, nursing notes, vitals
   * - Medication orders
   * - Lab / radiology requests
   * - Procedures
   * - Bed transfer history
   * Styled to match the Mortuary Discharge Certificate PDF.
   */
  const generateAdmissionReportPdf = async (admissionData, billingData) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;

    const logoImg = await loadImage(medicoreLogo);

    const checkPageBreak = (y, minSpace = 30) => {
      if (y > pageHeight - minSpace) {
        doc.addPage();
        return 15;
      }
      return y;
    };

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
    doc.text("MEDICORE HOSPITAL", brandX, 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text("Healthcare Management Information System", brandX, 19);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_COLOR);
    doc.text("INPATIENT ADMISSION REPORT", pageWidth - margin, 15, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED_COLOR);
    doc.text(`Generated: ${formatDateTime(new Date())}`, pageWidth - margin, 19, { align: "right" });

    doc.setDrawColor(...BRAND_COLOR);
    doc.setLineWidth(0.4);
    doc.line(margin, 24, pageWidth - margin, 24);

    let startY = 28;

    // 2. Patient & Admission Particulars
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text("1. Patient & Admission Particulars", margin, startY);
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
        ["Admission #:", admissionData.admission_number || "N/A", "Status:", admissionData.status || "N/A"],
        ["Patient Name:", admissionData.patient_name || "N/A", "Hospital #:", admissionData.hospital_number || "N/A"],
        ["Ward:", admissionData.ward_name || "N/A", "Bed:", admissionData.bed_number || "N/A"],
        ["Admission Type:", admissionData.admission_type || "N/A", "Length of Stay:", `${admissionData.length_of_stay_days ?? 0} day(s)`],
        ["Admission Date:", formatDateTime(admissionData.admission_date), "Discharge Date:", admissionData.discharge_date ? formatDateTime(admissionData.discharge_date) : "—"],
        ["Admitting Doctor:", admissionData.admitting_doctor_name || "N/A", "Attending Doctor:", admissionData.attending_doctor_name || "N/A"],
        ["Discharge Type:", admissionData.discharge_type || "—", "Diagnosis:", admissionData.admission_diagnosis || "—"],
      ],
    });
    startY = doc.lastAutoTable.finalY + 5;

    if (admissionData.discharge_summary) {
      startY = checkPageBreak(startY, 25);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED_COLOR);
      doc.text("Discharge Summary:", margin, startY);
      startY += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(...DARK_TEXT);
      const summaryLines = doc.splitTextToSize(admissionData.discharge_summary, pageWidth - margin * 2);
      doc.text(summaryLines, margin, startY);
      startY += summaryLines.length * 4 + 4;
    }

    // 3. Billing Summary
    startY = checkPageBreak(startY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text("2. Billing Summary", margin, startY);
    startY += 3;

    if (billingData?.has_visit) {
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
        body: [[
          "Grand Total:", formatCurrency(billingData.grand_total || 0),
          "Amount Paid:", formatCurrency(billingData.amount_paid || 0),
          "Balance:", formatCurrency(billingData.balance || 0),
        ]],
      });
      startY = doc.lastAutoTable.finalY + 2;

      const invoicesList = billingData.invoices || [];
      if (invoicesList.length > 0) {
        autoTable(doc, {
          startY,
          head: [["Invoice #", "Type", "Description", "Amount", "Paid", "Balance", "Status"]],
          body: invoicesList.map((inv) => [
            inv.invoice_number || "-",
            inv.source_type || "-",
            inv.description || "-",
            formatCurrency(inv.amount),
            formatCurrency(inv.amount_paid),
            formatCurrency(inv.balance),
            inv.status || "-",
          ]),
          margin: { left: margin, right: margin },
          styles: { fontSize: 7.5, cellPadding: 2, textColor: DARK_TEXT },
          headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: "bold" },
        });
        startY = doc.lastAutoTable.finalY + 6;
      } else {
        startY += 6;
      }
    } else {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...MUTED_COLOR);
      doc.text("No billing data available.", margin, startY + 2);
      startY += 8;
    }

    // Reusable table-section renderer for the remaining clinical sections
    const renderTableSection = (title, head, rows, emptyLabel) => {
      startY = checkPageBreak(startY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(...DARK_TEXT);
      doc.text(title, margin, startY);
      startY += 3;

      if (rows.length > 0) {
        autoTable(doc, {
          startY,
          head: [head],
          body: rows,
          margin: { left: margin, right: margin },
          styles: { fontSize: 7.5, cellPadding: 2, textColor: DARK_TEXT },
          headStyles: { fillColor: BRAND_COLOR, textColor: [255, 255, 255], fontStyle: "bold" },
        });
        startY = doc.lastAutoTable.finalY + 6;
      } else {
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(...MUTED_COLOR);
        doc.text(emptyLabel, margin, startY + 2);
        startY += 8;
      }
    };

    // 4. Ward Rounds
    renderTableSection(
      "3. Ward Rounds",
      ["Date", "Doctor", "Notes", "Plan"],
      (admissionData.ward_rounds || []).map((r) => [
        formatDateTime(r.round_date),
        r.doctor_name || "—",
        r.notes || "—",
        r.plan || "—",
      ]),
      "No ward rounds recorded."
    );

    // 5. Nursing Notes
    renderTableSection(
      "4. Nursing Notes",
      ["Shift", "Nurse", "Note"],
      (admissionData.nursing_notes || []).map((n) => [n.shift || "—", n.nurse_name || "—", n.note || "—"]),
      "No nursing notes recorded."
    );

    // 6. Vitals
    renderTableSection(
      "5. Vitals",
      ["Date/Time", "Shift", "BP", "Temp", "Pulse", "RR", "SpO2", "BMI"],
      (admissionData.vitals || []).map((v) => [
        formatDateTime(v.recorded_at),
        v.shift || "—",
        `${v.bp_systolic ?? "—"}/${v.bp_diastolic ?? "—"}`,
        v.temperature_c ? `${v.temperature_c}°C` : "—",
        v.pulse_bpm ?? "—",
        v.respiratory_rate ?? "—",
        v.oxygen_saturation ? `${v.oxygen_saturation}%` : "—",
        v.bmi || "—",
      ]),
      "No vitals recorded."
    );

    // 7. Medication Orders
    renderTableSection(
      "6. Medication Orders",
      ["Medicine", "Dosage", "Route", "Frequency", "Qty", "Status"],
      (admissionData.medication_orders || []).map((m) => [
        m.medicine_name || "—",
        m.dosage || "—",
        m.route || "—",
        m.frequency || "—",
        m.quantity ?? "—",
        m.is_active ? "Active" : "Discontinued",
      ]),
      "No medication orders."
    );

    // 8. Lab Requests
    renderTableSection(
      "7. Lab Requests",
      ["Test", "Price", "Status", "Ordered", "Result"],
      (admissionData.lab_orders || []).map((o) => [
        o.test_name || "—",
        formatCurrency(o.test_price || 0),
        o.status || "—",
        formatDateTime(o.ordered_at),
        o.result?.result_text || (o.result ? "See file" : "Pending"),
      ]),
      "No lab requests for this admission."
    );

    // 9. Radiology Requests
    renderTableSection(
      "8. Radiology Requests",
      ["Test", "Price", "Status", "Ordered"],
      (admissionData.radiology_orders || []).map((o) => [
        o.test_name || "—",
        formatCurrency(o.test_price || 0),
        o.status || "—",
        formatDateTime(o.ordered_at),
      ]),
      "No radiology requests for this admission."
    );

    // 10. Procedures
    renderTableSection(
      "9. Procedures",
      ["Procedure", "Price", "Notes", "Status", "Ordered"],
      (admissionData.procedures || []).map((p) => [
        p.procedure_name || "—",
        formatCurrency(p.procedure_price || 0),
        p.notes || "—",
        p.status || "—",
        formatDateTime(p.ordered_at),
      ]),
      "No procedures recorded for this admission."
    );

    // 11. Bed Transfer History
    renderTableSection(
      "10. Bed Transfer History",
      ["Date", "From", "To", "Reason"],
      (admissionData.bed_transfers || []).map((t) => [
        formatDateTime(t.transferred_at),
        t.from_bed_label || "N/A",
        t.to_bed_label || "—",
        t.reason || "—",
      ]),
      "No bed transfer history."
    );

    // 12. Certification footer
    startY = checkPageBreak(startY, 40);
    doc.setDrawColor(...LIGHT_BORDER);
    doc.setFillColor(...LIGHT_FILL);
    doc.rect(margin, startY, pageWidth - margin * 2, 30, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...DARK_TEXT);
    doc.text("REPORT CERTIFICATION", margin + 4, startY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED_COLOR);
    doc.text("This report reflects the admission record as of the generation date above.", margin + 4, startY + 12);

    doc.line(margin + 4, startY + 24, margin + 70, startY + 24);
    doc.text("Prepared By", margin + 4, startY + 28);

    doc.line(pageWidth - margin - 70, startY + 24, pageWidth - margin - 4, startY + 24);
    doc.text("Medical Records Officer", pageWidth - margin - 70, startY + 28);

    doc.save(`Admission_Report_${admissionData.admission_number}.pdf`);
  };

  const handleDownloadAdmissionPdf = async () => {
    if (!admission) return;
    setGeneratingPdf(true);
    try {
      await generateAdmissionReportPdf(admission, billing);
    } catch (err) {
      setError(err.message);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading admission details...</span>
      </div>
    );
  }

  if (error && !admission) {
    return (
      <div className="card" style={{ padding: "var(--space-6)", textAlign: "center" }}>
        <div className="text-danger font-semibold">Error loading admission</div>
        <p className="text-sm text-muted" style={{ marginTop: "var(--space-2)" }}>{error}</p>
        <button className="btn btn-primary mt-4" onClick={() => navigate("/inpatient/admissions")}>
          <i className="bi bi-arrow-left  me-1"></i> Back to Admissions
        </button>
      </div>
    );
  }

  if (!admission) return null;

  const isActive = admission.status === "ADMITTED";
  const hasOutstandingBalance = Number(billing?.balance || 0) > 0;
  // A normal discharge requires the bill to be cleared. Every other discharge
  // type (DAMA, Referred Out, Deceased, Absconded) may proceed with a balance owing.
  const dischargeBlockedByBalance = dischargeType === "NORMAL" && hasOutstandingBalance;

  const tabs = [
    { id: "patient", label: "Patient Info", icon: "bi-person" },
    { id: "billing", label: "Billing", icon: "bi-currency-dollar" },
    { id: "rounds", label: "Ward Rounds", icon: "bi-clipboard" },
    { id: "nursing", label: "Nursing Notes", icon: "bi-file-text" },
    { id: "vitals", label: "Vitals", icon: "bi-heart-pulse" },
    { id: "medications", label: "Medications", icon: "bi-capsule" },
    { id: "lab", label: "Lab Requests", icon: "bi-droplet-half" },
    { id: "radiology", label: "Radiology Requests", icon: "bi-camera" },
    { id: "procedures", label: "Procedures", icon: "bi-scissors" },
    { id: "transfers", label: "Bed Transfers", icon: "bi-arrow-left-right" },
  ];

  if (isActive) {
    tabs.push({ id: "discharge", label: "Discharge", icon: "bi-door-open" });
    tabs.push({ id: "transfer", label: "Transfer Bed", icon: "bi-arrows-move" });
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      "PAID": "badge-success",
      "PARTIAL": "badge-warning",
      "UNPAID": "badge-danger",
      "CANCELLED": "badge-neutral",
      "COMPLETED": "badge-success",
      "REPORTED": "badge-success",
      "ORDERED": "badge-warning",
      "PENDING": "badge-warning",
      "COLLECTED": "badge-info",
      "PROCESSING": "badge-info",
      "DONE": "badge-info",
    };
    return statusMap[status] || "badge-neutral";
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Inpatient Management</div>
          <h1 className="page-title">{admission.admission_number}</h1>
          <p className="page-subtitle">
            {admission.patient_name} • {admission.ward_name} / Bed {admission.bed_number}
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/inpatient/admissions")}>
            <i className="bi bi-arrow-left  me-1"></i> Back
          </button>
          <button className="btn btn-secondary" onClick={loadAdmission}>
            <i className="bi bi-arrow-clockwise  me-1"></i> Refresh
          </button>
          <button className="btn btn-secondary" onClick={handleDownloadAdmissionPdf} disabled={generatingPdf}>
            <i className="bi bi-download  me-1"></i> {generatingPdf ? "Generating..." : "Download Report (PDF)"}
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
              <i className="bi bi-person fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{admission.patient_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash  me-1"></i> {admission.hospital_number}
                </span>
                <span>•</span>
                <span>Ward: {admission.ward_name}</span>
                <span>•</span>
                <span>Bed: {admission.bed_number}</span>
                <span>•</span>
                <span className={`badge ${isActive ? "badge-primary" : "badge-success"}`}>
                  <span className="badge-dot"></span>
                  {admission.status}
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
              <div className="info-item__label">Admitting Doctor</div>
              <div className="info-item__value">{admission.admitting_doctor_name || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Attending Doctor</div>
              <div className="info-item__value">{admission.attending_doctor_name || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Admission Type</div>
              <div className="info-item__value">
                <span className="tag">{admission.admission_type}</span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Admission Date</div>
              <div className="info-item__value">{new Date(admission.admission_date).toLocaleString()}</div>
            </div>
          </div>

          {admission.admission_diagnosis && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <div className="text-sm text-muted">Diagnosis</div>
              <div className="diagnosis-chip">
                <span className="diagnosis-chip__code">DX</span>
                {admission.admission_diagnosis}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tabs__item ${activeTab === tab.id ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`bi ${tab.icon}  me-1`}></i> {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          {/* Patient Info Tab */}
          {activeTab === "patient" && (
            <div>
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-item__label">Admission Number</div>
                  <div className="info-item__value font-mono">{admission.admission_number}</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Status</div>
                  <div className="info-item__value">
                    <span className={`badge ${isActive ? "badge-primary" : "badge-success"}`}>
                      <span className="badge-dot"></span>
                      {admission.status}
                    </span>
                  </div>
                </div>
                {!isActive && (
                  <>
                    <div className="info-item">
                      <div className="info-item__label">Discharge Type</div>
                      <div className="info-item__value">{admission.discharge_type || "—"}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-item__label">Discharge Date</div>
                      <div className="info-item__value">
                        {admission.discharge_date ? new Date(admission.discharge_date).toLocaleString() : "—"}
                      </div>
                    </div>
                  </>
                )}
              </div>
              {admission.discharge_summary && (
                <div style={{ marginTop: "var(--space-4)" }}>
                  <div className="text-sm text-muted">Discharge Summary</div>
                  <div className="consult-notes-field">{admission.discharge_summary}</div>
                </div>
              )}
            </div>
          )}

          {/* Billing Tab */}
          {activeTab === "billing" && (
            <div>
              {billingLoading ? (
                <div className="loading-screen" style={{ padding: "var(--space-6)" }}>
                  <div className="spinner"></div>
                  <span className="loading-screen__label">Loading billing summary...</span>
                </div>
              ) : !billing?.has_visit ? (
                <div className="text-sm text-muted text-center" style={{ padding: "var(--space-6)" }}>
                  <i className="bi bi-info-circle  me-1"></i> No billing data yet. Charges will appear once bed charges or orders are generated.
                </div>
              ) : (
                <div>
                  <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
                    <div className="stat-card">
                      <div className="stat-card__top">
                        <span className="stat-card__label">Grand Total</span>
                        <div className="stat-card__icon tone-info">
                          <i className="bi bi-receipt"></i>
                        </div>
                      </div>
                      <div className="stat-card__value">KES {billing.grand_total}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card__top">
                        <span className="stat-card__label">Amount Paid</span>
                        <div className="stat-card__icon tone-success">
                          <i className="bi bi-check-circle"></i>
                        </div>
                      </div>
                      <div className="stat-card__value">KES {billing.amount_paid}</div>
                    </div>
                    <div className="stat-card">
                      <div className="stat-card__top">
                        <span className="stat-card__label">Balance</span>
                        <div className="stat-card__icon tone-warning">
                          <i className="bi bi-currency-dollar"></i>
                        </div>
                      </div>
                      <div className="stat-card__value">KES {billing.balance}</div>
                    </div>
                  </div>

                  <div className="table-scroll" style={{ marginBottom: "var(--space-4)" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th className="cell-numeric">Items</th>
                          <th className="cell-numeric">Total</th>
                          <th className="cell-numeric">Paid</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(billing.breakdown).map(([sourceType, row]) => (
                          <tr key={sourceType}>
                            <td>{sourceType}</td>
                            <td className="cell-numeric">{row.count}</td>
                            <td className="cell-numeric">KES {row.total}</td>
                            <td className="cell-numeric">KES {row.paid}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-3)" }}>Invoice Detail</h6>
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Invoice #</th>
                          <th>Type</th>
                          <th>Description</th>
                          <th className="cell-numeric">Amount</th>
                          <th className="cell-numeric">Paid</th>
                          <th className="cell-numeric">Balance</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billing.invoices.map((inv) => (
                          <tr key={inv.id}>
                            <td className="cell-mono">{inv.invoice_number}</td>
                            <td>{inv.source_type}</td>
                            <td>{inv.description}</td>
                            <td className="cell-numeric">KES {inv.amount}</td>
                            <td className="cell-numeric">KES {inv.amount_paid}</td>
                            <td className="cell-numeric">KES {inv.balance}</td>
                            <td>
                              <span className={`badge ${getStatusBadge(inv.status)}`}>
                                <span className="badge-dot"></span>
                                {inv.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="form-actions" style={{ marginTop: "var(--space-4)" }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={goToBillingPayment}
                      disabled={Number(billing.balance) <= 0}
                    >
                      <i className="bi bi-credit-card  me-1"></i> Go to Billing / Take Payment
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Ward Rounds Tab */}
          {activeTab === "rounds" && (
            <div>
              {isActive && (
                <form onSubmit={handleAddWardRound} style={{ marginBottom: "var(--space-4)" }}>
                  <div className="field">
                    <label className="field-label">Notes</label>
                    <textarea
                      className="textarea"
                      placeholder="Enter ward round notes"
                      value={roundNotes}
                      onChange={(e) => setRoundNotes(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Plan</label>
                    <textarea
                      className="textarea"
                      placeholder="Enter treatment plan"
                      value={roundPlan}
                      onChange={(e) => setRoundPlan(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                    <i className="bi bi-plus-circle  me-1"></i> Add Ward Round
                  </button>
                </form>
              )}
              {(admission.ward_rounds || []).length === 0 ? (
                <div className="text-sm text-muted text-center" style={{ padding: "var(--space-6)" }}>
                  No ward rounds recorded
                </div>
              ) : (
                <div className="timeline">
                  {(admission.ward_rounds || []).map((r) => (
                    <div key={r.id} className="timeline-item">
                      <div className="timeline-item__title">{r.notes}</div>
                      <div className="timeline-item__time">
                        {r.doctor_name} • {new Date(r.round_date).toLocaleString()}
                        {r.plan && <div className="text-sm text-muted mt-1">Plan: {r.plan}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Nursing Notes Tab */}
          {activeTab === "nursing" && (
            <div>
              {isActive && (
                <form onSubmit={handleAddNursingNote} style={{ marginBottom: "var(--space-4)" }}>
                  <div className="field-row">
                    <div className="field">
                      <label className="field-label">Shift</label>
                      <select className="select" value={nnShift} onChange={(e) => setNnShift(e.target.value)}>
                        <option value="MORNING">Morning</option>
                        <option value="AFTERNOON">Afternoon</option>
                        <option value="NIGHT">Night</option>
                      </select>
                    </div>
                    <div className="field" style={{ flex: 2 }}>
                      <label className="field-label">Note</label>
                      <textarea
                        className="textarea"
                        placeholder="Enter nursing note"
                        value={nnNote}
                        onChange={(e) => setNnNote(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                    <i className="bi bi-plus-circle  me-1"></i> Add Nursing Note
                  </button>
                </form>
              )}
              {(admission.nursing_notes || []).length === 0 ? (
                <div className="text-sm text-muted text-center" style={{ padding: "var(--space-6)" }}>
                  No nursing notes recorded
                </div>
              ) : (
                <div className="timeline">
                  {(admission.nursing_notes || []).map((n) => (
                    <div key={n.id} className="timeline-item">
                      <div className="timeline-item__title">{n.note}</div>
                      <div className="timeline-item__time">
                        {n.nurse_name} • {n.shift} shift
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Vitals Tab */}
          {activeTab === "vitals" && (
            <div>
              {isActive && (
                <form onSubmit={handleSaveVitals} style={{ marginBottom: "var(--space-4)" }}>
                  <div className="field">
                    <label className="field-label">Shift</label>
                    <select className="select" value={vitals.shift} onChange={handleVitalsChange("shift")}>
                      <option value="MORNING">Morning</option>
                      <option value="AFTERNOON">Afternoon</option>
                      <option value="NIGHT">Night</option>
                    </select>
                  </div>
                  <div className="vitals-grid">
                    <div className="field">
                      <label className="field-label">Weight (kg)</label>
                      <input type="number" className="input" placeholder="Weight" value={vitals.weight_kg} onChange={handleVitalsChange("weight_kg")} />
                    </div>
                    <div className="field">
                      <label className="field-label">Height (cm)</label>
                      <input type="number" className="input" placeholder="Height" value={vitals.height_cm} onChange={handleVitalsChange("height_cm")} />
                    </div>
                    <div className="field">
                      <label className="field-label">Temp (°C)</label>
                      <input type="number" className="input" placeholder="Temp" value={vitals.temperature_c} onChange={handleVitalsChange("temperature_c")} />
                    </div>
                    <div className="field">
                      <label className="field-label">Pulse (bpm)</label>
                      <input type="number" className="input" placeholder="Pulse" value={vitals.pulse_bpm} onChange={handleVitalsChange("pulse_bpm")} />
                    </div>
                    <div className="field">
                      <label className="field-label">Respiratory Rate</label>
                      <input type="number" className="input" placeholder="Respiratory rate" value={vitals.respiratory_rate} onChange={handleVitalsChange("respiratory_rate")} />
                    </div>
                    <div className="field">
                      <label className="field-label">BP Systolic</label>
                      <input type="number" className="input" placeholder="Systolic" value={vitals.bp_systolic} onChange={handleVitalsChange("bp_systolic")} />
                    </div>
                    <div className="field">
                      <label className="field-label">BP Diastolic</label>
                      <input type="number" className="input" placeholder="Diastolic" value={vitals.bp_diastolic} onChange={handleVitalsChange("bp_diastolic")} />
                    </div>
                    <div className="field">
                      <label className="field-label">SpO2 (%)</label>
                      <input type="number" className="input" placeholder="SpO2" value={vitals.oxygen_saturation} onChange={handleVitalsChange("oxygen_saturation")} />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                    <i className="bi bi-floppy  me-1"></i> Save Vitals
                  </button>
                </form>
              )}
              {(admission.vitals || []).length === 0 ? (
                <div className="text-sm text-muted text-center" style={{ padding: "var(--space-6)" }}>
                  No vitals recorded
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date/Time</th>
                        <th>Shift</th>
                        <th className="cell-numeric">BP</th>
                        <th className="cell-numeric">Temp</th>
                        <th className="cell-numeric">Pulse</th>
                        <th className="cell-numeric">SpO2</th>
                        <th className="cell-numeric">BMI</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(admission.vitals || []).map((v) => (
                        <tr key={v.id}>
                          <td>{new Date(v.recorded_at).toLocaleString()}</td>
                          <td>{v.shift}</td>
                          <td className="cell-numeric">{v.bp_systolic}/{v.bp_diastolic}</td>
                          <td className="cell-numeric">{v.temperature_c}°C</td>
                          <td className="cell-numeric">{v.pulse_bpm}</td>
                          <td className="cell-numeric">{v.oxygen_saturation}%</td>
                          <td className="cell-numeric">{v.bmi || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Medications Tab */}
          {activeTab === "medications" && (
            <div>
              {isActive && (
                <form onSubmit={handleCreateMedOrder} style={{ marginBottom: "var(--space-4)" }}>
                  <div className="field-row">
                    <div className="field">
                      <label className="field-label">Medicine</label>
                      <select className="select" value={medOrder.medicine} onChange={handleMedOrderChange("medicine")} required>
                        <option value="">Select medicine</option>
                        {medicines.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Dosage</label>
                      <input type="text" className="input" placeholder="e.g. 500mg" value={medOrder.dosage} onChange={handleMedOrderChange("dosage")} required />
                    </div>
                    <div className="field">
                      <label className="field-label">Route</label>
                      <select className="select" value={medOrder.route} onChange={handleMedOrderChange("route")}>
                        <option value="ORAL">Oral</option>
                        <option value="IV">IV</option>
                        <option value="IM">IM</option>
                        <option value="SC">SC</option>
                        <option value="TOPICAL">Topical</option>
                      </select>
                    </div>
                    <div className="field">
                      <label className="field-label">Frequency</label>
                      <input type="text" className="input" placeholder="e.g. Every 8 hours" value={medOrder.frequency} onChange={handleMedOrderChange("frequency")} required />
                    </div>
                    <div className="field">
                      <label className="field-label">Qty per dose</label>
                      <input type="number" className="input" min="1" placeholder="Quantity" value={medOrder.quantity} onChange={handleMedOrderChange("quantity")} required />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                    <i className="bi bi-plus-circle  me-1"></i> Add Medication Order
                  </button>
                </form>
              )}
              {(admission.medication_orders || []).length === 0 ? (
                <div className="text-sm text-muted text-center" style={{ padding: "var(--space-6)" }}>
                  No medication orders
                </div>
              ) : (
                <div className="rx-list">
                  {(admission.medication_orders || []).map((m) => (
                    <div key={m.id} className="rx-item">
                      <div>
                        <div className="rx-item__name">{m.medicine_name}</div>
                        <div className="rx-item__detail">
                          {m.dosage} • {m.route} • {m.frequency} • Qty: {m.quantity}
                        </div>
                      </div>
                      <div className="flex gap-2 align-items-center">
                        <span className={`badge ${m.is_active ? "badge-success" : "badge-neutral"}`}>
                          <span className="badge-dot"></span>
                          {m.is_active ? "Active" : "Discontinued"}
                        </span>
                        {isActive && m.is_active && (
                          <>
                            <button className="btn btn-success btn-sm" onClick={() => handleAdministerMed(m.id)}>
                              <i className="bi bi-check  me-1"></i> Give
                            </button>
                            <button className="btn btn-danger-outline btn-sm" onClick={() => handleDiscontinueMed(m.id)}>
                              <i className="bi bi-x  me-1"></i> DC
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Lab Requests Tab */}
          {activeTab === "lab" && (
            <div>
              {isActive && (
                <form onSubmit={handleOrderLab} style={{ marginBottom: "var(--space-4)" }}>
                  <div className="field-row">
                    <div className="field" style={{ flex: 1 }}>
                      <label className="field-label">Lab Test</label>
                      <select className="select" value={selectedLabTest} onChange={(e) => setSelectedLabTest(e.target.value)} required>
                        <option value="">Select lab test</option>
                        {labTests.map((t) => (
                          <option key={t.id} value={t.id}>{t.name} (KES {t.price})</option>
                        ))}
                      </select>
                    </div>
                    <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
                      <button type="submit" className="btn btn-primary" disabled={orderSubmitting}>
                        <i className="bi bi-plus-circle  me-1"></i> Order Lab Test
                      </button>
                    </div>
                  </div>
                </form>
              )}
              {(admission.lab_orders || []).length === 0 ? (
                <div className="text-sm text-muted text-center" style={{ padding: "var(--space-6)" }}>
                  No lab requests for this admission
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Test</th>
                        <th className="cell-numeric">Price</th>
                        <th>Status</th>
                        <th>Ordered</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(admission.lab_orders || []).map((o) => (
                        <tr key={o.id}>
                          <td className="cell-primary">{o.test_name}</td>
                          <td className="cell-numeric">KES {o.test_price}</td>
                          <td>
                            <span className={`badge ${getStatusBadge(o.status)}`}>
                              <span className="badge-dot"></span>
                              {o.status}
                            </span>
                          </td>
                          <td>{new Date(o.ordered_at).toLocaleString()}</td>
                          <td>
                            {o.result ? (
                              <div>
                                {o.result.result_text && <div className="text-sm">{o.result.result_text}</div>}
                                {o.result.result_file && (
                                  <a href={o.result.result_file} target="_blank" rel="noreferrer">
                                    <i className="bi bi-file-earmark-medical  me-1"></i> View File
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-muted">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Radiology Requests Tab */}
          {activeTab === "radiology" && (
            <div>
              {isActive && (
                <form onSubmit={handleOrderRadiology} style={{ marginBottom: "var(--space-4)" }}>
                  <div className="field-row">
                    <div className="field" style={{ flex: 1 }}>
                      <label className="field-label">Radiology Test</label>
                      <select className="select" value={selectedRadiologyTest} onChange={(e) => setSelectedRadiologyTest(e.target.value)} required>
                        <option value="">Select radiology test</option>
                        {radiologyTests.map((t) => (
                          <option key={t.id} value={t.id}>{t.name} (KES {t.price})</option>
                        ))}
                      </select>
                    </div>
                    <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
                      <button type="submit" className="btn btn-primary" disabled={orderSubmitting}>
                        <i className="bi bi-plus-circle  me-1"></i> Order Radiology
                      </button>
                    </div>
                  </div>
                </form>
              )}
              {(admission.radiology_orders || []).length === 0 ? (
                <div className="text-sm text-muted text-center" style={{ padding: "var(--space-6)" }}>
                  No radiology requests for this admission
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Test</th>
                        <th className="cell-numeric">Price</th>
                        <th>Status</th>
                        <th>Ordered</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(admission.radiology_orders || []).map((o) => (
                        <tr key={o.id}>
                          <td className="cell-primary">{o.test_name}</td>
                          <td className="cell-numeric">KES {o.test_price}</td>
                          <td>
                            <span className={`badge ${getStatusBadge(o.status)}`}>
                              <span className="badge-dot"></span>
                              {o.status}
                            </span>
                          </td>
                          <td>{new Date(o.ordered_at).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Procedures Tab */}
          {activeTab === "procedures" && (
            <div>
              {isActive && (
                <form onSubmit={handleOrderProcedure} style={{ marginBottom: "var(--space-4)" }}>
                  <div className="field-row">
                    <div className="field" style={{ flex: 1 }}>
                      <label className="field-label">Procedure</label>
                      <select className="select" value={selectedProcedure} onChange={(e) => setSelectedProcedure(e.target.value)} required>
                        <option value="">Select procedure</option>
                        {procedureCatalog.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} (KES {p.price})</option>
                        ))}
                      </select>
                    </div>
                    <div className="field" style={{ flex: 1 }}>
                      <label className="field-label">Notes</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Optional notes"
                        value={procedureNotes}
                        onChange={(e) => setProcedureNotes(e.target.value)}
                      />
                    </div>
                    <div className="field" style={{ display: "flex", alignItems: "flex-end" }}>
                      <button type="submit" className="btn btn-primary" disabled={orderSubmitting}>
                        <i className="bi bi-plus-circle  me-1"></i> Order Procedure
                      </button>
                    </div>
                  </div>
                </form>
              )}
              {(admission.procedures || []).length === 0 ? (
                <div className="text-sm text-muted text-center" style={{ padding: "var(--space-6)" }}>
                  No procedures recorded for this admission
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Procedure</th>
                        <th className="cell-numeric">Price</th>
                        <th>Notes</th>
                        <th>Status</th>
                        <th>Ordered</th>
                        <th className="cell-actions"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(admission.procedures || []).map((p) => (
                        <tr key={p.id}>
                          <td className="cell-primary">{p.procedure_name}</td>
                          <td className="cell-numeric">KES {p.procedure_price}</td>
                          <td>{p.notes || "—"}</td>
                          <td>
                            <span className={`badge ${getStatusBadge(p.status)}`}>
                              <span className="badge-dot"></span>
                              {p.status}
                            </span>
                          </td>
                          <td>{new Date(p.ordered_at).toLocaleString()}</td>
                          <td className="cell-actions">
                            {isActive && p.status === "ORDERED" && (
                              <button className="btn btn-success btn-sm" onClick={() => handleCompleteProcedure(p.id)}>
                                <i className="bi bi-check  me-1"></i> Complete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Bed Transfers Tab */}
          {activeTab === "transfers" && (
            <div>
              {(admission.bed_transfers || []).length === 0 ? (
                <div className="text-sm text-muted text-center" style={{ padding: "var(--space-6)" }}>
                  No bed transfer history
                </div>
              ) : (
                <div className="timeline">
                  {(admission.bed_transfers || []).map((t) => (
                    <div key={t.id} className="timeline-item">
                      <div className="timeline-item__title">
                        <i className="bi bi-arrow-right  me-1"></i> {t.from_bed_label || "N/A"} → {t.to_bed_label}
                      </div>
                      <div className="timeline-item__time">
                        {new Date(t.transferred_at).toLocaleString()}
                        {t.reason && <div className="text-sm text-muted mt-1">Reason: {t.reason}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Transfer Bed Tab */}
          {activeTab === "transfer" && isActive && (
            <div>
              <form onSubmit={handleTransferBed}>
                <div className="field-row">
                  <div className="field">
                    <label className="field-label">Ward</label>
                    <select className="select" value={transferWard} onChange={handleTransferWardChange} required>
                      <option value="">Select ward</option>
                      {wards.map((w) => (
                        <option key={w.id} value={w.id}>{w.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">Bed</label>
                    <select className="select" value={transferBedId} onChange={(e) => setTransferBedId(e.target.value)} required>
                      <option value="">Select bed</option>
                      {transferBeds.map((b) => (
                        <option key={b.id} value={b.id}>{b.bed_number}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label className="field-label">Reason</label>
                    <input type="text" className="input" placeholder="Reason for transfer" value={transferReason} onChange={(e) => setTransferReason(e.target.value)} />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                  <i className="bi bi-arrows-move  me-1"></i> Transfer Bed
                </button>
              </form>
            </div>
          )}

          {/* Discharge Tab */}
          {activeTab === "discharge" && isActive && (
            <div>
              {dischargeBlockedByBalance && (
                <div
                  className="card"
                  style={{
                    marginBottom: "var(--space-4)",
                    borderColor: "var(--warning)",
                    background: "var(--warning-soft)",
                  }}
                >
                  <div className="card-body text-warning">
                    <i className="bi bi-lock-fill  me-1"></i>
                    <strong>Discharge Restricted:</strong> This admission has an outstanding balance of{" "}
                    <strong>KES {billing?.balance}</strong>. A normal discharge requires the bill to be cleared
                    first. Select a different discharge type (Discharge Against Medical Advice, Referred Out,
                    Deceased, or Absconded) if the patient needs to leave before the balance is settled.
                  </div>
                </div>
              )}

              <form onSubmit={handleDischarge}>
                <div className="field">
                  <label className="field-label">Discharge Type</label>
                  <select className="select" value={dischargeType} onChange={(e) => setDischargeType(e.target.value)}>
                    <option value="NORMAL">Normal Discharge</option>
                    <option value="DAMA">Discharge Against Medical Advice</option>
                    <option value="REFERRED">Referred Out</option>
                    <option value="DECEASED">Deceased</option>
                    <option value="ABSCONDED">Absconded</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Discharge Summary</label>
                  <textarea
                    className="textarea"
                    placeholder="Enter discharge summary"
                    value={dischargeSummary}
                    onChange={(e) => setDischargeSummary(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-danger"
                  disabled={dischargeBlockedByBalance}
                  title={dischargeBlockedByBalance ? "Clear the outstanding balance to unlock normal discharge" : ""}
                >
                  <i className={`bi ${dischargeBlockedByBalance ? "bi-lock-fill" : "bi-door-open"}  me-1`}></i>
                  Discharge Patient
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </>
  );
}