import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPatients, getInsurers, getInsurancePolicies, createInsurancePolicy, verifyEligibility } from "../../services/api";

export default function PatientPolicies() {
  const [policies, setPolicies] = useState([]);
  const [insurers, setInsurers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [verifyResults, setVerifyResults] = useState({});

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [form, setForm] = useState({
    insurer: "", member_number: "", scheme_name: "", principal_member_name: "",
    relationship: "PRINCIPAL", valid_from: "", valid_to: "",
  });

  useEffect(() => { load(); loadInsurers(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getInsurancePolicies({ page_size: 100 });
      setPolicies(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadInsurers = async () => {
    try {
      const data = await getInsurers();
      setInsurers(data.results ?? data);
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
    if (!selectedPatient) { setError("Select a patient first."); return; }
    try {
      await createInsurancePolicy({ patient: selectedPatient.id, ...form });
      setSelectedPatient(null);
      setPatientQuery("");
      setPatientResults([]);
      setForm({ insurer: "", member_number: "", scheme_name: "", principal_member_name: "", relationship: "PRINCIPAL", valid_from: "", valid_to: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleVerify = async (policyId) => {
    try {
      const result = await verifyEligibility(policyId);
      setVerifyResults((p) => ({ ...p, [policyId]: result }));
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Patient Insurance Policies</h1>
      {error && <p>Error: {error}</p>}

      <h2>Register Policy</h2>
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

      <form onSubmit={handleSubmit}>
        <select value={form.insurer} onChange={handleChange("insurer")} required>
          <option value="">Select insurer</option>
          {insurers.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.insurer_type})</option>)}
        </select>
        <input type="text" placeholder="Member/SHA number" value={form.member_number} onChange={handleChange("member_number")} required />
        <input type="text" placeholder="Scheme name" value={form.scheme_name} onChange={handleChange("scheme_name")} />
        <input type="text" placeholder="Principal member name" value={form.principal_member_name} onChange={handleChange("principal_member_name")} />
        <select value={form.relationship} onChange={handleChange("relationship")}>
          <option value="PRINCIPAL">Principal</option>
          <option value="SPOUSE">Spouse</option>
          <option value="CHILD">Child</option>
          <option value="OTHER">Other</option>
        </select>
        <input type="date" value={form.valid_from} onChange={handleChange("valid_from")} />
        <input type="date" value={form.valid_to} onChange={handleChange("valid_to")} />
        <button type="submit" disabled={!selectedPatient}>Register Policy</button>
      </form>

      <h2>All Policies</h2>
      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Patient</th><th>Insurer</th><th>Member #</th><th>Valid</th><th>Eligibility</th></tr></thead>
          <tbody>
            {policies.map((p) => (
              <tr key={p.id}>
                <td>{p.patient_name} ({p.hospital_number})</td>
                <td>{p.insurer_name} ({p.insurer_type})</td>
                <td>{p.member_number}</td>
                <td>{p.is_currently_valid ? "Valid" : "Invalid/Expired"}</td>
                <td>
                  <button type="button" onClick={() => handleVerify(p.id)}>Verify Eligibility</button>
                  {verifyResults[p.id] && (
                    <span> — {verifyResults[p.id].is_eligible ? "ELIGIBLE" : "NOT ELIGIBLE"} ({verifyResults[p.id].member_status})</span>
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