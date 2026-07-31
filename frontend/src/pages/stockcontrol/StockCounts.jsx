import { useEffect, useState } from "react";
import { getStockCounts, createStockCount, getStoreLocations, getLocationStock, submitStockCount, approveStockCount } from "../../services/api";
import { formatDateTime } from "../../utils/formatters";

export default function StockCounts() {
  const [counts, setCounts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [activeCount, setActiveCount] = useState(null);
  const [systemStock, setSystemStock] = useState([]);
  const [countedValues, setCountedValues] = useState({});

  useEffect(() => { load(); loadLocations(); }, []);

  const load = async () => {
    setLoading(true);
    try { 
      const data = await getStockCounts({ page_size: 100 }); 
      setCounts(data.results ?? data); 
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };
  
  const loadLocations = async () => {
    try { 
      const data = await getStoreLocations(); 
      setLocations(data.results ?? data); 
    } catch (err) { 
      setError(err.message); 
    }
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

  const getStatusBadge = (status) => {
    const statusMap = {
      "DRAFT": "badge-warning",
      "SUBMITTED": "badge-primary",
      "VARIANCE_PENDING": "badge-danger",
      "APPROVED": "badge-success",
      "REJECTED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading stock counts...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Stock Control</div>
          <h1 className="page-title">Stock Counts</h1>
          <p className="page-subtitle">Manage physical inventory counts</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => { load(); loadLocations(); }}>
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

      {!activeCount ? (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-plus-circle me-2"></i> Start New Count
            </h5>
          </div>
          <div className="card-body">
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Location <span className="required">*</span></label>
                <select className="select" value={selectedLocation} onChange={(e) => setSelectedLocation(e.target.value)}>
                  <option value="">Select location</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button type="button" className="btn btn-primary" onClick={startCount} disabled={!selectedLocation}>
                  <i className="bi bi-plus-circle me-2"></i> Start Count
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <div className="flex items-center gap-3 flex-wrap">
              <i className="bi bi-clipboard-check me-1"></i>
              <h5 className="card-title" style={{ marginBottom: 0 }}>
                Counting: {activeCount.location_name}
              </h5>
            </div>
            <div>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                In Progress
              </span>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th className="cell-numeric">System Qty</th>
                    <th className="cell-numeric">Physical Count</th>
                  </tr>
                </thead>
                <tbody>
                  {systemStock.map((s) => (
                    <tr key={s.medicine}>
                      <td className="cell-primary">{s.medicine_name}</td>
                      <td className="cell-numeric">{s.quantity_on_hand}</td>
                      <td className="cell-numeric">
                        <input
                          type="number"
                          className="input"
                          value={countedValues[s.medicine] ?? ""}
                          onChange={(e) => setCountedValues((p) => ({ ...p, [s.medicine]: e.target.value }))}
                          style={{ width: "120px", display: "inline-block" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="card-footer">
            <div className="flex gap-3">
              <button type="button" className="btn btn-success" onClick={submitCount}>
                <i className="bi bi-check-circle me-2"></i> Submit Count
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setActiveCount(null)}>
                <i className="bi bi-x me-2"></i> Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Count History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {counts.length} count{counts.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {counts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No count history</h3>
              <p className="empty-state__desc">Start your first stock count using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Count #</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Variance?</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {counts.map((c) => (
                    <tr key={c.id} style={c.has_variance ? { background: "var(--danger-soft)" } : {}}>
                      <td className="cell-mono">{c.count_number}</td>
                      <td>{c.location_name}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(c.status)}`}>
                          <span className="badge-dot"></span>
                          {c.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${c.has_variance ? "badge-danger" : "badge-success"}`}>
                          <span className="badge-dot"></span>
                          {c.has_variance ? "YES" : "No"}
                        </span>
                      </td>
                      <td className="cell-actions">
                        {(c.status === "SUBMITTED" || c.status === "VARIANCE_PENDING") && (
                          <button className="btn btn-success btn-sm" onClick={() => handleApprove(c.id)}>
                            <i className="bi bi-check-circle me-1"></i> Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {counts.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {counts.length} count{counts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Draft
              </span>
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                Submitted
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Variance
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Approved
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}