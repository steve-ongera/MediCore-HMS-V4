import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getAvailableICUBeds, getUsers, admitToICU } from "../../services/api";

export default function AdmitToICU() {
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [beds, setBeds] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    ward_admission: "", bed: "", admission_reason: "OTHER",
    admission_diagnosis: "", severity_score: "", attending_physician: "",
  });

  useEffect(() => {
    loadBeds();
    loadDoctors();
  }, []);

  const loadBeds = async () => {
    try {
      const data = await getAvailableICUBeds();
      setBeds(data);
    } catch (err) { setError(err.message); }
  };

  const loadDoctors = async () => {
    try {
      const data = await getUsers({ role: "DOCTOR" });
      setDoctors(data.results ?? data);
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
      setError("Please select a patient first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const icuAdmission = await admitToICU({
        patient: selectedPatient.id,
        ward_admission: form.ward_admission || undefined,
        bed: form.bed,
        admission_reason: form.admission_reason,
        admission_diagnosis: form.admission_diagnosis,
        severity_score: form.severity_score || undefined,
        attending_physician: form.attending_physician || undefined,
      });
      navigate(`/icu/${icuAdmission.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <h1>Admit to ICU / HDU</h1>
      {error && <p>Error: {error}</p>}

      <h2>1. Find Patient</h2>
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
      {selectedPatient && <p>Patient: <strong>{selectedPatient.full_name}</strong> ({selectedPatient.hospital_number})</p>}

      <h2>2. Admission Details</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Existing ward admission ID (optional, if transferring from a ward)"
          value={form.ward_admission}
          onChange={handleChange("ward_admission")}
        />

        <select value={form.bed} onChange={handleChange("bed")} required>
          <option value="">Select bed</option>
          {beds.map((b) => (
            <option key={b.id} value={b.id}>{b.bed_number} ({b.unit_type}) - KES {b.daily_rate}/day</option>
          ))}
        </select>

        <select value={form.admission_reason} onChange={handleChange("admission_reason")} required>
          <option value="RESPIRATORY_FAILURE">Respiratory Failure</option>
          <option value="SEPSIS">Sepsis / Septic Shock</option>
          <option value="POST_SURGICAL">Post-Surgical Monitoring</option>
          <option value="TRAUMA">Trauma</option>
          <option value="CARDIAC">Cardiac Event</option>
          <option value="NEUROLOGICAL">Neurological Event</option>
          <option value="OTHER">Other</option>
        </select>

        <textarea placeholder="Admission diagnosis" value={form.admission_diagnosis} onChange={handleChange("admission_diagnosis")} />
        <input type="number" placeholder="Severity score (e.g. APACHE II / SOFA)" value={form.severity_score} onChange={handleChange("severity_score")} />

        <select value={form.attending_physician} onChange={handleChange("attending_physician")}>
          <option value="">Assign attending physician later</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>

        <button type="submit" disabled={submitting || !selectedPatient}>
          {submitting ? "Admitting..." : "Admit to ICU / HDU"}
        </button>
      </form>
    </div>
  );
}