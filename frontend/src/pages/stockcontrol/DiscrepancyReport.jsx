import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTransferDiscrepancies, getVariancePendingCounts } from "../../services/api";

export default function DiscrepancyReport() {
  const [transferDiscrepancies, setTransferDiscrepancies] = useState([]);
  const [countVariances, setCountVariances] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const [t, c] = await Promise.all([getTransferDiscrepancies(), getVariancePendingCounts()]);
      setTransferDiscrepancies(t);
      setCountVariances(c);
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Stock Discrepancy Report</h1>
      <p>Every flagged transfer mismatch and every stock count variance, system-wide. Use this as your primary theft/loss early-warning view.</p>
      {error && <p>Error: {error}</p>}
      <button type="button" onClick={load}>Refresh</button>

      <h2>Transfer Discrepancies ({transferDiscrepancies.length})</h2>
      <table>
        <thead><tr><th>Transfer #</th><th>From</th><th>To</th><th></th></tr></thead>
        <tbody>
          {transferDiscrepancies.map((t) => (
            <tr key={t.id}>
              <td>{t.transfer_number}</td><td>{t.from_location_name}</td><td>{t.to_location_name}</td>
              <td><Link to={`/stockcontrol/transfers/${t.id}`}>Investigate</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      {transferDiscrepancies.length === 0 && <p>No transfer discrepancies.</p>}

      <h2>Stock Count Variances Pending Approval ({countVariances.length})</h2>
      <table>
        <thead><tr><th>Count #</th><th>Location</th><th>Lines with Variance</th></tr></thead>
        <tbody>
          {countVariances.map((c) => (
            <tr key={c.id}>
              <td>{c.count_number}</td><td>{c.location_name}</td>
              <td>{c.lines.filter((l) => l.variance !== 0).map((l) => `${l.medicine_name}: ${l.variance > 0 ? "+" : ""}${l.variance}`).join(", ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {countVariances.length === 0 && <p>No pending count variances.</p>}
    </div>
  );
}