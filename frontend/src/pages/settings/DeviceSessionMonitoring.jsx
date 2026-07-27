import { useEffect, useState } from "react";
import { getActiveSessions, getUserSessions, getAccountLockouts, unlockAccount } from "../../services/api";

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

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Device & Session Monitoring</h1>
      {error && <p>Error: {error}</p>}
      <button type="button" onClick={load}>Refresh</button>

      <div>
        <button type="button" onClick={() => setTab("active")} style={{ fontWeight: tab === "active" ? "bold" : "normal" }}>
          Active Sessions ({activeSessions.length})
        </button>{" "}
        <button type="button" onClick={() => setTab("locked")} style={{ fontWeight: tab === "locked" ? "bold" : "normal" }}>
          Locked Accounts ({lockedAccounts.length})
        </button>{" "}
        <button type="button" onClick={() => setTab("history")} style={{ fontWeight: tab === "history" ? "bold" : "normal" }}>
          Session History
        </button>
      </div>

      {tab === "active" && (
        <section>
          <h2>Currently Active Sessions</h2>
          <table>
            <thead>
              <tr><th>User</th><th>IP Address</th><th>Browser</th><th>Device</th><th>Login Time</th><th>Last Activity</th></tr>
            </thead>
            <tbody>
              {activeSessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.full_name} ({s.username})</td>
                  <td>{s.ip_address}</td>
                  <td>{s.browser}</td>
                  <td>{s.device}</td>
                  <td>{new Date(s.login_at).toLocaleString()}</td>
                  <td>{new Date(s.last_activity_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {activeSessions.length === 0 && <p>No active sessions right now.</p>}
        </section>
      )}

      {tab === "locked" && (
        <section>
          <h2>Locked Accounts</h2>
          <p>Accounts are locked automatically after 3 consecutive failed login attempts. Unlocking resets the failed-attempt counter.</p>
          <table>
            <thead>
              <tr><th>User</th><th>Failed Attempts</th><th>Locked At</th><th></th></tr>
            </thead>
            <tbody>
              {lockedAccounts.map((l) => (
                <tr key={l.id}>
                  <td>{l.full_name} ({l.username})</td>
                  <td>{l.failed_attempts}</td>
                  <td>{l.locked_at ? new Date(l.locked_at).toLocaleString() : "—"}</td>
                  <td><button type="button" onClick={() => handleUnlock(l.id)}>Unlock Account</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {lockedAccounts.length === 0 && <p>No locked accounts.</p>}
        </section>
      )}

      {tab === "history" && (
        <section>
          <h2>Session History</h2>
          <table>
            <thead>
              <tr><th>User</th><th>IP Address</th><th>Browser</th><th>Device</th><th>Login</th><th>Logout</th><th>Status</th></tr>
            </thead>
            <tbody>
              {allSessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.full_name} ({s.username})</td>
                  <td>{s.ip_address}</td><td>{s.browser}</td><td>{s.device}</td>
                  <td>{new Date(s.login_at).toLocaleString()}</td>
                  <td>{s.logout_at ? new Date(s.logout_at).toLocaleString() : "—"}</td>
                  <td>{s.is_active ? "Active" : "Ended"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {allSessions.length === 0 && <p>No session history.</p>}
        </section>
      )}
    </div>
  );
}