import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStockTransfers, createStockTransfer, getStoreLocations, getMedicines } from "../../services/api";

export default function StockTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");

  const [form, setForm] = useState({ from_location: "", to_location: "", notes: "" });
  const [items, setItems] = useState([{ medicine: "", quantity_requested: 1 }]);

  useEffect(() => { loadLocations(); loadMedicines(); }, []);
  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getStockTransfers(params);
      setTransfers(data.results ?? data);
    } catch (err) { setError(err.message); }
  };
  const loadLocations = async () => {
    try { const data = await getStoreLocations(); setLocations(data.results ?? data); } catch (err) { setError(err.message); }
  };
  const loadMedicines = async () => {
    try { const data = await getMedicines({ page_size: 200 }); setMedicines(data.results ?? data); } catch (err) { setError(err.message); }
  };

  const addItem = () => setItems([...items, { medicine: "", quantity_requested: 1 }]);
  const updateItem = (i, field, val) => { const u = [...items]; u[i][field] = val; setItems(u); };
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createStockTransfer({ ...form, items: items.map((it) => ({ medicine: it.medicine, quantity_requested: Number(it.quantity_requested) })) });
      setForm({ from_location: "", to_location: "", notes: "" });
      setItems([{ medicine: "", quantity_requested: 1 }]);
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Internal Stock Transfers</h1>
      {error && <p>Error: {error}</p>}

      <h2>Request Transfer</h2>
      <form onSubmit={submit}>
        <select value={form.from_location} onChange={(e) => setForm((p) => ({ ...p, from_location: e.target.value }))} required>
          <option value="">From Location</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <select value={form.to_location} onChange={(e) => setForm((p) => ({ ...p, to_location: e.target.value }))} required>
          <option value="">To Location</option>
          {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
        <textarea placeholder="Notes" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />

        <h3>Items</h3>
        {items.map((it, i) => (
          <div key={i}>
            <select value={it.medicine} onChange={(e) => updateItem(i, "medicine", e.target.value)} required>
              <option value="">Select medicine</option>
              {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            <input type="number" min="1" value={it.quantity_requested} onChange={(e) => updateItem(i, "quantity_requested", e.target.value)} required />
            {items.length > 1 && <button type="button" onClick={() => removeItem(i)}>Remove</button>}
          </div>
        ))}
        <button type="button" onClick={addItem}>+ Add Item</button>
        <div><button type="submit">Submit Transfer Request</button></div>
      </form>

      <h2>All Transfers</h2>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="REQUESTED">Requested</option>
        <option value="APPROVED">Approved</option>
        <option value="DISPATCHED">Dispatched</option>
        <option value="RECEIVED">Received — Matched</option>
        <option value="DISCREPANCY">Discrepancy Flagged</option>
        <option value="CANCELLED">Cancelled</option>
      </select>
      <table>
        <thead><tr><th>Transfer #</th><th>From</th><th>To</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {transfers.map((t) => (
            <tr key={t.id} style={{ background: t.status === "DISCREPANCY" ? "#fee" : "inherit" }}>
              <td>{t.transfer_number}</td><td>{t.from_location_name}</td><td>{t.to_location_name}</td><td>{t.status}</td>
              <td><Link to={`/stockcontrol/transfers/${t.id}`}>View</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}