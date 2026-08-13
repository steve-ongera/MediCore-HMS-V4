//src/pages/doctor/Consultation.jsx
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "../../context/ToastContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import medicoreLogo from "../../assets/logo.png";
import {
  getConsultations,
  getVisit,
  startConsultation,
  saveConsultation,
  addDiagnosis,
  pauseConsultation,
  resumeConsultation,
  completeConsultation,
  getPatientSummary,
  lookupIcd10,
  searchMedicines,
  createPrescription,
  createLabOrder,
  createRadiologyOrder,
  getLabTestCatalog,
  getRadiologyTestCatalog,
  addConsultationProcedure,
} from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import Modal from "../../components/Modal";
import StatusBadge from "../../components/StatusBadge";
import { formatDate, formatDateTime, initials } from "../../utils/formatters";

const TABS = [
  { key: "notes", label: "Clinical Notes", icon: "bi-file-text" },
  { key: "diagnoses", label: "Diagnoses", icon: "bi-clipboard-check" },
  { key: "prescriptions", label: "Prescriptions", icon: "bi-capsule" },
  { key: "procedures", label: "Procedures", icon: "bi-heart-pulse" },
  { key: "orders", label: "Lab & Radiology", icon: "bi-list-ul" },
];

const EMPTY_FORM = {
  chief_complaint: "",
  history_of_present_illness: "",
  physical_examination: "",
  treatment_plan: "",
  clinical_notes: "",
};

const draftKeyFor = (visitId) => `consultation_draft_${visitId}`;

// ---------------------------------------------------------------------------
// Branded PDF design constants (matches MediCore mortuary discharge format)
// ---------------------------------------------------------------------------
const BRAND_COLOR = [30, 64, 175]; // #1e40af
const DARK_TEXT = [17, 24, 39]; // #111827
const MUTED_COLOR = [107, 114, 128]; // #6b7280
const LIGHT_BORDER = [229, 231, 235]; // #e5e7eb
const LIGHT_FILL = [249, 250, 251]; // #f9fafb

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

    // eslint-disable-next-line no-void
    resolve(canvas.toDataURL("image/png"));
  });
};

// Renders the shared MediCore letterhead (logo + facility name + document title) on the current page
const renderLetterhead = (doc, logoImg, pageWidth, margin, documentTitle) => {
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
  doc.text(documentTitle, pageWidth - margin, 15, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...MUTED_COLOR);
  doc.text(`Generated: ${formatDateTime(new Date())}`, pageWidth - margin, 19, { align: "right" });

  doc.setDrawColor(...BRAND_COLOR);
  doc.setLineWidth(0.4);
  doc.line(margin, 24, pageWidth - margin, 24);

  return 28; // next content Y
};

