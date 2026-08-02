import { useEffect, useState } from "react";
import { getDischargeSummaries, getIncompleteDischargeSummaries, updateDischargeSummary, completeDischargeSummary } from "../../services/api";

export default function DischargeSummaries() {
  const [summaries, setSummaries] = useState([]);
  const [incomplete, setIncomplete] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [all, inc] = await Promise.all([getDischargeSummaries({ page_size: 100 }), getIncompleteDischargeSummaries()]);
      setSummaries(all.results ?? all);
      setIncomplete(inc);
    } catch (err) { setError(err.message); }
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setEditForm({
      diagnosis_on_admission: s.diagnosis_on_admission || "",
      diagnosis_on_discharge: s.diagnosis_on_discharge || "",
      procedures_performed: s.procedures_performed || "",
      treatment_summary: s.treatment_summary || "",
      condition_on_discharge: s.condition_on_discharge || "",
      discharge_medications: s.discharge_medications || "",
      followup_instructions: s.followup_instructions || "",
    });
  };

  const saveEdit = async () => {
    try {
      await updateDischargeSummary(editingId, editForm);
      setEditingId(null);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleComplete = async (id) => {
    if (!window.confirm("Mark this discharge summary complete? It should be fully filled in first.")) return;
    try {
      await completeDischargeSummary(id);
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Discharge Summaries</h1>
      {error && <p>Error: {error}</p>}

      <h2>Incomplete Summaries ({incomplete.length})</h2>
      <p>These need to be completed before the patient's file can be fully archived.</p>

      <table>
        <thead><tr><th>Admission #</th><th>Patient</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {summaries.map((s) => (
            <tr key={s.id}>
              <td>{s.admission_number}</td><td>{s.patient_name}</td>
              <td>{s.is_complete ? "Complete" : "Incomplete"}</td>
              <td>
                <button type="button" onClick={() => openEdit(s)}>Edit</button>
                {!s.is_complete && <button type="button" onClick={() => handleComplete(s.id)}>Mark Complete</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingId && (
        <div>
          <h2>Edit Discharge Summary</h2>
          <textarea placeholder="Diagnosis on admission" value={editForm.diagnosis_on_admission} onChange={(e) => setEditForm((p) => ({ ...p, diagnosis_on_admission: e.target.value }))} />
          <textarea placeholder="Diagnosis on discharge" value={editForm.diagnosis_on_discharge} onChange={(e) => setEditForm((p) => ({ ...p, diagnosis_on_discharge: e.target.value }))} />
          <textarea placeholder="Procedures performed" value={editForm.procedures_performed} onChange={(e) => setEditForm((p) => ({ ...p, procedures_performed: e.target.value }))} />
          <textarea placeholder="Treatment summary" value={editForm.treatment_summary} onChange={(e) => setEditForm((p) => ({ ...p, treatment_summary: e.target.value }))} />
          <input type="text" placeholder="Condition on discharge" value={editForm.condition_on_discharge} onChange={(e) => setEditForm((p) => ({ ...p, condition_on_discharge: e.target.value }))} />
          <textarea placeholder="Discharge medications" value={editForm.discharge_medications} onChange={(e) => setEditForm((p) => ({ ...p, discharge_medications: e.target.value }))} />
          <textarea placeholder="Follow-up instructions" value={editForm.followup_instructions} onChange={(e) => setEditForm((p) => ({ ...p, followup_instructions: e.target.value }))} />
          <button type="button" onClick={saveEdit}>Save</button>
          <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}