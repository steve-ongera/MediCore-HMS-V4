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

  if (loading) return <div>Loading...</div>;
  if (!admission) return null;

  const isActive = admission.status === "ADMITTED";

  return (
    <div>
      <button type="button" onClick={() => navigate("/icu")}>&larr; Back</button>
      <h1>{admission.icu_admission_number}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Patient: {admission.patient_name} ({admission.hospital_number})</p>
        <p>Bed: {admission.bed_number} ({admission.unit_type})</p>
        <p>Admission Reason: {admission.admission_reason} — Severity Score: {admission.severity_score ?? "—"}</p>
        <p>Diagnosis: {admission.admission_diagnosis || "—"}</p>
        <p>Attending Physician: {admission.attending_physician_name || "—"}</p>
        <p>Status: {admission.status}</p>
        <p>Admitted: {new Date(admission.admitted_at).toLocaleString()} — LOS: {admission.length_of_stay_days} days</p>
        {admission.discharged_at && <p>Discharged: {new Date(admission.discharged_at).toLocaleString()}</p>}
        {admission.discharge_summary && <p>Discharge Summary: {admission.discharge_summary}</p>}
      </section>

      <section>
        <h2>Billing</h2>
        {!billing ? <p>Loading billing...</p> : (
          <>
            <p>Grand Total: KES {billing.grand_total} — Paid: KES {billing.amount_paid} — Balance: KES {billing.balance}</p>
            <table>
              <thead><tr><th>Invoice #</th><th>Description</th><th>Amount</th><th>Balance</th><th>Status</th></tr></thead>
              <tbody>
                {billing.invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td>{inv.invoice_number}</td><td>{inv.description}</td>
                    <td>KES {inv.amount}</td><td>KES {inv.balance}</td><td>{inv.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={goToBillingPayment} disabled={Number(billing.balance) <= 0}>
              Go to Billing / Take Payment
            </button>
          </>
        )}
      </section>

      {isActive && (
        <section>
          <h2>Record Vitals</h2>
          <form onSubmit={submitVitals}>
            <input type="number" placeholder="Heart Rate" value={vitalsForm.heart_rate} onChange={handleVitalsChange("heart_rate")} />
            <input type="number" placeholder="BP Systolic" value={vitalsForm.bp_systolic} onChange={handleVitalsChange("bp_systolic")} />
            <input type="number" placeholder="BP Diastolic" value={vitalsForm.bp_diastolic} onChange={handleVitalsChange("bp_diastolic")} />
            <input type="number" placeholder="MAP" value={vitalsForm.mean_arterial_pressure} onChange={handleVitalsChange("mean_arterial_pressure")} />
            <input type="number" placeholder="Respiratory Rate" value={vitalsForm.respiratory_rate} onChange={handleVitalsChange("respiratory_rate")} />
            <input type="number" placeholder="SpO2 (%)" value={vitalsForm.oxygen_saturation} onChange={handleVitalsChange("oxygen_saturation")} />
            <input type="number" placeholder="Temp (°C)" value={vitalsForm.temperature_c} onChange={handleVitalsChange("temperature_c")} />
            <input type="number" placeholder="GCS Score" value={vitalsForm.gcs_score} onChange={handleVitalsChange("gcs_score")} />
            <input type="number" placeholder="Urine Output (ml/hr)" value={vitalsForm.urine_output_ml} onChange={handleVitalsChange("urine_output_ml")} />
            <input type="number" placeholder="CVP" value={vitalsForm.central_venous_pressure} onChange={handleVitalsChange("central_venous_pressure")} />
            <textarea placeholder="Notes" value={vitalsForm.notes} onChange={handleVitalsChange("notes")} />
            <button type="submit">Record Vitals</button>
          </form>
        </section>
      )}

      <section>
        <h2>Vitals History</h2>
        <table>
          <thead><tr><th>Time</th><th>HR</th><th>BP</th><th>SpO2</th><th>GCS</th><th>Urine Output</th></tr></thead>
          <tbody>
            {admission.vitals.map((v) => (
              <tr key={v.id}>
                <td>{new Date(v.recorded_at).toLocaleString()}</td><td>{v.heart_rate}</td>
                <td>{v.bp_systolic}/{v.bp_diastolic}</td><td>{v.oxygen_saturation}%</td>
                <td>{v.gcs_score}</td><td>{v.urine_output_ml} ml</td>
              </tr>
            ))}
          </tbody>
        </table>
        {admission.vitals.length === 0 && <p>No vitals recorded yet.</p>}
      </section>

      {isActive && (
        <section>
          <h2>Record Ventilator Settings</h2>
          <form onSubmit={submitVent}>
            <select value={ventForm.mode} onChange={handleVentChange("mode")}>
              <option value="NONE">Not Ventilated</option>
              <option value="CPAP">CPAP</option>
              <option value="BIPAP">BiPAP</option>
              <option value="AC">Assist Control (AC)</option>
              <option value="SIMV">SIMV</option>
              <option value="PSV">Pressure Support (PSV)</option>
            </select>
            <input type="number" placeholder="FiO2 (%)" value={ventForm.fio2_percent} onChange={handleVentChange("fio2_percent")} />
            <input type="number" placeholder="PEEP (cmH2O)" value={ventForm.peep_cmh2o} onChange={handleVentChange("peep_cmh2o")} />
            <input type="number" placeholder="Tidal Volume (ml)" value={ventForm.tidal_volume_ml} onChange={handleVentChange("tidal_volume_ml")} />
            <input type="number" placeholder="Set Respiratory Rate" value={ventForm.respiratory_rate_set} onChange={handleVentChange("respiratory_rate_set")} />
            <input type="number" placeholder="Peak Pressure" value={ventForm.peak_pressure} onChange={handleVentChange("peak_pressure")} />
            <textarea placeholder="Notes" value={ventForm.notes} onChange={handleVentChange("notes")} />
            <button type="submit">Record Settings</button>
          </form>
        </section>
      )}

      <section>
        <h2>Ventilator Settings History</h2>
        <table>
          <thead><tr><th>Time</th><th>Mode</th><th>FiO2</th><th>PEEP</th><th>Tidal Volume</th></tr></thead>
          <tbody>
            {admission.ventilator_settings.map((v) => (
              <tr key={v.id}>
                <td>{new Date(v.recorded_at).toLocaleString()}</td><td>{v.mode}</td>
                <td>{v.fio2_percent}%</td><td>{v.peep_cmh2o}</td><td>{v.tidal_volume_ml}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {admission.ventilator_settings.length === 0 && <p>No ventilator settings recorded.</p>}
      </section>

      {isActive && (
        <section>
          <h2>Order Procedure</h2>
          <form onSubmit={submitProcedure}>
            <select value={procedureForm.procedure} onChange={(e) => setProcedureForm((p) => ({ ...p, procedure: e.target.value }))} required>
              <option value="">Select procedure</option>
              {procedures.map((p) => <option key={p.id} value={p.id}>{p.name} (KES {p.price})</option>)}
            </select>
            <input type="text" placeholder="Notes" value={procedureForm.notes} onChange={(e) => setProcedureForm((p) => ({ ...p, notes: e.target.value }))} />
            <button type="submit">Order & Bill Procedure</button>
          </form>
        </section>
      )}

      <section>
        <h2>Procedures</h2>
        <table>
          <thead><tr><th>Procedure</th><th>Performed By</th><th>Time</th></tr></thead>
          <tbody>
            {admission.procedures.map((p) => (
              <tr key={p.id}>
                <td>{p.procedure_name}</td><td>{p.performed_by_name}</td>
                <td>{new Date(p.performed_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {admission.procedures.length === 0 && <p>No procedures recorded.</p>}
      </section>

      {isActive && (
        <section>
          <h2>Discharge / Close Episode</h2>
          <form onSubmit={submitDischarge}>
            <select value={dischargeForm.status} onChange={(e) => setDischargeForm((p) => ({ ...p, status: e.target.value }))}>
              <option value="STEPPED_DOWN">Stepped Down to Ward</option>
              <option value="DISCHARGED_HOME">Discharged Home</option>
              <option value="DECEASED">Deceased</option>
              <option value="TRANSFERRED_OUT">Transferred to Another Facility</option>
            </select>
            <textarea placeholder="Discharge summary" value={dischargeForm.discharge_summary} onChange={(e) => setDischargeForm((p) => ({ ...p, discharge_summary: e.target.value }))} />
            <button type="submit">Close ICU Episode</button>
          </form>
        </section>
      )}
    </div>
  );
}