import { useEffect, useState } from "react";
import { getPatientFiles, createPatientFile, checkoutPatientFile, returnPatientFile, getOverdueFiles, getPatients, getUsers } from "../../services/api";

export default function PatientFileTracking() {
  const [files, setFiles] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [location, setLocation] = useState("");

  const [checkoutId, setCheckoutId] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({ to_custodian: "", location: "", reason: "", expected_return_at: "" });

  useEffect(() => { loadUsers(); loadOverdue(); }, []);
  useEffect(() => { load(); }, [statusFilter, search]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const data = await getPatientFiles(params);
      setFiles(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadOverdue = async () => {
    try { const data = await getOverdueFiles(); setOverdue(data); } catch (err) { setError(err.message); }
  };

  const loadUsers = async () => {
    try { const data = await getUsers(); setUsers(data.results ?? data); } catch (err) { setError(err.message); }
  };

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const createFile = async () => {
    if (!selectedPatient) return;
    try {
      await createPatientFile({ patient: selectedPatient.id, current_location: location });
      setSelectedPatient(null);
      setPatientQuery("");
      setPatientResults([]);
      setLocation("");
      load();
    } catch (err) { setError(err.message); }
  };

  const openCheckout = (id) => {
    setCheckoutId(id);
    setCheckoutForm({ to_custodian: "", location: "", reason: "", expected_return_at: "" });
  };

  const submitCheckout = async () => {
    try {
      await checkoutPatientFile(checkoutId, {
        to_custodian: checkoutForm.to_custodian,
        location: checkoutForm.location,
        reason: checkoutForm.reason,
        expected_return_at: checkoutForm.expected_return_at || undefined,
      });
      setCheckoutId(null);
      load();
      loadOverdue();
    } catch (err) { setError(err.message); }
  };

  const handleReturn = async (id) => {
    try {
      await returnPatientFile(id, { location: "Records Room" });
      load();
      loadOverdue();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Patient File Tracking</h1>
      {error && <p>Error: {error}</p>}

      <h2>Register New File</h2>
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
      {selectedPatient && (
        <div>
          <p>Patient: <strong>{selectedPatient.full_name}</strong></p>
          <input type="text" placeholder="Initial location (e.g. Records Room Shelf B12)" value={location} onChange={(e) => setLocation(e.target.value)} />
          <button type="button" onClick={createFile}>Create File Record</button>
        </div>
      )}

      <h2>Overdue Files ({overdue.length})</h2>
      {overdue.length > 0 && (
        <table>
          <thead><tr><th>File #</th><th>Patient</th><th>Custodian</th><th>Location</th></tr></thead>
          <tbody>
            {overdue.map((f) => (
              <tr key={f.id} style={{ background: "#fee" }}>
                <td>{f.file_number}</td><td>{f.patient_name}</td><td>{f.current_custodian_name}</td><td>{f.current_location}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>All Files</h2>
      <input type="text" placeholder="Search by file #, patient" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="IN_ARCHIVE">In Archive</option>
        <option value="CHECKED_OUT">Checked Out</option>
        <option value="IN_TRANSIT">In Transit</option>
        <option value="ARCHIVED_OFFSITE">Archived Offsite</option>
        <option value="LOST">Lost / Missing</option>
      </select>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>File #</th><th>Patient</th><th>Status</th><th>Custodian</th><th>Location</th><th></th></tr></thead>
          <tbody>
            {files.map((f) => (
              <tr key={f.id}>
                <td>{f.file_number}</td><td>{f.patient_name}</td><td>{f.status}</td>
                <td>{f.current_custodian_name || "—"}</td><td>{f.current_location || "—"}</td>
                <td>
                  {f.status === "CHECKED_OUT" ? (
                    <button type="button" onClick={() => handleReturn(f.id)}>Return</button>
                  ) : (
                    checkoutId === f.id ? (
                      <span>
                        <select value={checkoutForm.to_custodian} onChange={(e) => setCheckoutForm((p) => ({ ...p, to_custodian: e.target.value }))}>
                          <option value="">Select custodian</option>
                          {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                        </select>
                        <input type="text" placeholder="Location" value={checkoutForm.location} onChange={(e) => setCheckoutForm((p) => ({ ...p, location: e.target.value }))} />
                        <input type="datetime-local" value={checkoutForm.expected_return_at} onChange={(e) => setCheckoutForm((p) => ({ ...p, expected_return_at: e.target.value }))} />
                        <button type="button" onClick={submitCheckout}>Confirm</button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => openCheckout(f.id)}>Check Out</button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}