import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMortuaryCases, getMortuaryUnits } from "../../services/api";

export default function MortuaryRegister() {
  const [cases, setCases] = useState([]);
  const [units, setUnits] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ADMITTED");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { loadUnits(); }, []);
  useEffect(() => { load(); }, [statusFilter, search]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const data = await getMortuaryCases(params);
      setCases(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadUnits = async () => {
    try {
      const data = await getMortuaryUnits();
      setUnits(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const occupied = units.filter((u) => u.status === "OCCUPIED").length;

  return (
    <div>
      <h1>Mortuary Register</h1>
      {error && <p>Error: {error}</p>}
      <Link to="/mortuary/admit"><button type="button">+ Admit Deceased</button></Link>

      <h2>Compartment Status</h2>
      <p>Occupied: {occupied} / {units.length}</p>
      <table>
        <thead><tr><th>Compartment</th><th>Daily Rate</th><th>Status</th><th>Current Case</th></tr></thead>
        <tbody>
          {units.map((u) => (
            <tr key={u.id}>
              <td>{u.compartment_number}</td><td>KES {u.daily_storage_rate}</td><td>{u.status}</td>
              <td>
                {u.current_case ? (
                  <Link to={`/mortuary/${u.current_case.case_id}`}>
                    {u.current_case.case_number} - {u.current_case.deceased_name}
                  </Link>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Cases</h2>
      <input type="text" placeholder="Search by case #, name" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="ADMITTED">In Mortuary</option>
        <option value="RELEASED">Released</option>
      </select>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead>
            <tr><th>Case #</th><th>Deceased</th><th>Compartment</th><th>Source</th><th>Status</th><th>Days in Storage</th><th></th></tr>
          </thead>
          <tbody>
            {cases.map((c) => (
              <tr key={c.id}>
                <td>{c.case_number}</td><td>{c.deceased_display_name}</td>
                <td>{c.compartment_number || "—"}</td><td>{c.source}</td>
                <td>{c.status}</td><td>{c.days_in_storage}</td>
                <td><Link to={`/mortuary/${c.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && cases.length === 0 && <p>No cases found.</p>}
    </div>
  );
}