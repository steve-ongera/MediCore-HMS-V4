import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getUsers, registerDentalVisit } from "../../services/api";

export default function RegisterDentalVisit() {
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [dentists, setDentists] = useState([]);
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [selectedDentist, setSelectedDentist] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { loadDentists(); }, []);

  const loadDentists = async () => {
    try {
      const data = await getUsers({ role: "DOCTOR" });
      setDentists(data.results ?? data);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError("Please select a patient first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const visit = await registerDentalVisit({
        patient: selectedPatient.id,
        dentist: selectedDentist || undefined,
        chief_complaint: chiefComplaint,
      });
      navigate(`/dental/${visit.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <h1>Register Dental Visit</h1>
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
      {selectedPatient && <p>Patient: <strong>{selectedPatient.full_name}</strong> ({selectedPatient.hospital_number})</p>}

      <h2>Visit Details</h2>
      <form onSubmit={handleSubmit}>
        <select value={selectedDentist} onChange={(e) => setSelectedDentist(e.target.value)}>
          <option value="">Assign dentist later</option>
          {dentists.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
        <textarea placeholder="Chief complaint" value={chiefComplaint} onChange={(e) => setChiefComplaint(e.target.value)} />
        <button type="submit" disabled={submitting || !selectedPatient}>
          {submitting ? "Registering..." : "Register Visit"}
        </button>
      </form>
    </div>
  );
}