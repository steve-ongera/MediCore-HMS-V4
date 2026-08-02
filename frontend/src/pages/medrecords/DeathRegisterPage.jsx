import { useEffect, useState } from "react";
import { getDeathRegister, createDeathRegistration, getPatients, getUsers } from "../../services/api";

export default function DeathRegisterPage() {
  const [entries, setEntries] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [unidentified, setUnidentified] = useState(false);

  const [form, setForm] = useState({
    deceased_name: "", date_of_death: "", cause_of_death: "", certifying_doctor: "",
  });

  useEffect(() => { loadDoctors(); }, []);
  useEffect(() => { load(); }, [search]);

  const load = async () => {
    try {
      const params = { page_size: 100 };
      if (search) params.search = search;
      const data = await getDeathRegister(params);
      setEntries(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadDoctors = async () => {
    try { const data = await getUsers({ role: "DOCTOR" }); setDoctors(data.results ?? data); } catch (err) { setError(err.message); }
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
    if (!unidentified && !selectedPatient) { setError("Select the patient or mark as unidentified."); return; }
    try {
      await createDeathRegistration({
        ...form,
        deceased_name: unidentified ? form.deceased_name : selectedPatient.full_name,
        patient: unidentified ? undefined : selectedPatient.id,
        certifying_doctor: form.certifying_doctor || undefined,
      });
      setSelectedPatient(null);
      setPatientQuery("");
      setUnidentified(false);
      setForm({ deceased_name: "", date_of_death: "", cause_of_death: "", certifying_doctor: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Death Register</h1>
      {error && <p>Error: {error}</p>}

      <h2>Register Death</h2>
      <label><input type="checkbox" checked={unidentified} onChange={(e) => { setUnidentified(e.target.checked); setSelectedPatient(null); }} /> Unidentified / no patient record</label>

      {!unidentified ? (
        <>
          <form onSubmit={handlePatientSearch}>
            <input type="text" placeholder="Search patient" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
            <button type="submit">Search</button>
          </form>
          {patientResults.length > 0 && (
            <ul>
              {patientResults.map((p) => (
                <li key={p.id}>{p.full_name} — {p.hospital_number} <button type="button" onClick={() => setSelectedPatient(p)}>Select</button></li>
              ))}
            </ul>
          )}
          {selectedPatient && <p>Deceased: <strong>{selectedPatient.full_name}</strong></p>}
        </>
      ) : (
        <input type="text" placeholder="Deceased name (if known)" value={form.deceased_name} onChange={(e) => setForm((p) => ({ ...p, deceased_name: e.target.value }))} required />
      )}

      <form onSubmit={submit}>
        <label>Date & Time of Death</label>
        <input type="datetime-local" value={form.date_of_death} onChange={(e) => setForm((p) => ({ ...p, date_of_death: e.target.value }))} required />
        <textarea placeholder="Cause of death" value={form.cause_of_death} onChange={(e) => setForm((p) => ({ ...p, cause_of_death: e.target.value }))} required />
        <select value={form.certifying_doctor} onChange={(e) => setForm((p) => ({ ...p, certifying_doctor: e.target.value }))}>
          <option value="">Certifying doctor (optional)</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
        <button type="submit">Register Death</button>
      </form>

      <h2>Death Register Entries</h2>
      <input type="text" placeholder="Search by reg #, name" value={search} onChange={(e) => setSearch(e.target.value)} />
      <table>
        <thead><tr><th>Reg #</th><th>Deceased</th><th>Date of Death</th><th>Cause</th><th>Certifying Doctor</th></tr></thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{e.registration_number}</td><td>{e.deceased_name}</td>
              <td>{new Date(e.date_of_death).toLocaleString()}</td>
              <td>{e.cause_of_death}</td><td>{e.certifying_doctor_name || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}