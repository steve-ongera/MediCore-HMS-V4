import { useEffect, useState } from "react";
import { getMedicineBatches, getLowStockMedicines } from "../../services/api";

export default function ExpiryAlerts() {
  const [batches, setBatches] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [b, l] = await Promise.all([getMedicineBatches({ page_size: 200 }), getLowStockMedicines()]);
      const results = b.results ?? b;
      const today = new Date();
      const cutoff = new Date(today.getTime() + 30 * 86400000);
      setBatches(results.filter((x) => new Date(x.expiry_date) <= cutoff && x.quantity_remaining > 0));
      setLowStock(l);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const getExpiryStatus = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) return "badge-danger";
    if (diffDays <= 14) return "badge-warning";
    return "badge-info";
  };

  const getExpiryLabel = (expiryDate) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays <= 7) return "Critical";
    if (diffDays <= 14) return "Warning";
    return "Soon";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading alerts...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Pharmacy</div>
          <h1 className="page-title">Expiry & Low Stock Alerts</h1>
          <p className="page-subtitle">Monitor expiring batches and low stock items</p>
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
            <i className="bi bi-clock-history me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Batches Expiring Within 30 Days</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {batches.length} batch{batches.length !== 1 ? "es" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {batches.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <h3 className="empty-state__title">No batches expiring soon</h3>
              <p className="empty-state__desc">All medicine batches have more than 30 days until expiry.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th>Batch #</th>
                    <th className="cell-numeric">Qty Remaining</th>
                    <th>Expiry Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {batches.map((b) => (
                    <tr key={b.id}>
                      <td className="cell-primary">{b.medicine_name}</td>
                      <td className="cell-mono">{b.batch_number}</td>
                      <td className="cell-numeric">{b.quantity_remaining}</td>
                      <td>{b.expiry_date}</td>
                      <td>
                        <span className={`badge ${getExpiryStatus(b.expiry_date)}`}>
                          <span className="badge-dot"></span>
                          {getExpiryLabel(b.expiry_date)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {batches.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {batches.length} batch{batches.length !== 1 ? "es" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Critical (&lt; 7 days)
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Warning (7-14 days)
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                Soon (15-30 days)
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-exclamation-triangle me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Low Stock Medicines</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {lowStock.length} item{lowStock.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {lowStock.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <h3 className="empty-state__title">No low stock alerts</h3>
              <p className="empty-state__desc">All medicines are above their reorder levels.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th className="cell-numeric">Current Stock</th>
                    <th className="cell-numeric">Reorder Level</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((m) => (
                    <tr key={m.id}>
                      <td className="cell-primary">{m.name}</td>
                      <td className="cell-numeric">{m.current_stock}</td>
                      <td className="cell-numeric">{m.reorder_level}</td>
                      <td>
                        <span className="badge badge-danger">
                          <span className="badge-dot"></span>
                          Reorder Required
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {lowStock.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {lowStock.length} item{lowStock.length !== 1 ? "s" : ""} below reorder level
            </span>
          </div>
        )}
      </div>
    </>
  );
}