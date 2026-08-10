import { useEffect, useState } from "react";
import { getActiveSessions, getUserSessions, getAccountLockouts, unlockAccount } from "../../services/api";
import { formatDateTime } from "../../utils/formatters";

export default function DeviceSessionMonitoring() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [lockouts, setLockouts] = useState([]);
  const [tab, setTab] = useState("active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [active, all, locks] = await Promise.all([
        getActiveSessions(),
        getUserSessions({ page_size: 100 }),
        getAccountLockouts({ page_size: 100 }),
      ]);
      setActiveSessions(active);
      setAllSessions(all.results ?? all);
      setLockouts(locks.results ?? locks);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (id) => {
    if (!window.confirm("Unlock this account? The user will be able to log in again immediately.")) return;
    try {
      await unlockAccount(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const lockedAccounts = lockouts.filter((l) => l.is_locked);

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading session data...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Security</div>
          <h1 className="page-title">Device & Session Monitoring</h1>
          <p className="page-subtitle">Monitor active sessions and manage account lockouts</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise  me-1"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle  me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header" style={{ padding: 0 }}>
          <div className="tabs" style={{ padding: "0 var(--space-4)" }}>
            <button
              type="button"
              className={`tabs__item ${tab === "active" ? "is-active" : ""}`}
              onClick={() => setTab("active")}
            >
              <i className="bi bi-wifi  me-1"></i>
              Active Sessions
              {activeSessions.length > 0 && <span className="pill-count">{activeSessions.length}</span>}
            </button>
            <button
              type="button"
              className={`tabs__item ${tab === "locked" ? "is-active" : ""}`}
              onClick={() => setTab("locked")}
            >
              <i className="bi bi-lock  me-1"></i>
              Locked Accounts
              {lockedAccounts.length > 0 && <span className="pill-count">{lockedAccounts.length}</span>}
            </button>
            <button
              type="button"
              className={`tabs__item ${tab === "history" ? "is-active" : ""}`}
              onClick={() => setTab("history")}
            >
              <i className="bi bi-clock-history  me-1"></i>
              Session History
            </button>
          </div>
        </div>
        <div className="card-body">
          {/* Active Sessions Tab */}
          {tab === "active" && (
            <div className="tab-content">
              <h5 className="card-title" style={{ marginBottom: "var(--space-2)" }}>
                Currently Active Sessions
              </h5>
              {activeSessions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-wifi-off"></i>
                  </div>
                  <h3 className="empty-state__title">No active sessions</h3>
                  <p className="empty-state__desc">There are no currently active user sessions.</p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>IP Address</th>
                        <th>Browser</th>
                        <th>Device</th>
                        <th>Login Time</th>
                        <th>Last Activity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeSessions.map((s) => (
                        <tr key={s.id}>
                          <td className="cell-primary">
                            {s.full_name}
                            <div className="text-2xs text-tertiary">{s.username}</div>
                          </td>
                          <td className="cell-mono">{s.ip_address}</td>
                          <td>{s.browser}</td>
                          <td>{s.device}</td>
                          <td>{formatDateTime(s.login_at)}</td>
                          <td>{formatDateTime(s.last_activity_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Locked Accounts Tab */}
          {tab === "locked" && (
            <div className="tab-content">
              <h5 className="card-title" style={{ marginBottom: "var(--space-2)" }}>
                Locked Accounts
              </h5>
              <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
                <i className="bi bi-info-circle  me-1"></i>
                Accounts are locked automatically after 3 consecutive failed login attempts. Unlocking resets the failed-attempt counter.
              </div>
              {lockedAccounts.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-unlock"></i>
                  </div>
                  <h3 className="empty-state__title">No locked accounts</h3>
                  <p className="empty-state__desc">All accounts are currently unlocked.</p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th className="cell-numeric">Failed Attempts</th>
                        <th>Locked At</th>
                        <th className="cell-actions"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lockedAccounts.map((l) => (
                        <tr key={l.id}>
                          <td className="cell-primary">
                            {l.full_name}
                            <div className="text-2xs text-tertiary">{l.username}</div>
                          </td>
                          <td className="cell-numeric">
                            <span className="badge badge-danger">
                              <span className="badge-dot"></span>
                              {l.failed_attempts}
                            </span>
                          </td>
                          <td>{l.locked_at ? formatDateTime(l.locked_at) : "—"}</td>
                          <td className="cell-actions">
                            <button className="btn btn-success btn-sm" onClick={() => handleUnlock(l.id)}>
                              <i className="bi bi-unlock  me-1"></i> Unlock Account
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Session History Tab */}
          {tab === "history" && (
            <div className="tab-content">
              <h5 className="card-title" style={{ marginBottom: "var(--space-2)" }}>
                Session History
              </h5>
              {allSessions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-clock-history"></i>
                  </div>
                  <h3 className="empty-state__title">No session history</h3>
                  <p className="empty-state__desc">No sessions have been recorded yet.</p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>IP Address</th>
                        <th>Browser</th>
                        <th>Device</th>
                        <th>Login</th>
                        <th>Logout</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allSessions.map((s) => (
                        <tr key={s.id}>
                          <td className="cell-primary">
                            {s.full_name}
                            <div className="text-2xs text-tertiary">{s.username}</div>
                          </td>
                          <td className="cell-mono">{s.ip_address}</td>
                          <td>{s.browser}</td>
                          <td>{s.device}</td>
                          <td>{formatDateTime(s.login_at)}</td>
                          <td>{s.logout_at ? formatDateTime(s.logout_at) : "—"}</td>
                          <td>
                            <span className={`badge ${s.is_active ? "badge-success" : "badge-neutral"}`}>
                              <span className="badge-dot"></span>
                              {s.is_active ? "Active" : "Ended"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}