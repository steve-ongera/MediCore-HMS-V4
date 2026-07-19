import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPayrollRuns, generatePayrollRun } from "../../services/api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function Payroll() {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const now = new Date();
  const [form, setForm] = useState({ period_month: now.getMonth() + 1, period_year: now.getFullYear() });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPayrollRuns({ page_size: 50 });
      setRuns(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: Number(e.target.value) }));

  const handleGenerate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await generatePayrollRun(form);
      load();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "DRAFT": "badge-warning",
      "OPEN": "badge-primary",
      "CLOSED": "badge-success",
      "PAID": "badge-success",
    };
    return statusMap[status] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading && runs.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading payroll runs...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Human Resources</div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Manage payroll runs and payslips</p>
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
            <i className="bi bi-plus-circle me-2"></i> Generate Payroll Run
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleGenerate}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Period Month <span className="required">*</span></label>
                <select className="select" value={form.period_month} onChange={handleChange("period_month")}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Period Year <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  value={form.period_year}
                  onChange={handleChange("period_year")}
                  min="2000"
                  max="2100"
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                      Generating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i> Generate Payroll Run
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
          <div className="text-sm text-muted" style={{ marginTop: "var(--space-2)" }}>
            <i className="bi bi-info-circle me-1"></i>
            This creates a draft payslip for every active employee, seeded from their basic salary. Edit individual payslips afterward.
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-grid me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Payroll Runs</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {runs.length} run{runs.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {runs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-cash-stack"></i>
              </div>
              <h3 className="empty-state__title">No payroll runs</h3>
              <p className="empty-state__desc">Generate your first payroll run using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th>Status</th>
                    <th className="cell-numeric">Employees</th>
                    <th className="cell-numeric">Total Net Pay</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-primary">{MONTHS[r.period_month - 1]} {r.period_year}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(r.status)}`}>
                          <span className="badge-dot"></span>
                          {r.status}
                        </span>
                      </td>
                      <td className="cell-numeric">{r.employee_count}</td>
                      <td className="cell-numeric">{formatCurrency(r.total_net_pay)}</td>
                      <td className="cell-actions">
                        <Link to={`/hr/payroll/${r.id}`} className="btn btn-secondary btn-sm">
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
        {runs.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {runs.length} payroll run{runs.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Draft
              </span>
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                Open
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Closed/Paid
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}