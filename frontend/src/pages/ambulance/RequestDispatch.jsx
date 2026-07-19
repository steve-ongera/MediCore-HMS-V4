import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getAvailableAmbulances, requestDispatch } from "../../services/api";

export default function RequestDispatch() {
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [unregisteredMode, setUnregisteredMode] = useState(false);

  const [ambulances, setAmbulances] = useState([]);

  const [form, setForm] = useState({
    ambulance: "", patient_name_freetext: "", contact_phone: "",
    dispatch_type: "EMERGENCY_PICKUP", pickup_location: "", destination: "Facility", notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadAmbulances();
  }, []);

  const loadAmbulances = async () => {
    try {
      const data = await getAvailableAmbulances();
      setAmbulances(data);
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

  const handleFormChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient && !form.patient_name_freetext.trim()) {
      setError("Select a registered patient or enter a name for an unregistered pickup.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const dispatch = await requestDispatch({
        ambulance: form.ambulance || undefined,
        patient: selectedPatient ? selectedPatient.id : undefined,
        patient_name_freetext: selectedPatient ? "" : form.patient_name_freetext,
        contact_phone: form.contact_phone,
        dispatch_type: form.dispatch_type,
        pickup_location: form.pickup_location,
        destination: form.destination,
        notes: form.notes,
      });
      navigate(`/ambulance/${dispatch.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <h1>Request Ambulance Dispatch</h1>
      {error && <p>Error: {error}</p>}

      <h2>Patient</h2>
      <label>
        <input type="checkbox" checked={unregisteredMode} onChange={(e) => { setUnregisteredMode(e.target.checked); setSelectedPatient(null); }} />
        Unregistered / unknown patient (emergency pickup)
      </label>

      {!unregisteredMode ? (
        <>
          <form onSubmit={handlePatientSearch}>
            <input type="text" placeholder="Search patient by name / phone / hospital number" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
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
        </>
      ) : (
        <input type="text" placeholder="Patient name (if known)" value={form.patient_name_freetext} onChange={handleFormChange("patient_name_freetext")} />
      )}

      <h2>Dispatch Details</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Contact phone" value={form.contact_phone} onChange={handleFormChange("contact_phone")} />

        <select value={form.dispatch_type} onChange={handleFormChange("dispatch_type")}>
          <option value="EMERGENCY_PICKUP">Emergency Pickup</option>
          <option value="INTER_FACILITY_TRANSFER">Inter-Facility Transfer</option>
          <option value="DISCHARGE_TRANSPORT">Discharge Transport</option>
          <option value="OTHER">Other</option>
        </select>

        <input type="text" placeholder="Pickup location" value={form.pickup_location} onChange={handleFormChange("pickup_location")} required />
        <input type="text" placeholder="Destination" value={form.destination} onChange={handleFormChange("destination")} required />

        <select value={form.ambulance} onChange={handleFormChange("ambulance")}>
          <option value="">Assign ambulance later</option>
          {ambulances.map((a) => (
            <option key={a.id} value={a.id}>{a.registration_number} - {a.ambulance_type} (base KES {a.base_fee} + KES {a.rate_per_km}/km)</option>
          ))}
        </select>

        <textarea placeholder="Notes" value={form.notes} onChange={handleFormChange("notes")} />

        <button type="submit" disabled={submitting}>
          {submitting ? "Requesting..." : "Request Dispatch"}
        </button>
      </form>
    </div>
  );
}