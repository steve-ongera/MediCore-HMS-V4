import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTodaysDialysisSessions, getDialysisMachines } from "../../services/api";

export default function DialysisSessionsToday() {
  const [sessions, setSessions] = useState([]);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [s, m] = await Promise.all([getTodaysDialysisSessions(), getDialysisMachines()]);
      setSessions(s);
      setMachines(m.results ?? m);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div>
      <h1>Today's Dialysis Sessions</h1>
      {error && <p>Error: {error}</p>}
      <button type="button" onClick={load}>Refresh</button>

      <h2>Machines</h2>
      <table>
        <thead><tr><th>Machine</th><th>Rate/Session</th><th>Status</th></tr></thead>
        <tbody>
          {machines.map((m) => (
            <tr key={m.id}>
              <td>{m.machine_number}</td><td>KES {m.rate_per_session}</td><td>{m.status}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Sessions</h2>
      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Session #</th><th>Patient</th><th>Machine</th><th>Scheduled</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {sessions.map((s) => (
              <tr key={s.id}>
                <td>{s.session_number}</td><td>{s.patient_name}</td>
                <td>{s.machine_number || "Unassigned"}</td>
                <td>{new Date(s.scheduled_date).toLocaleString()}</td><td>{s.status}</td>
                <td><Link to={`/dialysis/sessions/${s.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && sessions.length === 0 && <p>No sessions scheduled today.</p>}
    </div>
  );
}