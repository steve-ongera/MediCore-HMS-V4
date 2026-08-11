import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getVisits, deleteVisit } from "../../services/api";

const PAGE_SIZE = 20;

export default function VisitList() {
  const [visits, setVisits] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [page, search, statusFilter]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const data = await getVisits(params);
      setVisits(data.results ?? data);
      setTotal(data.count ?? (data.results ?? data).length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (visit) => {
    if (!window.confirm(`Delete visit ${visit.visit_number} for ${visit.patient_name}? This cannot be undone.`)) return;
    try {
      await deleteVisit(visit.id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  // Status badge mapping
  const getStatusBadge = (status) => {
    const statusMap = {
      'WAITING': 'badge-warning',
      'IN_CONSULTATION': 'badge-info',
      'COMPLETED': 'badge-success',
      'CANCELLED': 'badge-neutral',
      'REGISTERED': 'badge-info',
      'IN_QUEUE': 'badge-warning',
    };
    return statusMap[status] || 'badge-neutral';
  };

  // Status display names
  const getStatusLabel = (status) => {
    return status?.replace('_', ' ') || status;
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Clinical</div>
          <h1 className="page-title">Visit List</h1>
          <p className="page-subtitle">Manage and track all patient visits</p>
        </div>
        <div className="page-header__actions">
          <Link to="/visits/register" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i>
            Register Visit
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div 
          className="alert alert-danger" 
          style={{ 
            marginBottom: "var(--space-4)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)"
          }}
        >
          <i className="bi bi-exclamation-circle-fill"></i>
          <span>Error: {error}</span>
          <button 
            className="btn-icon-only" 
            onClick={() => setError("")}
            style={{ marginLeft: "auto", color: "var(--text-tertiary)" }}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap" style={{ flex: 1 }}>
            {/* Search Bar */}
            <div className="search-bar" style={{ minWidth: "240px" }}>
              <i className="search-bar__icon bi bi-search"></i>
              <input
                type="text"
                className="search-bar__input"
                placeholder="Search by visit #, patient name, hospital #..."
                value={search}
                onChange={(e) => { 
                  setSearch(e.target.value); 
                  setPage(1); 
                }}
              />
              {search && (
                <button 
                  className="search-bar__clear" 
                  onClick={() => { setSearch(""); setPage(1); }}
                  aria-label="Clear search"
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select 
              className="select" 
              value={statusFilter} 
              onChange={(e) => { 
                setStatusFilter(e.target.value); 
                setPage(1); 
              }}
              style={{ width: "160px" }}
            >
              <option value="">All Statuses</option>
              <option value="WAITING">Waiting</option>
              <option value="IN_CONSULTATION">In Consultation</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div>
            <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
              <i className={`bi ${loading ? 'bi-arrow-repeat spin' : 'bi-arrow-repeat'}`}></i>
              Refresh
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="loading-screen" style={{ minHeight: "200px" }}>
              <div className="spinner spinner-lg"></div>
              <span className="loading-screen__label">Loading visits...</span>
            </div>
          ) : visits.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-clipboard"></i>
              </div>
              <div className="empty-state__title">No visits found</div>
              <div className="empty-state__desc">
                {search || statusFilter ? "No results match your search criteria." : "Start by registering a new visit."}
              </div>
              <Link to="/visits/register" className="btn btn-primary">
                <i className="bi bi-plus-circle me-2"></i>
                Register First Visit
              </Link>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Visit #</th>
                      <th>Patient</th>
                      <th>Department</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((v) => (
                      <tr key={v.id} className="is-clickable">
                        <td className="cell-mono">{v.visit_number}</td>
                        <td>
                          <div className="table-row-avatar">
                            <span className="avatar avatar-sm">
                              {(v.patient_name || "?").charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <div className="cell-primary">{v.patient_name}</div>
                              <div className="text-2xs text-muted">{v.hospital_number || ""}</div>
                            </div>
                          </div>
                        </td>
                        <td>{v.department_name}</td>
                        <td>
                          <span className="tag">{v.consultation_type}</span>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadge(v.status)}`}>
                            {getStatusLabel(v.status)}
                          </span>
                        </td>
                        <td className="text-sm text-muted">
                          {new Date(v.visit_date).toLocaleString()}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <div className="flex gap-1 justify-end">
                            <Link
                              to={`/visits/${v.id}`}
                              className="btn-icon-only"
                              title="View visit"
                            >
                              <i className="bi bi-eye"></i>
                            </Link>
                            <Link
                              to={`/visits/${v.id}/edit`}
                              className="btn-icon-only"
                              title="Edit visit"
                            >
                              <i className="bi bi-pencil"></i>
                            </Link>
                            <button
                              className="btn-icon-only"
                              style={{ color: "var(--danger-strong)" }}
                              onClick={() => handleDelete(v)}
                              title="Delete visit"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {!loading && visits.length > 0 && (
          <div className="table-footer">
            <span className="table-footer__meta">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total} visits
            </span>

            <div className="pagination">
              <button 
                className="pagination__btn" 
                disabled={page <= 1} 
                onClick={() => setPage((p) => p - 1)}
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              <span className="text-sm text-muted">
                Page {page} of {totalPages}
              </span>
              <button 
                className="pagination__btn" 
                disabled={page >= totalPages} 
                onClick={() => setPage((p) => p + 1)}
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}