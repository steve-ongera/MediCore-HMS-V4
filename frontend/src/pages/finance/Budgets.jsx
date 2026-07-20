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

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  const getStatusBadge = (remaining, allocated) => {
    const percentage = allocated > 0 ? (remaining / allocated) * 100 : 0;
    if (percentage <= 20) return "badge-danger";
    if (percentage <= 50) return "badge-warning";
    return "badge-success";
  };

  if (loading && budgets.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading budgets...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1 className="page-title">Department Budgets</h1>
          <p className="page-subtitle">Manage departmental budgets</p>
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
            <i className="bi bi-plus-circle me-2"></i> Allocate Budget
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Department <span className="required">*</span></label>
                <select className="select" value={form.department} onChange={handleChange("department")} required>
                  <option value="">Select department</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Fiscal Period <span className="required">*</span></label>
                <select className="select" value={form.fiscal_period} onChange={handleChange("fiscal_period")} required>
                  <option value="">Select fiscal period</option>
                  {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Allocated Amount <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  placeholder="Allocated amount"
                  value={form.allocated_amount}
                  onChange={handleChange("allocated_amount")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Notes</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Notes"
                  value={form.notes}
                  onChange={handleChange("notes")}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-plus-circle me-2"></i> Allocate Budget
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-grid me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>All Budgets</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {budgets.length} budget{budgets.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {budgets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-wallet"></i>
              </div>
              <h3 className="empty-state__title">No budgets allocated</h3>
              <p className="empty-state__desc">Allocate your first budget using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Department</th>
                    <th>Period</th>
                    <th className="cell-numeric">Allocated</th>
                    <th className="cell-numeric">Spent</th>
                    <th className="cell-numeric">Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {budgets.map((b) => {
                    const remainingPercent = b.allocated_amount > 0 
                      ? Math.round((b.remaining_amount / b.allocated_amount) * 100) 
                      : 0;
                    const statusBadge = getStatusBadge(b.remaining_amount, b.allocated_amount);
                    let statusLabel = "Healthy";
                    if (remainingPercent <= 20) statusLabel = "Critical";
                    else if (remainingPercent <= 50) statusLabel = "Low";

                    return (
                      <tr key={b.id}>
                        <td className="cell-primary">{b.department_name}</td>
                        <td>{b.fiscal_period_name}</td>
                        <td className="cell-numeric">{formatCurrency(b.allocated_amount)}</td>
                        <td className="cell-numeric">{formatCurrency(b.spent_amount)}</td>
                        <td className="cell-numeric">{formatCurrency(b.remaining_amount)}</td>
                        <td>
                          <span className={`badge ${statusBadge}`}>
                            <span className="badge-dot"></span>
                            {statusLabel} ({remainingPercent}%)
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {budgets.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {budgets.length} budget{budgets.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Healthy
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Low
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Critical
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}