import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDentalVisits } from "../../services/api";

export default function DentalVisits() {
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
      const data = await getDentalVisits(params);
      setVisits(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div>
      <h1>Dental Visits</h1>
      {error && <p>Error: {error}</p>}
      <Link to="/dental/register"><button type="button">+ Register Visit</button></Link>

      <input type="text" placeholder="Search by patient, visit #" value={search} onChange={(e) => setSearch(e.target.value)} />

      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Visit #</th><th>Patient</th><th>Dentist</th><th>Chief Complaint</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {visits.map((v) => (
              <tr key={v.id}>
                <td>{v.visit_number}</td><td>{v.patient_name}</td>
                <td>{v.dentist_name || "—"}</td><td>{v.chief_complaint || "—"}</td>
                <td>{new Date(v.visit_date).toLocaleString()}</td>
                <td><Link to={`/dental/${v.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && visits.length === 0 && <p>No dental visits found.</p>}
    </div>
  );
}