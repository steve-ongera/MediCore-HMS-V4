import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPACSWorklist, schedulePACSStudy, getPatients } from "../../services/api";

export default function PACSWorklist() {
  const [studies, setStudies] = useState([]);
  const [error, setError] = useState("");

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [form, setForm] = useState({ modality: "CT", description: "" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const data = await getPACSWorklist(); setStudies(data); } catch (err) { setError(err.message); }
  };

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) { setError("Select a patient first."); return; }
    try {
      await schedulePACSStudy({ patient: selectedPatient.id, ...form });
      setSelectedPatient(null);
      setPatientQuery("");
      setForm({ modality: "CT", description: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>PACS Worklist</h1>
      <p style={{ background: "#fff3cd", padding: "8px" }}>
        ⚠ Demo Mode — this system is not yet connected to real imaging equipment. Studies are simulated for
        demonstration purposes. See a facility's Orthanc/PACS server configuration to enable real modality integration.
      </p>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <h2>Schedule a Study</h2>
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
      {selectedPatient && (
        <form onSubmit={submit}>
          <p>Patient: <strong>{selectedPatient.full_name}</strong></p>
          <select value={form.modality} onChange={(e) => setForm((p) => ({ ...p, modality: e.target.value }))}>
            <option value="CR">Computed Radiography (X-Ray)</option>
            <option value="CT">CT</option>
            <option value="MR">MRI</option>
            <option value="US">Ultrasound</option>
            <option value="MG">Mammography</option>
            <option value="DX">Digital Radiography</option>
            <option value="OT">Other</option>
          </select>
          <input type="text" placeholder="Study description (e.g. Chest X-Ray PA)" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required />
          <button type="submit">Schedule Study</button>
        </form>
      )}

      <h2>Awaiting Imaging</h2>
      <table>
        <thead><tr><th>Accession #</th><th>Patient</th><th>Modality</th><th>Description</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {studies.map((s) => (
            <tr key={s.id}>
              <td>{s.accession_number}</td><td>{s.patient_name}</td><td>{s.modality}</td>
              <td>{s.description}</td><td>{s.status}</td>
              <td><Link to={`/pacs/studies/${s.id}`}>View</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      {studies.length === 0 && <p>No studies awaiting imaging.</p>}
    </div>
  );
}