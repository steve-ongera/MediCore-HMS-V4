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

  const getStatusBadge = (status) => {
    const statusMap = {
      "IN_USE": "badge-success",
      "IN_STORE": "badge-info",
      "UNDER_MAINTENANCE": "badge-warning",
      "DISPOSED": "badge-danger",
      "LOST": "badge-danger",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getConditionBadge = (condition) => {
    const conditionMap = {
      "NEW": "badge-success",
      "GOOD": "badge-primary",
      "FAIR": "badge-info",
      "POOR": "badge-warning",
      "UNUSABLE": "badge-danger",
    };
    return conditionMap[condition] || "badge-neutral";
  };

  // Format currency with 2 decimal places
  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading && assets.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading assets...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Asset Management</div>
          <h1 className="page-title">Asset Register</h1>
          <p className="page-subtitle">Manage all facility assets</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => { load(); loadSummary(); }}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
          <Link to="/assets/register" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i> Register Asset
          </Link>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-2"></i> {error}
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      {summary && (
        <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
          <div className="stat-card">
            <div className="stat-card__top">
              <span className="stat-card__label">Total Assets</span>
              <div className="stat-card__icon tone-primary">
                <i className="bi bi-boxes"></i>
              </div>
            </div>
            <div className="stat-card__value">{summary.total_assets}</div>
          </div>

          <div className="stat-card">
            <div className="stat-card__top">
              <span className="stat-card__label">Total Current Value</span>
              <div className="stat-card__icon tone-success">
                <i className="bi bi-currency-dollar"></i>
              </div>
            </div>
            <div className="stat-card__value">{formatCurrency(summary.total_current_value)}</div>
          </div>

          <div className="stat-card">
            <div className="stat-card__top">
              <span className="stat-card__label">Under Warranty</span>
              <div className="stat-card__icon tone-info">
                <i className="bi bi-shield-check"></i>
              </div>
            </div>
            <div className="stat-card__value">{summary.under_warranty}</div>
          </div>

          <div className="stat-card">
            <div className="stat-card__top">
              <span className="stat-card__label">Under Maintenance</span>
              <div className="stat-card__icon tone-warning">
                <i className="bi bi-tools"></i>
              </div>
            </div>
            <div className="stat-card__value">{summary.under_maintenance}</div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="search-bar" style={{ width: "250px" }}>
              <i className="bi bi-search search-bar__icon"></i>
              <input
                type="text"
                className="search-bar__input"
                placeholder="Search by tag, name, serial..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="search-bar__clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "180px" }}
              >
                <option value="">All Statuses</option>
                <option value="IN_USE">In Use</option>
                <option value="IN_STORE">In Store</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="DISPOSED">Disposed</option>
                <option value="LOST">Lost</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {assets.length} asset{assets.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {assets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-boxes"></i>
              </div>
              <h3 className="empty-state__title">No assets found</h3>
              <p className="empty-state__desc">
                {search || statusFilter 
                  ? "No assets match your search criteria." 
                  : "Start by registering a new asset."}
              </p>
              {!search && !statusFilter && (
                <Link to="/assets/register" className="btn btn-primary">
                  <i className="bi bi-plus-circle me-2"></i> Register Asset
                </Link>
              )}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Name</th>
                    <th>Category</th>
                    <th>Department</th>
                    <th>Assigned To</th>
                    <th>Status</th>
                    <th>Condition</th>
                    <th className="cell-numeric">Purchase Cost</th>
                    <th className="cell-numeric">Current Value</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((a) => (
                    <tr key={a.id}>
                      <td className="cell-mono">{a.asset_tag}</td>
                      <td className="cell-primary">{a.name}</td>
                      <td>{a.category_name}</td>
                      <td>{a.department_name || "—"}</td>
                      <td>{a.assigned_to_name || "—"}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(a.status)}`}>
                          <span className="badge-dot"></span>
                          {a.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getConditionBadge(a.condition)}`}>
                          <span className="badge-dot"></span>
                          {a.condition}
                        </span>
                      </td>
                      <td className="cell-numeric">{formatCurrency(a.purchase_cost)}</td>
                      <td className="cell-numeric">{formatCurrency(a.current_value)}</td>
                      <td className="cell-actions">
                        <Link to={`/assets/${a.id}`} className="btn btn-secondary btn-sm">
                          <i className="bi bi-eye me-1"></i> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {assets.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {assets.length} asset{assets.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                In Use
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                In Store
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Maintenance
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Disposed/Lost
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}