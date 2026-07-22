import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getICUAdmission, getICUBilling, recordICUVitals, recordVentilatorSettings,
  getICUProcedureCatalog, orderICUProcedure, dischargeFromICU,
} from "../../services/api";

export default function ICUAdmissionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [admission, setAdmission] = useState(null);
  const [billing, setBilling] = useState(null);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const submitDischarge = async (e) => {
    e.preventDefault();
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

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
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
            <i className="bi bi-arrow-left me-2"></i> Back to Board
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
              <i className="bi bi-hospital fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{admission.patient_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {admission.hospital_number}
                </span>
                <span>•</span>
                <span>Bed: {admission.bed_number} ({admission.unit_type})</span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(admission.status)}`}>
                  <span className="badge-dot"></span>
                  {admission.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-clock me-1"></i> LOS: {admission.length_of_stay_days} days
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
              <div className="info-item__value">{new Date(admission.admitted_at).toLocaleString()}</div>
            </div>
            <div className="info-item" style={{ gridColumn: "span 2" }}>
              <div className="info-item__label">Diagnosis</div>
              <div className="info-item__value">{admission.admission_diagnosis || "—"}</div>
            </div>
            {admission.discharged_at && (
              <div className="info-item">
                <div className="info-item__label">Discharged</div>
                <div className="info-item__value">{new Date(admission.discharged_at).toLocaleString()}</div>
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
                    <div className="stat-card__icon tone-warning">
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
                  <i className="bi bi-credit-card me-2"></i> Go to Billing / Take Payment
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
              <i className="bi bi-heart-pulse me-2"></i> Record Vitals
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
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-floppy me-2"></i> Record Vitals
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history me-1"></i>
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
                      <td>{new Date(v.recorded_at).toLocaleString()}</td>
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
              <i className="bi bi-plus-circle me-2"></i> Record Ventilator Settings
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

              <button type="submit" className="btn btn-primary">
                <i className="bi bi-floppy me-2"></i> Record Settings
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history me-1"></i>
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
                      <td>{new Date(v.recorded_at).toLocaleString()}</td>
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
              <i className="bi bi-plus-circle me-2"></i> Order Procedure
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
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-plus-circle me-2"></i> Order & Bill Procedure
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
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
                      <td>{new Date(p.performed_at).toLocaleString()}</td>
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
              <i className="bi bi-door-open me-2"></i> Discharge / Close Episode
            </h5>
          </div>
          <div className="card-body">
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
              <button type="submit" className="btn btn-danger">
                <i className="bi bi-door-open me-2"></i> Close ICU Episode
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}