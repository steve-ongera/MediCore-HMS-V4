//src/pages/doctor/ConsultationDetail.jsx
import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getConsultation, saveConsultation, deleteConsultation } from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import StatusBadge from "../../components/StatusBadge";
import ConfirmDialog from "../../components/ConfirmDialog";
import { formatDate } from "../../utils/formatters";

const HOSPITAL_NAME = "City General Hospital";
const HOSPITAL_ADDRESS = "P.O. Box 00100, Nairobi, Kenya  ·  Tel: +254 700 000 000";
const BRAND_COLOR = [30, 64, 175];

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

  const handleDownloadPdf = () => {
    if (!consultation) return;
    setDownloading(true);
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 40;
      let y = margin;

      const ensureSpace = (needed) => {
        if (y + needed > pageHeight - 50) {
          doc.addPage();
          y = margin;
        }
      };

      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...BRAND_COLOR);
      doc.text(HOSPITAL_NAME, margin, y);
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(HOSPITAL_ADDRESS, margin, y + 14);
      doc.setDrawColor(...BRAND_COLOR);
      doc.setLineWidth(1.2);
      doc.line(margin, y + 24, pageWidth - margin, y + 24);
      y += 48;

      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Consultation Report", margin, y);
      doc.setFontSize(8.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text(`Generated ${new Date().toLocaleString()}`, pageWidth - margin, y, { align: "right" });
      doc.setTextColor(0, 0, 0);
      y += 20;

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        theme: "plain",
        styles: { fontSize: 9.5, cellPadding: 3 },
        body: [
          ["Patient", consultation.patient_name || "—", "Status", humanize(consultation.status)],
          ["Attending Doctor", consultation.doctor_name || "—", "Started", consultation.started_at ? formatDate(consultation.started_at) : "—"],
          ["Visit Reference", consultation.visit || "—", "Completed", consultation.completed_at ? formatDate(consultation.completed_at) : "—"],
        ],
        columnStyles: {
          0: { fontStyle: "bold", cellWidth: 110, textColor: [90, 90, 90] },
          1: { cellWidth: 155 },
          2: { fontStyle: "bold", cellWidth: 110, textColor: [90, 90, 90] },
          3: { cellWidth: 110 },
        },
      });
      y = doc.lastAutoTable.finalY + 16;

      const addSection = (title, content) => {
        ensureSpace(30);
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND_COLOR);
        doc.text(title, margin, y);
        doc.setTextColor(0, 0, 0);
        y += 13;
        doc.setFontSize(9.5);
        doc.setFont("helvetica", "normal");
        const text = content && content.trim() ? content : "None recorded";
        const lines = doc.splitTextToSize(text, pageWidth - margin * 2);
        ensureSpace(lines.length * 12 + 10);
        doc.text(lines, margin, y);
        y += lines.length * 12 + 14;
      };

      addSection("Chief Complaint", consultation.chief_complaint);
      addSection("History of Present Illness", consultation.history_of_present_illness);
      addSection("Physical Examination", consultation.physical_examination);
      addSection("Treatment Plan", consultation.treatment_plan);
      addSection("Clinical Notes", consultation.clinical_notes);

      if (consultation.diagnoses?.length) {
        ensureSpace(40);
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND_COLOR);
        doc.text("Diagnoses", margin, y);
        doc.setTextColor(0, 0, 0);
        y += 8;
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Code", "Description", "Primary"]],
          body: consultation.diagnoses.map((d) => [d.code, d.description, d.is_primary ? "Yes" : ""]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: BRAND_COLOR, textColor: 255 },
        });
        y = doc.lastAutoTable.finalY + 18;
      }

      if (consultation.prescriptions?.length) {
        ensureSpace(40);
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND_COLOR);
        doc.text("Prescriptions", margin, y);
        doc.setTextColor(0, 0, 0);
        y += 8;
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Medicine", "Dosage", "Frequency", "Duration", "Qty", "Instructions", "Dispensed"]],
          body: consultation.prescriptions.map((rx) => [
            rx.medicine_name,
            rx.dosage,
            rx.frequency || "—",
            rx.duration || "—",
            rx.quantity,
            rx.instructions || "—",
            rx.is_dispensed ? "Yes" : "No",
          ]),
          styles: { fontSize: 8.5 },
          headStyles: { fillColor: BRAND_COLOR, textColor: 255 },
        });
        y = doc.lastAutoTable.finalY + 18;
      }

      if (consultation.lab_orders?.length) {
        ensureSpace(40);
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND_COLOR);
        doc.text("Lab Orders", margin, y);
        doc.setTextColor(0, 0, 0);
        y += 8;
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Test", "Status", "Paid"]],
          body: consultation.lab_orders.map((o) => [o.test_name, humanize(o.status), o.is_paid ? "Yes" : "No"]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: BRAND_COLOR, textColor: 255 },
        });
        y = doc.lastAutoTable.finalY + 18;
      }

      if (consultation.radiology_orders?.length) {
        ensureSpace(40);
        doc.setFontSize(10.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...BRAND_COLOR);
        doc.text("Radiology Orders", margin, y);
        doc.setTextColor(0, 0, 0);
        y += 8;
        autoTable(doc, {
          startY: y,
          margin: { left: margin, right: margin },
          head: [["Test", "Status", "Paid"]],
          body: consultation.radiology_orders.map((o) => [o.test_name, humanize(o.status), o.is_paid ? "Yes" : "No"]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: BRAND_COLOR, textColor: 255 },
        });
        y = doc.lastAutoTable.finalY + 18;
      }

      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `${HOSPITAL_NAME} — Confidential Medical Record — Page ${i} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 20,
          { align: "center" }
        );
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
                <i className="bi bi-file-earmark-pdf me-2"></i>
                Download PDF
              </>
            )}
          </button>
          {!isEditing ? (
            <>
              <button type="button" className="btn btn-primary" onClick={() => setEditMode(true)}>
                <i className="bi bi-pencil me-2"></i>
                Edit
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={() => setShowConfirm(true)}
                disabled={deleting}
              >
                <i className="bi bi-trash me-2"></i>
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
                    <i className="bi bi-save me-2"></i>
                    Save Changes
                  </>
                )}
              </button>
            </>
          )}
          <Link to="/doctor/consultations" className="btn btn-secondary">
            <i className="bi bi-arrow-left me-2"></i>
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
                {consultation.patient_name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?"}
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
                <i className={`bi ${tab.icon} me-2`}></i>
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