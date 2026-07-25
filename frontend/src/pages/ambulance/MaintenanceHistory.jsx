import { useEffect, useState } from "react";
import { getAmbulanceMaintenanceLogs } from "../../services/api";

export default function MaintenanceHistory() {
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try { const data = await getAmbulanceMaintenanceLogs({ page_size: 100 }); setLogs(data.results ?? data); }
      catch (err) { setError(err.message); }
    })();
  }, []);

  return (
    <div>
      <h1>Ambulance Maintenance History</h1>
      {error && <p>Error: {error}</p>}
      <table><thead><tr><th>Vehicle</th><th>Type</th><th>Date</th><th>Vendor</th><th>Cost</th></tr></thead>
        <tbody>{logs.map((l) => (<tr key={l.id}><td>{l.ambulance_registration}</td><td>{l.maintenance_type}</td><td>{l.service_date}</td><td>{l.vendor || "—"}</td><td>{l.cost ? `KES ${l.cost}` : "—"}</td></tr>))}</tbody>
      </table>
      {logs.length === 0 && <p>No maintenance logs.</p>}
    </div>
  );
}