import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getActiveEmergencyVisits, getEmergencyVisits } from "../../services/api";

const TRIAGE_META = {
  1: { label: "Resuscitation", badge: "badge-danger" },
  2: { label: "Emergent", badge: "badge-warning" },
  3: { label: "Urgent", badge: "badge-primary" },
  4: { label: "Less Urgent", badge: "badge-info" },
  5: { label: "Non-Urgent", badge: "badge-neutral" },
};

const STATUS_META = {
  IN_ED: { label: "In ED", badge: "badge-primary" },
  ADMITTED: { label: "Admitted", badge: "badge-info" },
  DISCHARGED: { label: "Discharged Home", badge: "badge-success" },
  TRANSFERRED_OUT: { label: "Transferred Out", badge: "badge-neutral" },
  LAMA: { label: "LAMA", badge: "badge-warning" },
  DECEASED: { label: "Deceased", badge: "badge-danger" },
};

export default function EmergencyBoard() {
  const [activeTab, setActiveTab] = useState("board"); // "board" | "history"

  // ---- Active board state -------------------------------------------
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---- History tab state ----------------------------------------------
  const [historyVisits, setHistoryVisits] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const [historySearchInput, setHistorySearchInput] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historyStatus, setHistoryStatus] = useState("");

  const [historyPage, setHistoryPage] = useState(1);
  const [historyCount, setHistoryCount] = useState(0);
  const [historyNext, setHistoryNext] = useState(null);
  const [historyPrev, setHistoryPrev] = useState(null);
  const [historyPageSize, setHistoryPageSize] = useState(20);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getActiveEmergencyVisits();
      setVisits(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadHistory = async (page = 1) => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const data = await getEmergencyVisits({
        page,
        search: historySearch || undefined,
        status: historyStatus || undefined,
      });
      const results = data.results ?? data;
      setHistoryVisits(results);
      setHistoryCount(data.count ?? results.length);
      setHistoryNext(data.next ?? null);
      setHistoryPrev(data.previous ?? null);
      if (results.length > 0 && page === 1) {
        setHistoryPageSize(results.length);
      }
      setHistoryPage(page);
      setHistoryLoaded(true);
    } catch (err) {
      setHistoryError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Load history the first time the tab is opened
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
  }, [historySearch, historyStatus]);

  const totalHistoryPages = historyPageSize > 0 ? Math.max(1, Math.ceil(historyCount / historyPageSize)) : 1;

  const formatDate = (value) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading emergency board...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Emergency Department</div>
          <h1 className="page-title">Emergency Board</h1>
          <p className="page-subtitle">Active emergency patients</p>
        </div>
        <div className="page-header__actions">
          <button
            className="btn btn-secondary"
            onClick={() => (activeTab === "board" ? load() : loadHistory(historyPage))}
          >
            <i className="bi bi-arrow-clockwise  me-1"></i> Refresh
          </button>
          <Link to="/emergency/register" className="btn btn-primary">
            <i className="bi bi-plus-circle  me-1"></i> Register Emergency
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ marginBottom: "var(--space-4)" }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === "board" ? "tab-btn--active" : ""}`}
          onClick={() => setActiveTab("board")}
          style={{
            padding: "var(--space-2) var(--space-4)",
            marginRight: "var(--space-2)",
            border: "none",
            borderBottom: activeTab === "board" ? "2px solid var(--primary)" : "2px solid transparent",
            background: "transparent",
            fontWeight: activeTab === "board" ? 600 : 400,
            color: activeTab === "board" ? "var(--primary)" : "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <i className="bi bi-grid me-1"></i> Active Board
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
          <i className="bi bi-clock-history me-1"></i> Visit History
        </button>
      </div>

      {activeTab === "board" && error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle  me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      {activeTab === "board" && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3 flex-wrap">
              <i className="bi bi-grid  me-1"></i>
              <h5 className="card-title" style={{ marginBottom: 0 }}>Active Patients</h5>
            </div>
            <div>
              <span className="text-tertiary text-sm">
                {visits.length} patient{visits.length !== 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <div className="card-body p-0">
            {visits.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">
                  <i className="bi bi-hospital"></i>
                </div>
                <h3 className="empty-state__title">No active emergency patients</h3>
                <p className="empty-state__desc">The emergency department is currently empty.</p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Visit #</th>
                      <th>Patient</th>
                      <th>Bay</th>
                      <th>Triage</th>
                      <th>Arrival Mode</th>
                      <th className="cell-numeric">Duration (hrs)</th>
                      <th className="cell-actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {visits.map((v) => {
                      const triage = TRIAGE_META[v.triage_level] || { label: "—", badge: "badge-neutral" };
                      const duration = Number(v.duration_hours) || 0;
                      const durationColor = duration > 4 ? "var(--danger-strong)" :
                                           duration > 2 ? "var(--warning-strong)" :
                                           "var(--text-primary)";

                      return (
                        <tr key={v.id}>
                          <td className="cell-mono">{v.visit_number}</td>
                          <td className="cell-primary">{v.patient_name}</td>
                          <td>{v.bay_number || "—"}</td>
                          <td>
                            <span className={`badge ${triage.badge}`}>
                              <span className="badge-dot"></span>
                              {triage.label}
                            </span>
                          </td>
                          <td>
                            <span className="tag">{v.arrival_mode}</span>
                          </td>
                          <td className="cell-numeric" style={{ color: durationColor, fontWeight: 600 }}>
                            {duration.toFixed(1)}
                          </td>
                          <td className="cell-actions">
                            <Link to={`/emergency/${v.id}`} className="btn btn-secondary btn-sm">
                              <i className="bi bi-eye  me-1"></i> View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {visits.length > 0 && (
            <div className="card-footer">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-tertiary text-sm">
                  Showing {visits.length} active patient{visits.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex gap-2">
                <span className="badge badge-danger"><span className="badge-dot"></span>Resuscitation</span>
                <span className="badge badge-warning"><span className="badge-dot"></span>Emergent</span>
                <span className="badge badge-primary"><span className="badge-dot"></span>Urgent</span>
                <span className="badge badge-info"><span className="badge-dot"></span>Less Urgent</span>
                <span className="badge badge-neutral"><span className="badge-dot"></span>Non-Urgent</span>
              </div>
            </div>
          )}
        </div>
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
                <h5 className="card-title" style={{ marginBottom: 0 }}>Visit History</h5>
              </div>
              <div>
                <span className="text-tertiary text-sm">
                  {historyCount} record{historyCount !== 1 ? "s" : ""}
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
                    placeholder="Visit # / patient name / hospital number"
                    value={historySearchInput}
                    onChange={(e) => setHistorySearchInput(e.target.value)}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, minWidth: "200px" }}>
                  <label className="field-label">Status</label>
                  <select
                    className="select"
                    value={historyStatus}
                    onChange={(e) => setHistoryStatus(e.target.value)}
                  >
                    <option value="">All Statuses</option>
                    <option value="IN_ED">In Emergency Department</option>
                    <option value="ADMITTED">Admitted to Ward</option>
                    <option value="DISCHARGED">Discharged Home</option>
                    <option value="TRANSFERRED_OUT">Transferred Out</option>
                    <option value="LAMA">Left Against Medical Advice</option>
                    <option value="DECEASED">Deceased</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="card-body p-0">
              {historyLoading ? (
                <div className="empty-state">
                  <div className="spinner" style={{ margin: "0 auto var(--space-3)" }}></div>
                  <p className="empty-state__desc">Loading visit history...</p>
                </div>
              ) : historyVisits.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-clock-history"></i>
                  </div>
                  <h3 className="empty-state__title">No visits found</h3>
                  <p className="empty-state__desc">Try adjusting your search or status filter.</p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Visit #</th>
                        <th>Patient</th>
                        <th>Hospital #</th>
                        <th>Bay</th>
                        <th>Triage</th>
                        <th>Status</th>
                        <th>Arrived</th>
                        <th className="cell-numeric">Duration (hrs)</th>
                        <th className="cell-actions"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyVisits.map((v) => {
                        const triage = TRIAGE_META[v.triage_level] || { label: "—", badge: "badge-neutral" };
                        const statusMeta = STATUS_META[v.status] || { label: v.status || "—", badge: "badge-neutral" };
                        const duration = Number(v.duration_hours) || 0;

                        return (
                          <tr key={v.id}>
                            <td className="cell-mono">{v.visit_number}</td>
                            <td className="cell-primary">{v.patient_name}</td>
                            <td className="cell-mono">{v.hospital_number}</td>
                            <td>{v.bay_number || "—"}</td>
                            <td>
                              <span className={`badge ${triage.badge}`}>
                                <span className="badge-dot"></span>
                                {triage.label}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${statusMeta.badge}`}>
                                <span className="badge-dot"></span>
                                {statusMeta.label}
                              </span>
                            </td>
                            <td className="text-sm">{formatDate(v.arrived_at)}</td>
                            <td className="cell-numeric">{duration.toFixed(1)}</td>
                            <td className="cell-actions">
                              <Link to={`/emergency/${v.id}`} className="btn btn-secondary btn-sm">
                                <i className="bi bi-eye  me-1"></i> View
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {!historyLoading && historyVisits.length > 0 && (
              <div className="card-footer">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-tertiary text-sm">
                    Page {historyPage} of {totalHistoryPages} • {historyCount} total record{historyCount !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => loadHistory(historyPage - 1)}
                    disabled={!historyPrev || historyLoading}
                  >
                    <i className="bi bi-chevron-left me-1"></i> Previous
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => loadHistory(historyPage + 1)}
                    disabled={!historyNext || historyLoading}
                  >
                    Next <i className="bi bi-chevron-right ms-1"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}