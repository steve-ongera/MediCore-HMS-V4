import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDialysisSession, getAvailableDialysisMachines, startDialysisSession, completeDialysisSession, markSessionMissed } from "../../services/api";

export default function DialysisSessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [startForm, setStartForm] = useState({
    machine: "", pre_weight_kg: "", pre_bp_systolic: "", pre_bp_diastolic: "",
    ultrafiltration_target_ml: "", blood_flow_rate: "", dialysate_flow_rate: "",
  });
  const [completeForm, setCompleteForm] = useState({
    post_weight_kg: "", post_bp_systolic: "", post_bp_diastolic: "", complications: "", nursing_notes: "",
  });

  useEffect(() => { load(); loadMachines(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDialysisSession(id);
      setSession(data);
      if (data.machine) setStartForm((p) => ({ ...p, machine: data.machine }));
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadMachines = async () => {
    try {
      const data = await getAvailableDialysisMachines();
      setMachines(data);
    } catch (err) { setError(err.message); }
  };

  const submitStart = async (e) => {
    e.preventDefault();
    try {
      await startDialysisSession(id, {
        ...startForm,
        pre_weight_kg: startForm.pre_weight_kg || undefined,
        pre_bp_systolic: startForm.pre_bp_systolic || undefined,
        pre_bp_diastolic: startForm.pre_bp_diastolic || undefined,
        ultrafiltration_target_ml: startForm.ultrafiltration_target_ml || undefined,
        blood_flow_rate: startForm.blood_flow_rate || undefined,
        dialysate_flow_rate: startForm.dialysate_flow_rate || undefined,
      });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitComplete = async (e) => {
    e.preventDefault();
    try {
      await completeDialysisSession(id, {
        ...completeForm,
        post_weight_kg: completeForm.post_weight_kg || undefined,
        post_bp_systolic: completeForm.post_bp_systolic || undefined,
        post_bp_diastolic: completeForm.post_bp_diastolic || undefined,
      });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleMarkMissed = async () => {
    try {
      await markSessionMissed(id);
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div>Loading...</div>;
  if (!session) return null;

  const isScheduled = session.status === "SCHEDULED";
  const isInProgress = session.status === "IN_PROGRESS";

  return (
    <div>
      <button type="button" onClick={() => navigate(-1)}>&larr; Back</button>
      <h1>{session.session_number}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Patient: {session.patient_name}</p>
        <p>Machine: {session.machine_number || "Unassigned"}</p>
        <p>Scheduled: {new Date(session.scheduled_date).toLocaleString()}</p>
        <p>Status: {session.status}</p>
        {session.started_at && <p>Started: {new Date(session.started_at).toLocaleString()}</p>}
        {session.ended_at && <p>Ended: {new Date(session.ended_at).toLocaleString()}</p>}
        {session.fluid_removed_kg && <p>Fluid Removed: {session.fluid_removed_kg} kg</p>}
        <p>Pre: BP {session.pre_bp_systolic}/{session.pre_bp_diastolic}, Weight {session.pre_weight_kg} kg</p>
        <p>Post: BP {session.post_bp_systolic}/{session.post_bp_diastolic}, Weight {session.post_weight_kg} kg</p>
        <p>UF Target: {session.ultrafiltration_target_ml} ml — Blood Flow: {session.blood_flow_rate} ml/min — Dialysate Flow: {session.dialysate_flow_rate} ml/min</p>
        {session.complications && <p>Complications: {session.complications}</p>}
        {session.nursing_notes && <p>Nursing Notes: {session.nursing_notes}</p>}
        {isScheduled && <button type="button" onClick={handleMarkMissed}>Mark as Missed</button>}
      </section>

      {isScheduled && (
        <section>
          <h2>Start Session</h2>
          <form onSubmit={submitStart}>
            <select value={startForm.machine} onChange={(e) => setStartForm((p) => ({ ...p, machine: e.target.value }))} required>
              <option value="">Select machine</option>
              {machines.map((m) => <option key={m.id} value={m.id}>{m.machine_number}</option>)}
            </select>
            <input type="number" placeholder="Pre-weight (kg)" value={startForm.pre_weight_kg} onChange={(e) => setStartForm((p) => ({ ...p, pre_weight_kg: e.target.value }))} />
            <input type="number" placeholder="Pre BP Systolic" value={startForm.pre_bp_systolic} onChange={(e) => setStartForm((p) => ({ ...p, pre_bp_systolic: e.target.value }))} />
            <input type="number" placeholder="Pre BP Diastolic" value={startForm.pre_bp_diastolic} onChange={(e) => setStartForm((p) => ({ ...p, pre_bp_diastolic: e.target.value }))} />
            <input type="number" placeholder="UF Target (ml)" value={startForm.ultrafiltration_target_ml} onChange={(e) => setStartForm((p) => ({ ...p, ultrafiltration_target_ml: e.target.value }))} />
            <input type="number" placeholder="Blood Flow Rate (ml/min)" value={startForm.blood_flow_rate} onChange={(e) => setStartForm((p) => ({ ...p, blood_flow_rate: e.target.value }))} />
            <input type="number" placeholder="Dialysate Flow Rate (ml/min)" value={startForm.dialysate_flow_rate} onChange={(e) => setStartForm((p) => ({ ...p, dialysate_flow_rate: e.target.value }))} />
            <button type="submit">Start Session</button>
          </form>
        </section>
      )}

      {isInProgress && (
        <section>
          <h2>Complete Session</h2>
          <form onSubmit={submitComplete}>
            <input type="number" placeholder="Post-weight (kg)" value={completeForm.post_weight_kg} onChange={(e) => setCompleteForm((p) => ({ ...p, post_weight_kg: e.target.value }))} />
            <input type="number" placeholder="Post BP Systolic" value={completeForm.post_bp_systolic} onChange={(e) => setCompleteForm((p) => ({ ...p, post_bp_systolic: e.target.value }))} />
            <input type="number" placeholder="Post BP Diastolic" value={completeForm.post_bp_diastolic} onChange={(e) => setCompleteForm((p) => ({ ...p, post_bp_diastolic: e.target.value }))} />
            <textarea placeholder="Complications" value={completeForm.complications} onChange={(e) => setCompleteForm((p) => ({ ...p, complications: e.target.value }))} />
            <textarea placeholder="Nursing notes" value={completeForm.nursing_notes} onChange={(e) => setCompleteForm((p) => ({ ...p, nursing_notes: e.target.value }))} />
            <button type="submit">Complete Session & Bill</button>
          </form>
        </section>
      )}

      {session.invoice && (
        <section>
          <h2>Billing</h2>
          <p>Invoice created — view under Billing → Invoices.</p>
        </section>
      )}
    </div>
  );
}