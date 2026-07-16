import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getInsurancePolicies, getInvoices, createInsuranceClaim } from "../../services/api";

export default function FileClaim() {
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [policies, setPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState("");

  const [invoices, setInvoices] = useState([]);
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState([]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (selectedPatient) {
      loadPolicies(selectedPatient.id);
      loadInvoices(selectedPatient.id);
    }
  }, [selectedPatient]);

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadPolicies = async (patientId) => {
    try {
      const data = await getInsurancePolicies({ patient: patientId });
      setPolicies(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadInvoices = async (patientId) => {
    try {
      const data = await getInvoices({ patient: patientId, page_size: 100 });
      const results = (data.results ?? data).filter((inv) => Number(inv.balance) > 0);
      setInvoices(results);
    } catch (err) { setError(err.message); }
  };

  const toggleInvoice = (id) => {
    setSelectedInvoiceIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const totalSelected = invoices
    .filter((inv) => selectedInvoiceIds.includes(inv.id))
    .reduce((sum, inv) => sum + Number(inv.balance), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !selectedPolicy || selectedInvoiceIds.length === 0) {
      setError("Select a patient, policy, and at least one invoice.");
      return;
    }
    setSubmitting(true);
    try {
      const claim = await createInsuranceClaim({
        patient: selectedPatient.id, policy: selectedPolicy,
        invoice_ids: selectedInvoiceIds, notes,
      });
      navigate(`/insurance/claims/${claim.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <h1>File Insurance Claim</h1>
      {error && <p>Error: {error}</p>}

      <h2>1. Find Patient</h2>
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
        <>
          <p>Patient: <strong>{selectedPatient.full_name}</strong></p>

          <h2>2. Select Policy</h2>
          <select value={selectedPolicy} onChange={(e) => setSelectedPolicy(e.target.value)} required>
            <option value="">Select policy</option>
            {policies.map((p) => (
              <option key={p.id} value={p.id}>{p.insurer_name} — {p.member_number} {p.is_currently_valid ? "" : "(EXPIRED)"}</option>
            ))}
          </select>

          <h2>3. Select Invoices to Claim</h2>
          {invoices.length === 0 ? <p>No outstanding invoices for this patient.</p> : (
            <table>
              <thead><tr><th></th><th>Invoice #</th><th>Description</th><th>Type</th><th>Balance</th></tr></thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td><input type="checkbox" checked={selectedInvoiceIds.includes(inv.id)} onChange={() => toggleInvoice(inv.id)} /></td>
                    <td>{inv.invoice_number}</td>
                    <td>{inv.description}</td>
                    <td>{inv.source_type}</td>
                    <td>KES {inv.balance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p>Total to claim: KES {totalSelected}</p>

          <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Filing..." : "File Claim"}
          </button>
        </>
      )}
    </div>
  );
}