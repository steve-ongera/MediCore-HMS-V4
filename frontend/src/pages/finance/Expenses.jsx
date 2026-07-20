import { useEffect, useState } from "react";
import {
  getExpenses, createExpense, approveExpense, rejectExpense, markExpensePaid,
  getExpenseCategories, getDepartments,
} from "../../services/api";

export default function Expenses() {
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    category: "", department: "", amount: "", expense_date: new Date().toISOString().slice(0, 10),
    description: "", receipt_reference: "",
  });
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => { loadCategories(); loadDepartments(); }, []);
  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getExpenses(params);
      setExpenses(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadCategories = async () => {
    try {
      const data = await getExpenseCategories();
      setCategories(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createExpense({ ...form, amount: Number(form.amount), department: form.department || undefined });
      setForm({ category: "", department: "", amount: "", expense_date: new Date().toISOString().slice(0, 10), description: "", receipt_reference: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleApprove = async (id) => {
    try { await approveExpense(id); load(); } catch (err) { setError(err.message); }
  };

  const submitRejection = async (id) => {
    try {
      await rejectExpense(id, { rejection_reason: rejectionReason });
      setRejectingId(null);
      setRejectionReason("");
      load();
    } catch (err) { setError(err.message); }
  };

  const handleMarkPaid = async (id) => {
    try { await markExpensePaid(id); load(); } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "PENDING_APPROVAL": "badge-warning",
      "APPROVED": "badge-success",
      "REJECTED": "badge-danger",
      "PAID": "badge-primary",
    };
    return statusMap[status] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading && expenses.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading expenses...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1 className="page-title">Expenses</h1>
          <p className="page-subtitle">Manage expense claims</p>
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
            <i className="bi bi-plus-circle me-2"></i> Submit Expense
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Category <span className="required">*</span></label>
                <select className="select" value={form.category} onChange={handleChange("category")} required>
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Department</label>
                <select className="select" value={form.department} onChange={handleChange("department")}>
                  <option value="">No department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Amount <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  placeholder="Amount"
                  value={form.amount}
                  onChange={handleChange("amount")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Expense Date <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={form.expense_date}
                  onChange={handleChange("expense_date")}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Description</label>
              <textarea
                className="textarea"
                placeholder="Description"
                value={form.description}
                onChange={handleChange("description")}
              />
            </div>

            <div className="field">
              <label className="field-label">Receipt Reference</label>
              <input
                type="text"
                className="input"
                placeholder="Receipt reference"
                value={form.receipt_reference}
                onChange={handleChange("receipt_reference")}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-plus-circle me-2"></i> Submit Expense
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
                <option value="PAID">Paid</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {expenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-receipt"></i>
              </div>
              <h3 className="empty-state__title">No expenses found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No expenses with status "${statusFilter}" found.` 
                  : "Submit your first expense using the form above."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Expense #</th>
                    <th>Category</th>
                    <th>Department</th>
                    <th className="cell-numeric">Amount</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id}>
                      <td className="cell-mono">{e.expense_number}</td>
                      <td>{e.category_name}</td>
                      <td>{e.department_name || "—"}</td>
                      <td className="cell-numeric">{formatCurrency(e.amount)}</td>
                      <td>{e.expense_date}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(e.status)}`}>
                          <span className="badge-dot"></span>
                          {e.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <div className="flex gap-1 justify-end">
                          {e.status === "PENDING_APPROVAL" && (
                            <>
                              <button className="btn btn-success btn-sm" onClick={() => handleApprove(e.id)}>
                                <i className="bi bi-check me-1"></i> Approve
                              </button>
                              {rejectingId === e.id ? (
                                <>
                                  <input
                                    type="text"
                                    className="input"
                                    placeholder="Reason"
                                    value={rejectionReason}
                                    onChange={(ev) => setRejectionReason(ev.target.value)}
                                    style={{ width: "120px" }}
                                  />
                                  <button className="btn btn-danger btn-sm" onClick={() => submitRejection(e.id)}>
                                    <i className="bi bi-check me-1"></i> Confirm
                                  </button>
                                  <button className="btn btn-secondary btn-sm" onClick={() => setRejectingId(null)}>
                                    <i className="bi bi-x"></i>
                                  </button>
                                </>
                              ) : (
                                <button className="btn btn-danger btn-sm" onClick={() => setRejectingId(e.id)}>
                                  <i className="bi bi-x me-1"></i> Reject
                                </button>
                              )}
                            </>
                          )}
                          {e.status === "APPROVED" && (
                            <button className="btn btn-primary btn-sm" onClick={() => handleMarkPaid(e.id)}>
                              <i className="bi bi-cash me-1"></i> Mark Paid
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {expenses.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {expenses.length} expense{expenses.length !== 1 ? "s" : ""}
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
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                Paid
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}