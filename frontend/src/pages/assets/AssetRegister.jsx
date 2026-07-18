import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAssets, getAssetSummary } from "../../services/api";

export default function AssetRegister() {
  const [assets, setAssets] = useState([]);
  const [summary, setSummary] = useState(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); loadSummary(); }, [statusFilter, search]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const data = await getAssets(params);
      setAssets(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadSummary = async () => {
    try {
      const data = await getAssetSummary();
      setSummary(data);
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Asset Register</h1>
      {error && <p>Error: {error}</p>}
      <Link to="/assets/register"><button type="button">+ Register Asset</button></Link>

      {summary && (
        <div>
          <p>Total Assets: {summary.total_assets}</p>
          <p>Total Current Value: KES {summary.total_current_value}</p>
          <p>Under Warranty: {summary.under_warranty}</p>
          <p>Under Maintenance: {summary.under_maintenance}</p>
        </div>
      )}

      <input type="text" placeholder="Search by tag, name, serial number" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All Statuses</option>
        <option value="IN_USE">In Use</option>
        <option value="IN_STORE">In Store</option>
        <option value="UNDER_MAINTENANCE">Under Maintenance</option>
        <option value="DISPOSED">Disposed</option>
        <option value="LOST">Lost</option>
      </select>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead>
            <tr>
              <th>Tag</th><th>Name</th><th>Category</th><th>Department</th>
              <th>Assigned To</th><th>Status</th><th>Condition</th>
              <th>Purchase Cost</th><th>Current Value</th><th></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => (
              <tr key={a.id}>
                <td>{a.asset_tag}</td><td>{a.name}</td><td>{a.category_name}</td>
                <td>{a.department_name || "—"}</td><td>{a.assigned_to_name || "—"}</td>
                <td>{a.status}</td><td>{a.condition}</td>
                <td>KES {a.purchase_cost}</td><td>KES {a.current_value}</td>
                <td><Link to={`/assets/${a.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && assets.length === 0 && <p>No assets found.</p>}
    </div>
  );
}