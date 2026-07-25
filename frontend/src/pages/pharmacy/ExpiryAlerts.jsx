import { useEffect, useState } from "react";
import { getMedicineBatches, getLowStockMedicines } from "../../services/api";

export default function ExpiryAlerts() {
  const [batches, setBatches] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);
  const load = async () => {
    try {
      const [b, l] = await Promise.all([getMedicineBatches({ page_size: 200 }), getLowStockMedicines()]);
      const results = b.results ?? b;
      const today = new Date();
      const cutoff = new Date(today.getTime() + 30 * 86400000);
      setBatches(results.filter((x) => new Date(x.expiry_date) <= cutoff && x.quantity_remaining > 0));
      setLowStock(l);
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Expiry & Low Stock Alerts</h1>
      {error && <p>Error: {error}</p>}
      <h2>Batches Expiring Within 30 Days</h2>
      <table><thead><tr><th>Medicine</th><th>Batch #</th><th>Qty Remaining</th><th>Expiry Date</th></tr></thead>
        <tbody>{batches.map((b) => (<tr key={b.id}><td>{b.medicine_name}</td><td>{b.batch_number}</td><td>{b.quantity_remaining}</td><td>{b.expiry_date}</td></tr>))}</tbody>
      </table>
      {batches.length === 0 && <p>No batches expiring soon.</p>}

      <h2>Low Stock Medicines</h2>
      <table><thead><tr><th>Medicine</th><th>Current Stock</th><th>Reorder Level</th></tr></thead>
        <tbody>{lowStock.map((m) => (<tr key={m.id}><td>{m.name}</td><td>{m.current_stock}</td><td>{m.reorder_level}</td></tr>))}</tbody>
      </table>
      {lowStock.length === 0 && <p>No low stock alerts.</p>}
    </div>
  );
}