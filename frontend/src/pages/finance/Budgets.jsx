import { useEffect, useState } from "react";
import { getBudgets, createBudget, getDepartments, getFiscalPeriods } from "../../services/api";

export default function Budgets() {
  const [budgets, setBudgets] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ department: "", fiscal_period: "", allocated_amount: "", notes: "" });

  useEffect(() => { load(); loadDepartments(); loadPeriods(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getBudgets({ page_size: 100 });
      setBudgets(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadPeriods = async () => {
    try {
      const data = await getFiscalPeriods();
      setPeriods(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createBudget({ ...form, allocated_amount: Number(form.allocated_amount) });
      setForm({ department: "", fiscal_period: "", allocated_amount: "", notes: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Department Budgets</h1>
      {error && <p>Error: {error}</p>}

      <h2>Allocate Budget</h2>
      <form onSubmit={handleSubmit}>
        <select value={form.department} onChange={handleChange("department")} required>
          <option value="">Select department</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <select value={form.fiscal_period} onChange={handleChange("fiscal_period")} required>
          <option value="">Select fiscal period</option>
          {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="number" placeholder="Allocated amount" value={form.allocated_amount} onChange={handleChange("allocated_amount")} required />
        <textarea placeholder="Notes" value={form.notes} onChange={handleChange("notes")} />
        <button type="submit">Allocate Budget</button>
      </form>

      <h2>All Budgets</h2>
      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Department</th><th>Period</th><th>Allocated</th><th>Spent</th><th>Remaining</th></tr></thead>
          <tbody>
            {budgets.map((b) => (
              <tr key={b.id}>
                <td>{b.department_name}</td><td>{b.fiscal_period_name}</td>
                <td>KES {b.allocated_amount}</td><td>KES {b.spent_amount}</td><td>KES {b.remaining_amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && budgets.length === 0 && <p>No budgets allocated yet.</p>}
    </div>
  );
}