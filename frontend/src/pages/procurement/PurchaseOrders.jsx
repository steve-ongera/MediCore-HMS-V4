import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  getPurchaseOrders, createPurchaseOrder, getSuppliers, getMedicines,
  getRequisitions,
} from "../../services/api";

export default function PurchaseOrders() {
  const [searchParams] = useSearchParams();
  const requisitionIdParam = searchParams.get("requisition");

  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [requisitions, setRequisitions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    requisition: requisitionIdParam || "", supplier: "", expected_delivery_date: "", notes: "",
  });
  const [items, setItems] = useState([
    { item_type: "MEDICINE", medicine: "", description: "", quantity_ordered: "", unit_cost: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); loadSuppliers(); loadMedicines(); loadApprovedRequisitions(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getPurchaseOrders(params);
      setOrders(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadMedicines = async () => {
    try {
      const data = await getMedicines({ page_size: 200 });
      setMedicines(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadApprovedRequisitions = async () => {
    try {
      const data = await getRequisitions({ status: "APPROVED", page_size: 100 });
      setRequisitions(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleFormChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleItemChange = (index, field) => (e) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: e.target.value };
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { item_type: "MEDICINE", medicine: "", description: "", quantity_ordered: "", unit_cost: "" }]);
  };

  const removeItemRow = (index) => setItems(items.filter((_, i) => i !== index));

  const prefillFromRequisition = (reqId) => {
    const req = requisitions.find((r) => r.id === reqId);
    if (!req) return;
    setItems(req.items.map((it) => ({
      item_type: it.item_type, medicine: it.medicine || "", description: it.description,
      quantity_ordered: it.quantity_requested, unit_cost: it.estimated_unit_cost || "",
    })));
  };

  const handleRequisitionChange = (e) => {
    const val = e.target.value;
    setForm((p) => ({ ...p, requisition: val }));
    if (val) prefillFromRequisition(val);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const po = await createPurchaseOrder({
        requisition: form.requisition || undefined,
        supplier: form.supplier,
        expected_delivery_date: form.expected_delivery_date || undefined,
        notes: form.notes,
        items: items.map((it) => ({
          item_type: it.item_type,
          medicine: it.item_type === "MEDICINE" ? (it.medicine || undefined) : undefined,
          description: it.description,
          quantity_ordered: Number(it.quantity_ordered),
          unit_cost: Number(it.unit_cost),
        })),
      });
      setForm({ requisition: "", supplier: "", expected_delivery_date: "", notes: "" });
      setItems([{ item_type: "MEDICINE", medicine: "", description: "", quantity_ordered: "", unit_cost: "" }]);
      load();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "OPEN": "badge-primary",
      "PARTIALLY_RECEIVED": "badge-warning",
      "FULLY_RECEIVED": "badge-success",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading && orders.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading purchase orders...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Procurement</div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">Manage purchase orders</p>
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
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> Create Purchase Order
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Requisition (optional)</label>
                <select className="select" value={form.requisition} onChange={handleRequisitionChange}>
                  <option value="">No requisition (direct PO)</option>
                  {requisitions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.requisition_number} - {r.department_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Supplier <span className="required">*</span></label>
                <select className="select" value={form.supplier} onChange={handleFormChange("supplier")} required>
                  <option value="">Select supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Expected Delivery Date</label>
                <input
                  type="date"
                  className="input"
                  value={form.expected_delivery_date}
                  onChange={handleFormChange("expected_delivery_date")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                <label className="field-label">Notes</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Additional notes"
                  value={form.notes}
                  onChange={handleFormChange("notes")}
                />
              </div>
            </div>

            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <i className="bi bi-list-ul me-1"></i> Items
            </h6>
            {items.map((item, index) => (
              <div key={index} className="field-row" style={{ marginBottom: "var(--space-2)" }}>
                <div className="field" style={{ marginBottom: 0, flex: 0.7 }}>
                  <select className="select" value={item.item_type} onChange={handleItemChange(index, "item_type")}>
                    <option value="MEDICINE">Medicine</option>
                    <option value="ASSET">Asset / Equipment</option>
                    <option value="CONSUMABLE">Consumable</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                {item.item_type === "MEDICINE" && (
                  <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                    <select className="select" value={item.medicine} onChange={handleItemChange(index, "medicine")}>
                      <option value="">Select medicine (optional)</option>
                      {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="field" style={{ marginBottom: 0, flex: 1.2 }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Description"
                    value={item.description}
                    onChange={handleItemChange(index, "description")}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 0.6 }}>
                  <input
                    type="number"
                    className="input"
                    placeholder="Qty"
                    value={item.quantity_ordered}
                    onChange={handleItemChange(index, "quantity_ordered")}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 0.8 }}>
                  <input
                    type="number"
                    className="input"
                    placeholder="Unit Cost"
                    value={item.unit_cost}
                    onChange={handleItemChange(index, "unit_cost")}
                    required
                  />
                </div>
                {items.length > 1 && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItemRow(index)}>
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={addItemRow}>
              <i className="bi bi-plus-circle me-1"></i> Add Item
            </button>

            <div className="form-actions" style={{ marginTop: "var(--space-3)" }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle me-2"></i> Create Purchase Order
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
                <option value="OPEN">Open</option>
                <option value="PARTIALLY_RECEIVED">Partially Received</option>
                <option value="FULLY_RECEIVED">Fully Received</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {orders.length} purchase order{orders.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {orders.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-file-earmark-text"></i>
              </div>
              <h3 className="empty-state__title">No purchase orders found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No orders with status "${statusFilter}" found.` 
                  : "Create a new purchase order using the form above."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PO #</th>
                    <th>Supplier</th>
                    <th>Status</th>
                    <th>Order Date</th>
                    <th className="cell-numeric">Total</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td className="cell-mono">{o.po_number}</td>
                      <td>{o.supplier_name}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(o.status)}`}>
                          <span className="badge-dot"></span>
                          {o.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{new Date(o.order_date).toLocaleDateString()}</td>
                      <td className="cell-numeric">{formatCurrency(o.total_amount)}</td>
                      <td className="cell-actions">
                        <Link to={`/procurement/orders/${o.id}`} className="btn btn-secondary btn-sm">
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
        {orders.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {orders.length} purchase order{orders.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                Open
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Partially Received
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Fully Received
              </span>
              <span className="badge badge-neutral">
                <span className="badge-dot"></span>
                Cancelled
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}