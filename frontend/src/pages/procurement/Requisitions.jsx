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

  const getStatusBadge = (status) => {
    const statusMap = {
      "PENDING_APPROVAL": "badge-warning",
      "APPROVED": "badge-success",
      "REJECTED": "badge-danger",
      "CONVERTED": "badge-info",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading && requisitions.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading requisitions...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Procurement</div>
          <h1 className="page-title">Purchase Requisitions</h1>
          <p className="page-subtitle">Manage purchase requisitions</p>
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
            <i className="bi bi-plus-circle me-2"></i> New Requisition
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Department <span className="required">*</span></label>
                <select className="select" value={form.department} onChange={handleFormChange("department")} required>
                  <option value="">Select department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                <label className="field-label">Justification <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Justification for requisition"
                  value={form.justification}
                  onChange={handleFormChange("justification")}
                  required
                />
              </div>
            </div>

            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <i className="bi bi-list-ul me-1"></i> Items
            </h6>
            {items.map((item, index) => (
              <div key={index} className="field-row" style={{ marginBottom: "var(--space-2)" }}>
                <div className="field" style={{ marginBottom: 0, flex: 0.8 }}>
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
                    value={item.quantity_requested}
                    onChange={handleItemChange(index, "quantity_requested")}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 0.8 }}>
                  <input
                    type="number"
                    className="input"
                    placeholder="Est. cost"
                    value={item.estimated_unit_cost}
                    onChange={handleItemChange(index, "estimated_unit_cost")}
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
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-2"></i> Submit Requisition
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
                <option value="PENDING_APPROVAL">Pending Approval</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CONVERTED">Converted to PO</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {requisitions.length} requisition{requisitions.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {requisitions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-file-earmark-text"></i>
              </div>
              <h3 className="empty-state__title">No requisitions found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No requisitions with status "${statusFilter}" found.` 
                  : "Create a new requisition using the form above."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Req #</th>
                    <th>Department</th>
                    <th>Requested By</th>
                    <th>Status</th>
                    <th>Items</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {requisitions.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-mono">{r.requisition_number}</td>
                      <td>{r.department_name}</td>
                      <td>{r.requested_by_name}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(r.status)}`}>
                          <span className="badge-dot"></span>
                          {r.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <div className="text-sm">
                          {r.items.slice(0, 3).map((it) => (
                            <div key={it.id}>
                              <span className="text-muted">{it.description}</span>
                              <span className="text-2xs text-tertiary"> x{it.quantity_requested}</span>
                            </div>
                          ))}
                          {r.items.length > 3 && (
                            <div className="text-2xs text-tertiary">+{r.items.length - 3} more</div>
                          )}
                        </div>
                      </td>
                      <td className="cell-actions">
                        {r.status === "PENDING_APPROVAL" && (
                          <div className="flex gap-1 justify-end">
                            <button className="btn btn-success btn-sm" onClick={() => handleApprove(r.id)}>
                              <i className="bi bi-check me-1"></i> Approve
                            </button>
                            {rejectingId === r.id ? (
                              <>
                                <input
                                  type="text"
                                  className="input"
                                  placeholder="Reason"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  style={{ width: "120px" }}
                                />
                                <button className="btn btn-danger btn-sm" onClick={() => submitRejection(r.id)}>
                                  <i className="bi bi-check me-1"></i> Confirm
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => setRejectingId(null)}>
                                  <i className="bi bi-x"></i>
                                </button>
                              </>
                            ) : (
                              <button className="btn btn-danger btn-sm" onClick={() => setRejectingId(r.id)}>
                                <i className="bi bi-x me-1"></i> Reject
                              </button>
                            )}
                          </div>
                        )}
                        {r.status === "APPROVED" && (
                          <Link to={`/procurement/orders?requisition=${r.id}`} className="btn btn-primary btn-sm">
                            <i className="bi bi-file-earmark-plus me-1"></i> Create PO
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {requisitions.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {requisitions.length} requisition{requisitions.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Pending Approval
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Approved
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Rejected
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                Converted
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}