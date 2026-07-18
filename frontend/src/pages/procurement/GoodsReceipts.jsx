import { useEffect, useState } from "react";
import { getGoodsReceipts } from "../../services/api";

export default function GoodsReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getGoodsReceipts({ page_size: 100 });
      setReceipts(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div>
      <h1>Goods Receipts</h1>
      {error && <p>Error: {error}</p>}

      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>GRN #</th><th>PO #</th><th>Supplier</th><th>Received By</th><th>Date</th></tr></thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id}>
                <td>{r.grn_number}</td><td>{r.po_number}</td><td>{r.supplier_name}</td>
                <td>{r.received_by_name}</td><td>{new Date(r.received_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && receipts.length === 0 && <p>No goods receipts recorded yet.</p>}

      {receipts.map((r) => (
        <div key={`${r.id}-detail`} style={{ marginTop: "1em" }}>
          <h3>{r.grn_number} — Items</h3>
          <table>
            <thead><tr><th>Item</th><th>Qty Received</th><th>Batch #</th><th>Expiry</th><th>Asset Tag</th></tr></thead>
            <tbody>
              {r.items.map((it) => (
                <tr key={it.id}>
                  <td>{it.item_description}</td><td>{it.quantity_received}</td>
                  <td>{it.batch_number || "—"}</td><td>{it.expiry_date || "—"}</td>
                  <td>{it.asset_tag || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}