import { useEffect, useState } from "react";
import { getSpareParts, createSparePart, updateSparePart, getLowStockSpareParts, getSuppliers } from "../../services/api";

export default function SparePartsInventory() {
  const [parts, setParts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ part_number: "", name: "", quantity_in_stock: "0", reorder_level: "2", unit_cost: "0", supplier: "" });

  useEffect(() => { load(); loadLowStock(); loadSuppliers(); }, []);

  const load = async () => {
    try { const data = await getSpareParts({ page_size: 200 }); setParts(data.results ?? data); } catch (err) { setError(err.message); }
  };
  const loadLowStock = async () => {
    try { const data = await getLowStockSpareParts(); setLowStock(data); } catch (err) { setError(err.message); }
  };
  const loadSuppliers = async () => {
    try { const data = await getSuppliers(); setSuppliers(data.results ?? data); } catch (err) { setError(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createSparePart({
        ...form, quantity_in_stock: Number(form.quantity_in_stock), reorder_level: Number(form.reorder_level),
        unit_cost: Number(form.unit_cost), supplier: form.supplier || undefined,
      });
      setForm({ part_number: "", name: "", quantity_in_stock: "0", reorder_level: "2", unit_cost: "0", supplier: "" });
      load(); loadLowStock();
    } catch (err) { setError(err.message); }
  };

  const adjustStock = async (part, delta) => {
    try {
      await updateSparePart(part.id, { quantity_in_stock: Math.max(part.quantity_in_stock + delta, 0) });
      load(); loadLowStock();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Spare Parts Inventory</h1>
      {error && <p>Error: {error}</p>}

      <h2>Low Stock Alerts ({lowStock.length})</h2>
      {lowStock.length > 0 && (
        <table>
          <thead><tr><th>Part #</th><th>Name</th><th>In Stock</th><th>Reorder Level</th></tr></thead>
          <tbody>
            {lowStock.map((p) => (
              <tr key={p.id} style={{ background: "#fee" }}>
                <td>{p.part_number}</td><td>{p.name}</td><td>{p.quantity_in_stock}</td><td>{p.reorder_level}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>Add Spare Part</h2>
      <form onSubmit={submit}>
        <input type="text" placeholder="Part Number" value={form.part_number} onChange={(e) => setForm((p) => ({ ...p, part_number: e.target.value }))} required />
        <input type="text" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
        <input type="number" placeholder="Quantity in Stock" value={form.quantity_in_stock} onChange={(e) => setForm((p) => ({ ...p, quantity_in_stock: e.target.value }))} />
        <input type="number" placeholder="Reorder Level" value={form.reorder_level} onChange={(e) => setForm((p) => ({ ...p, reorder_level: e.target.value }))} />
        <input type="number" placeholder="Unit Cost" value={form.unit_cost} onChange={(e) => setForm((p) => ({ ...p, unit_cost: e.target.value }))} />
        <select value={form.supplier} onChange={(e) => setForm((p) => ({ ...p, supplier: e.target.value }))}>
          <option value="">Supplier (optional)</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button type="submit">Add Part</button>
      </form>

      <h2>All Spare Parts</h2>
      <table>
        <thead><tr><th>Part #</th><th>Name</th><th>Stock</th><th>Reorder Level</th><th>Unit Cost</th><th></th></tr></thead>
        <tbody>
          {parts.map((p) => (
            <tr key={p.id} style={{ background: p.is_low_stock ? "#fee" : "inherit" }}>
              <td>{p.part_number}</td><td>{p.name}</td><td>{p.quantity_in_stock}</td>
              <td>{p.reorder_level}</td><td>KES {p.unit_cost}</td>
              <td>
                <button type="button" onClick={() => adjustStock(p, 1)}>+1</button>
                <button type="button" onClick={() => adjustStock(p, -1)}>-1</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}