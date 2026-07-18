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

  return (
    <div>
      <h1>Purchase Orders</h1>
      {error && <p>Error: {error}</p>}

      <h2>Create Purchase Order</h2>
      <form onSubmit={handleSubmit}>
        <select value={form.requisition} onChange={handleRequisitionChange}>
          <option value="">No requisition (direct PO)</option>
          {requisitions.map((r) => <option key={r.id} value={r.id}>{r.requisition_number} - {r.department_name}</option>)}
        </select>
        <select value={form.supplier} onChange={handleFormChange("supplier")} required>
          <option value="">Select supplier</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" value={form.expected_delivery_date} onChange={handleFormChange("expected_delivery_date")} />
        <textarea placeholder="Notes" value={form.notes} onChange={handleFormChange("notes")} />

        <h3>Items</h3>
        {items.map((item, index) => (
          <div key={index}>
            <select value={item.item_type} onChange={handleItemChange(index, "item_type")}>
              <option value="MEDICINE">Medicine</option>
              <option value="ASSET">Asset / Equipment</option>
              <option value="CONSUMABLE">Consumable</option>
              <option value="OTHER">Other</option>
            </select>
            {item.item_type === "MEDICINE" && (
              <select value={item.medicine} onChange={handleItemChange(index, "medicine")}>
                <option value="">Select medicine (optional)</option>
                {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}
            <input type="text" placeholder="Description" value={item.description} onChange={handleItemChange(index, "description")} required />
            <input type="number" placeholder="Quantity" value={item.quantity_ordered} onChange={handleItemChange(index, "quantity_ordered")} required />
            <input type="number" placeholder="Unit Cost" value={item.unit_cost} onChange={handleItemChange(index, "unit_cost")} required />
            {items.length > 1 && <button type="button" onClick={() => removeItemRow(index)}>Remove</button>}
          </div>
        ))}
        <button type="button" onClick={addItemRow}>+ Add Item</button>

        <div>
          <button type="submit" disabled={submitting}>{submitting ? "Creating..." : "Create Purchase Order"}</button>
        </div>
      </form>

      <h2>All Purchase Orders</h2>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="OPEN">Open</option>
        <option value="PARTIALLY_RECEIVED">Partially Received</option>
        <option value="FULLY_RECEIVED">Fully Received</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>PO #</th><th>Supplier</th><th>Status</th><th>Order Date</th><th>Total</th><th></th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id}>
                <td>{o.po_number}</td><td>{o.supplier_name}</td><td>{o.status}</td>
                <td>{o.order_date}</td><td>KES {o.total_amount}</td>
                <td><Link to={`/procurement/orders/${o.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && orders.length === 0 && <p>No purchase orders found.</p>}
    </div>
  );
}