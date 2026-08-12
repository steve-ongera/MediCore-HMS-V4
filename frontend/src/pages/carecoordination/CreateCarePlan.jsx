import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getUsers, getDepartments, createCarePlan } from "../../services/api";

export default function CreateCarePlan() {
  const navigate = useNavigate();
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "", condition: "", is_chronic: false, notes: "",
    responsible_doctor: "", responsible_department: "",
    first_task_description: "", first_task_due_date: "", first_task_type: "CLINIC_REVIEW",
  });

  useEffect(() => {
    (async () => {
      try {
        const [d, dept] = await Promise.all([getUsers({ role: "DOCTOR" }), getDepartments()]);
        setDoctors(d.results ?? d); setDepartments(dept.results ?? dept);
      } catch (err) { setError(err.message); }
    })();
  }, []);

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) { setError("Select a patient first."); return; }
    try {
      const plan = await createCarePlan({
        patient: selectedPatient.id, ...form,
        responsible_doctor: form.responsible_doctor || undefined,
        responsible_department: form.responsible_department || undefined,
        first_task_due_date: form.first_task_due_date || undefined,
      });
      navigate(`/care-coordination/care-plans/${plan.id}`);
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Create Care Plan</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <h2>Patient</h2>
      <form onSubmit={handlePatientSearch}>
        <input type="text" placeholder="Search patient" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
        <button type="submit">Search</button>
      </form>
      {patientResults.length > 0 && (
        <ul>
          {patientResults.map((p) => (
            <li key={p.id}>{p.full_name} — {p.hospital_number} <button type="button" onClick={() => { setSelectedPatient(p); setPatientResults([]); }}>Select</button></li>
          ))}
        </ul>
      )}
      {selectedPatient && <p>Patient: <strong>{selectedPatient.full_name}</strong></p>}

      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Title (e.g. Diabetes Management)" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
        <input type="text" placeholder="Condition" value={form.condition} onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))} />
        <label><input type="checkbox" checked={form.is_chronic} onChange={(e) => setForm((p) => ({ ...p, is_chronic: e.target.checked }))} /> Chronic disease (ongoing monitoring)</label>
        <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />

        <select value={form.responsible_doctor} onChange={(e) => setForm((p) => ({ ...p, responsible_doctor: e.target.value }))}>
          <option value="">Assign responsible doctor</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
        </select>
        <select value={form.responsible_department} onChange={(e) => setForm((p) => ({ ...p, responsible_department: e.target.value }))}>
          <option value="">Assign clinic/department</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>

        <h3>First Follow-up Task (optional, can add later)</h3>
        <select value={form.first_task_type} onChange={(e) => setForm((p) => ({ ...p, first_task_type: e.target.value }))}>
          <option value="CLINIC_REVIEW">Clinic Review</option>
          <option value="PENDING_INVESTIGATION">Pending Investigation</option>
          <option value="SPECIALIST_REVIEW">Specialist Review</option>
          <option value="POST_DISCHARGE_CHECK">Post-Discharge Check</option>
          <option value="MEDICATION_REVIEW">Medication Review</option>
          <option value="OUTREACH_CALL">Outreach Call</option>
        </select>
        <input type="text" placeholder="e.g. 'Review after 14 days'" value={form.first_task_description} onChange={(e) => setForm((p) => ({ ...p, first_task_description: e.target.value }))} />
        <input type="date" value={form.first_task_due_date} onChange={(e) => setForm((p) => ({ ...p, first_task_due_date: e.target.value }))} />

        <button type="submit" disabled={!selectedPatient}>Create Care Plan</button>
      </form>
    </div>
  );
}