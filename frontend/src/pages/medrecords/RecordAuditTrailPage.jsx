import { useEffect, useState } from "react";
import { getRecordAuditTrail, getPatients } from "../../services/api";

export default function RecordAuditTrailPage() {
  const [entries, setEntries] = useState([]);
  const [actionFilter, setActionFilter] = useState("");
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [actionFilter, selectedPatient]);

  const load = async () => {
    try {
      const params = { page_size: 200 };
      if (actionFilter) params.action = actionFilter;
      if (selectedPatient) params.patient = selectedPatient.id;
      const data = await getRecordAuditTrail(params);
      setEntries(data.results ?? data);
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

  return (
    <div>
      <h1>Record Audit Trail</h1>
      <p>Immutable log of every access to a patient's medical record — view, export, print, upload, file checkout/return.</p>
      {error && <p>Error: {error}</p>}

      <form onSubmit={handlePatientSearch}>
        <input type="text" placeholder="Filter by patient" value={patientQuery} onChange={(e) => setPatientQuery(e.target.value)} />
        <button type="submit">Search</button>
        {selectedPatient && <button type="button" onClick={() => { setSelectedPatient(null); setPatientQuery(""); }}>Clear Filter</button>}
      </form>
      {patientResults.length > 0 && !selectedPatient && (
        <ul>
          {patientResults.map((p) => (
            <li key={p.id}>{p.full_name} — {p.hospital_number} <button type="button" onClick={() => { setSelectedPatient(p); setPatientResults([]); }}>Select</button></li>
          ))}
        </ul>
      )}
      {selectedPatient && <p>Filtering: <strong>{selectedPatient.full_name}</strong></p>}

      <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
        <option value="">All Actions</option>
        <option value="VIEWED">Viewed</option>
        <option value="EXPORTED">Exported</option>
        <option value="PRINTED">Printed</option>
        <option value="DOCUMENT_UPLOADED">Document Uploaded</option>
        <option value="FILE_CHECKED_OUT">File Checked Out</option>
        <option value="FILE_RETURNED">File Returned</option>
      </select>

      <table>
        <thead><tr><th>Patient</th><th>Action</th><th>By</th><th>Detail</th><th>IP</th><th>Time</th></tr></thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id}>
              <td>{e.patient_name}</td><td>{e.action}</td><td>{e.performed_by_name}</td>
              <td>{e.detail || "—"}</td><td>{e.ip_address || "—"}</td>
              <td>{new Date(e.occurred_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {entries.length === 0 && <p>No audit entries match this filter.</p>}
    </div>
  );
}