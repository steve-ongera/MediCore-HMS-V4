import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  getRequisitions, createRequisition, approveRequisition, rejectRequisition,
  getDepartments, getMedicines,
} from "../../services/api";

export default function Requisitions() {
  const [requisitions, setRequisitions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ department: "", justification: "" });
  const [items, setItems] = useState([
    { item_type: "MEDICINE", medicine: "", description: "", quantity_requested: "", estimated_unit_cost: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => { load(); loadDepartments(); loadMedicines(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getRequisitions(params);
      setRequisitions(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadMedicines = async () => {
    try {
      const data = await getMedicines({ page_size: 200 });
      setMedicines(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleFormChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleItemChange = (index, field) => (e) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: e.target.value };
    setItems(updated);
  };

  const addItemRow = () => {
    setItems([...items, { item_type: "MEDICINE", medicine: "", description: "", quantity_requested: "", estimated_unit_cost: "" }]);
  };

  const removeItemRow = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createRequisition({
        department: form.department,
        justification: form.justification,
        items: items.map((it) => ({
          item_type: it.item_type,
          medicine: it.item_type === "MEDICINE" ? (it.medicine || undefined) : undefined,
          description: it.description,
          quantity_requested: Number(it.quantity_requested),
          estimated_unit_cost: it.estimated_unit_cost || undefined,
        })),
      });
      setForm({ department: "", justification: "" });
      setItems([{ item_type: "MEDICINE", medicine: "", description: "", quantity_requested: "", estimated_unit_cost: "" }]);
      load();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const handleApprove = async (id) => {
    try {
      await approveRequisition(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const submitRejection = async (id) => {
    try {
      await rejectRequisition(id, { rejection_reason: rejectionReason });
      setRejectingId(null);
      setRejectionReason("");
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Purchase Requisitions</h1>
      {error && <p>Error: {error}</p>}

      <h2>New Requisition</h2>
      <form onSubmit={handleSubmit}>
        <select value={form.department} onChange={handleFormChange("department")} required>
          <option value="">Select department</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <textarea placeholder="Justification" value={form.justification} onChange={handleFormChange("justification")} />

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
            <input type="number" placeholder="Quantity" value={item.quantity_requested} onChange={handleItemChange(index, "quantity_requested")} required />
            <input type="number" placeholder="Est. unit cost (optional)" value={item.estimated_unit_cost} onChange={handleItemChange(index, "estimated_unit_cost")} />
            {items.length > 1 && <button type="button" onClick={() => removeItemRow(index)}>Remove</button>}
          </div>
        ))}
        <button type="button" onClick={addItemRow}>+ Add Item</button>

        <div>
          <button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Requisition"}</button>
        </div>
      </form>

      <h2>All Requisitions</h2>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="PENDING_APPROVAL">Pending Approval</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
        <option value="CONVERTED">Converted to PO</option>
        <option value="CANCELLED">Cancelled</option>
      </select>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Req #</th><th>Department</th><th>Requested By</th><th>Status</th><th>Items</th><th></th></tr></thead>
          <tbody>
            {requisitions.map((r) => (
              <tr key={r.id}>
                <td>{r.requisition_number}</td>
                <td>{r.department_name}</td>
                <td>{r.requested_by_name}</td>
                <td>{r.status}</td>
                <td>{r.items.map((it) => `${it.description} x${it.quantity_requested}`).join(", ")}</td>
                <td>
                  {r.status === "PENDING_APPROVAL" && (
                    <>
                      <button type="button" onClick={() => handleApprove(r.id)}>Approve</button>{" "}
                      {rejectingId === r.id ? (
                        <>
                          <input type="text" placeholder="Reason" value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} />
                          <button type="button" onClick={() => submitRejection(r.id)}>Confirm Reject</button>
                          <button type="button" onClick={() => setRejectingId(null)}>Cancel</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setRejectingId(r.id)}>Reject</button>
                      )}
                    </>
                  )}
                  {r.status === "APPROVED" && (
                    <Link to={`/procurement/orders?requisition=${r.id}`}>Create PO</Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && requisitions.length === 0 && <p>No requisitions found.</p>}
    </div>
  );
}