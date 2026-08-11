import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDoctorProfiles } from "../../services/api";

export default function DoctorList() {
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, [search]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page_size: 100 };
      if (search) params.search = search;
      const data = await getDoctorProfiles(params);
      setDoctors(data.results ?? data);
    } catch (err) { 
      setError(err.message); 
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Clinical</div>
          <h1 className="page-title">List of Doctors</h1>
          <p className="page-subtitle">Manage doctor profiles and availability</p>
        </div>
        <div className="page-header__actions">
          <Link to="/doctors/create" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i>
            Add New Doctor Profile
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
            <div className="search-bar" style={{ minWidth: "280px" }}>
              <i className="search-bar__icon bi bi-search"></i>
              <input
                type="text"
                className="search-bar__input"
                placeholder="Search doctors by name or specialty..."
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
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {doctors.length} doctor{doctors.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="loading-screen" style={{ minHeight: "200px" }}>
              <div className="spinner spinner-lg"></div>
              <span className="loading-screen__label">Loading doctors...</span>
            </div>
          ) : doctors.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-person-badge"></i>
              </div>
              <div className="empty-state__title">No doctors found</div>
              <div className="empty-state__desc">
                {search ? "No results match your search criteria." : "Start by adding a new doctor profile."}
              </div>
              <Link to="/doctors/create" className="btn btn-primary">
                <i className="bi bi-plus-circle me-2"></i>
                Add First Doctor
              </Link>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Specialty</th>
                      <th>Department</th>
                      <th>Available</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {doctors.map((d) => (
                      <tr key={d.id} className="is-clickable">
                        <td>
                          <div className="table-row-avatar">
                            <span className="avatar avatar-sm">
                              <i className="bi bi-person"></i>
                            </span>
                            <div>
                              <div className="cell-primary">Dr. {d.full_name}</div>
                              <div className="text-2xs text-muted">{d.email || ""}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="tag">{d.specialty || "General"}</span>
                        </td>
                        <td>{d.department_name || "—"}</td>
                        <td>
                          <span className={`badge ${d.is_available_for_booking ? "badge-success" : "badge-neutral"}`}>
                            <span className="badge-dot"></span>
                            {d.is_available_for_booking ? "Available" : "Unavailable"}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${d.is_active_staff ? "badge-success" : "badge-danger"}`}>
                            <span className="badge-dot"></span>
                            {d.is_active_staff ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link to={`/doctors/${d.id}`} className="btn btn-secondary btn-sm">
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
      </div>
    </>
  );
}