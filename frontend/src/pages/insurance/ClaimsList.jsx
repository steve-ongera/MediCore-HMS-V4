import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getInsuranceClaims } from "../../services/api";

export default function ClaimsList() {
  const [claims, setClaims] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getInsuranceClaims(params);
      setClaims(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div>
      <h1>Insurance Claims</h1>
      {error && <p>Error: {error}</p>}
      <Link to="/insurance/claims/new"><button type="button">+ File Claim</button></Link>

      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="DRAFT">Draft</option>
        <option value="SUBMITTED">Submitted</option>
        <option value="UNDER_REVIEW">Under Review</option>
        <option value="APPROVED">Approved</option>
        <option value="PARTIALLY_APPROVED">Partially Approved</option>
        <option value="REJECTED">Rejected</option>
        <option value="SETTLED">Settled</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Claim #</th><th>Patient</th><th>Insurer</th><th>Status</th><th>Claimed</th><th>Approved</th><th></th></tr></thead>
          <tbody>
            {claims.map((c) => (
              <tr key={c.id}>
                <td>{c.claim_number}</td><td>{c.patient_name}</td><td>{c.insurer_name}</td>
                <td>{c.status}</td><td>KES {c.total_claimed}</td><td>KES {c.total_approved}</td>
                <td><Link to={`/insurance/claims/${c.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}