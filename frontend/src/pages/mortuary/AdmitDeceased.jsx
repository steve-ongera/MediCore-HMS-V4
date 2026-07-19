import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getAvailableMortuaryUnits, registerMortuaryCase } from "../../services/api";

export default function AdmitDeceased() {
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [unidentifiedMode, setUnidentifiedMode] = useState(false);

  const [units, setUnits] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    deceased_name_freetext: "", gender: "UNKNOWN", estimated_age: "",
    date_of_death: "", cause_of_death: "", source: "OTHER",
    compartment: "", brought_by: "", police_ob_number: "",
  });

  useEffect(() => { loadUnits(); }, []);

  const loadUnits = async () => {
    try {
      const data = await getAvailableMortuaryUnits();
      setUnits(data);
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
    if (!selectedPatient && !form.deceased_name_freetext.trim()) {
      setError("Select a registered patient or enter a name for an unidentified case.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const mortuaryCase = await registerMortuaryCase({
        patient: selectedPatient ? selectedPatient.id : undefined,
        deceased_name_freetext: selectedPatient ? "" : form.deceased_name_freetext,
        gender: form.gender,
        estimated_age: form.estimated_age || undefined,
        date_of_death: form.date_of_death,
        cause_of_death: form.cause_of_death,
        source: form.source,
        compartment: form.compartment || undefined,
        brought_by: form.brought_by,
        police_ob_number: form.police_ob_number,
      });
      navigate(`/mortuary/${mortuaryCase.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <h1>Admit Deceased</h1>
      {error && <p>Error: {error}</p>}

      <h2>Deceased Identity</h2>
      <label>
        <input type="checkbox" checked={unidentifiedMode} onChange={(e) => { setUnidentifiedMode(e.target.checked); setSelectedPatient(null); }} />
        Unidentified / brought-in-dead case
      </label>

      {!unidentifiedMode ? (
        <>
          <form onSubmit={handlePatientSearch}>
            <input type="text" placeholder="Search patient by name / hospital number" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
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
          {selectedPatient && <p>Deceased: <strong>{selectedPatient.full_name}</strong> ({selectedPatient.hospital_number})</p>}
        </>
      ) : (
        <input type="text" placeholder="Name (if known, else leave blank)" value={form.deceased_name_freetext} onChange={handleChange("deceased_name_freetext")} />
      )}

      <h2>Case Details</h2>
      <form onSubmit={handleSubmit}>
        <select value={form.gender} onChange={handleChange("gender")}>
          <option value="UNKNOWN">Unknown</option>
          <option value="MALE">Male</option>
          <option value="FEMALE">Female</option>
        </select>
        <input type="number" placeholder="Estimated age (if unidentified)" value={form.estimated_age} onChange={handleChange("estimated_age")} />

        <label>Date & Time of Death</label>
        <input type="datetime-local" value={form.date_of_death} onChange={handleChange("date_of_death")} required />

        <textarea placeholder="Cause of death" value={form.cause_of_death} onChange={handleChange("cause_of_death")} />

        <select value={form.source} onChange={handleChange("source")} required>
          <option value="INPATIENT">Inpatient Ward</option>
          <option value="EMERGENCY">Emergency Department</option>
          <option value="MCH">Maternal & Child Health</option>
          <option value="BROUGHT_IN_DEAD">Brought in Dead (BID)</option>
          <option value="OTHER">Other</option>
        </select>

        <select value={form.compartment} onChange={handleChange("compartment")}>
          <option value="">Assign compartment later</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>{u.compartment_number} (KES {u.daily_storage_rate}/day)</option>
          ))}
        </select>

        <input type="text" placeholder="Brought by (ambulance, police, family)" value={form.brought_by} onChange={handleChange("brought_by")} />
        <input type="text" placeholder="Police OB number (if applicable)" value={form.police_ob_number} onChange={handleChange("police_ob_number")} />

        <button type="submit" disabled={submitting}>
          {submitting ? "Admitting..." : "Admit to Mortuary"}
        </button>
      </form>
    </div>
  );
}