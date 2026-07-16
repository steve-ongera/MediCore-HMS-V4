import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getAvailableEmergencyBays, getUsers, registerEmergencyVisit } from "../../services/api";

export default function RegisterEmergency() {
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [bays, setBays] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [form, setForm] = useState({
    bay: "", triage_level: "3", arrival_mode: "WALK_IN",
    chief_complaint: "", attending_doctor: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBays();
    loadDoctors();
  }, []);

  const loadBays = async () => {
    try {
      const data = await getAvailableEmergencyBays();
      setBays(data);
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

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFormChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError("Please select a patient first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const ed = await registerEmergencyVisit({
        patient: selectedPatient.id,
        bay: form.bay || undefined,
        triage_level: Number(form.triage_level),
        arrival_mode: form.arrival_mode,
        chief_complaint: form.chief_complaint,
        attending_doctor: form.attending_doctor || undefined,
      });
      navigate(`/emergency/${ed.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1>Register Emergency Patient</h1>
      {error && <p>Error: {error}</p>}

      <h2>1. Find Patient</h2>
      <form onSubmit={handlePatientSearch}>
        <input type="text" placeholder="Search by name / phone / hospital number" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
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

      <h2>2. Triage & Registration</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Bay (optional)</label>
          <select value={form.bay} onChange={handleFormChange("bay")}>
            <option value="">No bay yet</option>
            {bays.map((b) => (
              <option key={b.id} value={b.id}>{b.zone} - {b.bay_number} (KES {b.hourly_rate}/hr)</option>
            ))}
          </select>
        </div>
        <div>
          <label>Triage Level</label>
          <select value={form.triage_level} onChange={handleFormChange("triage_level")}>
            <option value="1">1 - Resuscitation (Immediate)</option>
            <option value="2">2 - Emergent (&lt; 10 min)</option>
            <option value="3">3 - Urgent (&lt; 30 min)</option>
            <option value="4">4 - Less Urgent (&lt; 60 min)</option>
            <option value="5">5 - Non-Urgent</option>
          </select>
        </div>
        <div>
          <label>Arrival Mode</label>
          <select value={form.arrival_mode} onChange={handleFormChange("arrival_mode")}>
            <option value="WALK_IN">Walk-in</option>
            <option value="AMBULANCE">Ambulance</option>
            <option value="POLICE">Police</option>
            <option value="REFERRAL">Referral</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label>Attending Doctor</label>
          <select value={form.attending_doctor} onChange={handleFormChange("attending_doctor")}>
            <option value="">Unassigned</option>
            {doctors.map((d) => (
              <option key={d.id} value={d.id}>{d.full_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label>Chief Complaint</label>
          <textarea value={form.chief_complaint} onChange={handleFormChange("chief_complaint")} />
        </div>
        <button type="submit" disabled={submitting || !selectedPatient}>
          {submitting ? "Registering..." : "Register Emergency Visit"}
        </button>
      </form>
    </div>
  );
}