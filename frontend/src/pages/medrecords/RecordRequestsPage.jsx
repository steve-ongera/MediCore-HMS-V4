import { useEffect, useState } from "react";
import { getRecordRequests, createRecordRequest, approveRecordRequest, denyRecordRequest, fulfillRecordRequest, getPatients } from "../../services/api";

export default function RecordRequestsPage() {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [error, setError] = useState("");

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [purpose, setPurpose] = useState("CLINICAL_CARE");
  const [purposeDetails, setPurposeDetails] = useState("");

  const [denyingId, setDenyingId] = useState(null);
  const [denyReason, setDenyReason] = useState("");

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getRecordRequests(params);
      setRequests(data.results ?? data);
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

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) { setError("Select a patient first."); return; }
    try {
      await createRecordRequest({ patient: selectedPatient.id, purpose, purpose_details: purposeDetails });
      setSelectedPatient(null);
      setPatientQuery("");
      setPurposeDetails("");
      load();
    } catch (err) { setError(err.message); }
  };

  const handleApprove = async (id) => {
    try { await approveRecordRequest(id); load(); } catch (err) { setError(err.message); }
  };

  const submitDeny = async (id) => {
    try {
      await denyRecordRequest(id, { denial_reason: denyReason });
      setDenyingId(null);
      setDenyReason("");
      load();
    } catch (err) { setError(err.message); }
  };

  const handleFulfill = async (id) => {
    try { await fulfillRecordRequest(id); load(); } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Record Requests</h1>
      <p>Anyone requesting a patient's medical records must file a request here. HIM reviews and approves/denies before it can be fulfilled.</p>
      {error && <p>Error: {error}</p>}

      <h2>New Request</h2>
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
        <select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
          <option value="CLINICAL_CARE">Continued Clinical Care</option>
          <option value="INSURANCE">Insurance Claim</option>
          <option value="LEGAL">Legal Proceedings</option>
          <option value="PATIENT_COPY">Patient's Own Copy</option>
          <option value="RESEARCH">Research</option>
          <option value="OTHER">Other</option>
        </select>
        <textarea placeholder="Additional details" value={purposeDetails} onChange={(e) => setPurposeDetails(e.target.value)} />
        <button type="submit" disabled={!selectedPatient}>Submit Request</button>
      </form>

      <h2>All Requests</h2>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="DENIED">Denied</option>
        <option value="FULFILLED">Fulfilled</option>
      </select>

      <table>
        <thead><tr><th>Request #</th><th>Patient</th><th>Requested By</th><th>Purpose</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td>{r.request_number}</td><td>{r.patient_name}</td><td>{r.requested_by_name}</td>
              <td>{r.purpose}</td><td>{r.status}</td>
              <td>
                {r.status === "PENDING" && (
                  <>
                    <button type="button" onClick={() => handleApprove(r.id)}>Approve</button>{" "}
                    {denyingId === r.id ? (
                      <>
                        <input type="text" placeholder="Reason" value={denyReason} onChange={(e) => setDenyReason(e.target.value)} />
                        <button type="button" onClick={() => submitDeny(r.id)}>Confirm Deny</button>
                      </>
                    ) : (
                      <button type="button" onClick={() => setDenyingId(r.id)}>Deny</button>
                    )}
                  </>
                )}
                {r.status === "APPROVED" && <button type="button" onClick={() => handleFulfill(r.id)}>Mark Fulfilled</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}