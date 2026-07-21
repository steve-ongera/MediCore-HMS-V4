import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getUsers, registerDialysisPatient } from "../../services/api";

export default function RegisterDialysisPatient() {
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [nephrologists, setNephrologists] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    primary_diagnosis: "", dry_weight_kg: "", vascular_access_type: "AV_FISTULA",
    access_site_notes: "", sessions_per_week: "3", session_duration_hours: "4.0",
    dialyzer_type: "", anticoagulation_protocol: "", nephrologist: "",
    started_on: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => { loadDoctors(); }, []);

  const loadDoctors = async () => {
    try {
      const data = await getUsers({ role: "DOCTOR" });
      setNephrologists(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError("Select a patient first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const profile = await registerDialysisPatient({
        patient: selectedPatient.id,
        ...form,
        dry_weight_kg: form.dry_weight_kg || undefined,
        sessions_per_week: Number(form.sessions_per_week),
        session_duration_hours: Number(form.session_duration_hours),
        nephrologist: form.nephrologist || undefined,
      });
      navigate(`/dialysis/patients/${profile.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <h1>Register Dialysis Patient</h1>
      {error && <p>Error: {error}</p>}

      <h2>Find Patient</h2>
      <form onSubmit={handlePatientSearch}>
        <input type="text" placeholder="Search patient" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
        <button type="submit">Search</button>
      </form>
      {patientResults.length > 0 && (
        <ul>
          {patientResults.map((p) => (
            <li key={p.id}>
              {p.full_name} — {p.hospital_number}{" "}
              <button type="button" onClick={() => setSelectedPatient(p)}>Select</button>
            </li>
          ))}
        </ul>
      )}
      {selectedPatient && <p>Patient: <strong>{selectedPatient.full_name}</strong></p>}

      <h2>Dialysis Prescription</h2>
      <form onSubmit={handleSubmit}>
        <textarea placeholder="Primary diagnosis" value={form.primary_diagnosis} onChange={handleChange("primary_diagnosis")} />
        <input type="number" placeholder="Dry weight (kg)" value={form.dry_weight_kg} onChange={handleChange("dry_weight_kg")} />
        <select value={form.vascular_access_type} onChange={handleChange("vascular_access_type")}>
          <option value="AV_FISTULA">AV Fistula</option>
          <option value="AV_GRAFT">AV Graft</option>
          <option value="CENTRAL_CATHETER">Central Venous Catheter</option>
          <option value="PERITONEAL">Peritoneal Dialysis Catheter</option>
        </select>
        <input type="text" placeholder="Access site notes" value={form.access_site_notes} onChange={handleChange("access_site_notes")} />
        <input type="number" placeholder="Sessions per week" value={form.sessions_per_week} onChange={handleChange("sessions_per_week")} />
        <input type="number" step="0.5" placeholder="Session duration (hours)" value={form.session_duration_hours} onChange={handleChange("session_duration_hours")} />
        <input type="text" placeholder="Dialyzer type" value={form.dialyzer_type} onChange={handleChange("dialyzer_type")} />
        <input type="text" placeholder="Anticoagulation protocol" value={form.anticoagulation_protocol} onChange={handleChange("anticoagulation_protocol")} />
        <select value={form.nephrologist} onChange={handleChange("nephrologist")}>
          <option value="">Assign nephrologist later</option>
          {nephrologists.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
        <label>Started On</label>
        <input type="date" value={form.started_on} onChange={handleChange("started_on")} required />

        <button type="submit" disabled={submitting || !selectedPatient}>
          {submitting ? "Registering..." : "Register Patient"}
        </button>
      </form>
    </div>
  );
}