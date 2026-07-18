import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAssetMaintenanceRecords, completeAssetMaintenance } from "../../services/api";

export default function AssetMaintenance() {
  const [records, setRecords] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getAssetMaintenanceRecords(params);
      setRecords(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleComplete = async (id) => {
    try {
      await completeAssetMaintenance(id);
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Asset Maintenance</h1>
      {error && <p>Error: {error}</p>}

      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="SCHEDULED">Scheduled</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="COMPLETED">Completed</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Asset</th><th>Type</th><th>Status</th><th>Scheduled</th><th>Vendor</th><th>Cost</th><th></th></tr></thead>
          <tbody>
            {records.map((m) => (
              <tr key={m.id}>
                <td><Link to={`/assets/${m.asset}`}>{m.asset_tag} - {m.asset_name}</Link></td>
                <td>{m.maintenance_type}</td><td>{m.status}</td>
                <td>{m.scheduled_date || "—"}</td><td>{m.vendor || "—"}</td>
                <td>{m.cost ? `KES ${m.cost}` : "—"}</td>
                <td>
                  {(m.status === "SCHEDULED" || m.status === "IN_PROGRESS") && (
                    <button type="button" onClick={() => handleComplete(m.id)}>Mark Complete</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && records.length === 0 && <p>No maintenance records.</p>}
    </div>
  );
}