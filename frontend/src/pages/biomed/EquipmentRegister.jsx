import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEquipment } from "../../services/api";

export default function EquipmentRegister() {
  const [equipment, setEquipment] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [categoryFilter, statusFilter, search]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 200 };
      if (categoryFilter) params.category = categoryFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const data = await getEquipment(params);
      setEquipment(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div>
      <h1>Equipment Register</h1>
      {error && <p>Error: {error}</p>}
      <Link to="/biomed/equipment/register"><button type="button">+ Register Equipment</button></Link>

      <input type="text" placeholder="Search by tag, name, serial #" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
        <option value="">All Categories</option>
        <option value="DIAGNOSTIC">Diagnostic</option>
        <option value="THERAPEUTIC">Therapeutic</option>
        <option value="LIFE_SUPPORT">Life Support</option>
        <option value="LABORATORY">Laboratory</option>
        <option value="IMAGING">Imaging</option>
        <option value="STERILIZATION">Sterilization</option>
        <option value="OTHER">Other</option>
      </select>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All Statuses</option>
        <option value="OPERATIONAL">Operational</option>
        <option value="UNDER_MAINTENANCE">Under Maintenance</option>
        <option value="OUT_OF_SERVICE">Out of Service</option>
        <option value="AWAITING_PARTS">Awaiting Parts</option>
        <option value="DECOMMISSIONED">Decommissioned</option>
      </select>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead>
            <tr>
              <th>Tag</th><th>Name</th><th>Category</th><th>Department</th><th>Status</th>
              <th>Risk</th><th>Next PM Due</th><th>Next Calibration Due</th><th></th>
            </tr>
          </thead>
          <tbody>
            {equipment.map((e) => (
              <tr key={e.id} style={{ background: e.status === "OUT_OF_SERVICE" ? "#fee" : "inherit" }}>
                <td>{e.asset_tag}</td><td>{e.name}</td><td>{e.category}</td><td>{e.department || "—"}</td>
                <td>{e.status}</td><td>{e.risk_class}</td>
                <td>{e.next_preventive_maintenance_due || "—"}</td>
                <td>{e.next_calibration_due || "—"}</td>
                <td><Link to={`/biomed/equipment/${e.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && equipment.length === 0 && <p>No equipment found.</p>}
    </div>
  );
}