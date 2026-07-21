import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDentalVisits } from "../../services/api";

export default function DentalVisits() {
  const [visits, setVisits] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (search) params.search = search;
      const data = await getDentalVisits(params);
      setVisits(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  if (loading && visits.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading dental visits...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Dental</div>
          <h1 className="page-title">Dental Visits</h1>
          <p className="page-subtitle">Manage patient dental visits</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
          <Link to="/dental/register" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i> Register Visit
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
            <div className="search-bar" style={{ width: "250px" }}>
              <i className="bi bi-search search-bar__icon"></i>
              <input
                type="text"
                className="search-bar__input"
                placeholder="Search by patient, visit #..."
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
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {visits.length} visit{visits.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {visits.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-teeth"></i>
              </div>
              <h3 className="empty-state__title">No dental visits found</h3>
              <p className="empty-state__desc">
                {search 
                  ? "No visits match your search criteria." 
                  : "Register a new dental visit to get started."}
              </p>
              {!search && (
                <Link to="/dental/register" className="btn btn-primary">
                  <i className="bi bi-plus-circle me-2"></i> Register Visit
                </Link>
              )}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Visit #</th>
                    <th>Patient</th>
                    <th>Dentist</th>
                    <th>Chief Complaint</th>
                    <th>Date</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {visits.map((v) => (
                    <tr key={v.id}>
                      <td className="cell-mono">{v.visit_number}</td>
                      <td className="cell-primary">{v.patient_name}</td>
                      <td>{v.dentist_name || "—"}</td>
                      <td>{v.chief_complaint || "—"}</td>
                      <td>{new Date(v.visit_date).toLocaleString()}</td>
                      <td className="cell-actions">
                        <Link to={`/dental/${v.id}`} className="btn btn-secondary btn-sm">
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
        {visits.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {visits.length} visit{visits.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}