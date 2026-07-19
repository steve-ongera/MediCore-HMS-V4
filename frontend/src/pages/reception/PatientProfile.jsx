import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { toast } from "react-toastify";
import {
  getPatientSummary,
  createAllergy,
  deleteAllergy,
  createMedicalHistoryNote,
  deleteMedicalHistoryNote,
} from "../../services/api";
import DataTable from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import ConfirmDialog from "../../components/ConfirmDialog";
import LoadingSpinner from "../../components/LoadingSpinner";
import { formatDate, formatDateTime } from "../../utils/formatters";

const SEVERITY_VARIANT = { MILD: "neutral", MODERATE: "warning", SEVERE: "danger" };

const EMPTY_ALLERGY = { substance: "", reaction: "", severity: "MILD" };
const EMPTY_HISTORY = { condition: "", notes: "", diagnosed_date: "" };

export default function PatientProfile() {
  const { id } = useParams();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const [showAllergyForm, setShowAllergyForm] = useState(false);
  const [allergyForm, setAllergyForm] = useState(EMPTY_ALLERGY);
  const [savingAllergy, setSavingAllergy] = useState(false);

  const [showHistoryForm, setShowHistoryForm] = useState(false);
  const [historyForm, setHistoryForm] = useState(EMPTY_HISTORY);
  const [savingHistory, setSavingHistory] = useState(false);

  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPatientSummary(id);
      setSummary(data);
    } catch (err) {
      toast.error(err.message || "Failed to load patient profile");
    } finally {
      setLoading(false);
    }
  };

  const handleAddAllergy = async (e) => {
    e.preventDefault();
    setSavingAllergy(true);
    try {
      await createAllergy({ ...allergyForm, patient: id });
      toast.success("Allergy added");
      setShowAllergyForm(false);
      setAllergyForm(EMPTY_ALLERGY);
      load();
    } catch (err) {
      toast.error(err.message || "Failed to add allergy");
    } finally {
      setSavingAllergy(false);
    }
  };

  const handleAddHistory = async (e) => {
    e.preventDefault();
    setSavingHistory(true);
    try {
      await createMedicalHistoryNote({ ...historyForm, patient: id });
      toast.success("Medical history note added");
      setShowHistoryForm(false);
      setHistoryForm(EMPTY_HISTORY);
      load();
    } catch (err) {
      toast.error(err.message || "Failed to add note");
    } finally {
      setSavingHistory(false);
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      if (pendingDelete.type === "allergy") {
        await deleteAllergy(pendingDelete.id);
        toast.success("Allergy removed");
      } else {
        await deleteMedicalHistoryNote(pendingDelete.id);
        toast.success("Note removed");
      }
      load();
    } catch (err) {
      toast.error(err.message || "Failed to remove");
    } finally {
      setPendingDelete(null);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!summary) return null;

  const { patient, previous_visits, allergies, medical_history, current_medications } = summary;

  const visitColumns = [
    { key: "visit_number", label: "Visit #", render: (row) => <span className="cell-mono">{row.visit_number}</span> },
    { key: "department_name", label: "Department", render: (row) => row.department_name },
    { key: "doctor_name", label: "Doctor", render: (row) => row.doctor_name || "—" },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} variant="neutral" /> },
    { key: "visit_date", label: "Date", render: (row) => formatDateTime(row.visit_date) },
  ];

  const medicationColumns = [
    { key: "medicine_name", label: "Medicine", render: (row) => row.medicine_name },
    { key: "dosage", label: "Dosage", render: (row) => row.dosage },
    { key: "frequency", label: "Frequency", render: (row) => row.frequency },
    { key: "duration", label: "Duration", render: (row) => row.duration },
    {
      key: "is_dispensed",
      label: "Status",
      render: (row) => (
        <StatusBadge status={row.is_dispensed ? "Dispensed" : "Pending"} variant={row.is_dispensed ? "success" : "warning"} />
      ),
    },
  ];

  const tabs = [
    { id: "overview", label: "Overview", icon: "bi-person" },
    { id: "allergies", label: "Allergies", icon: "bi-exclamation-triangle" },
    { id: "history", label: "Medical History", icon: "bi-file-text" },
    { id: "medications", label: "Medications", icon: "bi-capsule" },
    { id: "visits", label: "Visits", icon: "bi-clock-history" },
  ];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Patient Profile</div>
          <h1 className="page-title">{patient.full_name}</h1>
          <p className="page-subtitle">
            {patient.hospital_number} &middot; {patient.gender || "—"} &middot; {patient.age ?? "—"} yrs
          </p>
        </div>
        <div className="page-header__actions">
          <Link to={`/patients/${id}/visits`} className="btn btn-outline">
            <i className="bi bi-clock-history me-2"></i>
            Visit History
          </Link>
          <Link to={`/patients/${id}/edit`} className="btn btn-primary">
            <i className="bi bi-pencil me-2"></i>
            Edit Patient
          </Link>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-person fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{patient.full_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {patient.hospital_number}
                </span>
                <span>•</span>
                <span>{patient.gender || "—"}</span>
                <span>•</span>
                <span>{patient.age ?? "—"} yrs</span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-calendar me-1"></i> DOB: {patient.dob ? formatDate(patient.dob) : "—"}
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Phone</div>
              <div className="info-item__value">{patient.phone || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">National ID</div>
              <div className="info-item__value">{patient.national_id || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Address</div>
              <div className="info-item__value">{patient.address || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Next of Kin</div>
              <div className="info-item__value">
                {patient.next_of_kin_name || "—"} 
                {patient.next_of_kin_phone && <div className="text-2xs text-tertiary">{patient.next_of_kin_phone}</div>}
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Guardian</div>
              <div className="info-item__value">
                {patient.guardian_name || "—"} 
                {patient.guardian_phone && <div className="text-2xs text-tertiary">{patient.guardian_phone}</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header" style={{ padding: 0 }}>
          <div className="tabs" style={{ padding: "0 var(--space-4)" }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`tabs__item ${activeTab === tab.id ? "is-active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <i className={`bi ${tab.icon} me-1`}></i> {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="tab-content">
              <div className="info-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span className="stat-card__label">Allergies</span>
                    <div className="stat-card__icon tone-warning">
                      <i className="bi bi-exclamation-triangle"></i>
                    </div>
                  </div>
                  <div className="stat-card__value">{allergies.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span className="stat-card__label">Medical History</span>
                    <div className="stat-card__icon tone-info">
                      <i className="bi bi-file-text"></i>
                    </div>
                  </div>
                  <div className="stat-card__value">{medical_history.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span className="stat-card__label">Active Medications</span>
                    <div className="stat-card__icon tone-success">
                      <i className="bi bi-capsule"></i>
                    </div>
                  </div>
                  <div className="stat-card__value">{current_medications.length}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span className="stat-card__label">Total Visits</span>
                    <div className="stat-card__icon tone-primary">
                      <i className="bi bi-clock-history"></i>
                    </div>
                  </div>
                  <div className="stat-card__value">{previous_visits.length}</div>
                </div>
              </div>
            </div>
          )}

          {/* Allergies Tab */}
          {activeTab === "allergies" && (
            <div className="tab-content">
              <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: "var(--space-3)" }}>
                <h5 className="card-title" style={{ marginBottom: 0 }}>Allergies</h5>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAllergyForm((v) => !v)}>
                  <i className="bi bi-plus-lg me-1"></i> Add Allergy
                </button>
              </div>

              {showAllergyForm && (
                <form onSubmit={handleAddAllergy} style={{ marginBottom: "var(--space-3)" }}>
                  <div className="field-row">
                    <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                      <input
                        className="input"
                        placeholder="Substance"
                        value={allergyForm.substance}
                        onChange={(e) => setAllergyForm({ ...allergyForm, substance: e.target.value })}
                        required
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                      <input
                        className="input"
                        placeholder="Reaction"
                        value={allergyForm.reaction}
                        onChange={(e) => setAllergyForm({ ...allergyForm, reaction: e.target.value })}
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 0, flex: 0.7 }}>
                      <select
                        className="select"
                        value={allergyForm.severity}
                        onChange={(e) => setAllergyForm({ ...allergyForm, severity: e.target.value })}
                      >
                        <option value="MILD">Mild</option>
                        <option value="MODERATE">Moderate</option>
                        <option value="SEVERE">Severe</option>
                      </select>
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <button className="btn btn-primary" type="submit" disabled={savingAllergy}>
                        {savingAllergy ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {allergies.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-exclamation-triangle"></i>
                  </div>
                  <h3 className="empty-state__title">No known allergies</h3>
                  <p className="empty-state__desc">This patient has no recorded allergies.</p>
                </div>
              ) : (
                <ul className="detail-list">
                  {allergies.map((a) => (
                    <li key={a.id}>
                      <div>
                        <span className="cell-primary">{a.substance}</span>{" "}
                        <StatusBadge status={a.severity} variant={SEVERITY_VARIANT[a.severity] || "neutral"} />
                        {a.reaction && <div className="text-2xs text-tertiary">{a.reaction}</div>}
                      </div>
                      <button
                        className="btn-icon-only"
                        style={{ color: "var(--danger-strong)" }}
                        onClick={() => setPendingDelete({ type: "allergy", id: a.id })}
                        title="Remove allergy"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Medical History Tab */}
          {activeTab === "history" && (
            <div className="tab-content">
              <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: "var(--space-3)" }}>
                <h5 className="card-title" style={{ marginBottom: 0 }}>Medical History</h5>
                <button className="btn btn-primary btn-sm" onClick={() => setShowHistoryForm((v) => !v)}>
                  <i className="bi bi-plus-lg me-1"></i> Add Note
                </button>
              </div>

              {showHistoryForm && (
                <form onSubmit={handleAddHistory} style={{ marginBottom: "var(--space-3)" }}>
                  <div className="field-row">
                    <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                      <input
                        className="input"
                        placeholder="Condition"
                        value={historyForm.condition}
                        onChange={(e) => setHistoryForm({ ...historyForm, condition: e.target.value })}
                        required
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 0, flex: 0.7 }}>
                      <input
                        type="date"
                        className="input"
                        value={historyForm.diagnosed_date}
                        onChange={(e) => setHistoryForm({ ...historyForm, diagnosed_date: e.target.value })}
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                      <input
                        className="input"
                        placeholder="Notes"
                        value={historyForm.notes}
                        onChange={(e) => setHistoryForm({ ...historyForm, notes: e.target.value })}
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 0 }}>
                      <button className="btn btn-primary" type="submit" disabled={savingHistory}>
                        {savingHistory ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                </form>
              )}

              {medical_history.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-file-text"></i>
                  </div>
                  <h3 className="empty-state__title">No medical history</h3>
                  <p className="empty-state__desc">No medical history notes have been recorded.</p>
                </div>
              ) : (
                <ul className="detail-list">
                  {medical_history.map((h) => (
                    <li key={h.id}>
                      <div>
                        <span className="cell-primary">{h.condition}</span>
                        {h.diagnosed_date && <span className="text-2xs text-tertiary"> &middot; diagnosed {formatDate(h.diagnosed_date)}</span>}
                        {h.notes && <div className="text-2xs text-tertiary">{h.notes}</div>}
                      </div>
                      <button
                        className="btn-icon-only"
                        style={{ color: "var(--danger-strong)" }}
                        onClick={() => setPendingDelete({ type: "history", id: h.id })}
                        title="Remove note"
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Medications Tab */}
          {activeTab === "medications" && (
            <div className="tab-content">
              <h5 className="card-title" style={{ marginBottom: "var(--space-2)" }}>Current Medications</h5>
              <DataTable
                columns={medicationColumns}
                data={current_medications}
                loading={false}
                emptyMessage="No active prescriptions."
              />
            </div>
          )}

          {/* Visits Tab */}
          {activeTab === "visits" && (
            <div className="tab-content">
              <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: "var(--space-2)" }}>
                <h5 className="card-title" style={{ marginBottom: 0 }}>Recent Visits</h5>
                <Link to={`/patients/${id}/visits`} className="btn btn-secondary btn-sm">
                  <i className="bi bi-arrow-right me-1"></i> View All
                </Link>
              </div>
              <DataTable
                columns={visitColumns}
                data={previous_visits}
                loading={false}
                emptyMessage="No previous visits."
              />
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        show={!!pendingDelete}
        onClose={() => setPendingDelete(null)}
        onConfirm={confirmDelete}
        title={pendingDelete?.type === "allergy" ? "Remove Allergy" : "Remove Medical History Note"}
        message="Are you sure you want to remove this record? This action cannot be undone."
        variant="danger"
      />
    </>
  );
}