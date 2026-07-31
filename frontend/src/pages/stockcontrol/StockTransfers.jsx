import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getStockTransfers, createStockTransfer, getStoreLocations, getMedicines } from "../../services/api";

export default function StockTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ from_location: "", to_location: "", notes: "" });
  const [items, setItems] = useState([{ medicine: "", quantity_requested: 1 }]);

  useEffect(() => { loadLocations(); loadMedicines(); }, []);
  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getStockTransfers(params);
      setTransfers(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
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

  const getStatusBadge = (status) => {
    const statusMap = {
      "REQUESTED": "badge-warning",
      "APPROVED": "badge-primary",
      "DISPATCHED": "badge-info",
      "RECEIVED": "badge-success",
      "DISCREPANCY": "badge-danger",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading && transfers.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading stock transfers...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Stock Control</div>
          <h1 className="page-title">Internal Stock Transfers</h1>
          <p className="page-subtitle">Request and manage stock transfers between locations</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => { load(); loadLocations(); loadMedicines(); }}>
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
          <h5 className="card-title">
            <i className="bi bi-arrow-left-right me-2"></i> Request Transfer
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">From Location <span className="required">*</span></label>
                <select className="select" value={form.from_location} onChange={(e) => setForm((p) => ({ ...p, from_location: e.target.value }))} required>
                  <option value="">From Location</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">To Location <span className="required">*</span></label>
                <select className="select" value={form.to_location} onChange={(e) => setForm((p) => ({ ...p, to_location: e.target.value }))} required>
                  <option value="">To Location</option>
                  {locations.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Notes</label>
              <textarea
                className="textarea"
                placeholder="Additional notes"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <i className="bi bi-list-ul me-1"></i> Items
            </h6>
            {items.map((it, i) => (
              <div key={i} className="field-row" style={{ marginBottom: "var(--space-2)" }}>
                <div className="field" style={{ marginBottom: 0, flex: 1.5 }}>
                  <select className="select" value={it.medicine} onChange={(e) => updateItem(i, "medicine", e.target.value)} required>
                    <option value="">Select medicine</option>
                    {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 0.7 }}>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    placeholder="Qty"
                    value={it.quantity_requested}
                    onChange={(e) => updateItem(i, "quantity_requested", e.target.value)}
                    required
                  />
                </div>
                {items.length > 1 && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItem(i)}>
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
              <i className="bi bi-plus-circle me-1"></i> Add Item
            </button>

            <div className="form-actions" style={{ marginTop: "var(--space-3)" }}>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-send me-2"></i> Submit Transfer Request
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-funnel me-1"></i>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>Filter by Status</label>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "180px" }}
              >
                <option value="">All</option>
                <option value="REQUESTED">Requested</option>
                <option value="APPROVED">Approved</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="RECEIVED">Received — Matched</option>
                <option value="DISCREPANCY">Discrepancy Flagged</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {transfers.length} transfer{transfers.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {transfers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-arrow-left-right"></i>
              </div>
              <h3 className="empty-state__title">No transfers found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No transfers with status "${statusFilter}" found.` 
                  : "Create your first stock transfer using the form above."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Transfer #</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {transfers.map((t) => (
                    <tr key={t.id} style={t.status === "DISCREPANCY" ? { background: "var(--danger-soft)" } : {}}>
                      <td className="cell-mono">{t.transfer_number}</td>
                      <td>{t.from_location_name}</td>
                      <td>{t.to_location_name}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(t.status)}`}>
                          <span className="badge-dot"></span>
                          {t.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <Link to={`/stockcontrol/transfers/${t.id}`} className="btn btn-secondary btn-sm">
                          <i className="bi bi-eye me-1"></i> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {transfers.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {transfers.length} transfer{transfers.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Requested
              </span>
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                Approved
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                Dispatched
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Received
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Discrepancy
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}