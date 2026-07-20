import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getSurgery, markIncision, markClosure, getUsers, assignSurgicalTeamMember,
  getMedicines, recordConsumable, addPostOpNote, completeSurgery,
} from "../../services/api";

export default function SurgeryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [surgery, setSurgery] = useState(null);
  const [users, setUsers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [teamForm, setTeamForm] = useState({ user: "", role: "ASSISTANT_SURGEON", fee: "" });
  const [consumableForm, setConsumableForm] = useState({ medicine: "", quantity: "1" });
  const [postOpForm, setPostOpForm] = useState({
    bp_systolic: "", bp_diastolic: "", pulse_bpm: "", oxygen_saturation: "",
    consciousness_level: "", pain_score: "", notes: "",
  });
  const [completeForm, setCompleteForm] = useState({
    outcome: "SUCCESSFUL", operative_notes: "", complications: "", estimated_blood_loss_ml: "",
  });

  useEffect(() => { load(); loadUsers(); loadMedicines(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getSurgery(id);
      setSurgery(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadMedicines = async () => {
    try {
      const data = await getMedicines({ page_size: 200 });
      setMedicines(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleMarkIncision = async () => {
    try { await markIncision(id); load(); } catch (err) { setError(err.message); }
  };

  const handleMarkClosure = async () => {
    try { await markClosure(id); load(); } catch (err) { setError(err.message); }
  };

  const submitTeam = async (e) => {
    e.preventDefault();
    try {
      await assignSurgicalTeamMember(id, { ...teamForm, fee: teamForm.fee || 0 });
      setTeamForm({ user: "", role: "ASSISTANT_SURGEON", fee: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitConsumable = async (e) => {
    e.preventDefault();
    try {
      await recordConsumable(id, { medicine: consumableForm.medicine, quantity: Number(consumableForm.quantity) });
      setConsumableForm({ medicine: "", quantity: "1" });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitPostOp = async (e) => {
    e.preventDefault();
    try {
      await addPostOpNote(id, postOpForm);
      setPostOpForm({ bp_systolic: "", bp_diastolic: "", pulse_bpm: "", oxygen_saturation: "", consciousness_level: "", pain_score: "", notes: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitComplete = async (e) => {
    e.preventDefault();
    if (!window.confirm("Complete this surgery? This closes the theatre and finalizes billing.")) return;
    try {
      await completeSurgery(id, {
        ...completeForm,
        estimated_blood_loss_ml: completeForm.estimated_blood_loss_ml || undefined,
      });
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div>Loading...</div>;
  if (!surgery) return null;

  const isActive = surgery.status === "IN_PROGRESS";

  return (
    <div>
      <button type="button" onClick={() => navigate("/theatre")}>&larr; Back</button>
      <h1>Surgery — {surgery.patient_name}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Procedure: {surgery.procedure_name}</p>
        <p>Theatre: {surgery.theatre_number}</p>
        <p>Status: {surgery.status} {surgery.outcome && `(${surgery.outcome})`}</p>
        <p>Theatre In: {new Date(surgery.theatre_in_at).toLocaleString()}</p>
        <p>Incision: {surgery.incision_at ? new Date(surgery.incision_at).toLocaleString() : "—"}</p>
        <p>Closure: {surgery.closure_at ? new Date(surgery.closure_at).toLocaleString() : "—"}</p>
        <p>Theatre Out: {surgery.theatre_out_at ? new Date(surgery.theatre_out_at).toLocaleString() : "—"}</p>
        <p>Duration: {surgery.duration_hours} hrs</p>
        {surgery.operative_notes && <p>Operative Notes: {surgery.operative_notes}</p>}
        {surgery.complications && <p>Complications: {surgery.complications}</p>}
        {surgery.estimated_blood_loss_ml && <p>Estimated Blood Loss: {surgery.estimated_blood_loss_ml} ml</p>}

        {isActive && (
          <>
            {!surgery.incision_at && <button type="button" onClick={handleMarkIncision}>Mark Incision</button>}
            {surgery.incision_at && !surgery.closure_at && <button type="button" onClick={handleMarkClosure}>Mark Closure</button>}
          </>
        )}
      </section>

      {isActive && (
        <section>
          <h2>Assign Team Member</h2>
          <form onSubmit={submitTeam}>
            <select value={teamForm.user} onChange={(e) => setTeamForm((p) => ({ ...p, user: e.target.value }))} required>
              <option value="">Select staff</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
            <select value={teamForm.role} onChange={(e) => setTeamForm((p) => ({ ...p, role: e.target.value }))}>
              <option value="PRIMARY_SURGEON">Primary Surgeon</option>
              <option value="ASSISTANT_SURGEON">Assistant Surgeon</option>
              <option value="ANESTHETIST">Anesthetist</option>
              <option value="SCRUB_NURSE">Scrub Nurse</option>
              <option value="CIRCULATING_NURSE">Circulating Nurse</option>
              <option value="OTHER">Other</option>
            </select>
            <input type="number" placeholder="Fee (if separately billed)" value={teamForm.fee} onChange={(e) => setTeamForm((p) => ({ ...p, fee: e.target.value }))} />
            <button type="submit">Add to Team</button>
          </form>
        </section>
      )}

      <section>
        <h2>Surgical Team</h2>
        <ul>
          {surgery.team.map((m) => <li key={m.id}>{m.user_name} — {m.role} {m.fee > 0 && `(Fee: KES ${m.fee})`}</li>)}
        </ul>
      </section>

      {isActive && (
        <section>
          <h2>Record Consumable Used</h2>
          <form onSubmit={submitConsumable}>
            <select value={consumableForm.medicine} onChange={(e) => setConsumableForm((p) => ({ ...p, medicine: e.target.value }))} required>
              <option value="">Select medicine</option>
              {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="number" min="1" value={consumableForm.quantity} onChange={(e) => setConsumableForm((p) => ({ ...p, quantity: e.target.value }))} required />
            <button type="submit">Record Usage</button>
          </form>
        </section>
      )}

      <section>
        <h2>Consumables Used</h2>
        <ul>
          {surgery.consumables_used.map((c) => <li key={c.id}>{c.medicine_name} x{c.quantity}</li>)}
        </ul>
      </section>

      {isActive && (
        <section>
          <h2>Add Post-Op Note</h2>
          <form onSubmit={submitPostOp}>
            <input type="number" placeholder="BP Systolic" value={postOpForm.bp_systolic} onChange={(e) => setPostOpForm((p) => ({ ...p, bp_systolic: e.target.value }))} />
            <input type="number" placeholder="BP Diastolic" value={postOpForm.bp_diastolic} onChange={(e) => setPostOpForm((p) => ({ ...p, bp_diastolic: e.target.value }))} />
            <input type="number" placeholder="Pulse" value={postOpForm.pulse_bpm} onChange={(e) => setPostOpForm((p) => ({ ...p, pulse_bpm: e.target.value }))} />
            <input type="number" placeholder="SpO2 (%)" value={postOpForm.oxygen_saturation} onChange={(e) => setPostOpForm((p) => ({ ...p, oxygen_saturation: e.target.value }))} />
            <input type="text" placeholder="Consciousness level" value={postOpForm.consciousness_level} onChange={(e) => setPostOpForm((p) => ({ ...p, consciousness_level: e.target.value }))} />
            <input type="number" placeholder="Pain score (0-10)" value={postOpForm.pain_score} onChange={(e) => setPostOpForm((p) => ({ ...p, pain_score: e.target.value }))} />
            <textarea placeholder="Notes" value={postOpForm.notes} onChange={(e) => setPostOpForm((p) => ({ ...p, notes: e.target.value }))} />
            <button type="submit">Save Note</button>
          </form>
        </section>
      )}

      <section>
        <h2>Post-Op Notes History</h2>
        <table>
          <thead><tr><th>Time</th><th>BP</th><th>Pulse</th><th>SpO2</th><th>Pain</th><th>Notes</th></tr></thead>
          <tbody>
            {surgery.post_op_notes.map((n) => (
              <tr key={n.id}>
                <td>{new Date(n.recorded_at).toLocaleString()}</td>
                <td>{n.bp_systolic}/{n.bp_diastolic}</td><td>{n.pulse_bpm}</td>
                <td>{n.oxygen_saturation}%</td><td>{n.pain_score}</td><td>{n.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {isActive && (
        <section>
          <h2>Complete Surgery</h2>
          <form onSubmit={submitComplete}>
            <select value={completeForm.outcome} onChange={(e) => setCompleteForm((p) => ({ ...p, outcome: e.target.value }))}>
              <option value="SUCCESSFUL">Successful</option>
              <option value="COMPLICATIONS">Completed with Complications</option>
              <option value="DECEASED">Patient Deceased</option>
            </select>
            <textarea placeholder="Operative notes" value={completeForm.operative_notes} onChange={(e) => setCompleteForm((p) => ({ ...p, operative_notes: e.target.value }))} />
            <textarea placeholder="Complications" value={completeForm.complications} onChange={(e) => setCompleteForm((p) => ({ ...p, complications: e.target.value }))} />
            <input type="number" placeholder="Estimated blood loss (ml)" value={completeForm.estimated_blood_loss_ml} onChange={(e) => setCompleteForm((p) => ({ ...p, estimated_blood_loss_ml: e.target.value }))} />
            <button type="submit">Complete Surgery & Finalize Billing</button>
          </form>
        </section>
      )}
    </div>
  );
}