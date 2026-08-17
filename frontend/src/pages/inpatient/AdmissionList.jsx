import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdmissions } from "../../services/api";
import Pagination from "../../components/Pagination";

const STATUS_OPTIONS = [
  { value: "", label: "All" },
  { value: "ADMITTED", label: "Admitted" },
  { value: "DISCHARGED", label: "Discharged" },
  { value: "TRANSFERRED_OUT", label: "Transferred Out" },
  { value: "DECEASED", label: "Deceased" },
  { value: "ABSCONDED", label: "Absconded" },
];

export default function AdmissionList() {
  const [activeTab, setActiveTab] = useState("active"); // "active" | "history"

  // ---- Active tab state (unchanged behavior — defaults to ADMITTED) ----
  const [admissions, setAdmissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("ADMITTED");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // ---- History tab state — independent search/filter/pagination so
  // switching tabs never clobbers the other tab's filters ----
  const [historyAdmissions, setHistoryAdmissions] = useState([]);
  const [historyStatusFilter, setHistoryStatusFilter] = useState("");
  const [historySearchInput, setHistorySearchInput] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const pageSize = 20;

  useEffect(() => {
    loadAdmissions();
  }, [statusFilter, page]);

  const loadAdmissions = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { search, page, page_size: pageSize };
      if (statusFilter) params.status = statusFilter;
      const data = await getAdmissions(params);
      const results = data.results ?? data;
      setAdmissions(results);
      setTotal(data.count ?? results.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadAdmissions();
  };

  // Load history the first time that tab is opened
  useEffect(() => {
    if (activeTab === "history" && !historyLoaded) {
      loadHistory(1);
    }
  }, [activeTab]);

  // Debounce free-text search, re-fetch page 1 whenever search/status change
  useEffect(() => {
    if (!historyLoaded && activeTab !== "history") return;
    const timeout = setTimeout(() => {
      setHistorySearch(historySearchInput.trim());
    }, 400);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historySearchInput]);

  useEffect(() => {
    if (activeTab === "history" && historyLoaded) {
      loadHistory(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historySearch, historyStatusFilter]);

  const loadHistory = async (page = historyPage) => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const params = { page, page_size: pageSize };
      if (historySearch) params.search = historySearch;
      if (historyStatusFilter) params.status = historyStatusFilter;
      const data = await getAdmissions(params);
      const results = data.results ?? data;
      setHistoryAdmissions(results);
      setHistoryTotal(data.count ?? results.length);
      setHistoryPage(page);
      setHistoryLoaded(true);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "ADMITTED": "badge-primary",
      "DISCHARGED": "badge-success",
      "TRANSFERRED_OUT": "badge-info",
      "DECEASED": "badge-danger",
      "ABSCONDED": "badge-warning"
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading && admissions.length === 0 && activeTab === "active") {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading admissions...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Inpatient Management</div>
          <h1 className="page-title">Admissions</h1>
          <p className="page-subtitle">Manage all patient admissions at your branch</p>
        </div>
        <div className="page-header__actions">
          <Link to="/inpatient/admit" className="btn btn-primary">
            <i className="bi bi-person-plus  me-1"></i>
            Admit Patient
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: "var(--space-4)" }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === "active" ? "tab-btn--active" : ""}`}
          onClick={() => setActiveTab("active")}
          style={{
            padding: "var(--space-2) var(--space-4)",
            marginRight: "var(--space-2)",
            border: "none",
            borderBottom: activeTab === "active" ? "2px solid var(--primary)" : "2px solid transparent",
            background: "transparent",
            fontWeight: activeTab === "active" ? 600 : 400,
            color: activeTab === "active" ? "var(--primary)" : "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <i className="bi bi-grid me-1"></i> Admissions
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === "history" ? "tab-btn--active" : ""}`}
          onClick={() => setActiveTab("history")}
          style={{
            padding: "var(--space-2) var(--space-4)",
            border: "none",
            borderBottom: activeTab === "history" ? "2px solid var(--primary)" : "2px solid transparent",
            background: "transparent",
            fontWeight: activeTab === "history" ? 600 : 400,
            color: activeTab === "history" ? "var(--primary)" : "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <i className="bi bi-clock-history me-1"></i> Admission History
        </button>
      </div>

      {activeTab === "active" && error && (
        <div className="card" style={{ padding: "var(--space-6)", textAlign: "center", marginBottom: "var(--space-4)" }}>
          <div className="text-danger font-semibold">Error loading admissions</div>
          <p className="text-sm text-muted" style={{ marginTop: "var(--space-2)" }}>{error}</p>
          <button className="btn btn-primary mt-4" onClick={loadAdmissions}>
            <i className="bi bi-arrow-clockwise"></i> Retry
          </button>
        </div>
      )}

      {activeTab === "active" && (
        <>
          <div className="card" style={{ marginBottom: "var(--space-6)" }}>
            <div className="card-body">
              <form onSubmit={handleSearchSubmit}>
                <div className="field-row">
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="field-label" htmlFor="search">Search</label>
                    <input
                      id="search"
                      type="text"
                      className="input"
                      placeholder="Patient name / hospital number"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <label className="field-label" htmlFor="status">Status</label>
                    <select
                      id="status"
                      className="select"
                      value={statusFilter}
                      onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                    <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
                      <i className="bi bi-search  me-1"></i> Search
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-tertiary text-sm">
                  {total} admission{total !== 1 ? "s" : ""} found
                </span>
                {statusFilter && (
                  <span className="badge badge-primary">
                    <span className="badge-dot"></span>
                    {statusFilter.replace("_", " ")}
                  </span>
                )}
              </div>
              <div>
                <button className="btn btn-secondary btn-sm" onClick={() => { setPage(1); loadAdmissions(); }}>
                  <i className="bi bi-arrow-clockwise  me-1"></i> Refresh
                </button>
              </div>
            </div>

            <div className="card-body p-0">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Admission #</th>
                      <th>Patient</th>
                      <th>Hospital #</th>
                      <th>Branch</th>
                      <th>Ward / Bed</th>
                      <th>Doctor</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Admitted</th>
                      <th className="cell-numeric">LOS (days)</th>
                      <th className="cell-actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {admissions.map((a) => (
                      <tr key={a.id}>
                        <td className="cell-primary">{a.admission_number}</td>
                        <td>{a.patient_name}</td>
                        <td className="cell-mono">{a.hospital_number}</td>
                        <td>{a.branch_name || "—"}</td>
                        <td>{a.ward_name} / {a.bed_number}</td>
                        <td>{a.attending_doctor_name || "—"}</td>
                        <td>
                          <span className="tag">{a.admission_type}</span>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadge(a.status)}`}>
                            <span className="badge-dot"></span>
                            {a.status.replace("_", " ")}
                          </span>
                        </td>
                        <td>{new Date(a.admission_date).toLocaleDateString()}</td>
                        <td className="cell-numeric">{a.length_of_stay_days || "—"}</td>
                        <td className="cell-actions">
                          <Link
                            to={`/inpatient/admissions/${a.id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            <i className="bi bi-eye  me-1"></i> View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!loading && admissions.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-hospital"></i>
                  </div>
                  <h3 className="empty-state__title">No admissions found</h3>
                  <p className="empty-state__desc">
                    {search || statusFilter
                      ? "No admissions match your search criteria."
                      : "Start by admitting a patient to the ward."}
                  </p>
                  {search || statusFilter ? (
                    <button className="btn btn-secondary" onClick={() => {
                      setSearch("");
                      setStatusFilter("");
                      setPage(1);
                    }}>
                      <i className="bi bi-x-circle  me-1"></i> Clear filters
                    </button>
                  ) : (
                    <Link to="/inpatient/admit">
                      <button className="btn btn-primary">
                        <i className="bi bi-person-plus  me-1"></i> Admit Patient
                      </button>
                    </Link>
                  )}
                </div>
              )}

              {admissions.length > 0 && (
                <Pagination page={page} count={total} pageSize={pageSize} onPageChange={setPage} />
              )}
            </div>

            {admissions.length > 0 && (
              <div className="card-footer">
                <div className="flex gap-2">
                  <span className="badge badge-primary">
                    <span className="badge-dot"></span> Admitted
                  </span>
                  <span className="badge badge-success">
                    <span className="badge-dot"></span> Discharged
                  </span>
                  <span className="badge badge-danger">
                    <span className="badge-dot"></span> Deceased
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === "history" && (
        <>
          {historyError && (
            <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
              <div className="card-body">
                <div className="text-danger">
                  <i className="bi bi-exclamation-circle  me-1"></i> {historyError}
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-3 flex-wrap">
                <i className="bi bi-clock-history me-1"></i>
                <h5 className="card-title" style={{ marginBottom: 0 }}>Admission History</h5>
              </div>
              <div>
                <span className="text-tertiary text-sm">
                  {historyTotal} record{historyTotal !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="card-body" style={{ paddingBottom: 0 }}>
              <div className="field-row" style={{ marginBottom: "var(--space-4)" }}>
                <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: "220px" }}>
                  <label className="field-label">Search</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Admission # / patient name / hospital number"
                    value={historySearchInput}
                    onChange={(e) => setHistorySearchInput(e.target.value)}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, minWidth: "200px" }}>
                  <label className="field-label">Status</label>
                  <select
                    className="select"
                    value={historyStatusFilter}
                    onChange={(e) => setHistoryStatusFilter(e.target.value)}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="card-body p-0">
              {historyLoading ? (
                <div className="empty-state">
                  <div className="spinner" style={{ margin: "0 auto var(--space-3)" }}></div>
                  <p className="empty-state__desc">Loading admission history...</p>
                </div>
              ) : historyAdmissions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-clock-history"></i>
                  </div>
                  <h3 className="empty-state__title">No admissions found</h3>
                  <p className="empty-state__desc">Try adjusting your search or status filter.</p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Admission #</th>
                        <th>Patient</th>
                        <th>Hospital #</th>
                        <th>Branch</th>
                        <th>Ward / Bed</th>
                        <th>Doctor</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Admitted</th>
                        <th className="cell-numeric">LOS (days)</th>
                        <th className="cell-actions"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyAdmissions.map((a) => (
                        <tr key={a.id}>
                          <td className="cell-primary">{a.admission_number}</td>
                          <td>{a.patient_name}</td>
                          <td className="cell-mono">{a.hospital_number}</td>
                          <td>{a.branch_name || "—"}</td>
                          <td>{a.ward_name} / {a.bed_number}</td>
                          <td>{a.attending_doctor_name || "—"}</td>
                          <td>
                            <span className="tag">{a.admission_type}</span>
                          </td>
                          <td>
                            <span className={`badge ${getStatusBadge(a.status)}`}>
                              <span className="badge-dot"></span>
                              {a.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="text-sm">{new Date(a.admission_date).toLocaleDateString()}</td>
                          <td className="cell-numeric">{a.length_of_stay_days || "—"}</td>
                          <td className="cell-actions">
                            <Link
                              to={`/inpatient/admissions/${a.id}`}
                              className="btn btn-secondary btn-sm"
                            >
                              <i className="bi bi-eye  me-1"></i> View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!historyLoading && historyAdmissions.length > 0 && (
              <Pagination page={historyPage} count={historyTotal} pageSize={pageSize} onPageChange={loadHistory} />
            )}
          </div>
        </>
      )}
    </>
  );
}