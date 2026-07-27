import { useEffect, useState } from "react";
import { getPendingVarianceShifts, approveShiftVariance } from "../../services/api";

export default function VarianceApprovals() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPendingVarianceShifts();
      setShifts(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this variance? This closes the till permanently.")) return;
    try {
      await approveShiftVariance(id);
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Cash Variance Approvals</h1>
      <p>Tills that closed with a cash discrepancy beyond tolerance are held here until a supervisor reviews and signs off.</p>
      {error && <p>Error: {error}</p>}

      <table>
        <thead><tr><th>Cashier</th><th>Opened</th><th>Closed</th><th>Expected</th><th>Counted</th><th>Variance</th><th>Notes</th><th></th></tr></thead>
        <tbody>
          {shifts.map((s) => (
            <tr key={s.id}>
              <td>{s.cashier_name}</td>
              <td>{new Date(s.opened_at).toLocaleString()}</td>
              <td>{new Date(s.closed_at).toLocaleString()}</td>
              <td>KES {s.expected_cash}</td>
              <td>KES {s.counted_cash}</td>
              <td style={{ color: Number(s.variance) < 0 ? "red" : "inherit" }}>KES {s.variance}</td>
              <td>{s.variance_notes || "—"}</td>
              <td><button type="button" onClick={() => handleApprove(s.id)}>Approve</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {shifts.length === 0 && <p>No variances pending approval.</p>}
    </div>
  );
}