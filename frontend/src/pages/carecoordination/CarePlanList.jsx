import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCarePlans } from "../../services/api";

export default function CarePlanList() {
  const [plans, setPlans] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [chronicOnly, setChronicOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [statusFilter, chronicOnly, search]);

  const load = async () => {
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      if (chronicOnly) params.is_chronic = true;
      if (search) params.search = search;
      const data = await getCarePlans(params);
      setPlans(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Care Plans</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <input type="text" placeholder="Search by patient, title, condition" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="ACTIVE">Active</option>
        <option value="COMPLETED">Completed</option>
        <option value="DISCONTINUED">Discontinued</option>
      </select>
      <label><input type="checkbox" checked={chronicOnly} onChange={(e) => setChronicOnly(e.target.checked)} /> Chronic only</label>

      <table>
        <thead><tr><th>Patient</th><th>Title</th><th>Condition</th><th>Chronic?</th><th>Doctor</th><th>Open Tasks</th><th>Next Due</th><th></th></tr></thead>
        <tbody>
          {plans.map((p) => (
            <tr key={p.id}>
              <td>{p.patient_name}</td><td>{p.title}</td><td>{p.condition || "—"}</td>
              <td>{p.is_chronic ? "Yes" : "No"}</td><td>{p.responsible_doctor_name || "—"}</td>
              <td>{p.open_task_count}</td><td>{p.next_due_date || "—"}</td>
              <td><Link to={`/care-coordination/care-plans/${p.id}`}>View</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      {plans.length === 0 && <p>No care plans found.</p>}
    </div>
  );
}