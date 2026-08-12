import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getCarePlanDetail, addFollowUpTask, addMilestone, addMonitoringReading,
  completeFollowUpTask, markFollowUpMissed, closeCarePlan,
} from "../../services/api";

export default function CarePlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");

  const [taskForm, setTaskForm] = useState({ task_type: "CLINIC_REVIEW", description: "", due_date: "" });
  const [milestoneForm, setMilestoneForm] = useState({ description: "", target_date: "" });
  const [readingForm, setReadingForm] = useState({ metric_name: "", value: "", unit: "" });

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try { const data = await getCarePlanDetail(id); setPlan(data); } catch (err) { setError(err.message); }
  };

  const submitTask = async (e) => {
    e.preventDefault();
    try {
      await addFollowUpTask(id, taskForm);
      setTaskForm({ task_type: "CLINIC_REVIEW", description: "", due_date: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitMilestone = async (e) => {
    e.preventDefault();
    try {
      await addMilestone(id, milestoneForm);
      setMilestoneForm({ description: "", target_date: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitReading = async (e) => {
    e.preventDefault();
    try {
      await addMonitoringReading(id, readingForm);
      setReadingForm({ metric_name: "", value: "", unit: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleCompleteTask = async (taskId) => {
    const notes = window.prompt("Outcome notes (optional):") || "";
    try { await completeFollowUpTask(taskId, { outcome_notes: notes }); load(); } catch (err) { setError(err.message); }
  };

  const handleMarkMissed = async (taskId) => {
    const notes = window.prompt("Why was this missed?");
    if (!notes) return;
    try { await markFollowUpMissed(taskId, { outcome_notes: notes }); load(); } catch (err) { setError(err.message); }
  };

  const handleCloseCarePlan = async () => {
    if (!window.confirm("Close this care plan?")) return;
    try { await closeCarePlan(id); load(); } catch (err) { setError(err.message); }
  };

  if (!plan) return <div>Loading...</div>;

  return (
    <div>
      <button type="button" onClick={() => navigate(-1)}>&larr; Back</button>
      <h1>{plan.title}</h1>
      <p>Patient: {plan.patient_name} ({plan.hospital_number})</p>
      <p>Condition: {plan.condition || "—"} — Chronic: {plan.is_chronic ? "Yes" : "No"}</p>
      <p>Responsible Doctor: {plan.responsible_doctor_name || "—"} — Status: {plan.status}</p>
      {plan.notes && <p>Notes: {plan.notes}</p>}
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      {plan.status === "ACTIVE" && <button type="button" onClick={handleCloseCarePlan}>Close Care Plan</button>}

      <section>
        <h2>Follow-up Tasks</h2>
        <form onSubmit={submitTask}>
          <select value={taskForm.task_type} onChange={(e) => setTaskForm((p) => ({ ...p, task_type: e.target.value }))}>
            <option value="CLINIC_REVIEW">Clinic Review</option>
            <option value="PENDING_INVESTIGATION">Pending Investigation</option>
            <option value="SPECIALIST_REVIEW">Specialist Review</option>
            <option value="REFERRAL_FOLLOWUP">Referral Follow-up</option>
            <option value="POST_DISCHARGE_CHECK">Post-Discharge Check</option>
            <option value="MEDICATION_REVIEW">Medication Review</option>
            <option value="OUTREACH_CALL">Outreach Call</option>
            <option value="OTHER">Other</option>
          </select>
          <input type="text" placeholder="Description (e.g. 'Review after 14 days')" value={taskForm.description} onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))} required />
          <input type="date" value={taskForm.due_date} onChange={(e) => setTaskForm((p) => ({ ...p, due_date: e.target.value }))} required />
          <button type="submit">Add Task</button>
        </form>

        <table>
          <thead><tr><th>Type</th><th>Description</th><th>Due</th><th>Status</th><th>Assigned</th><th></th></tr></thead>
          <tbody>
            {plan.tasks.map((t) => (
              <tr key={t.id} style={{ background: ["OVERDUE", "ESCALATED"].includes(t.status) ? "#fee" : "inherit" }}>
                <td>{t.task_type}</td><td>{t.description}</td><td>{t.due_date}</td><td>{t.status}</td>
                <td>{t.assigned_to_name || "—"}</td>
                <td>
                  {!["COMPLETED", "CANCELLED", "MISSED"].includes(t.status) && (
                    <>
                      <button type="button" onClick={() => handleCompleteTask(t.id)}>Complete</button>
                      <button type="button" onClick={() => handleMarkMissed(t.id)}>Mark Missed</button>
                    </>
                  )}
                  {t.outcome_notes && <div><small>{t.outcome_notes}</small></div>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section>
        <h2>Milestones</h2>
        <form onSubmit={submitMilestone}>
          <input type="text" placeholder="Milestone (e.g. HbA1c < 7%)" value={milestoneForm.description} onChange={(e) => setMilestoneForm((p) => ({ ...p, description: e.target.value }))} required />
          <input type="date" value={milestoneForm.target_date} onChange={(e) => setMilestoneForm((p) => ({ ...p, target_date: e.target.value }))} />
          <button type="submit">Add Milestone</button>
        </form>
        <ul>
          {plan.milestones.map((m) => (
            <li key={m.id}>{m.is_achieved ? "✅" : "⬜"} {m.description} {m.target_date && `(target: ${m.target_date})`}</li>
          ))}
        </ul>
      </section>

      {plan.is_chronic && (
        <section>
          <h2>Monitoring Readings</h2>
          <form onSubmit={submitReading}>
            <input type="text" placeholder="Metric (e.g. Blood Glucose)" value={readingForm.metric_name} onChange={(e) => setReadingForm((p) => ({ ...p, metric_name: e.target.value }))} required />
            <input type="text" placeholder="Value" value={readingForm.value} onChange={(e) => setReadingForm((p) => ({ ...p, value: e.target.value }))} required />
            <input type="text" placeholder="Unit (e.g. mg/dL)" value={readingForm.unit} onChange={(e) => setReadingForm((p) => ({ ...p, unit: e.target.value }))} />
            <button type="submit">Add Reading</button>
          </form>
          <table>
            <thead><tr><th>Metric</th><th>Value</th><th>Recorded By</th><th>Date</th></tr></thead>
            <tbody>
              {plan.monitoring_readings.map((r) => (
                <tr key={r.id}><td>{r.metric_name}</td><td>{r.value}{r.unit}</td><td>{r.recorded_by_name}</td><td>{new Date(r.recorded_at).toLocaleString()}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}