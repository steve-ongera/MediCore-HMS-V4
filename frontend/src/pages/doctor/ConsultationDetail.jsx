import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { toast } from "../../context/ToastContext";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getConsultation, saveConsultation, deleteConsultation } from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import ConfirmDialog from "../../components/ConfirmDialog";
import { formatDate, formatDateTime, initials } from "../../utils/formatters";
import medicoreLogo from "../../assets/logo.png";

const HOSPITAL_NAME = "City General Hospital";
const HOSPITAL_ADDRESS = "P.O. Box 00100, Nairobi, Kenya  ·  Tel: +254 700 000 000";
const BRAND_COLOR = [30, 64, 175];
const MUTED_COLOR = [107, 114, 128];
const LIGHT_BORDER = [229, 231, 235];
const LIGHT_FILL = [249, 250, 251];

const EDITABLE_FIELDS = [
  ["chief_complaint", "Chief Complaint", 2],
  ["history_of_present_illness", "History of Present Illness", 3],
  ["physical_examination", "Physical Examination", 3],
  ["treatment_plan", "Treatment Plan", 3],
  ["clinical_notes", "Clinical Notes", 2],
];

const fieldsFrom = (cons) =>
  EDITABLE_FIELDS.reduce((acc, [key]) => {
    acc[key] = cons?.[key] || "";
    return acc;
  }, {});

const humanize = (value) => (value ? value.replace(/_/g, " ") : "—");

// Loads the bundled logo asset and returns it as a PNG data URL, plus its
// natural aspect ratio, so it can be embedded in the PDF without distortion.
const loadLogoDataUrl = () =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL("image/png"), ratio: img.naturalWidth / img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = medicoreLogo;
  });

