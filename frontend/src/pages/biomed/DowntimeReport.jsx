import { useEffect, useState } from "react";
import { getServiceRequests } from "../../services/api";

export default function DowntimeReport() {
  const [requests, setRequests] = useState([]);
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  const load = async () => {
    try {
      const data = await getServiceRequests({ page_size: 300 });
      const all = data.results ?? data;
      const filtered = all.filter((r) => {
        const reported = new Date(r.reported_at);
        return reported >= new Date(dateFrom) && reported <= new Date(dateTo) && r.caused_downtime;
      });
      setRequests(filtered);
    } catch (err) { setError(err.message); }
  };

  const totalDowntime = requests.reduce((sum, r) => sum + Number(r.downtime_hours || 0), 0);
  const byEquipment = {};
  requests.forEach((r) => {
    const key = `${r.equipment_tag} - ${r.equipment_name}`;
    byEquipment[key] = (byEquipment[key] || 0) + Number(r.downtime_hours || 0);
  });

  return (
    <div>
      <h1>Equipment Downtime Report</h1>
      {error && <p>Error: {error}</p>}

      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

      <h2>Total Downtime: {totalDowntime.toFixed(1)} hours across {requests.length} incident(s)</h2>

      <h2>Downtime by Equipment</h2>
      <table>
        <thead><tr><th>Equipment</th><th>Total Downtime (hrs)</th></tr></thead>
        <tbody>
          {Object.entries(byEquipment).sort((a, b) => b[1] - a[1]).map(([name, hours]) => (
            <tr key={name}><td>{name}</td><td>{hours.toFixed(1)}</td></tr>
          ))}
        </tbody>
      </table>

      <h2>Incident Detail</h2>
      <table>
        <thead><tr><th>Request #</th><th>Equipment</th><th>Priority</th><th>Downtime (hrs)</th><th>Status</th></tr></thead>
        <tbody>
          {requests.map((r) => (
            <tr key={r.id}>
              <td>{r.request_number}</td><td>{r.equipment_name}</td><td>{r.priority}</td>
              <td>{r.downtime_hours}</td><td>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {requests.length === 0 && <p>No downtime incidents in this date range.</p>}
    </div>
  );
}