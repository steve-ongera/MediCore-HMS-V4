import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getEmergencyVisit, getEmergencyBilling, saveTriageVitals, createEmergencyNote,
  getEmergencyProcedureCatalog, orderEmergencyProcedure, completeEmergencyProcedure,
  getMedicines, createEmergencyMedicationOrder, recordEmergencyMedicationAdministration,
  dischargeHome, transferToAdmission, emergencyLama, emergencyDeceased,
  getAvailableBeds, getWards, getUsers, addEmergencyCharge,
} from "../../services/api";

const TRIAGE_META = {
  1: { label: "Resuscitation", badge: "badge-danger" },
  2: { label: "Emergent", badge: "badge-warning" },
  3: { label: "Urgent", badge: "badge-primary" },
  4: { label: "Less Urgent", badge: "badge-info" },
  5: { label: "Non-Urgent", badge: "badge-neutral" },
};

export default function EmergencyVisitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [ed, setEd] = useState(null);
  const [billing, setBilling] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [vitals, setVitals] = useState({
    weight_kg: "", temperature_c: "", pulse_bpm: "", respiratory_rate: "",
    bp_systolic: "", bp_diastolic: "", oxygen_saturation: "", gcs_score: "", pain_score: "",
  });
  const [noteText, setNoteText] = useState("");

  const [procedureCatalog, setProcedureCatalog] = useState([]);
  const [selectedProcedure, setSelectedProcedure] = useState("");
  const [procedureNotes, setProcedureNotes] = useState("");

  const [medicines, setMedicines] = useState([]);
  const [medOrder, setMedOrder] = useState({ medicine: "", dosage: "", route: "IV", quantity: 1 });

  const [chargeForm, setChargeForm] = useState({ description: "", amount: "" });

  const [dispositionNotes, setDispositionNotes] = useState("");

  const [wards, setWards] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [transferWard, setTransferWard] = useState("");
  const [transferBeds, setTransferBeds] = useState([]);
  const [transferForm, setTransferForm] = useState({ bed: "", admitting_doctor: "", admission_diagnosis: "" });

  useEffect(() => {
    load();
    loadBilling();
    loadProcedureCatalog();
    loadMedicines();
    loadWards();
    loadDoctors();
  }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getEmergencyVisit(id);
      setEd(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBilling = async () => {
    try {
      const data = await getEmergencyBilling(id);
      setBilling(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadProcedureCatalog = async () => {
    try {
      const data = await getEmergencyProcedureCatalog();
      setProcedureCatalog(data.results ?? data);
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

  const loadWards = async () => {
    try {
      const data = await getWards();
      setWards(data.results ?? data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadDoctors = async () => {
    try {
      const data = await getUsers({ role: "DOCTOR" });
      setDoctors(data.results ?? data);
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

  const handleVitalsChange = (f) => (e) => setVitals((p) => ({ ...p, [f]: e.target.value }));
  const submitVitals = async (e) => {
    e.preventDefault();
    try {
      await saveTriageVitals({ emergency_visit: id, ...vitals });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitNote = async (e) => {
    e.preventDefault();
    try {
      await createEmergencyNote({ emergency_visit: id, note: noteText });
      setNoteText("");
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitProcedure = async (e) => {
    e.preventDefault();
    try {
      await orderEmergencyProcedure(id, { procedure: selectedProcedure, notes: procedureNotes });
      setSelectedProcedure("");
      setProcedureNotes("");
      load();
      loadBilling();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCompleteProcedure = async (procId) => {
    try {
      await completeEmergencyProcedure(procId);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMedOrderChange = (f) => (e) => setMedOrder((p) => ({ ...p, [f]: e.target.value }));
  const submitMedOrder = async (e) => {
    e.preventDefault();
    try {
      await createEmergencyMedicationOrder({ emergency_visit: id, ...medOrder, quantity: Number(medOrder.quantity) || 1 });
      setMedOrder({ medicine: "", dosage: "", route: "IV", quantity: 1 });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAdministerMed = async (orderId) => {
    try {
      await recordEmergencyMedicationAdministration({ medication_order: orderId, status: "GIVEN" });
      load();
      loadBilling();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleChargeChange = (f) => (e) => setChargeForm((p) => ({ ...p, [f]: e.target.value }));
  const submitCharge = async (e) => {
    e.preventDefault();
    try {
      await addEmergencyCharge(id, { description: chargeForm.description, amount: parseFloat(chargeForm.amount) });
      setChargeForm({ description: "", amount: "" });
      loadBilling();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDischargeHome = async (e) => {
    e.preventDefault();
    try {
      await dischargeHome(id, { disposition_notes: dispositionNotes });
      load();
      loadBilling();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLama = async (e) => {
    e.preventDefault();
    try {
      await emergencyLama(id, { disposition_notes: dispositionNotes });
      load();
      loadBilling();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeceased = async (e) => {
    e.preventDefault();
    try {
      await emergencyDeceased(id, { disposition_notes: dispositionNotes });
      load();
      loadBilling();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTransferWardChange = (e) => {
    setTransferWard(e.target.value);
    setTransferForm((p) => ({ ...p, bed: "" }));
    if (e.target.value) loadTransferBeds(e.target.value);
  };

  const handleTransferFormChange = (f) => (e) => setTransferForm((p) => ({ ...p, [f]: e.target.value }));

  const submitTransfer = async (e) => {
    e.preventDefault();
    try {
      const admission = await transferToAdmission(id, {
        bed: transferForm.bed,
        admitting_doctor: transferForm.admitting_doctor,
        admission_diagnosis: transferForm.admission_diagnosis,
        disposition_notes: dispositionNotes,
      });
      navigate(`/inpatient/admissions/${admission.admission ? admission.admission : ""}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const goToBillingPayment = () => {
    const unpaidInvoice = billing?.invoices?.find((inv) => Number(inv.balance) > 0);
    if (unpaidInvoice) navigate(`/billing/payments?invoice=${unpaidInvoice.id}`);
    else navigate("/billing/payments");
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading emergency visit...</span>
      </div>
    );
  }

  if (!ed) return null;

  const isActive = ed.status === "IN_ED";

  const getStatusBadge = (status) => {
    const statusMap = {
      "IN_ED": "badge-primary",
      "ADMITTED": "badge-info",
      "DISCHARGED": "badge-success",
      "TRANSFERRED_OUT": "badge-info",
      "LAMA": "badge-warning",
      "DECEASED": "badge-danger",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getStatusLabel = (status) => {
    const labelMap = {
      "IN_ED": "In ED",
      "ADMITTED": "Admitted",
      "DISCHARGED": "Discharged",
      "TRANSFERRED_OUT": "Transferred Out",
      "LAMA": "Left Against Medical Advice",
      "DECEASED": "Deceased",
    };
    return labelMap[status] || status;
  };

  const triage = TRIAGE_META[ed.triage_level] || { label: "—", badge: "badge-neutral" };
  const durationHours = Number(ed.duration_hours) || 0;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Emergency Department</div>
          <h1 className="page-title">{ed.visit_number}</h1>
          <p className="page-subtitle">
            {ed.patient_name} • {ed.hospital_number}
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/emergency")}>
            <i className="bi bi-arrow-left me-2"></i> Back to ED Board
          </button>
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-2"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-heart-pulse fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{ed.patient_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {ed.hospital_number}
                </span>
                <span>•</span>
                <span>Bay: {ed.bay_number || "—"}</span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(ed.status)}`}>
                  <span className="badge-dot"></span>
                  {getStatusLabel(ed.status)}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-clock me-1"></i> {durationHours.toFixed(1)} hrs
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Triage Level</div>
              <div className="info-item__value">
                <span className={`badge ${triage.badge}`}>
                  <span className="badge-dot"></span>
                  {triage.label}
                </span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Arrival Mode</div>
              <div className="info-item__value">
                <span className="tag">{ed.arrival_mode}</span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Arrived At</div>
              <div className="info-item__value">{new Date(ed.arrived_at).toLocaleString()}</div>
            </div>
            {ed.disposition_notes && (
              <div className="info-item" style={{ gridColumn: "span 2" }}>
                <div className="info-item__label">Disposition Notes</div>
                <div className="info-item__value">{ed.disposition_notes}</div>
              </div>
            )}
          </div>

          {ed.chief_complaint && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <div className="text-sm text-muted">Chief Complaint</div>
              <div className="diagnosis-chip">
                <span className="diagnosis-chip__code">CC</span>
                {ed.chief_complaint}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Billing Section */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-currency-dollar me-2"></i> Billing
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
                        <td className="cell-numeric">KES {inv.amount}</td>
                        <td className="cell-numeric">KES {inv.balance}</td>
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
                  <i className="bi bi-credit-card me-2"></i> Go to Billing / Take Payment
                </button>
              </div>

              {isActive && (
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
                          onChange={handleChargeChange("description")}
                          required
                        />
                      </div>
                      <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                        <input
                          type="number"
                          className="input"
                          placeholder="Amount"
                          value={chargeForm.amount}
                          onChange={handleChargeChange("amount")}
                          required
                        />
                      </div>
                      <div className="field" style={{ marginBottom: 0 }}>
                        <button type="submit" className="btn btn-primary">
                          <i className="bi bi-plus-circle me-2"></i> Add Charge
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

      {/* Vitals Section */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-heart-pulse me-2"></i> Triage Vitals
          </h5>
        </div>
        <div className="card-body">
          {isActive && (
            <form onSubmit={submitVitals} style={{ marginBottom: "var(--space-4)" }}>
              <div className="vitals-grid">
                <div className="field">
                  <label className="field-label">Weight (kg)</label>
                  <input type="number" className="input" placeholder="Weight" value={vitals.weight_kg} onChange={handleVitalsChange("weight_kg")} />
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
                  <label className="field-label">Resp. Rate</label>
                  <input type="number" className="input" placeholder="Resp rate" value={vitals.respiratory_rate} onChange={handleVitalsChange("respiratory_rate")} />
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
                <div className="field">
                  <label className="field-label">GCS Score</label>
                  <input type="number" className="input" placeholder="GCS" value={vitals.gcs_score} onChange={handleVitalsChange("gcs_score")} />
                </div>
                <div className="field">
                  <label className="field-label">Pain Score (0-10)</label>
                  <input type="number" className="input" placeholder="Pain" value={vitals.pain_score} onChange={handleVitalsChange("pain_score")} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-floppy me-2"></i> Save Vitals
              </button>
            </form>
          )}
          {(ed.vitals || []).length === 0 ? (
            <div className="text-sm text-muted text-center" style={{ padding: "var(--space-4)" }}>
              No vitals recorded
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date/Time</th>
                    <th className="cell-numeric">BP</th>
                    <th className="cell-numeric">Temp</th>
                    <th className="cell-numeric">Pulse</th>
                    <th className="cell-numeric">SpO2</th>
                    <th className="cell-numeric">GCS</th>
                    <th className="cell-numeric">Pain</th>
                  </tr>
                </thead>
                <tbody>
                  {(ed.vitals || []).map((v) => (
                    <tr key={v.id}>
                      <td>{new Date(v.recorded_at).toLocaleString()}</td>
                      <td className="cell-numeric">{v.bp_systolic}/{v.bp_diastolic}</td>
                      <td className="cell-numeric">{v.temperature_c}°C</td>
                      <td className="cell-numeric">{v.pulse_bpm}</td>
                      <td className="cell-numeric">{v.oxygen_saturation}%</td>
                      <td className="cell-numeric">{v.gcs_score}</td>
                      <td className="cell-numeric">{v.pain_score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Notes Section */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-file-text me-2"></i> Notes
          </h5>
        </div>
        <div className="card-body">
          {isActive && (
            <form onSubmit={submitNote} style={{ marginBottom: "var(--space-4)" }}>
              <div className="field">
                <textarea
                  className="textarea"
                  placeholder="Enter note..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-plus-circle me-2"></i> Add Note
              </button>
            </form>
          )}
          {(ed.notes || []).length === 0 ? (
            <div className="text-sm text-muted text-center" style={{ padding: "var(--space-4)" }}>
              No notes recorded
            </div>
          ) : (
            <div className="timeline">
              {(ed.notes || []).map((n) => (
                <div key={n.id} className="timeline-item">
                  <div className="timeline-item__title">{n.note}</div>
                  <div className="timeline-item__time">
                    {n.author_name} • {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Procedures Section */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-scissors me-2"></i> Procedures
          </h5>
        </div>
        <div className="card-body">
          {isActive && (
            <form onSubmit={submitProcedure} style={{ marginBottom: "var(--space-4)" }}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <select className="select" value={selectedProcedure} onChange={(e) => setSelectedProcedure(e.target.value)} required>
                    <option value="">Select procedure</option>
                    {procedureCatalog.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} (KES {p.price})</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Notes"
                    value={procedureNotes}
                    onChange={(e) => setProcedureNotes(e.target.value)}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-plus-circle me-2"></i> Order
                  </button>
                </div>
              </div>
            </form>
          )}
          {(ed.procedures || []).length === 0 ? (
            <div className="text-sm text-muted text-center" style={{ padding: "var(--space-4)" }}>
              No procedures ordered
            </div>
          ) : (
            <div className="rx-list">
              {(ed.procedures || []).map((p) => (
                <div key={p.id} className="rx-item">
                  <div>
                    <div className="rx-item__name">{p.procedure_name}</div>
                    <div className="rx-item__detail">{p.notes || "—"}</div>
                  </div>
                  <div className="flex gap-2 align-items-center">
                    <span className={`badge ${p.status === "ORDERED" ? "badge-warning" : p.status === "IN_PROGRESS" ? "badge-info" : "badge-success"}`}>
                      <span className="badge-dot"></span>
                      {p.status}
                    </span>
                    {isActive && p.status === "ORDERED" && (
                      <button className="btn btn-success btn-sm" onClick={() => handleCompleteProcedure(p.id)}>
                        <i className="bi bi-check me-1"></i> Complete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Medications Section */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-capsule me-2"></i> Medications
          </h5>
        </div>
        <div className="card-body">
          {isActive && (
            <form onSubmit={submitMedOrder} style={{ marginBottom: "var(--space-4)" }}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                  <select className="select" value={medOrder.medicine} onChange={handleMedOrderChange("medicine")} required>
                    <option value="">Select medicine</option>
                    {medicines.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Dosage"
                    value={medOrder.dosage}
                    onChange={handleMedOrderChange("dosage")}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <select className="select" value={medOrder.route} onChange={handleMedOrderChange("route")}>
                    <option value="IV">IV</option>
                    <option value="IM">IM</option>
                    <option value="SC">SC</option>
                    <option value="ORAL">Oral</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    placeholder="Qty"
                    value={medOrder.quantity}
                    onChange={handleMedOrderChange("quantity")}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-plus-circle me-2"></i> Order
                  </button>
                </div>
              </div>
            </form>
          )}
          {(ed.medication_orders || []).length === 0 ? (
            <div className="text-sm text-muted text-center" style={{ padding: "var(--space-4)" }}>
              No medication orders
            </div>
          ) : (
            <div className="rx-list">
              {(ed.medication_orders || []).map((m) => (
                <div key={m.id} className="rx-item">
                  <div>
                    <div className="rx-item__name">{m.medicine_name}</div>
                    <div className="rx-item__detail">
                      {m.dosage} • {m.route} • Qty: {m.quantity}
                    </div>
                  </div>
                  <div className="flex gap-2 align-items-center">
                    <span className={`badge ${m.is_active ? "badge-success" : "badge-neutral"}`}>
                      <span className="badge-dot"></span>
                      {m.is_active ? "Active" : "Complete"}
                    </span>
                    {isActive && m.is_active && (
                      <button className="btn btn-success btn-sm" onClick={() => handleAdministerMed(m.id)}>
                        <i className="bi bi-check me-1"></i> Give
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Disposition Section */}
      {isActive && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-door-open me-2"></i> Disposition
            </h5>
          </div>
          <div className="card-body">
            <div className="field" style={{ marginBottom: "var(--space-4)" }}>
              <label className="field-label">Disposition Notes</label>
              <textarea
                className="textarea"
                placeholder="Enter disposition notes..."
                value={dispositionNotes}
                onChange={(e) => setDispositionNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-3 flex-wrap" style={{ marginBottom: "var(--space-4)" }}>
              <button className="btn btn-success" onClick={handleDischargeHome}>
                <i className="bi bi-house me-2"></i> Discharge Home
              </button>
              <button className="btn btn-warning" onClick={handleLama}>
                <i className="bi bi-exclamation-triangle me-2"></i> Left Against Medical Advice
              </button>
              <button className="btn btn-danger" onClick={handleDeceased}>
                <i className="bi bi-heart me-2"></i> Deceased
              </button>
            </div>

            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)" }}>
              Transfer to Admission
            </h6>
            <form onSubmit={submitTransfer}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0 }}>
                  <select className="select" value={transferWard} onChange={handleTransferWardChange} required>
                    <option value="">Select ward</option>
                    {wards.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <select className="select" value={transferForm.bed} onChange={handleTransferFormChange("bed")} required>
                    <option value="">Select bed</option>
                    {transferBeds.map((b) => (
                      <option key={b.id} value={b.id}>{b.bed_number}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <select className="select" value={transferForm.admitting_doctor} onChange={handleTransferFormChange("admitting_doctor")} required>
                    <option value="">Select admitting doctor</option>
                    {doctors.map((d) => (
                      <option key={d.id} value={d.id}>{d.full_name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field" style={{ marginBottom: "var(--space-3)" }}>
                <textarea
                  className="textarea"
                  placeholder="Admission diagnosis"
                  value={transferForm.admission_diagnosis}
                  onChange={handleTransferFormChange("admission_diagnosis")}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-arrow-right me-2"></i> Transfer to Admission
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}