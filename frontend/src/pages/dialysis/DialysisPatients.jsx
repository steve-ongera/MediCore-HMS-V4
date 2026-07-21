import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDialysisPatients } from "../../services/api";

export default function DialysisPatients() {
  const [patients, setPatients] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getDialysisPatients(params);
      setPatients(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div>
      <h1>Dialysis Patients</h1>
      {error && <p>Error: {error}</p>}
      <Link to="/dialysis/register"><button type="button">+ Register Patient</button></Link>

      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="ACTIVE">Active</option>
        <option value="TRANSFERRED">Transferred</option>
        <option value="TRANSPLANTED">Transplanted</option>
        <option value="DECEASED">Deceased</option>
        <option value="DISCONTINUED">Discontinued</option>
      </select>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Profile #</th><th>Patient</th><th>Access Type</th><th>Sessions/Week</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id}>
                <td>{p.profile_number}</td><td>{p.patient_name} ({p.hospital_number})</td>
                <td>{p.vascular_access_type}</td><td>{p.sessions_per_week}</td><td>{p.status}</td>
                <td><Link to={`/dialysis/patients/${p.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && patients.length === 0 && <p>No dialysis patients found.</p>}
    </div>
  );
}