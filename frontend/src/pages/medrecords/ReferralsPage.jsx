import { useEffect, useState } from "react";
import { getReferrals, createReferral, updateReferralStatus, getPatients, getUsers } from "../../services/api";

export default function ReferralsPage() {
  const [referrals, setReferrals] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [directionFilter, setDirectionFilter] = useState("");
  const [error, setError] = useState("");

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [form, setForm] = useState({
    direction: "OUTGOING", facility_name: "", facility_contact: "", reason: "",
    clinical_summary: "", referring_doctor: "", receiving_doctor: "",
  });

  useEffect(() => { loadDoctors(); }, []);
  useEffect(() => { load(); }, [directionFilter]);

  const load = async () => {
    try {
      const params = { page_size: 100 };
      if (directionFilter) params.direction = directionFilter;
      const data = await getReferrals(params);
      setReferrals(data.results ?? data);
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
    if (!selectedPatient) { setError("Select a patient first."); return; }
    try {
      await createReferral({
        ...form,
        patient: selectedPatient.id,
        receiving_doctor: form.receiving_doctor || undefined,
      });
      setSelectedPatient(null);
      setPatientQuery("");
      setForm({ direction: "OUTGOING", facility_name: "", facility_contact: "", reason: "", clinical_summary: "", referring_doctor: "", receiving_doctor: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateReferralStatus(id, { status });
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Referral Management</h1>
      {error && <p>Error: {error}</p>}

      <h2>New Referral</h2>
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
      {selectedPatient && <p>Patient: <strong>{selectedPatient.full_name}</strong></p>}

      <form onSubmit={submit}>
        <select value={form.direction} onChange={(e) => setForm((p) => ({ ...p, direction: e.target.value }))}>
          <option value="OUTGOING">Outgoing (to another facility)</option>
          <option value="INCOMING">Incoming (from another facility)</option>
        </select>
        <input type="text" placeholder="Other facility name" value={form.facility_name} onChange={(e) => setForm((p) => ({ ...p, facility_name: e.target.value }))} required />
        <input type="text" placeholder="Facility contact" value={form.facility_contact} onChange={(e) => setForm((p) => ({ ...p, facility_contact: e.target.value }))} />
        <textarea placeholder="Reason for referral" value={form.reason} onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))} required />
        <textarea placeholder="Clinical summary" value={form.clinical_summary} onChange={(e) => setForm((p) => ({ ...p, clinical_summary: e.target.value }))} />
        {form.direction === "INCOMING" && (
          <input type="text" placeholder="Referring doctor (outside)" value={form.referring_doctor} onChange={(e) => setForm((p) => ({ ...p, referring_doctor: e.target.value }))} />
        )}
        <select value={form.receiving_doctor} onChange={(e) => setForm((p) => ({ ...p, receiving_doctor: e.target.value }))}>
          <option value="">Receiving doctor (optional)</option>
          {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
        </select>
        <button type="submit" disabled={!selectedPatient}>Create Referral</button>
      </form>

      <h2>All Referrals</h2>
      <select value={directionFilter} onChange={(e) => setDirectionFilter(e.target.value)}>
        <option value="">All</option>
        <option value="INCOMING">Incoming</option>
        <option value="OUTGOING">Outgoing</option>
      </select>

      <table>
        <thead><tr><th>Referral #</th><th>Patient</th><th>Direction</th><th>Facility</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {referrals.map((r) => (
            <tr key={r.id}>
              <td>{r.referral_number}</td><td>{r.patient_name}</td><td>{r.direction}</td>
              <td>{r.facility_name}</td><td>{r.status}</td>
              <td>
                {r.status === "PENDING" && (
                  <>
                    <button type="button" onClick={() => handleStatusChange(r.id, "ACCEPTED")}>Accept</button>
                    <button type="button" onClick={() => handleStatusChange(r.id, "DECLINED")}>Decline</button>
                  </>
                )}
                {r.status === "ACCEPTED" && <button type="button" onClick={() => handleStatusChange(r.id, "COMPLETED")}>Mark Completed</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}