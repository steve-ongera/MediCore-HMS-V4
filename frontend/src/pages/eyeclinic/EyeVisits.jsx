import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEyeVisits } from "../../services/api";

export default function EyeVisits() {
  const [visits, setVisits] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (search) params.search = search;
      const data = await getEyeVisits(params);
      setVisits(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div>
      <h1>Eye Clinic Visits</h1>
      {error && <p>Error: {error}</p>}
      <Link to="/eyeclinic/register"><button type="button">+ Register Visit</button></Link>

      <input type="text" placeholder="Search by patient, visit #" value={search} onChange={(e) => setSearch(e.target.value)} />

      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Visit #</th><th>Patient</th><th>Ophthalmologist</th><th>Chief Complaint</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {visits.map((v) => (
              <tr key={v.id}>
                <td>{v.visit_number}</td><td>{v.patient_name}</td>
                <td>{v.ophthalmologist_name || "—"}</td><td>{v.chief_complaint || "—"}</td>
                <td>{new Date(v.visit_date).toLocaleString()}</td>
                <td><Link to={`/eyeclinic/${v.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && visits.length === 0 && <p>No eye clinic visits found.</p>}
    </div>
  );
}