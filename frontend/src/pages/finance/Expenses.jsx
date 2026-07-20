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

  return (
    <div>
      <h1>Expenses</h1>
      {error && <p>Error: {error}</p>}

      <h2>Submit Expense</h2>
      <form onSubmit={handleSubmit}>
        <select value={form.category} onChange={handleChange("category")} required>
          <option value="">Select category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={form.department} onChange={handleChange("department")}>
          <option value="">No department</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input type="number" placeholder="Amount" value={form.amount} onChange={handleChange("amount")} required />
        <input type="date" value={form.expense_date} onChange={handleChange("expense_date")} required />
        <textarea placeholder="Description" value={form.description} onChange={handleChange("description")} />
        <input type="text" placeholder="Receipt reference" value={form.receipt_reference} onChange={handleChange("receipt_reference")} />
        <button type="submit">Submit Expense</button>
      </form>

      <h2>All Expenses</h2>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="PENDING_APPROVAL">Pending Approval</option>
        <option value="APPROVED">Approved</option>
        <option value="REJECTED">Rejected</option>
        <option value="PAID">Paid</option>
      </select>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Expense #</th><th>Category</th><th>Department</th><th>Amount</th><th>Date</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id}>
                <td>{e.expense_number}</td><td>{e.category_name}</td><td>{e.department_name || "—"}</td>
                <td>KES {e.amount}</td><td>{e.expense_date}</td><td>{e.status}</td>
                <td>
                  {e.status === "PENDING_APPROVAL" && (
                    <>
                      <button type="button" onClick={() => handleApprove(e.id)}>Approve</button>{" "}
                      {rejectingId === e.id ? (
                        <>
                          <input type="text" placeholder="Reason" value={rejectionReason} onChange={(ev) => setRejectionReason(ev.target.value)} />
                          <button type="button" onClick={() => submitRejection(e.id)}>Confirm</button>
                        </>
                      ) : (
                        <button type="button" onClick={() => setRejectingId(e.id)}>Reject</button>
                      )}
                    </>
                  )}
                  {e.status === "APPROVED" && <button type="button" onClick={() => handleMarkPaid(e.id)}>Mark Paid</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}