export default function ConsultationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(searchParams.get("edit") === "1");
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [activeTab, setActiveTab] = useState("clinical");

  useEffect(() => {
    loadConsultation();
  }, [id]);

  const loadConsultation = async () => {
    setLoading(true);
    try {
      const data = await getConsultation(id);
      setConsultation(data);
      setForm(fieldsFrom(data));
    } catch (err) {
      toast.error(err.message || "Failed to load consultation");
      navigate("/doctor/consultations");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const setEditMode = (value) => {
    setIsEditing(value);
    if (value) {
      searchParams.set("edit", "1");
    } else {
      searchParams.delete("edit");
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await saveConsultation(id, form);
      setConsultation(updated);
      setForm(fieldsFrom(updated));
      setEditMode(false);
      toast.success("Consultation updated successfully");
    } catch (err) {
      toast.error(err.message || "Failed to update consultation");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setForm(fieldsFrom(consultation));
    setEditMode(false);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteConsultation(id);
      toast.success("Consultation deleted successfully");
      navigate("/doctor/consultations");
    } catch (err) {
      toast.error(err.message || "Failed to delete consultation");
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!consultation) return;
    setDownloading(true);
    try {
      const logo = await loadLogoDataUrl();

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 44;
      let y = margin;

      const ensureSpace = (needed) => {
        if (y + needed > pageHeight - 56) {
          doc.addPage();
          y = margin;
        }
      };

      // ---- Header: logo + hospital name/address, right-aligned doc title ----
      const logoSize = 34;
      let textX = margin;
      if (logo?.dataUrl) {
        const w = logoSize;
        const h = logoSize / logo.ratio;
        doc.addImage(logo.dataUrl, "PNG", margin, y - 6, w, h);
        textX = margin + w + 10;
      }

      doc.setFontSize(15);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND_COLOR);
      doc.text(HOSPITAL_NAME, textX, y + 6);

      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED_COLOR);
      doc.text(HOSPITAL_ADDRESS, textX, y + 19);

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("CONSULTATION REPORT", pageWidth - margin, y + 2, { align: "right" });
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED_COLOR);
      doc.text(`Generated ${new Date().toLocaleString()}`, pageWidth - margin, y + 13, { align: "right" });

      y += 34;
      doc.setDrawColor(...BRAND_COLOR);
      doc.setLineWidth(1.4);
      doc.line(margin, y, pageWidth - margin, y);
      y += 22;

      // ---- Patient summary — light card, two-column key/value pairs ----
      const summaryRows = [
        ["Patient", consultation.patient_name || "—", "Status", humanize(consultation.status)],
        ["Attending Doctor", consultation.doctor_name || "—", "Started", consultation.started_at ? formatDate(consultation.started_at) : "—"],
        ["Visit Reference", consultation.visit || "—", "Completed", consultation.completed_at ? formatDate(consultation.completed_at) : "—"],
      ];
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: "plain",
        styles: { fontSize: 9.5, cellPadding: { top: 5, bottom: 5, left: 10, right: 6 } },
        body: summaryRows,
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 110, textColor: MUTED_COLOR },
          1: { cellWidth: 155, textColor: [17, 24, 39] },
          2: { fontStyle: "bold", cellWidth: 100, textColor: MUTED_COLOR },
          3: { cellWidth: 115, textColor: [17, 24, 39] },
        },
        didParseCell: (data) => {
          data.cell.styles.fillColor = LIGHT_FILL;
          data.cell.styles.lineColor = LIGHT_BORDER;
          data.cell.styles.lineWidth = 0.5;
        },
      });
      y = doc.lastAutoTable.finalY + 20;

      // ---- Section heading helper: bold title + thin colored rule ----
      const addSection = (title, content) => {
        ensureSpace(34);
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND_COLOR);
        doc.text(title.toUpperCase(), margin, y);
        doc.setDrawColor(...LIGHT_BORDER);
        doc.setLineWidth(0.6);
        doc.line(margin, y + 5, pageWidth - margin, y + 5);
        y += 17;

        doc.setFontSize(9.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(30, 30, 30);
        const text = content && content.trim() ? content : "None recorded";
        const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
        ensureSpace(lines.length * 12.5 + 12);
        doc.text(lines, margin, y);
        y += lines.length * 12.5 + 18;
      };

      const addTableSection = (title, head, body) => {
        ensureSpace(40);
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND_COLOR);
        doc.text(title.toUpperCase(), margin, y);
        doc.setDrawColor(...LIGHT_BORDER);
        doc.setLineWidth(0.6);
        doc.line(margin, y + 5, pageWidth - margin, y + 5);
        y += 10;
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [head],
          body,
          styles: { fontSize: 9, cellPadding: 6, lineColor: LIGHT_BORDER, lineWidth: 0.5 },
          headStyles: { fillColor: BRAND_COLOR, textColor: 255, fontStyle: "bold" },
          alternateRowStyles: { fillColor: LIGHT_FILL },
        });
        y = doc.lastAutoTable.finalY + 20;
      };

      addSection("Chief Complaint", consultation.chief_complaint);
      addSection("History of Present Illness", consultation.history_of_present_illness);
      addSection("Physical Examination", consultation.physical_examination);
      addSection("Treatment Plan", consultation.treatment_plan);
      addSection("Clinical Notes", consultation.clinical_notes);

      if (consultation.diagnoses?.length) {
        addTableSection(
          "Diagnoses",
          ["Code", "Description", "Primary"],
          consultation.diagnoses.map((d) => [d.code, d.description, d.is_primary ? "Yes" : ""])
        );
      }

      if (consultation.prescriptions?.length) {
        addTableSection(
          "Prescriptions",
          ["Medicine", "Dosage", "Frequency", "Duration", "Qty", "Instructions", "Dispensed"],
          consultation.prescriptions.map((rx) => [
            rx.medicine_name,
            rx.dosage,
            rx.frequency || "—",
            rx.duration || "—",
            rx.quantity,
            rx.instructions || "—",
            rx.is_dispensed ? "Yes" : "No",
          ])
        );
      }

      if (consultation.procedures?.length) {
        addTableSection(
          "Procedures Performed",
          ["Description", "Amount", "Performed By", "Time"],
          consultation.procedures.map((p) => [
            p.description,
            `KES ${p.amount}`,
            p.performed_by_name || "—",
            p.performed_at ? formatDateTime(p.performed_at) : "—",
          ])
        );
      }

      if (consultation.lab_orders?.length) {
        addTableSection(
          "Lab Orders",
          ["Test", "Status", "Paid"],
          consultation.lab_orders.map((o) => [o.test_name, humanize(o.status), o.is_paid ? "Yes" : "No"])
        );
      }

      if (consultation.radiology_orders?.length) {
        addTableSection(
          "Radiology Orders",
          ["Test", "Status", "Paid"],
          consultation.radiology_orders.map((o) => [o.test_name, humanize(o.status), o.is_paid ? "Yes" : "No"])
        );
      }

      // ---- Doctor's Signature, Stamp & Date Section ----
      ensureSpace(110);
      y += 10;

      doc.setFontSize(10.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND_COLOR);
      doc.text("DOCTOR SIGNATURE & AUTHORIZATION", margin, y);
      doc.setDrawColor(...LIGHT_BORDER);
      doc.setLineWidth(0.6);
      doc.line(margin, y + 5, pageWidth - margin, y + 5);
      y += 22;

      const colWidth = (pageWidth - margin * 2 - 30) / 3;

      // Column 1: Attending Doctor Details & Signature Line
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MUTED_COLOR);
      doc.text("ATTENDING DOCTOR", margin, y);

      doc.setFontSize(9.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text(consultation.doctor_name || "Dr. —", margin, y + 16);

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...MUTED_COLOR);
      doc.text("Medical Practitioner", margin, y + 28);

      doc.setDrawColor(180, 185, 195);
      doc.setLineWidth(0.8);
      doc.line(margin, y + 58, margin + colWidth, y + 58);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MUTED_COLOR);
      doc.text("Doctor's Signature", margin, y + 70);

      // Column 2: Official Hospital Stamp Box
      const col2X = margin + colWidth + 15;
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MUTED_COLOR);
      doc.text("OFFICIAL STAMP", col2X, y);

      doc.setDrawColor(...LIGHT_BORDER);
      doc.setFillColor(...LIGHT_FILL);
      doc.roundedRect(col2X, y + 10, colWidth, 54, 4, 4, "FD");

      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(160, 160, 160);
      doc.text("[ Official Stamp Here ]", col2X + colWidth / 2, y + 40, { align: "center" });

      // Column 3: Date & Time Signed
      const col3X = col2X + colWidth + 15;
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MUTED_COLOR);
      doc.text("DATE & TIME SIGNED", col3X, y);

      const signDateStr = formatDate(consultation.completed_at || new Date().toISOString());
      doc.setFontSize(9.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(30, 30, 30);
      doc.text(signDateStr, col3X, y + 16);

      doc.setDrawColor(180, 185, 195);
      doc.setLineWidth(0.8);
      doc.line(col3X, y + 58, col3X + colWidth, y + 58);

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...MUTED_COLOR);
      doc.text("Date", col3X, y + 70);

      y += 85;

      // ---- Footer: rule + confidentiality line + pagination on every page ----
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setDrawColor(...LIGHT_BORDER);
        doc.setLineWidth(0.6);
        doc.line(margin, pageHeight - 34, pageWidth - margin, pageHeight - 34);
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...MUTED_COLOR);
        doc.text(`${HOSPITAL_NAME} — Confidential Medical Record`, margin, pageHeight - 20);
        doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: "right" });
      }

      const safeName = (consultation.patient_name || "patient").replace(/[^a-z0-9]+/gi, "_");
      const dateStr = new Date().toISOString().slice(0, 10);
      doc.save(`consultation_${safeName}_${dateStr}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!consultation) return null;

  const tabs = [
    { id: "clinical", label: "Clinical Notes", icon: "bi-file-text" },
    { id: "diagnoses", label: "Diagnoses", icon: "bi-clipboard-check" },
    { id: "prescriptions", label: "Prescriptions", icon: "bi-capsule" },
    { id: "procedures", label: "Procedures", icon: "bi-heart-pulse" },
    { id: "orders", label: "Orders", icon: "bi-list-ul" },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Doctor</div>
          <h1 className="page-title">{consultation.patient_name}</h1>
          <p className="page-subtitle">Consultation on {formatDate(consultation.started_at)}</p>
        </div>
        <div className="page-header__actions">
          <StatusBadge status={consultation.status} />
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleDownloadPdf}
            disabled={downloading}
            title="Download a formatted PDF of this consultation"
          >
            {downloading ? (
              <span className="spinner-border spinner-border-sm" />
            ) : (
              <>
                <i className="bi bi-file-earmark-pdf  me-1"></i>
                Download PDF
              </>
            )}
          </button>
          {!isEditing ? (
            <>
              <button type="button" className="btn btn-primary" onClick={() => setEditMode(true)}>
                <i className="bi bi-pencil  me-1"></i>
                Edit
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setShowConfirm(true)}
                disabled={deleting}
              >
                <i className="bi bi-trash  me-1"></i>
                Delete
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" onClick={handleCancelEdit} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="btn btn-success" onClick={handleSave} disabled={saving}>
                {saving ? (
                  <span className="spinner-border spinner-border-sm" />
                ) : (
                  <>
                    <i className="bi bi-save  me-1"></i>
                    Save Changes
                  </>
                )}
              </button>
            </>
          )}
          <Link to="/doctor/consultations" className="btn btn-secondary">
            <i className="bi bi-arrow-left  me-1"></i>
            Back to List
          </Link>
        </div>
      </div>

      <div className="grid-4-8">
        {/* Sidebar - 4 columns */}
        <div className="grid-4-8__sidebar">
          <div className="card">
            <div className="card-body text-center">
              <span className="avatar avatar-xl mb-3" style={{ fontSize: "2.5rem" }}>
                {initials(consultation.patient_name) || "?"}
              </span>
              <h5 className="mb-0">{consultation.patient_name}</h5>
              <p className="text-muted text-sm">@{consultation.visit || "No visit"}</p>
              <div className="flex justify-content-center gap-2" style={{ flexWrap: "wrap" }}>
                <StatusBadge status={consultation.status} />
              </div>
              <hr />
              <div className="text-start">
                <div className="info-item">
                  <div className="info-item__label">Doctor</div>
                  <div className="info-item__value">{consultation.doctor_name || "—"}</div>
                </div>
                <div className="info-item" style={{ marginTop: "var(--space-3)" }}>
                  <div className="info-item__label">Started</div>
                  <div className="info-item__value">{consultation.started_at ? formatDate(consultation.started_at) : "—"}</div>
                </div>
                <div className="info-item" style={{ marginTop: "var(--space-3)" }}>
                  <div className="info-item__label">Completed</div>
                  <div className="info-item__value">{consultation.completed_at ? formatDate(consultation.completed_at) : "—"}</div>
                </div>
                <div className="info-item" style={{ marginTop: "var(--space-3)" }}>
                  <div className="info-item__label">Visit Reference</div>
                  <div className="info-item__value">{consultation.visit || "—"}</div>
                </div>
                <div className="info-item" style={{ marginTop: "var(--space-3)" }}>
                  <div className="info-item__label">Diagnoses</div>
                  <div className="info-item__value">
                    <span className="badge badge-primary">{consultation.diagnoses?.length || 0}</span>
                  </div>
                </div>
                <div className="info-item" style={{ marginTop: "var(--space-3)" }}>
                  <div className="info-item__label">Prescriptions</div>
                  <div className="info-item__value">
                    <span className="badge badge-primary">{consultation.prescriptions?.length || 0}</span>
                  </div>
                </div>
                <div className="info-item" style={{ marginTop: "var(--space-3)" }}>
                  <div className="info-item__label">Procedures</div>
                  <div className="info-item__value">
                    <span className="badge badge-primary">{consultation.procedures?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content - 8 columns */}
        <div className="grid-4-8__main">
          {/* Tabs */}
          <div className="tabs" style={{ marginBottom: "var(--space-3)" }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tabs__item ${activeTab === tab.id ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`bi ${tab.icon}  me-1`}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Clinical Notes Tab */}
          {activeTab === "clinical" && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Clinical Notes</h5>
                {isEditing && (
                  <span className="badge badge-warning">
                    <span className="badge-dot"></span>
                    Editing Mode
                  </span>
                )}
              </div>
              <div className="card-body">
                {EDITABLE_FIELDS.map(([key, label, rows]) => (
                  <div className="field" key={key}>
                    <label className="field-label">{label}</label>
                    {isEditing ? (
                      <textarea
                        name={key}
                        className="textarea"
                        rows={rows}
                        value={form[key]}
                        onChange={handleChange}
                      />
                    ) : (
                      <p className="mb-0">
                        {consultation[key] || <span className="text-tertiary">— none recorded —</span>}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Diagnoses Tab */}
          {activeTab === "diagnoses" && (
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Diagnoses</h5>
                <span className="badge badge-primary">{consultation.diagnoses?.length || 0}</span>
              </div>
              <div className="card-body">
                {consultation.diagnoses?.length ? (
                  <div className="flex flex-wrap gap-2">
                    {consultation.diagnoses.map((d) => (
                      <div key={d.id} className={`diagnosis-chip ${d.is_primary ? "is-primary" : ""}`}>
                        <span className="diagnosis-chip__code">{d.code}</span>
                        <span>{d.description}</span>
                        {d.is_primary && <span className="badge badge-primary">Primary</span>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state__icon">
                      <i className="bi bi-clipboard-check"></i>
                    </div>
                    <h3 className="empty-state__title">No diagnoses recorded</h3>
                    <p className="empty-state__desc">Diagnoses will appear here once added.</p>
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
                <span className="badge badge-primary">{consultation.prescriptions?.length || 0}</span>
              </div>
              <div className="card-body p-0">
                {consultation.prescriptions?.length ? (
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Medicine</th>
                          <th>Dosage</th>
                          <th>Frequency</th>
                          <th>Duration</th>
                          <th>Qty</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {consultation.prescriptions.map((rx) => (
                          <tr key={rx.id}>
                            <td className="cell-primary">{rx.medicine_name}</td>
                            <td>{rx.dosage}</td>
                            <td>{rx.frequency || "—"}</td>
                            <td>{rx.duration || "—"}</td>
                            <td className="cell-numeric">{rx.quantity}</td>
                            <td>
                              <StatusBadge status={rx.is_dispensed ? "DISPENSED" : "PENDING"} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state__icon">
                      <i className="bi bi-capsule"></i>
                    </div>
                    <h3 className="empty-state__title">No prescriptions</h3>
                    <p className="empty-state__desc">Prescriptions will appear here once added.</p>
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
                <span className="badge badge-primary">{consultation.procedures?.length || 0}</span>
              </div>
              <div className="card-body p-0">
                {consultation.procedures?.length ? (
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
                        {consultation.procedures.map((p) => (
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
                ) : (
                  <div className="empty-state">
                    <div className="empty-state__icon">
                      <i className="bi bi-heart-pulse"></i>
                    </div>
                    <h3 className="empty-state__title">No procedures recorded</h3>
                    <p className="empty-state__desc">Procedures performed during this consultation will appear here.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Orders Tab */}
          {activeTab === "orders" && (
            <div className="grid-2">
              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">Lab Orders</h6>
                  <span className="badge badge-primary">{consultation.lab_orders?.length || 0}</span>
                </div>
                <div className="card-body p-0">
                  {consultation.lab_orders?.length ? (
                    <div className="table-scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Test</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {consultation.lab_orders.map((o) => (
                            <tr key={o.id}>
                              <td className="cell-primary">{o.test_name}</td>
                              <td>
                                <StatusBadge status={o.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: "var(--space-4)" }}>
                      <div className="empty-state__icon">
                        <i className="bi bi-list-ul"></i>
                      </div>
                      <h3 className="empty-state__title">No lab orders</h3>
                      <p className="empty-state__desc">Lab orders will appear here once added.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h6 className="mb-0">Radiology Orders</h6>
                  <span className="badge badge-primary">{consultation.radiology_orders?.length || 0}</span>
                </div>
                <div className="card-body p-0">
                  {consultation.radiology_orders?.length ? (
                    <div className="table-scroll">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Test</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {consultation.radiology_orders.map((o) => (
                            <tr key={o.id}>
                              <td className="cell-primary">{o.test_name}</td>
                              <td>
                                <StatusBadge status={o.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="empty-state" style={{ padding: "var(--space-4)" }}>
                      <div className="empty-state__icon">
                        <i className="bi bi-list-ul"></i>
                      </div>
                      <h3 className="empty-state__title">No radiology orders</h3>
                      <p className="empty-state__desc">Radiology orders will appear here once added.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        show={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={confirmDelete}
        title="Delete Consultation"
        message={`Are you sure you want to delete the consultation record for ${consultation.patient_name}? This action cannot be undone.`}
        variant="danger"
      />
    </>
  );
}