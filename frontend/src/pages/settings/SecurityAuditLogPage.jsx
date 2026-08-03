import { useEffect, useState } from "react";
import { getSecurityAuditLogs } from "../../services/api";
import { formatDateTime } from "../../utils/formatters";
import Pagination from "../../components/Pagination";

const EVENT_TYPES = [
  "LOGIN", "LOGOUT", "FAILED_LOGIN", "PASSWORD_CHANGE", "ROLE_CHANGE",
  "MFA_CHANGE", "ACCOUNT_LOCKED", "ACCOUNT_UNLOCKED", "SESSION_EXPIRED",
];

const EVENT_BADGE_COLORS = {
  "LOGIN": "badge-success",
  "LOGOUT": "badge-neutral",
  "FAILED_LOGIN": "badge-danger",
  "PASSWORD_CHANGE": "badge-warning",
  "ROLE_CHANGE": "badge-primary",
  "MFA_CHANGE": "badge-info",
  "ACCOUNT_LOCKED": "badge-danger",
  "ACCOUNT_UNLOCKED": "badge-success",
  "SESSION_EXPIRED": "badge-warning",
};

export default function SecurityAuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [eventFilter, setEventFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  useEffect(() => { setPage(1); }, [eventFilter, search]);
  useEffect(() => { load(); }, [eventFilter, search, page]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, page_size: pageSize };
      if (eventFilter) params.event_type = eventFilter;
      if (search) params.search = search;
      const data = await getSecurityAuditLogs(params);
      const results = data.results ?? data;
      setLogs(results);
      setTotal(data.count ?? results.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getEventBadge = (eventType) => {
    return EVENT_BADGE_COLORS[eventType] || "badge-neutral";
  };

  if (loading && logs.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading audit logs...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Security</div>
          <h1 className="page-title">Security Audit Log</h1>
          <p className="page-subtitle">Immutable record of all security-relevant events</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
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
                placeholder="Search by user or description..."
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
                value={eventFilter}
                onChange={(e) => setEventFilter(e.target.value)}
                style={{ width: "180px" }}
              >
                <option value="">All Event Types</option>
                {EVENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {total} event{total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body">
          <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            <i className="bi bi-info-circle me-1"></i>
            This log cannot be edited or deleted — only viewed here.
          </div>
          {logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-shield-check"></i>
              </div>
              <h3 className="empty-state__title">No audit events found</h3>
              <p className="empty-state__desc">
                {eventFilter || search 
                  ? "No events match your search criteria." 
                  : "Security events will appear here as they occur."}
              </p>
            </div>
          ) : (
            <>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Event</th>
                      <th>User</th>
                      <th>Actor</th>
                      <th>IP Address</th>
                      <th>Description</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((log) => (
                      <tr key={log.id}>
                        <td>
                          <span className={`badge ${getEventBadge(log.event_type)}`}>
                            <span className="badge-dot"></span>
                            {log.event_type.replace(/_/g, " ")}
                          </span>
                        </td>
                        <td>{log.username || "—"}</td>
                        <td>{log.actor_username || "—"}</td>
                        <td className="cell-mono">{log.ip_address || "—"}</td>
                        <td>{log.description}</td>
                        <td>{formatDateTime(log.occurred_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Pagination page={page} count={total} pageSize={pageSize} onPageChange={setPage} />
            </>
          )}
        </div>
        {logs.length > 0 && (
          <div className="card-footer">
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Login / Unlock
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Failed / Locked
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Password / Expired
              </span>
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                Role Change
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}