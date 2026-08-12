import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCarePlans } from "../../services/api";

export default function CarePlanList() {
  const [plans, setPlans] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [chronicOnly, setChronicOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [statusFilter, chronicOnly, search]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      if (chronicOnly) params.is_chronic = true;
      if (search) params.search = search;
      const data = await getCarePlans(params);
      setPlans(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "ACTIVE": "badge-success",
      "COMPLETED": "badge-info",
      "DISCONTINUED": "badge-neutral",
      "PENDING": "badge-warning",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getStatusLabel = (status) => {
    return status?.replace("_", " ") || status;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Clinical / Care Coordination</div>
          <h1 className="page-title">Care Plans</h1>
          <p className="page-subtitle">Manage patient care plans and follow-up schedules</p>
        </div>
        <div className="page-header__actions">
          <Link to="/care-coordination/care-plans/create" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i>
            New Care Plan
          </Link>
          <Link to="/care-coordination" className="btn btn-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>
            Back to Dashboard
          </Link>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap" style={{ flex: 1 }}>
            <div className="search-bar" style={{ minWidth: "240px" }}>
              <i className="search-bar__icon bi bi-search"></i>
              <input
                type="text"
                className="search-bar__input"
                placeholder="Search by patient, title, condition..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  className="search-bar__clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>

            <select
              className="select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ width: "140px" }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
              <option value="DISCONTINUED">Discontinued</option>
            </select>

            <label className="checkbox-label" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
              <input
                type="checkbox"
                className="checkbox"
                checked={chronicOnly}
                onChange={(e) => setChronicOnly(e.target.checked)}
              />
              Chronic only
            </label>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {plans.length} plan{plans.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="loading-screen" style={{ minHeight: "200px" }}>
              <div className="spinner spinner-lg"></div>
              <span className="loading-screen__label">Loading care plans...</span>
            </div>
          ) : plans.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-file-medical"></i>
              </div>
              <div className="empty-state__title">No care plans found</div>
              <div className="empty-state__desc">
                {search || statusFilter || chronicOnly
                  ? "No results match your filters."
                  : "Start by creating a new care plan."}
              </div>
              <Link to="/care-coordination/care-plans/create" className="btn btn-primary">
                <i className="bi bi-plus-circle me-2"></i>
                Create First Care Plan
              </Link>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Title</th>
                      <th>Condition</th>
                      <th>Chronic?</th>
                      <th>Doctor</th>
                      <th style={{ textAlign: "center" }}>Open Tasks</th>
                      <th>Next Due</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((p) => (
                      <tr key={p.id} className="is-clickable">
                        <td>
                          <div className="table-row-avatar">
                            <span className="avatar avatar-sm">
                              {(p.patient_name || "?").charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <div className="cell-primary">{p.patient_name}</div>
                              <div className="text-2xs text-muted">{p.hospital_number || ""}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="font-medium">{p.title}</span>
                        </td>
                        <td>{p.condition || "—"}</td>
                        <td>
                          <span className={`badge ${p.is_chronic ? "badge-warning" : "badge-neutral"}`}>
                            {p.is_chronic ? "Yes" : "No"}
                          </span>
                        </td>
                        <td>{p.responsible_doctor_name || "—"}</td>
                        <td style={{ textAlign: "center" }}>
                          <span className="pill-count">{p.open_task_count || 0}</span>
                        </td>
                        <td className="text-sm text-muted">{p.next_due_date || "—"}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(p.status)}`}>
                            <span className="badge-dot"></span>
                            {getStatusLabel(p.status)}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link
                            to={`/care-coordination/care-plans/${p.id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            <i className="bi bi-eye me-1"></i>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {!loading && plans.length > 0 && (
          <div className="table-footer">
            <span className="table-footer__meta">
              Showing {plans.length} care plan{plans.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}