import { useEffect, useState } from "react";
import {
  getMyOpenShift, openCashierShift, closeCashierShift, recordCashDrop, getCashierShifts,
} from "../../services/api";

export default function CashTillDashboard() {
  const [shift, setShift] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [openingFloat, setOpeningFloat] = useState("");
  const [dropAmount, setDropAmount] = useState("");
  const [dropReason, setDropReason] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [current, hist] = await Promise.all([getMyOpenShift(), getCashierShifts({ page_size: 50 })]);
      setShift(current);
      setHistory(hist.results ?? hist);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleOpen = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await openCashierShift({ opening_float: Number(openingFloat) });
      setOpeningFloat("");
      load();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await recordCashDrop(shift.id, { amount: Number(dropAmount), reason: dropReason });
      setDropAmount("");
      setDropReason("");
      load();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const handleClose = async (e) => {
    e.preventDefault();
    if (!window.confirm("Close your till? This cannot be undone.")) return;
    setSubmitting(true);
    setError("");
    try {
      await closeCashierShift(shift.id, { counted_cash: Number(countedCash), notes: closeNotes });
      setCountedCash("");
      setCloseNotes("");
      load();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Cash Till</h1>
      {error && <p>Error: {error}</p>}

      {!shift ? (
        <section>
          <h2>Open Till</h2>
          <p>Count your starting cash float before beginning your shift and enter it here.</p>
          <form onSubmit={handleOpen}>
            <input type="number" placeholder="Opening float (KES)" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} required />
            <button type="submit" disabled={submitting}>{submitting ? "Opening..." : "Open Till"}</button>
          </form>
        </section>
      ) : (
        <>
          <section>
            <h2>Current Shift</h2>
            <p>Opened: {new Date(shift.opened_at).toLocaleString()}</p>
            <p>Opening Float: KES {shift.opening_float}</p>
            <p>Expected Cash Right Now: KES {shift.running_expected_cash}</p>
            <p>Status: {shift.status}</p>
          </section>

          <section>
            <h2>Cash Drops (mid-shift removal to safe)</h2>
            <form onSubmit={handleDrop}>
              <input type="number" placeholder="Amount" value={dropAmount} onChange={(e) => setDropAmount(e.target.value)} required />
              <input type="text" placeholder="Reason" value={dropReason} onChange={(e) => setDropReason(e.target.value)} />
              <button type="submit" disabled={submitting}>Record Cash Drop</button>
            </form>
            <table>
              <thead><tr><th>Amount</th><th>Reason</th><th>Time</th></tr></thead>
              <tbody>
                {shift.cash_drops.map((d) => (
                  <tr key={d.id}><td>KES {d.amount}</td><td>{d.reason || "—"}</td><td>{new Date(d.dropped_at).toLocaleString()}</td></tr>
                ))}
              </tbody>
            </table>
          </section>

          <section>
            <h2>Close Till</h2>
            <p>Physically count all cash in your drawer and enter the total. The system will compare it to what's expected.</p>
            <form onSubmit={handleClose}>
              <input type="number" placeholder="Counted cash (KES)" value={countedCash} onChange={(e) => setCountedCash(e.target.value)} required />
              <textarea placeholder="Notes (optional)" value={closeNotes} onChange={(e) => setCloseNotes(e.target.value)} />
              <button type="submit" disabled={submitting}>{submitting ? "Closing..." : "Close Till"}</button>
            </form>
          </section>
        </>
      )}

      <section>
        <h2>My Shift History</h2>
        <table>
          <thead><tr><th>Opened</th><th>Closed</th><th>Expected</th><th>Counted</th><th>Variance</th><th>Status</th></tr></thead>
          <tbody>
            {history.map((s) => (
              <tr key={s.id}>
                <td>{new Date(s.opened_at).toLocaleString()}</td>
                <td>{s.closed_at ? new Date(s.closed_at).toLocaleString() : "—"}</td>
                <td>{s.expected_cash != null ? `KES ${s.expected_cash}` : "—"}</td>
                <td>{s.counted_cash != null ? `KES ${s.counted_cash}` : "—"}</td>
                <td>{s.variance != null ? `KES ${s.variance}` : "—"}</td>
                <td>{s.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}