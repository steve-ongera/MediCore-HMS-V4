import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getEmergencyVisit, getEmergencyBilling, saveTriageVitals, createEmergencyNote,
  getEmergencyProcedureCatalog, orderEmergencyProcedure, completeEmergencyProcedure,
  getMedicines, createEmergencyMedicationOrder, recordEmergencyMedicationAdministration,
  dischargeHome, transferToAdmission, emergencyLama, emergencyDeceased,
  getAvailableBeds, getWards, getUsers, addEmergencyCharge,
} from "../../services/api";

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

  if (loading) return <div>Loading...</div>;
  if (!ed) return null;

  const isActive = ed.status === "IN_ED";

  return (
    <div>
      <button type="button" onClick={() => navigate("/emergency")}>&larr; Back to ED Board</button>
      <h1>{ed.visit_number}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Patient: {ed.patient_name} ({ed.hospital_number})</p>
        <p>Bay: {ed.bay_number || "—"}</p>
        <p>Triage Level: {ed.triage_level || "—"}</p>
        <p>Arrival Mode: {ed.arrival_mode}</p>
        <p>Chief Complaint: {ed.chief_complaint}</p>
        <p>Status: {ed.status}</p>
        <p>Arrived: {new Date(ed.arrived_at).toLocaleString()}</p>
        <p>Duration: {ed.duration_hours} hrs</p>
        {ed.disposition_notes && <p>Disposition Notes: {ed.disposition_notes}</p>}
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

            <h3>Add Charge</h3>
            <form onSubmit={submitCharge}>
              <input type="text" placeholder="Description" value={chargeForm.description} onChange={handleChargeChange("description")} required />
              <input type="number" placeholder="Amount" value={chargeForm.amount} onChange={handleChargeChange("amount")} required />
              <button type="submit">Add Charge</button>
            </form>
          </>
        )}
      </section>

      <section>
        <h2>Triage Vitals</h2>
        {isActive && (
          <form onSubmit={submitVitals}>
            <input type="number" placeholder="Weight (kg)" value={vitals.weight_kg} onChange={handleVitalsChange("weight_kg")} />
            <input type="number" placeholder="Temp (°C)" value={vitals.temperature_c} onChange={handleVitalsChange("temperature_c")} />
            <input type="number" placeholder="Pulse (bpm)" value={vitals.pulse_bpm} onChange={handleVitalsChange("pulse_bpm")} />
            <input type="number" placeholder="Resp. Rate" value={vitals.respiratory_rate} onChange={handleVitalsChange("respiratory_rate")} />
            <input type="number" placeholder="BP Systolic" value={vitals.bp_systolic} onChange={handleVitalsChange("bp_systolic")} />
            <input type="number" placeholder="BP Diastolic" value={vitals.bp_diastolic} onChange={handleVitalsChange("bp_diastolic")} />
            <input type="number" placeholder="SpO2 (%)" value={vitals.oxygen_saturation} onChange={handleVitalsChange("oxygen_saturation")} />
            <input type="number" placeholder="GCS Score" value={vitals.gcs_score} onChange={handleVitalsChange("gcs_score")} />
            <input type="number" placeholder="Pain Score (0-10)" value={vitals.pain_score} onChange={handleVitalsChange("pain_score")} />
            <button type="submit">Save Vitals</button>
          </form>
        )}
        <ul>
          {(ed.vitals || []).map((v) => (
            <li key={v.id}>
              [{new Date(v.recorded_at).toLocaleString()}] BP: {v.bp_systolic}/{v.bp_diastolic}, Temp: {v.temperature_c}°C,
              Pulse: {v.pulse_bpm}, SpO2: {v.oxygen_saturation}%, GCS: {v.gcs_score}, Pain: {v.pain_score}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Notes</h2>
        {isActive && (
          <form onSubmit={submitNote}>
            <textarea value={noteText} onChange={(e) => setNoteText(e.target.value)} required />
            <button type="submit">Add Note</button>
          </form>
        )}
        <ul>
          {(ed.notes || []).map((n) => (
            <li key={n.id}>[{new Date(n.created_at).toLocaleString()}] {n.author_name}: {n.note}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Procedures</h2>
        {isActive && (
          <form onSubmit={submitProcedure}>
            <select value={selectedProcedure} onChange={(e) => setSelectedProcedure(e.target.value)} required>
              <option value="">Select procedure</option>
              {procedureCatalog.map((p) => (
                <option key={p.id} value={p.id}>{p.name} (KES {p.price})</option>
              ))}
            </select>
            <input type="text" placeholder="Notes" value={procedureNotes} onChange={(e) => setProcedureNotes(e.target.value)} />
            <button type="submit">Order Procedure</button>
          </form>
        )}
        <ul>
          {(ed.procedures || []).map((p) => (
            <li key={p.id}>
              {p.procedure_name} — {p.status}
              {isActive && p.status === "ORDERED" && (
                <button type="button" onClick={() => handleCompleteProcedure(p.id)}>Mark Complete</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Medications</h2>
        {isActive && (
          <form onSubmit={submitMedOrder}>
            <select value={medOrder.medicine} onChange={handleMedOrderChange("medicine")} required>
              <option value="">Select medicine</option>
              {medicines.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <input type="text" placeholder="Dosage" value={medOrder.dosage} onChange={handleMedOrderChange("dosage")} required />
            <select value={medOrder.route} onChange={handleMedOrderChange("route")}>
              <option value="IV">IV</option>
              <option value="IM">IM</option>
              <option value="SC">SC</option>
              <option value="ORAL">Oral</option>
              <option value="OTHER">Other</option>
            </select>
            <input type="number" min="1" placeholder="Qty" value={medOrder.quantity} onChange={handleMedOrderChange("quantity")} required />
            <button type="submit">Order Medication</button>
          </form>
        )}
        <ul>
          {(ed.medication_orders || []).map((m) => (
            <li key={m.id}>
              {m.medicine_name} — {m.dosage} — {m.route} — Qty: {m.quantity}
              {isActive && m.is_active && (
                <button type="button" onClick={() => handleAdministerMed(m.id)}>Mark Given</button>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isActive && (
        <section>
          <h2>Disposition</h2>
          <textarea placeholder="Disposition notes" value={dispositionNotes} onChange={(e) => setDispositionNotes(e.target.value)} />

          <h3>Discharge Home</h3>
          <button type="button" onClick={handleDischargeHome}>Discharge Home</button>

          <h3>Transfer to Admission</h3>
          <form onSubmit={submitTransfer}>
            <select value={transferWard} onChange={handleTransferWardChange} required>
              <option value="">Select ward</option>
              {wards.map((w) => (
                <option key={w.id} value={w.id}>{w.name}</option>
              ))}
            </select>
            <select value={transferForm.bed} onChange={handleTransferFormChange("bed")} required>
              <option value="">Select bed</option>
              {transferBeds.map((b) => (
                <option key={b.id} value={b.id}>{b.bed_number}</option>
              ))}
            </select>
            <select value={transferForm.admitting_doctor} onChange={handleTransferFormChange("admitting_doctor")} required>
              <option value="">Select admitting doctor</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>{d.full_name}</option>
              ))}
            </select>
            <textarea placeholder="Admission diagnosis" value={transferForm.admission_diagnosis} onChange={handleTransferFormChange("admission_diagnosis")} />
            <button type="submit">Transfer to Admission</button>
          </form>

          <h3>Other Dispositions</h3>
          <button type="button" onClick={handleLama}>Left Against Medical Advice</button>{" "}
          <button type="button" onClick={handleDeceased}>Deceased</button>
        </section>
      )}
    </div>
  );
}