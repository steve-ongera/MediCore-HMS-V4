import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getEmployees, getDepartments } from "../../services/api";

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { loadDepartments(); }, []);
  useEffect(() => { load(); }, [statusFilter, deptFilter, search]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.employment_status = statusFilter;
      if (deptFilter) params.department = deptFilter;
      if (search) params.search = search;
      const data = await getEmployees(params);
      setEmployees(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "ACTIVE": "badge-success",
      "ON_LEAVE": "badge-warning",
      "SUSPENDED": "badge-danger",
      "TERMINATED": "badge-neutral",
      "RESIGNED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      "FULL_TIME": "badge-primary",
      "PART_TIME": "badge-info",
      "CONTRACT": "badge-warning",
      "INTERN": "badge-neutral",
      "CASUAL": "badge-secondary",
    };
    return typeMap[type] || "badge-neutral";
  };

  if (loading && employees.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading employees...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Human Resources</div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage all employees</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => { setSearch(""); setDeptFilter(""); setStatusFilter(""); load(); }}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
          <Link to="/hr/employees/register" className="btn btn-primary">
            <i className="bi bi-person-plus me-2"></i> Register Employee
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
                placeholder="Search by name, #, ID..."
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
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                style={{ width: "180px" }}
              >
                <option value="">All Departments</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
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
                <option value="ACTIVE">Active</option>
                <option value="ON_LEAVE">On Leave</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="TERMINATED">Terminated</option>
                <option value="RESIGNED">Resigned</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {employees.length} employee{employees.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {employees.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-people"></i>
              </div>
              <h3 className="empty-state__title">No employees found</h3>
              <p className="empty-state__desc">
                {search || deptFilter || statusFilter 
                  ? "No employees match your search criteria." 
                  : "Start by registering a new employee."}
              </p>
              {!search && !deptFilter && !statusFilter && (
                <Link to="/hr/employees/register" className="btn btn-primary">
                  <i className="bi bi-person-plus me-2"></i> Register Employee
                </Link>
              )}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee #</th>
                    <th>Name</th>
                    <th>Job Title</th>
                    <th>Department</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Date Hired</th>
                    <th>Phone</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => (
                    <tr key={e.id}>
                      <td className="cell-mono">{e.employee_number}</td>
                      <td className="cell-primary">{e.full_name}</td>
                      <td>{e.job_title}</td>
                      <td>{e.department_name || "—"}</td>
                      <td>
                        <span className={`badge ${getTypeBadge(e.employment_type)}`}>
                          <span className="badge-dot"></span>
                          {e.employment_type.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(e.employment_status)}`}>
                          <span className="badge-dot"></span>
                          {e.employment_status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{e.date_hired}</td>
                      <td>{e.phone || "—"}</td>
                      <td className="cell-actions">
                        <Link to={`/hr/employees/${e.id}`} className="btn btn-secondary btn-sm">
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
        {employees.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {employees.length} employee{employees.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Active
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                On Leave
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Suspended
              </span>
              <span className="badge badge-neutral">
                <span className="badge-dot"></span>
                Terminated
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}