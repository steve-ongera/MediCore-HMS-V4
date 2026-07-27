import { useEffect, useState } from "react";
import { getSecurityAuditLogs } from "../../services/api";

const EVENT_TYPES = [
  "LOGIN", "LOGOUT", "FAILED_LOGIN", "PASSWORD_CHANGE", "ROLE_CHANGE",
  "MFA_CHANGE", "ACCOUNT_LOCKED", "ACCOUNT_UNLOCKED", "SESSION_EXPIRED",
];

export default function SecurityAuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [eventFilter, setEventFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [eventFilter, search]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page_size: 200 };
      if (eventFilter) params.event_type = eventFilter;
      if (search) params.search = search;
      const data = await getSecurityAuditLogs(params);
      setLogs(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Security Audit Log</h1>
      <p>Immutable record of every security-relevant event system-wide. This log cannot be edited or deleted — only viewed here.</p>
      {error && <p>Error: {error}</p>}

      <input type="text" placeholder="Search by user or description" value={search} onChange={(e) => setSearch(e.target.value)} />
      <select value={eventFilter} onChange={(e) => setEventFilter(e.target.value)}>
        <option value="">All Event Types</option>
        {EVENT_TYPES.map((t) => <option key={t} value={t}>{t.replace(/_/g, " ")}</option>)}
      </select>
      <button type="button" onClick={load}>Refresh</button>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead>
            <tr><th>Event</th><th>User</th><th>Actor</th><th>IP Address</th><th>Description</th><th>Time</th></tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.event_type.replace(/_/g, " ")}</td>
                <td>{log.username || "—"}</td>
                <td>{log.actor_username || "—"}</td>
                <td>{log.ip_address || "—"}</td>
                <td>{log.description}</td>
                <td>{new Date(log.occurred_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && logs.length === 0 && <p>No audit events match this filter.</p>}
    </div>
  );
}