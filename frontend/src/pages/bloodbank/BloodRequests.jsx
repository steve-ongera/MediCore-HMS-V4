import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBloodRequests, createBloodRequest, getPatients } from "../../services/api";

export default function BloodRequests() {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [form, setForm] = useState({
    patient_blood_group: "O+", component_type: "WHOLE_BLOOD", units_requested: "1",
    priority: "ROUTINE", clinical_indication: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getBloodRequests(params);
      setRequests(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
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
      setError("Select a patient first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await createBloodRequest({
        patient: selectedPatient.id,
        ...form,
        units_requested: Number(form.units_requested),
      });
      setSelectedPatient(null);
      setPatientQuery("");
      setPatientResults([]);
      setForm({ patient_blood_group: "O+", component_type: "WHOLE_BLOOD", units_requested: "1", priority: "ROUTINE", clinical_indication: "" });
      load();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <h1>Blood Requests</h1>
      {error && <p>Error: {error}</p>}

      <h2>New Request</h2>
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
      {selectedPatient && <p>Patient: <strong>{selectedPatient.full_name}</strong></p>}

      <form onSubmit={handleSubmit}>
        <select value={form.patient_blood_group} onChange={handleChange("patient_blood_group")}>
          {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={form.component_type} onChange={handleChange("component_type")}>
          <option value="WHOLE_BLOOD">Whole Blood</option>
          <option value="PACKED_RED_CELLS">Packed Red Cells</option>
          <option value="PLATELETS">Platelets</option>
          <option value="FRESH_FROZEN_PLASMA">Fresh Frozen Plasma</option>
          <option value="CRYOPRECIPITATE">Cryoprecipitate</option>
        </select>
        <input type="number" min="1" placeholder="Units requested" value={form.units_requested} onChange={handleChange("units_requested")} />
        <select value={form.priority} onChange={handleChange("priority")}>
          <option value="EMERGENCY">Emergency</option>
          <option value="URGENT">Urgent</option>
          <option value="ROUTINE">Routine</option>
        </select>
        <textarea placeholder="Clinical indication" value={form.clinical_indication} onChange={handleChange("clinical_indication")} />
        <button type="submit" disabled={submitting || !selectedPatient}>
          {submitting ? "Submitting..." : "Submit Request"}
        </button>
      </form>

      <h2>All Requests</h2>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="PENDING">Pending</option>
        <option value="CROSS_MATCHED">Cross-Matched</option>
        <option value="ISSUED">Issued</option>
        <option value="CANCELLED">Cancelled</option>
        <option value="REJECTED">Rejected</option>
      </select>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Request #</th><th>Patient</th><th>Blood Group</th><th>Component</th><th>Units</th><th>Priority</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {requests.map((r) => (
              <tr key={r.id}>
                <td>{r.request_number}</td><td>{r.patient_name}</td><td>{r.patient_blood_group}</td>
                <td>{r.component_type}</td><td>{r.units_requested}</td><td>{r.priority}</td><td>{r.status}</td>
                <td><Link to={`/bloodbank/requests/${r.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}