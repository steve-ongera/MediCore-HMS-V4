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

  const getStatusBadge = (status) => {
    const statusMap = {
      "ADMITTED": "badge-primary",
      "RELEASED": "badge-success",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getUnitStatusBadge = (status) => {
    const statusMap = {
      "AVAILABLE": "badge-success",
      "OCCUPIED": "badge-danger",
      "UNDER_MAINTENANCE": "badge-warning",
    };
    return statusMap[status] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  const occupied = units.filter((u) => u.status === "OCCUPIED").length;

  if (loading && cases.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading mortuary register...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Mortuary Services</div>
          <h1 className="page-title">Mortuary Register</h1>
          <p className="page-subtitle">Manage deceased cases and compartments</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => { load(); loadUnits(); }}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
          <Link to="/mortuary/admit" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i> Admit Deceased
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

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-grid me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Compartment Status</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {occupied} occupied / {units.length} total
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {units.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-grid"></i>
              </div>
              <h3 className="empty-state__title">No compartments configured</h3>
              <p className="empty-state__desc">Mortuary compartments need to be set up.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Compartment</th>
                    <th className="cell-numeric">Daily Rate</th>
                    <th>Status</th>
                    <th>Current Case</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map((u) => (
                    <tr key={u.id}>
                      <td className="cell-mono">{u.compartment_number}</td>
                      <td className="cell-numeric">{formatCurrency(u.daily_storage_rate)}</td>
                      <td>
                        <span className={`badge ${getUnitStatusBadge(u.status)}`}>
                          <span className="badge-dot"></span>
                          {u.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        {u.current_case ? (
                          <Link to={`/mortuary/${u.current_case.case_id}`} className="btn btn-secondary btn-sm">
                            <i className="bi bi-eye me-1"></i>
                            {u.current_case.case_number} - {u.current_case.deceased_name}
                          </Link>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {units.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {units.length} compartment{units.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Available
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Occupied
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Maintenance
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="search-bar" style={{ width: "220px" }}>
              <i className="bi bi-search search-bar__icon"></i>
              <input
                type="text"
                className="search-bar__input"
                placeholder="Search by case #, name..."
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
                style={{ width: "160px" }}
              >
                <option value="">All</option>
                <option value="ADMITTED">In Mortuary</option>
                <option value="RELEASED">Released</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {cases.length} case{cases.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {cases.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-file-text"></i>
              </div>
              <h3 className="empty-state__title">No cases found</h3>
              <p className="empty-state__desc">
                {search || statusFilter 
                  ? "No cases match your search criteria." 
                  : "Start by admitting a deceased patient."}
              </p>
              {!search && !statusFilter && (
                <Link to="/mortuary/admit" className="btn btn-primary">
                  <i className="bi bi-plus-circle me-2"></i> Admit Deceased
                </Link>
              )}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Case #</th>
                    <th>Deceased</th>
                    <th>Compartment</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th className="cell-numeric">Days in Storage</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {cases.map((c) => (
                    <tr key={c.id}>
                      <td className="cell-mono">{c.case_number}</td>
                      <td className="cell-primary">{c.deceased_display_name}</td>
                      <td className="cell-mono">{c.compartment_number || "—"}</td>
                      <td>
                        <span className="tag">{c.source}</span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(c.status)}`}>
                          <span className="badge-dot"></span>
                          {c.status}
                        </span>
                      </td>
                      <td className="cell-numeric">{c.days_in_storage}</td>
                      <td className="cell-actions">
                        <Link to={`/mortuary/${c.id}`} className="btn btn-secondary btn-sm">
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
        {cases.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {cases.length} case{cases.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}