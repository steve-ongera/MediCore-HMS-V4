import { useEffect, useState } from "react";
import { getStockCounts, createStockCount, getStoreLocations, getLocationStock, submitStockCount, approveStockCount } from "../../services/api";

export default function StockCounts() {
  const [counts, setCounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [error, setError] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [activeCount, setActiveCount] = useState(null);
  const [systemStock, setSystemStock] = useState([]);
  const [countedValues, setCountedValues] = useState({});

  useEffect(() => { load(); loadLocations(); }, []);

  const load = async () => {
    try { const data = await getStockCounts({ page_size: 100 }); setCounts(data.results ?? data); } catch (err) { setError(err.message); }
  };
  const loadLocations = async () => {
    try { const data = await getStoreLocations(); setLocations(data.results ?? data); } catch (err) { setError(err.message); }
  };

  const startCount = async () => {
    if (!selectedLocation) return;
    try {
      const count = await createStockCount({ location: selectedLocation });
      setActiveCount(count);
      const stock = await getLocationStock(selectedLocation);
      setSystemStock(stock);
      const initial = {};
      stock.forEach((s) => { initial[s.medicine] = s.quantity_on_hand; });
      setCountedValues(initial);
    } catch (err) { setError(err.message); }
  };

  const submitCount = async () => {
    try {
      const lines = systemStock.map((s) => ({
        medicine: s.medicine,
        counted_quantity: Number(countedValues[s.medicine] ?? 0),
      }));
      await submitStockCount(activeCount.id, { lines });
      setActiveCount(null);
      setSystemStock([]);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleApprove = async (id) => {
    try { await approveStockCount(id); load(); } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Stock Counts</h1>
      {error && <p>Error: {error}</p>}

      {!activeCount ? (
        <div>
          <h2>Start New Count</h2>
          <select value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
            <option value="">Select location</option>
            {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <button type="button" onClick={startCount}>Start Count</button>
        </div>
      ) : (
        <div>
          <h2>Counting: {activeCount.location_name}</h2>
          <table>
            <thead><tr><th>Medicine</th><th>System Qty</th><th>Physical Count</th></tr></thead>
            <tbody>
              {systemStock.map((s) => (
                <tr key={s.medicine}>
                  <td>{s.medicine_name}</td>
                  <td>{s.quantity_on_hand}</td>
                  <td><input type="number" value={countedValues[s.medicine] ?? ""} onChange={(e) => setCountedValues((p) => ({ ...p, [s.medicine]: e.target.value }))} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <button type="button" onClick={submitCount}>Submit Count</button>
          <button type="button" onClick={() => setActiveCount(null)}>Cancel</button>
        </div>
      )}

      <h2>Count History</h2>
      <table>
        <thead><tr><th>Count #</th><th>Location</th><th>Status</th><th>Variance?</th><th></th></tr></thead>
        <tbody>
          {counts.map((c) => (
            <tr key={c.id} style={{ background: c.has_variance ? "#fee" : "inherit" }}>
              <td>{c.count_number}</td><td>{c.location_name}</td><td>{c.status}</td>
              <td>{c.has_variance ? "YES" : "No"}</td>
              <td>
                {(c.status === "SUBMITTED" || c.status === "VARIANCE_PENDING") && (
                  <button type="button" onClick={() => handleApprove(c.id)}>Approve</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}