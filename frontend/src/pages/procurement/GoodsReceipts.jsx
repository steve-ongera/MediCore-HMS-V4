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

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading goods receipts...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Procurement</div>
          <h1 className="page-title">Goods Receipts</h1>
          <p className="page-subtitle">Manage goods received notes</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-2"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-box-seam me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Goods Receipts</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {receipts.length} receipt{receipts.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {receipts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-box-seam"></i>
              </div>
              <h3 className="empty-state__title">No goods receipts recorded</h3>
              <p className="empty-state__desc">Goods receipts will appear here once items are received.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>GRN #</th>
                    <th>PO #</th>
                    <th>Supplier</th>
                    <th>Received By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-mono">{r.grn_number}</td>
                      <td className="cell-mono">{r.po_number}</td>
                      <td>{r.supplier_name}</td>
                      <td>{r.received_by_name}</td>
                      <td>{new Date(r.received_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {receipts.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {receipts.length} receipt{receipts.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>

      {/* Receipt Details Section */}
      {receipts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-list-ul me-2"></i> Receipt Details
            </h5>
          </div>
          <div className="card-body">
            {receipts.map((r) => (
              <div key={r.id} className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--border-color)" }}>
                <div className="card-header" style={{ backgroundColor: "var(--bg-secondary)", borderBottom: "1px solid var(--border-color)" }}>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h6 className="card-title" style={{ marginBottom: 0 }}>
                      <i className="bi bi-receipt me-1"></i> {r.grn_number}
                    </h6>
                    <span className="text-2xs text-tertiary">
                      PO: {r.po_number} • Supplier: {r.supplier_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-2xs text-tertiary">
                      {new Date(r.received_at).toLocaleString()}
                    </span>
                  </div>
                </div>
                <div className="card-body p-0">
                  <div className="table-scroll">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th className="cell-numeric">Qty Received</th>
                          <th>Batch #</th>
                          <th>Expiry</th>
                          <th>Asset Tag</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.items.map((it) => (
                          <tr key={it.id}>
                            <td className="cell-primary">{it.item_description}</td>
                            <td className="cell-numeric">{it.quantity_received}</td>
                            <td className="cell-mono">{it.batch_number || "—"}</td>
                            <td>{it.expiry_date || "—"}</td>
                            <td className="cell-mono">{it.asset_tag || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}