export default function Consultation() {
  const { visitId } = useParams();
  const navigate = useNavigate();
  const loadedVisitRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [consultation, setConsultation] = useState(null);
  const [patientSummary, setPatientSummary] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("notes");

  const [form, setForm] = useState(EMPTY_FORM);
  const [savedForm, setSavedForm] = useState(EMPTY_FORM);
  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);

  const [diagnosisSearch, setDiagnosisSearch] = useState("");
  const [diagnosisResults, setDiagnosisResults] = useState([]);
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);

  const [medSearch, setMedSearch] = useState("");
  const [medResults, setMedResults] = useState([]);
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescriptionForm, setPrescriptionForm] = useState({
    medicine: "",
    dosage: "",
    frequency: "",
    duration: "",
    quantity: "",
    instructions: "",
  });

  const [showProcedureModal, setShowProcedureModal] = useState(false);
  const [procedureForm, setProcedureForm] = useState({ description: "", amount: "" });

  const [labTests, setLabTests] = useState([]);
  const [radiologyTests, setRadiologyTests] = useState([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);

  const [showLabModal, setShowLabModal] = useState(false);
  const [labForm, setLabForm] = useState({ test: "" });

  const [showRadiologyModal, setShowRadiologyModal] = useState(false);
  const [radiologyForm, setRadiologyForm] = useState({ test: "" });

  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseForm, setPauseForm] = useState({ pause_reason: "OTHER", pause_notes: "" });

  useEffect(() => {
    if (loadedVisitRef.current === visitId) return;
    loadedVisitRef.current = visitId;
    loadConsultation();
  }, [visitId]);

  useEffect(() => {
    const loadCatalogs = async () => {
      setCatalogsLoading(true);
      try {
        const [labResp, radResp] = await Promise.all([
          getLabTestCatalog(),
          getRadiologyTestCatalog(),
        ]);
        setLabTests(labResp?.results || labResp || []);
        setRadiologyTests(radResp?.results || radResp || []);
      } catch (err) {
        toast.error(err.message || "Failed to load test catalogs");
      } finally {
        setCatalogsLoading(false);
      }
    };
    loadCatalogs();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isDirty]);

  useEffect(() => {
    if (!consultation) return;
    localStorage.setItem(draftKeyFor(visitId), JSON.stringify(form));
  }, [form, consultation, visitId]);

  const clearDraft = () => {
    localStorage.removeItem(draftKeyFor(visitId));
  };

  const loadConsultation = async () => {
    setLoading(true);
    try {
      const visit = await getVisit(visitId);
      const consultationsResp = await getConsultations({ visit: visitId });
      let cons;
      if (consultationsResp.results && consultationsResp.results.length > 0) {
        cons = consultationsResp.results[0];
      } else {
        cons = await startConsultation({ visit: visitId });
      }

      setConsultation(cons);

      const serverForm = {
        chief_complaint: cons.chief_complaint || "",
        history_of_present_illness: cons.history_of_present_illness || "",
        physical_examination: cons.physical_examination || "",
        treatment_plan: cons.treatment_plan || "",
        clinical_notes: cons.clinical_notes || "",
      };
      setSavedForm(serverForm);

      const draftRaw = localStorage.getItem(draftKeyFor(visitId));
      if (draftRaw) {
        try {
          const draft = JSON.parse(draftRaw);
          if (JSON.stringify(draft) !== JSON.stringify(serverForm)) {
            setForm(draft);
            toast.info("Restored your unsaved clinical notes from before the page reloaded.");
          } else {
            setForm(serverForm);
          }
        } catch {
          setForm(serverForm);
        }
      } else {
        setForm(serverForm);
      }

      const summary = await getPatientSummary(visit.patient);
      setPatientSummary(summary);
    } catch (err) {
      toast.error(err.message || "Failed to load consultation");
      navigate("/doctor");
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await saveConsultation(consultation.id, form);
      setSavedForm(form);
      clearDraft();
      toast.success("Consultation saved");
      loadConsultation();
    } catch (err) {
      toast.error(err.message || "Failed to save consultation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTabChange = (tabKey) => {
    if (tabKey === activeTab) return;
    if (activeTab === "notes" && isDirty) {
      toast.warning("Please save your clinical notes before switching tabs.");
      return;
    }
    setActiveTab(tabKey);
  };

  const handleBack = () => {
    if (isDirty && !window.confirm("You have unsaved clinical notes. Leave without saving?")) {
      return;
    }
    navigate("/doctor");
  };

  const handleComplete = async () => {
    if (!window.confirm("Complete this consultation?")) return;
    setSubmitting(true);
    try {
      if (isDirty) {
        await saveConsultation(consultation.id, form);
        setSavedForm(form);
      }
      await completeConsultation(consultation.id);
      clearDraft();
      toast.success("Consultation completed!");
      navigate("/doctor");
    } catch (err) {
      toast.error(err.message || "Failed to complete consultation");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePause = async () => {
    setSubmitting(true);
    try {
      if (isDirty) {
        await saveConsultation(consultation.id, form);
        setSavedForm(form);
      }
      await pauseConsultation(consultation.id, pauseForm);
      toast.success("Consultation paused");
      setShowPauseModal(false);
      loadConsultation();
    } catch (err) {
      toast.error(err.message || "Failed to pause consultation");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResume = async () => {
    setSubmitting(true);
    try {
      await resumeConsultation(consultation.id);
      toast.success("Consultation resumed");
      loadConsultation();
    } catch (err) {
      toast.error(err.message || "Failed to resume consultation");
    } finally {
      setSubmitting(false);
    }
  };

  const searchDiagnosis = async (query) => {
    if (!query || query.length < 2) {
      setDiagnosisResults([]);
      return;
    }
    try {
      const results = await lookupIcd10(query);
      setDiagnosisResults(results || []);
    } catch (err) {
      console.error("Diagnosis search failed:", err);
    }
  };

  const addDiagnosisToConsultation = async () => {
    if (!selectedDiagnosis) return;
    try {
      await addDiagnosis(consultation.id, {
        icd10_code: selectedDiagnosis.code,
        is_primary: consultation.diagnoses?.length === 0,
      });
      toast.success("Diagnosis added");
      setShowDiagnosisModal(false);
      setSelectedDiagnosis(null);
      setDiagnosisSearch("");
      loadConsultation();
    } catch (err) {
      toast.error(err.message || "Failed to add diagnosis");
    }
  };

  const searchMedicinesForRx = async (query) => {
    if (!query || query.length < 2) {
      setMedResults([]);
      return;
    }
    try {
      const results = await searchMedicines(query);
      setMedResults(results || []);
    } catch (err) {
      console.error("Medicine search failed:", err);
    }
  };

  const createPrescriptionForPatient = async () => {
    if (!prescriptionForm.medicine || !prescriptionForm.dosage) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await createPrescription({
        consultation: consultation.id,
        ...prescriptionForm,
        quantity: parseInt(prescriptionForm.quantity) || 1,
      });
      toast.success("Prescription created");
      setShowPrescriptionModal(false);
      setPrescriptionForm({ medicine: "", dosage: "", frequency: "", duration: "", quantity: "", instructions: "" });
      loadConsultation();
    } catch (err) {
      toast.error(err.message || "Failed to create prescription");
    } finally {
      setSubmitting(false);
    }
  };

  const addProcedureToConsultation = async () => {
    if (!procedureForm.description || !procedureForm.amount) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      await addConsultationProcedure(consultation.id, {
        description: procedureForm.description,
        amount: parseFloat(procedureForm.amount),
      });
      toast.success("Procedure added and billed");
      setShowProcedureModal(false);
      setProcedureForm({ description: "", amount: "" });
      loadConsultation();
    } catch (err) {
      toast.error(err.message || "Failed to add procedure");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLabOrder = async () => {
    if (!labForm.test) {
      toast.error("Please select a test");
      return;
    }
    setSubmitting(true);
    try {
      await createLabOrder({ consultation: consultation.id, test: labForm.test });
      toast.success("Lab order created");
      setShowLabModal(false);
      setLabForm({ test: "" });
      loadConsultation();
    } catch (err) {
      toast.error(err.message || "Failed to create lab order");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRadiologyOrder = async () => {
    if (!radiologyForm.test) {
      toast.error("Please select a test");
      return;
    }
    setSubmitting(true);
    try {
      await createRadiologyOrder({ consultation: consultation.id, test: radiologyForm.test });
      toast.success("Radiology order created");
      setShowRadiologyModal(false);
      setRadiologyForm({ test: "" });
      loadConsultation();
    } catch (err) {
      toast.error(err.message || "Failed to create radiology order");
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------
  // Branded result PDFs (MediCore letterhead format). Content is packed
  // onto a single page; it only spills onto a second page if the result
  // text is long enough that it wouldn't otherwise fit.
  // ---------------------------------------------------------------------
  const downloadLabResultPdf = async (order) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const bottomLimit = pageHeight - margin;

    const logoImg = await loadImage(medicoreLogo);
    const qrDataUrl = await generateQrCodeDataUrl(
      `LABRESULT:${order.id}|PATIENT:${consultation?.patient_name || "N/A"}|TEST:${order.test_name || "N/A"}`
    );

    let startY = renderLetterhead(doc, logoImg, pageWidth, margin, "LABORATORY RESULT");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text("1. Patient & Test Particulars", margin, startY);
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
        ["Patient Name:", consultation?.patient_name || "N/A", "Test Name:", order.test_name || "N/A"],
        ["Ordered At:", order.ordered_at ? formatDateTime(order.ordered_at) : "N/A", "Status:", order.status || "N/A"],
        [
          "Completed At:",
          order.result?.completed_at ? formatDateTime(order.result.completed_at) : "Pending",
          "Consultation Ref:",
          consultation?.id ? String(consultation.id).slice(0, 8).toUpperCase() : "N/A",
        ],
      ],
    });

    startY = doc.lastAutoTable.finalY + 8;

    // --- Result content ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text("2. Result", margin, startY);
    startY += 5;

    const resultText = order.result?.result_text || "(no text entered)";
    const resultLines = doc.splitTextToSize(resultText, pageWidth - margin * 2 - 8);
    const boxHeight = Math.max(24, resultLines.length * 4.5 + 10);

    // Only break to a new page if the result box + verification block genuinely won't fit
    if (startY + boxHeight + 8 + 38 > bottomLimit) {
      doc.addPage();
      startY = renderLetterhead(doc, logoImg, pageWidth, margin, "LABORATORY RESULT — REPORT (CONT.)");
    }

    doc.setDrawColor(...LIGHT_BORDER);
    doc.setFillColor(...LIGHT_FILL);
    doc.rect(margin, startY, pageWidth - margin * 2, boxHeight, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_TEXT);
    doc.text(resultLines, margin + 4, startY + 8);

    startY += boxHeight + 8;

    // Verification QR box & signature area
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
    doc.text("LABORATORY RESULT VERIFICATION", sigX, startY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED_COLOR);
    doc.text("This is a system-generated report. Scan the QR code to verify authenticity.", sigX, startY + 12);

    doc.line(sigX, startY + 28, sigX + 50, startY + 28);
    doc.text("Lab Technician Signature", sigX, startY + 32);

    doc.line(sigX + 65, startY + 28, sigX + 115, startY + 28);
    doc.text("Reviewing Doctor Signature", sigX + 65, startY + 32);

    const fileName = `${order.test_name || "lab_result"}_${consultation?.patient_name || "patient"}.pdf`.replace(
      /\s+/g,
      "_"
    );
    doc.save(fileName);
  };

  const downloadRadiologyResultPdf = async (order) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 12;
    const bottomLimit = pageHeight - margin;

    const logoImg = await loadImage(medicoreLogo);
    const qrDataUrl = await generateQrCodeDataUrl(
      `RADRESULT:${order.id}|PATIENT:${consultation?.patient_name || "N/A"}|TEST:${order.test_name || "N/A"}`
    );

    let startY = renderLetterhead(doc, logoImg, pageWidth, margin, "RADIOLOGY REPORT");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text("1. Patient & Test Particulars", margin, startY);
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
        ["Patient Name:", consultation?.patient_name || "N/A", "Test Name:", order.test_name || "N/A"],
        ["Ordered At:", order.ordered_at ? formatDateTime(order.ordered_at) : "N/A", "Status:", order.status || "N/A"],
        [
          "Completed At:",
          order.result?.completed_at ? formatDateTime(order.result.completed_at) : "Pending",
          "Consultation Ref:",
          consultation?.id ? String(consultation.id).slice(0, 8).toUpperCase() : "N/A",
        ],
      ],
    });

    startY = doc.lastAutoTable.finalY + 8;

    // --- Radiologist notes ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK_TEXT);
    doc.text("2. Radiologist Notes", margin, startY);
    startY += 5;

    const resultText = order.result?.radiologist_notes || "(no notes entered)";
    const resultLines = doc.splitTextToSize(resultText, pageWidth - margin * 2 - 8);
    const boxHeight = Math.max(24, resultLines.length * 4.5 + 10);

    // Only break to a new page if the notes box + verification block genuinely won't fit
    if (startY + boxHeight + 8 + 38 > bottomLimit) {
      doc.addPage();
      startY = renderLetterhead(doc, logoImg, pageWidth, margin, "RADIOLOGY REPORT — FINDINGS (CONT.)");
    }

    doc.setDrawColor(...LIGHT_BORDER);
    doc.setFillColor(...LIGHT_FILL);
    doc.rect(margin, startY, pageWidth - margin * 2, boxHeight, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...DARK_TEXT);
    doc.text(resultLines, margin + 4, startY + 8);

    startY += boxHeight + 8;

    // Verification QR box & signature area
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
    doc.text("RADIOLOGY REPORT VERIFICATION", sigX, startY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED_COLOR);
    doc.text("This is a system-generated report. Scan the QR code to verify authenticity.", sigX, startY + 12);

    doc.line(sigX, startY + 28, sigX + 50, startY + 28);
    doc.text("Radiologist Signature", sigX, startY + 32);

    doc.line(sigX + 65, startY + 28, sigX + 115, startY + 28);
    doc.text("Reviewing Doctor Signature", sigX + 65, startY + 32);

    const fileName = `${order.test_name || "radiology_report"}_${consultation?.patient_name || "patient"}.pdf`.replace(
      /\s+/g,
      "_"
    );
    doc.save(fileName);
  };

  if (loading) return <LoadingSpinner />;

  const diagnosesCount = consultation?.diagnoses?.length || 0;
  const prescriptionsCount = consultation?.prescriptions?.length || 0;
  const proceduresCount = consultation?.procedures?.length || 0;
  const ordersCount = (consultation?.lab_orders?.length || 0) + (consultation?.radiology_orders?.length || 0);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Doctor</div>
          <h1 className="page-title">Consultation</h1>
          <p className="page-subtitle">
            {consultation?.patient_name || "Patient"} · {formatDate(consultation?.started_at)}
          </p>
        </div>
        <div className="page-header__actions">
          <StatusBadge status={consultation?.status} />
          {isDirty && <span className="badge badge-warning">Unsaved changes</span>}
          {consultation?.status === "IN_PROGRESS" && (
            <>
              <button
                type="button"
                className="btn btn-warning"
                onClick={() => setShowPauseModal(true)}
                disabled={submitting}
              >
                <i className="bi bi-pause-circle  me-1"></i>
                Pause
              </button>
              <button
                type="button"
                className="btn btn-success"
                onClick={handleComplete}
                disabled={submitting}
              >
                <i className="bi bi-check2-circle  me-1"></i>
                Complete
              </button>
            </>
          )}
          {consultation?.status === "PAUSED" && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleResume}
              disabled={submitting}
            >
              <i className="bi bi-play-circle  me-1"></i>
              Resume
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleBack}
          >
            <i className="bi bi-arrow-left  me-1"></i>
            Back
          </button>
        </div>
      </div>

      <div className="grid-4-8">
        {/* Sidebar - 4 columns */}
        <div className="grid-4-8__sidebar">
          <div className="card">
            <div className="card-body text-center">
              <span className="avatar avatar-xl mb-3" style={{ fontSize: "2.5rem" }}>
                {initials(consultation?.patient_name) || "?"}
              </span>
              <h5 className="mb-0">{consultation?.patient_name}</h5>
              <span className="text-muted text-sm">
                #{patientSummary?.patient?.hospital_number || "—"}
              </span>
              <hr />
              <div className="text-start">
                <div className="info-item">
                  <div className="info-item__label">Age</div>
                  <div className="info-item__value">{patientSummary?.patient?.age || "—"}</div>
                </div>
                <div className="info-item" style={{ marginTop: "var(--space-2)" }}>
                  <div className="info-item__label">Gender</div>
                  <div className="info-item__value">{patientSummary?.patient?.gender || "—"}</div>
                </div>
                <div className="info-item" style={{ marginTop: "var(--space-2)" }}>
                  <div className="info-item__label">Phone</div>
                  <div className="info-item__value">{patientSummary?.patient?.phone || "—"}</div>
                </div>
                <div className="info-item" style={{ marginTop: "var(--space-2)" }}>
                  <div className="info-item__label">Status</div>
                  <div className="info-item__value">
                    <StatusBadge status={consultation?.status} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {patientSummary?.allergies?.length > 0 && (
            <div className="card" style={{ marginTop: "var(--space-3)" }}>
              <div className="card-header">
                <h6 className="mb-0">Allergies</h6>
              </div>
              <div className="card-body">
                {patientSummary.allergies.map((a) => (
                  <div key={a.id} className="flex justify-content-between align-items-center" style={{ marginBottom: "var(--space-1)" }}>
                    <span>{a.substance}</span>
                    <StatusBadge status={a.severity} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {consultation?.vitals && (
            <div className="card" style={{ marginTop: "var(--space-3)" }}>
              <div className="card-header">
                <h6 className="mb-0">Vitals</h6>
              </div>
              <div className="card-body">
                <div className="vitals-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: "var(--space-2)" }}>
                  <div className="vital-tile">
                    <div className="vital-tile__value">{consultation.vitals.bmi || "—"}</div>
                    <div className="vital-tile__label">BMI</div>
                  </div>
                  <div className="vital-tile">
                    <div className="vital-tile__value">{consultation.vitals.temperature_c || "—"}°C</div>
                    <div className="vital-tile__label">Temp</div>
                  </div>
                  <div className="vital-tile">
                    <div className="vital-tile__value">{consultation.vitals.pulse_bpm || "—"}</div>
                    <div className="vital-tile__label">Pulse</div>
                  </div>
                  <div className="vital-tile">
                    <div className="vital-tile__value">
                      {consultation.vitals.bp_systolic || "—"}/{consultation.vitals.bp_diastolic || "—"}
                    </div>
                    <div className="vital-tile__label">BP</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Main Content - 8 columns */}
        <div className="grid-4-8__main">
          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: "var(--space-3)" }}>
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`tabs__item ${activeTab === tab.key ? "is-active" : ""}`}
                onClick={() => handleTabChange(tab.key)}
                title={activeTab === "notes" && isDirty && tab.key !== "notes" ? "Save your clinical notes first" : undefined}
              >
                <i className={`bi ${tab.icon}  me-1`}></i>
                {tab.label}
                {tab.key === "diagnoses" && diagnosesCount > 0 && (
                  <span className="pill-count" style={{ marginLeft: "var(--space-1)" }}>{diagnosesCount}</span>
                )}
                {tab.key === "prescriptions" && prescriptionsCount > 0 && (
                  <span className="pill-count" style={{ marginLeft: "var(--space-1)" }}>{prescriptionsCount}</span>
                )}
                {tab.key === "procedures" && proceduresCount > 0 && (
                  <span className="pill-count" style={{ marginLeft: "var(--space-1)" }}>{proceduresCount}</span>
                )}
                {tab.key === "orders" && ordersCount > 0 && (
                  <span className="pill-count" style={{ marginLeft: "var(--space-1)" }}>{ordersCount}</span>
                )}
              </button>
            ))}
          </div>

          {/* Clinical Notes Tab */}
          {activeTab === "notes" && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Clinical Notes</h5>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={handleSave}
                  disabled={submitting || !isDirty}
                >
                  {submitting ? (
                    <span className="spinner-border spinner-border-sm" />
                  ) : (
                    <i className="bi bi-save  me-1"></i>
                  )}
                  Save
                </button>
              </div>
              <div className="card-body">
                <div className="field">
                  <label className="field-label" htmlFor="chief_complaint">
                    Chief Complaint
                  </label>
                  <textarea
                    id="chief_complaint"
                    name="chief_complaint"
                    className="textarea"
                    rows={2}
                    placeholder="Patient's main reason for visit..."
                    value={form.chief_complaint}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="history_of_present_illness">
                    History of Present Illness
                  </label>
                  <textarea
                    id="history_of_present_illness"
                    name="history_of_present_illness"
                    className="textarea"
                    rows={3}
                    placeholder="Detailed history of the current condition..."
                    value={form.history_of_present_illness}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="physical_examination">
                    Physical Examination
                  </label>
                  <textarea
                    id="physical_examination"
                    name="physical_examination"
                    className="textarea"
                    rows={3}
                    placeholder="Physical exam findings..."
                    value={form.physical_examination}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="treatment_plan">
                    Treatment Plan
                  </label>
                  <textarea
                    id="treatment_plan"
                    name="treatment_plan"
                    className="textarea"
                    rows={3}
                    placeholder="Treatment plan and recommendations..."
                    value={form.treatment_plan}
                    onChange={handleFormChange}
                  />
                </div>

                <div className="field mb-0">
                  <label className="field-label" htmlFor="clinical_notes">
                    Clinical Notes
                  </label>
                  <textarea
                    id="clinical_notes"
                    name="clinical_notes"
                    className="textarea"
                    rows={2}
                    placeholder="Additional clinical notes..."
                    value={form.clinical_notes}
                    onChange={handleFormChange}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Diagnoses Tab */}
          {activeTab === "diagnoses" && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Diagnoses</h5>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowDiagnosisModal(true)}
                >
                  <i className="bi bi-plus-lg  me-1"></i>
                  Add Diagnosis
                </button>
              </div>
              <div className="card-body">
                {diagnosesCount === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state__icon">
                      <i className="bi bi-clipboard2-pulse" style={{ fontSize: "1.5rem" }}></i>
                    </div>
                    <h3 className="empty-state__title">No diagnoses added yet</h3>
                    <p className="empty-state__desc">Add an ICD-10 diagnosis once you've assessed the patient.</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {consultation?.diagnoses?.map((d) => (
                      <div key={d.id} className={`diagnosis-chip ${d.is_primary ? "is-primary" : ""}`}>
                        <span className="diagnosis-chip__code">{d.code}</span>
                        <span>{d.description}</span>
                        {d.is_primary && (
                          <span className="badge badge-primary">Primary</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Prescriptions Tab */}
          {activeTab === "prescriptions" && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Prescriptions</h5>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowPrescriptionModal(true)}
                >
                  <i className="bi bi-plus-lg  me-1"></i>
                  Prescribe
                </button>
              </div>
              <div className="card-body p-0">
                {prescriptionsCount === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state__icon">
                      <i className="bi bi-capsule" style={{ fontSize: "1.5rem" }}></i>
                    </div>
                    <h3 className="empty-state__title">No prescriptions yet</h3>
                    <p className="empty-state__desc">Prescribe medication for this patient to send it to pharmacy.</p>
                  </div>
                ) : (
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Dosage</th>
                          <th>Frequency</th>
                          <th>Duration</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consultation?.prescriptions?.map((rx) => (
                          <tr key={rx.id}>
                            <td className="cell-primary">{rx.medicine_name}</td>
                            <td>{rx.dosage}</td>
                            <td>{rx.frequency || "—"}</td>
                            <td>{rx.duration || "—"}</td>
                            <td>
                              <StatusBadge status={rx.is_dispensed ? "DISPENSED" : "PENDING"} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Procedures Tab */}
          {activeTab === "procedures" && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Procedures Performed</h5>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowProcedureModal(true)}
                >
                  <i className="bi bi-plus-lg  me-1"></i>
                  Add Procedure
                </button>
              </div>
              <div className="card-body p-0">
                {proceduresCount === 0 ? (
                  <div className="empty-state">
                    <div className="empty-state__icon">
                      <i className="bi bi-heart-pulse" style={{ fontSize: "1.5rem" }}></i>
                    </div>
                    <h3 className="empty-state__title">No procedures recorded</h3>
                    <p className="empty-state__desc">
                      Record any procedure done during this consultation — it bills the patient immediately, separate from the consultation fee.
                    </p>
                  </div>
                ) : (
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Description</th>
                          <th>Amount</th>
                          <th>Performed By</th>
                          <th>Time</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consultation?.procedures?.map((p) => (
                          <tr key={p.id}>
                            <td className="cell-primary">{p.description}</td>
                            <td>KES {p.amount}</td>
                            <td>{p.performed_by_name || "—"}</td>
                            <td>{p.performed_at ? formatDateTime(p.performed_at) : "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Lab & Radiology Tab */}
          {activeTab === "orders" && (
            <div className="grid-2">
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">Lab Orders</h6>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowLabModal(true)}
                  >
                    <i className="bi bi-plus-lg  me-1"></i>
                    Order Lab
                  </button>
                </div>
                <div className="card-body p-0">
                  {consultation?.lab_orders?.length === 0 ? (
                    <div className="empty-state" style={{ padding: "var(--space-4)" }}>
                      <div className="empty-state__icon">
                        <i className="bi bi-list-ul"></i>
                      </div>
                      <h3 className="empty-state__title">No lab orders</h3>
                      <p className="empty-state__desc">Order lab tests for this patient.</p>
                    </div>
                  ) : (
                    <div className="table-scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Test</th>
                            <th>Status</th>
                            <th className="cell-actions"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {consultation?.lab_orders?.map((order) => (
                            <tr key={order.id}>
                              <td className="cell-primary">{order.test_name}</td>
                              <td>
                                <StatusBadge status={order.status} />
                              </td>
                              <td className="cell-actions">
                                <div className="flex gap-1 justify-end">
                                  {order.result?.result_file && (
                                    <a
                                      href={order.result.result_file}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-secondary btn-sm"
                                      title="View uploaded file"
                                    >
                                      <i className="bi bi-file-earmark-pdf"></i>
                                    </a>
                                  )}
                                  {order.result?.result_text && (
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => downloadLabResultPdf(order)}
                                      title="Download typed result as PDF"
                                    >
                                      <i className="bi bi-download"></i>
                                    </button>
                                  )}
                                  {order.result && !order.result.result_file && !order.result.result_text && (
                                    <span className="text-success">
                                      <i className="bi bi-check-circle"></i>
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">Radiology Orders</h6>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={() => setShowRadiologyModal(true)}
                  >
                    <i className="bi bi-plus-lg  me-1"></i>
                    Order Radiology
                  </button>
                </div>
                <div className="card-body p-0">
                  {consultation?.radiology_orders?.length === 0 ? (
                    <div className="empty-state" style={{ padding: "var(--space-4)" }}>
                      <div className="empty-state__icon">
                        <i className="bi bi-list-ul"></i>
                      </div>
                      <h3 className="empty-state__title">No radiology orders</h3>
                      <p className="empty-state__desc">Order radiology tests for this patient.</p>
                    </div>
                  ) : (
                    <div className="table-scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Test</th>
                            <th>Status</th>
                            <th className="cell-actions"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {consultation?.radiology_orders?.map((order) => (
                            <tr key={order.id}>
                              <td className="cell-primary">{order.test_name}</td>
                              <td>
                                <StatusBadge status={order.status} />
                              </td>
                              <td className="cell-actions">
                                <div className="flex gap-1 justify-end">
                                  {order.result?.image_file && (
                                    <a
                                      href={order.result.image_file}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-secondary btn-sm"
                                      title="View uploaded image"
                                    >
                                      <i className="bi bi-image"></i>
                                    </a>
                                  )}
                                  {order.result?.report_file && (
                                    <a
                                      href={order.result.report_file}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn btn-secondary btn-sm"
                                      title="View uploaded report"
                                    >
                                      <i className="bi bi-file-earmark-pdf"></i>
                                    </a>
                                  )}
                                  {order.result?.radiologist_notes && (
                                    <button
                                      type="button"
                                      className="btn btn-secondary btn-sm"
                                      onClick={() => downloadRadiologyResultPdf(order)}
                                      title="Download radiologist notes as PDF"
                                    >
                                      <i className="bi bi-download"></i>
                                    </button>
                                  )}
                                  {order.result &&
                                    !order.result.image_file &&
                                    !order.result.report_file &&
                                    !order.result.radiologist_notes && (
                                      <span className="text-success">
                                        <i className="bi bi-check-circle"></i>
                                      </span>
                                    )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Diagnosis Modal */}
      <Modal
        show={showDiagnosisModal}
        onClose={() => {
          setShowDiagnosisModal(false);
          setSelectedDiagnosis(null);
          setDiagnosisSearch("");
          setDiagnosisResults([]);
        }}
        title="Add Diagnosis"
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowDiagnosisModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={addDiagnosisToConsultation}
              disabled={!selectedDiagnosis}
            >
              <i className="bi bi-plus-lg  me-1"></i>
              Add Diagnosis
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="diagnosis_search">
            Search ICD-10 Codes
          </label>
          <input
            id="diagnosis_search"
            type="text"
            className="input"
            placeholder="Search by code or description..."
            value={diagnosisSearch}
            onChange={(e) => {
              setDiagnosisSearch(e.target.value);
              searchDiagnosis(e.target.value);
            }}
          />
        </div>
        {diagnosisResults.length > 0 && (
          <div className="list-group mt-2" style={{ maxHeight: 300, overflowY: "auto" }}>
            {diagnosisResults.map((d) => (
              <button
                key={d.code}
                type="button"
                className={`list-group-item list-group-item-action ${selectedDiagnosis?.code === d.code ? "active" : ""}`}
                onClick={() => setSelectedDiagnosis(d)}
              >
                <strong>{d.code}</strong> — {d.description}
              </button>
            ))}
          </div>
        )}
        {selectedDiagnosis && (
          <div className="mt-3 p-2 bg-primary-soft rounded">
            Selected: <strong>{selectedDiagnosis.code}</strong> — {selectedDiagnosis.description}
          </div>
        )}
      </Modal>

      {/* Prescription Modal */}
      <Modal
        show={showPrescriptionModal}
        onClose={() => {
          setShowPrescriptionModal(false);
          setPrescriptionForm({ medicine: "", dosage: "", frequency: "", duration: "", quantity: "", instructions: "" });
          setMedResults([]);
          setMedSearch("");
        }}
        title="New Prescription"
        size="lg"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowPrescriptionModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={createPrescriptionForPatient}
              disabled={submitting}
            >
              {submitting ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <>
                  <i className="bi bi-plus-lg  me-1"></i>
                  Prescribe
                </>
              )}
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="med_search">
            Medicine <span className="required">*</span>
          </label>
          <input
            id="med_search"
            type="text"
            className="input"
            placeholder="Search for medicine..."
            value={medSearch}
            onChange={(e) => {
              setMedSearch(e.target.value);
              searchMedicinesForRx(e.target.value);
            }}
          />
          {medResults.length > 0 && (
            <div className="list-group mt-1" style={{ maxHeight: 150, overflowY: "auto" }}>
              {medResults.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`list-group-item list-group-item-action ${prescriptionForm.medicine === m.id ? "active" : ""}`}
                  onClick={() => {
                    setPrescriptionForm((prev) => ({ ...prev, medicine: m.id }));
                    setMedSearch(m.name);
                    setMedResults([]);
                  }}
                >
                  {m.name} — {m.unit_price && `KES ${m.unit_price}`}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="grid-2">
          <div className="field">
            <label className="field-label" htmlFor="rx_dosage">
              Dosage <span className="required">*</span>
            </label>
            <input
              id="rx_dosage"
              name="dosage"
              type="text"
              className="input"
              placeholder="e.g., 500mg"
              value={prescriptionForm.dosage}
              onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, dosage: e.target.value }))}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="rx_frequency">
              Frequency
            </label>
            <input
              id="rx_frequency"
              name="frequency"
              type="text"
              className="input"
              placeholder="e.g., 3x daily"
              value={prescriptionForm.frequency}
              onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, frequency: e.target.value }))}
            />
          </div>
        </div>

        <div className="grid-3">
          <div className="field">
            <label className="field-label" htmlFor="rx_duration">
              Duration
            </label>
            <input
              id="rx_duration"
              name="duration"
              type="text"
              className="input"
              placeholder="e.g., 5 days"
              value={prescriptionForm.duration}
              onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, duration: e.target.value }))}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="rx_quantity">
              Quantity
            </label>
            <input
              id="rx_quantity"
              name="quantity"
              type="number"
              className="input"
              placeholder="e.g., 10"
              value={prescriptionForm.quantity}
              onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, quantity: e.target.value }))}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="rx_instructions">
              Instructions
            </label>
            <input
              id="rx_instructions"
              name="instructions"
              type="text"
              className="input"
              placeholder="e.g., After meals"
              value={prescriptionForm.instructions}
              onChange={(e) => setPrescriptionForm((prev) => ({ ...prev, instructions: e.target.value }))}
            />
          </div>
        </div>
      </Modal>

      {/* Add Procedure Modal */}
      <Modal
        show={showProcedureModal}
        onClose={() => {
          setShowProcedureModal(false);
          setProcedureForm({ description: "", amount: "" });
        }}
        title="Add & Bill Procedure"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowProcedureModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={addProcedureToConsultation}
              disabled={submitting || !procedureForm.description || !procedureForm.amount}
            >
              {submitting ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <>
                  <i className="bi bi-plus-lg  me-1"></i>
                  Add & Bill Procedure
                </>
              )}
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="proc_description">
            Description <span className="required">*</span>
          </label>
          <input
            id="proc_description"
            type="text"
            className="input"
            placeholder="e.g., Wound suturing, ECG, Nebulization"
            value={procedureForm.description}
            onChange={(e) => setProcedureForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>
        <div className="field mb-0">
          <label className="field-label" htmlFor="proc_amount">
            Amount (KES) <span className="required">*</span>
          </label>
          <input
            id="proc_amount"
            type="number"
            className="input"
            placeholder="e.g., 1500"
            value={procedureForm.amount}
            onChange={(e) => setProcedureForm((prev) => ({ ...prev, amount: e.target.value }))}
          />
        </div>
      </Modal>

      {/* Lab Order Modal */}
      <Modal
        show={showLabModal}
        onClose={() => {
          setShowLabModal(false);
          setLabForm({ test: "" });
        }}
        title="Order Lab Test"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowLabModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateLabOrder}
              disabled={submitting || !labForm.test}
            >
              {submitting ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <>
                  <i className="bi bi-plus-lg  me-1"></i>
                  Order Lab Test
                </>
              )}
            </button>
          </>
        }
      >
        <div className="field mb-0">
          <label className="field-label" htmlFor="lab_test">
            Select Lab Test
          </label>
          <select
            id="lab_test"
            className="select"
            value={labForm.test}
            onChange={(e) => setLabForm({ test: e.target.value })}
            disabled={catalogsLoading}
          >
            <option value="">
              {catalogsLoading ? "Loading tests..." : "Choose a test..."}
            </option>
            {labTests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.price != null ? ` — KES ${t.price}` : ""}
              </option>
            ))}
          </select>
          {!catalogsLoading && labTests.length === 0 && (
            <div className="text-muted text-sm mt-1">
              No lab tests found in the catalog. Add some under Lab Test Catalog first.
            </div>
          )}
        </div>
      </Modal>

      {/* Radiology Order Modal */}
      <Modal
        show={showRadiologyModal}
        onClose={() => {
          setShowRadiologyModal(false);
          setRadiologyForm({ test: "" });
        }}
        title="Order Radiology Test"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowRadiologyModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleCreateRadiologyOrder}
              disabled={submitting || !radiologyForm.test}
            >
              {submitting ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <>
                  <i className="bi bi-plus-lg  me-1"></i>
                  Order Radiology
                </>
              )}
            </button>
          </>
        }
      >
        <div className="field mb-0">
          <label className="field-label" htmlFor="radiology_test">
            Select Radiology Test
          </label>
          <select
            id="radiology_test"
            className="select"
            value={radiologyForm.test}
            onChange={(e) => setRadiologyForm({ test: e.target.value })}
            disabled={catalogsLoading}
          >
            <option value="">
              {catalogsLoading ? "Loading tests..." : "Choose a test..."}
            </option>
            {radiologyTests.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
                {t.price != null ? ` — KES ${t.price}` : ""}
              </option>
            ))}
          </select>
          {!catalogsLoading && radiologyTests.length === 0 && (
            <div className="text-muted text-sm mt-1">
              No radiology tests found in the catalog. Add some under Radiology Test Catalog first.
            </div>
          )}
        </div>
      </Modal>

      {/* Pause Modal */}
      <Modal
        show={showPauseModal}
        onClose={() => setShowPauseModal(false)}
        title="Pause Consultation"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowPauseModal(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-warning"
              onClick={handlePause}
              disabled={submitting}
            >
              {submitting ? (
                <span className="spinner-border spinner-border-sm" />
              ) : (
                <>
                  <i className="bi bi-pause-circle  me-1"></i>
                  Pause
                </>
              )}
            </button>
          </>
        }
      >
        <div className="field">
          <label className="field-label" htmlFor="pause_reason">
            Pause Reason
          </label>
          <select
            id="pause_reason"
            className="select"
            value={pauseForm.pause_reason}
            onChange={(e) => setPauseForm((prev) => ({ ...prev, pause_reason: e.target.value }))}
          >
            <option value="WAITING_LAB">Waiting for Lab Results</option>
            <option value="WAITING_RADIOLOGY">Waiting for Radiology</option>
            <option value="PATIENT_NOT_READY">Patient Not Ready</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="field mb-0">
          <label className="field-label" htmlFor="pause_notes">
            Notes
          </label>
          <input
            id="pause_notes"
            type="text"
            className="input"
            placeholder="Additional notes..."
            value={pauseForm.pause_notes}
            onChange={(e) => setPauseForm((prev) => ({ ...prev, pause_notes: e.target.value }))}
          />
        </div>
      </Modal>
    </>
  );
}