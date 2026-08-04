import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEquipment } from "../../services/api";
import { formatDate } from "../../utils/formatters";

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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "OPERATIONAL": "badge-success",
      "UNDER_MAINTENANCE": "badge-warning",
      "OUT_OF_SERVICE": "badge-danger",
      "AWAITING_PARTS": "badge-info",
      "DECOMMISSIONED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getCategoryBadge = (category) => {
    const categoryMap = {
      "DIAGNOSTIC": "badge-primary",
      "THERAPEUTIC": "badge-success",
      "LIFE_SUPPORT": "badge-danger",
      "LABORATORY": "badge-info",
      "IMAGING": "badge-warning",
      "STERILIZATION": "badge-secondary",
      "OTHER": "badge-neutral",
    };
    return categoryMap[category] || "badge-neutral";
  };

  const getRiskBadge = (risk) => {
    const riskMap = {
      "HIGH": "badge-danger",
      "MEDIUM": "badge-warning",
      "LOW": "badge-success",
    };
    return riskMap[risk] || "badge-neutral";
  };

  if (loading && equipment.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading equipment...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Biomedical Engineering</div>
          <h1 className="page-title">Equipment Register</h1>
          <p className="page-subtitle">Manage all medical equipment</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
          <Link to="/biomed/equipment/register" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i> Register Equipment
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

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="search-bar" style={{ width: "220px" }}>
              <i className="bi bi-search search-bar__icon"></i>
              <input
                type="text"
                className="search-bar__input"
                placeholder="Search by tag, name, serial #..."
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
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{ width: "160px" }}
              >
                <option value="">All Categories</option>
                <option value="DIAGNOSTIC">Diagnostic</option>
                <option value="THERAPEUTIC">Therapeutic</option>
                <option value="LIFE_SUPPORT">Life Support</option>
                <option value="LABORATORY">Laboratory</option>
                <option value="IMAGING">Imaging</option>
                <option value="STERILIZATION">Sterilization</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "160px" }}
              >
                <option value="">All Statuses</option>
                <option value="OPERATIONAL">Operational</option>
                <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                <option value="OUT_OF_SERVICE">Out of Service</option>
                <option value="AWAITING_PARTS">Awaiting Parts</option>
                <option value="DECOMMISSIONED">Decommissioned</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {equipment.length} item{equipment.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {equipment.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-tools"></i>
              </div>
              <h3 className="empty-state__title">No equipment found</h3>
              <p className="empty-state__desc">
                {search || categoryFilter || statusFilter 
                  ? "No equipment matches your search criteria." 
                  : "Register new equipment to get started."}
              </p>
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
                    <th>Status</th>
                    <th>Risk</th>
                    <th>Next PM Due</th>
                    <th>Next Calibration Due</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((e) => (
                    <tr key={e.id} style={e.status === "OUT_OF_SERVICE" ? { background: "var(--danger-soft)" } : {}}>
                      <td className="cell-mono">{e.asset_tag}</td>
                      <td className="cell-primary">{e.name}</td>
                      <td>
                        <span className={`badge ${getCategoryBadge(e.category)}`}>
                          <span className="badge-dot"></span>
                          {e.category}
                        </span>
                      </td>
                      <td>{e.department || "—"}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(e.status)}`}>
                          <span className="badge-dot"></span>
                          {e.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getRiskBadge(e.risk_class)}`}>
                          <span className="badge-dot"></span>
                          {e.risk_class}
                        </span>
                      </td>
                      <td>{e.next_preventive_maintenance_due ? formatDate(e.next_preventive_maintenance_due) : "—"}</td>
                      <td>{e.next_calibration_due ? formatDate(e.next_calibration_due) : "—"}</td>
                      <td className="cell-actions">
                        <Link to={`/biomed/equipment/${e.id}`} className="btn btn-secondary btn-sm">
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
        {equipment.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {equipment.length} item{equipment.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Operational
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Maintenance
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Out of Service
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                Awaiting Parts
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}