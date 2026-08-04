import { useEffect, useState } from "react";
import { getSpareParts, createSparePart, updateSparePart, getLowStockSpareParts, getSuppliers } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";

export default function SparePartsInventory() {
  const [parts, setParts] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ part_number: "", name: "", quantity_in_stock: "0", reorder_level: "2", unit_cost: "0", supplier: "" });

  useEffect(() => { load(); loadLowStock(); loadSuppliers(); }, []);

  const load = async () => {
    setLoading(true);
    try { 
      const data = await getSpareParts({ page_size: 200 }); 
      setParts(data.results ?? data); 
    } catch (err) { 
      setError(err.message); 
    } finally {
      setLoading(false);
    }
  };
  
  const loadLowStock = async () => {
    try { 
      const data = await getLowStockSpareParts(); 
      setLowStock(data); 
    } catch (err) { 
      setError(err.message); 
    }
  };
  
  const loadSuppliers = async () => {
    try { 
      const data = await getSuppliers(); 
      setSuppliers(data.results ?? data); 
    } catch (err) { 
      setError(err.message); 
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createSparePart({
        ...form, 
        quantity_in_stock: Number(form.quantity_in_stock), 
        reorder_level: Number(form.reorder_level),
        unit_cost: Number(form.unit_cost), 
        supplier: form.supplier || undefined,
      });
      setForm({ part_number: "", name: "", quantity_in_stock: "0", reorder_level: "2", unit_cost: "0", supplier: "" });
      load(); 
      loadLowStock();
    } catch (err) { 
      setError(err.message); 
    } finally {
      setSubmitting(false);
    }
  };

  const adjustStock = async (part, delta) => {
    try {
      await updateSparePart(part.id, { quantity_in_stock: Math.max(part.quantity_in_stock + delta, 0) });
      load(); 
      loadLowStock();
    } catch (err) { 
      setError(err.message); 
    }
  };

  if (loading && parts.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading spare parts inventory...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Biomedical Engineering</div>
          <h1 className="page-title">Spare Parts Inventory</h1>
          <p className="page-subtitle">Manage spare parts and track stock levels</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => { load(); loadLowStock(); }}>
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
            <i className="bi bi-exclamation-triangle me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Low Stock Alerts ({lowStock.length})</h5>
          </div>
        </div>
        <div className="card-body p-0">
          {lowStock.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <h3 className="empty-state__title">No low stock alerts</h3>
              <p className="empty-state__desc">All spare parts are above their reorder levels.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Part #</th>
                    <th>Name</th>
                    <th className="cell-numeric">In Stock</th>
                    <th className="cell-numeric">Reorder Level</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((p) => (
                    <tr key={p.id} style={{ background: "var(--danger-soft)" }}>
                      <td className="cell-mono">{p.part_number}</td>
                      <td className="cell-primary">{p.name}</td>
                      <td className="cell-numeric">{p.quantity_in_stock}</td>
                      <td className="cell-numeric">{p.reorder_level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> Add Spare Part
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Part Number <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Part Number"
                  value={form.part_number}
                  onChange={(e) => setForm((p) => ({ ...p, part_number: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1.5 }}>
                <label className="field-label">Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Part Name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Quantity in Stock</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Quantity"
                  value={form.quantity_in_stock}
                  onChange={(e) => setForm((p) => ({ ...p, quantity_in_stock: e.target.value }))}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Reorder Level</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Reorder Level"
                  value={form.reorder_level}
                  onChange={(e) => setForm((p) => ({ ...p, reorder_level: e.target.value }))}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Unit Cost</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Unit Cost"
                  value={form.unit_cost}
                  onChange={(e) => setForm((p) => ({ ...p, unit_cost: e.target.value }))}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Supplier</label>
              <select className="select" value={form.supplier} onChange={(e) => setForm((p) => ({ ...p, supplier: e.target.value }))}>
                <option value="">Supplier (optional)</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle me-2"></i> Add Part
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>All Spare Parts</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {parts.length} part{parts.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {parts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-boxes"></i>
              </div>
              <h3 className="empty-state__title">No spare parts</h3>
              <p className="empty-state__desc">Add your first spare part using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Part #</th>
                    <th>Name</th>
                    <th className="cell-numeric">Stock</th>
                    <th className="cell-numeric">Reorder Level</th>
                    <th className="cell-numeric">Unit Cost</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {parts.map((p) => (
                    <tr key={p.id} style={p.is_low_stock ? { background: "var(--danger-soft)" } : {}}>
                      <td className="cell-mono">{p.part_number}</td>
                      <td className="cell-primary">{p.name}</td>
                      <td className="cell-numeric">{p.quantity_in_stock}</td>
                      <td className="cell-numeric">{p.reorder_level}</td>
                      <td className="cell-numeric">{formatCurrency(p.unit_cost)}</td>
                      <td className="cell-actions">
                        <div className="flex gap-1 justify-end">
                          <button className="btn btn-success btn-sm" onClick={() => adjustStock(p, 1)}>
                            <i className="bi bi-plus me-1"></i> +1
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => adjustStock(p, -1)} disabled={p.quantity_in_stock <= 0}>
                            <i className="bi bi-dash me-1"></i> -1
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {parts.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {parts.length} spare part{parts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                In Stock
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Low Stock
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}