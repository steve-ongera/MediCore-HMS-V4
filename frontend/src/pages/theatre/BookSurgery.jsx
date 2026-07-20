import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getSurgicalProcedureCatalog, getAvailableTheatres, getUsers, createSurgeryBooking } from "../../services/api";

export default function BookSurgery() {
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [procedures, setProcedures] = useState([]);
  const [theatres, setTheatres] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    procedure: "", priority: "ELECTIVE", requested_date: "", theatre: "",
    primary_surgeon: "", diagnosis: "", pre_op_notes: "",
  });

  useEffect(() => {
    loadProcedures();
    loadTheatres();
    loadDoctors();
  }, []);

  const loadProcedures = async () => {
    try {
      const data = await getSurgicalProcedureCatalog();
      setProcedures(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadTheatres = async () => {
    try {
      const data = await getAvailableTheatres();
      setTheatres(data);
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
      const booking = await createSurgeryBooking({
        patient: selectedPatient.id,
        procedure: form.procedure,
        priority: form.priority,
        requested_date: form.requested_date,
        theatre: form.theatre || undefined,
        primary_surgeon: form.primary_surgeon || undefined,
        diagnosis: form.diagnosis,
        pre_op_notes: form.pre_op_notes,
      });
      navigate(`/theatre/booking/${booking.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <h1>Book Surgery</h1>
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

      <h2>2. Booking Details</h2>
      <form onSubmit={handleSubmit}>
        <select value={form.procedure} onChange={handleChange("procedure")} required>
          <option value="">Select procedure</option>
          {procedures.map((p) => <option key={p.id} value={p.id}>{p.name} (KES {p.base_price})</option>)}
        </select>

        <select value={form.priority} onChange={handleChange("priority")}>
          <option value="EMERGENCY">Emergency</option>
          <option value="URGENT">Urgent</option>
          <option value="ELECTIVE">Elective</option>
        </select>

        <label>Requested Date & Time</label>
        <input type="datetime-local" value={form.requested_date} onChange={handleChange("requested_date")} required />

        <select value={form.theatre} onChange={handleChange("theatre")}>
          <option value="">Assign theatre later</option>
          {theatres.map((t) => <option key={t.id} value={t.id}>{t.theatre_number}</option>)}
        </select>

        <select value={form.primary_surgeon} onChange={handleChange("primary_surgeon")}>
          <option value="">Assign surgeon later</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>

        <textarea placeholder="Diagnosis" value={form.diagnosis} onChange={handleChange("diagnosis")} />
        <textarea placeholder="Pre-op notes" value={form.pre_op_notes} onChange={handleChange("pre_op_notes")} />

        <button type="submit" disabled={submitting}>
          {submitting ? "Booking..." : "Book Surgery"}
        </button>
      </form>
    </div>
  );
}