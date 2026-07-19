import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPayrollRun, updatePayslip, processPayrollRun, markPayrollRunPaid } from "../../services/api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PayrollRunDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [run, setRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editValues, setEditValues] = useState({});

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPayrollRun(id);
      setRun(data);
      const initial = {};
      data.payslips.forEach((p) => {
        initial[p.id] = {
          allowances: p.allowances, overtime: p.overtime,
          paye_tax: p.paye_tax, nhif_deduction: p.nhif_deduction,
          nssf_deduction: p.nssf_deduction, other_deductions: p.other_deductions,
        };
      });
      setEditValues(initial);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleFieldChange = (payslipId, field) => (e) => {
    setEditValues((prev) => ({ ...prev, [payslipId]: { ...prev[payslipId], [field]: e.target.value } }));
  };

  const saveRow = async (payslipId) => {
    try {
      await updatePayslip(payslipId, editValues[payslipId]);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleProcess = async () => {
    if (!window.confirm("Process this payroll run? Payslips can no longer be edited afterward.")) return;
    try {
      await processPayrollRun(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleMarkPaid = async () => {
    try {
      await markPayrollRunPaid(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "DRAFT": "badge-warning",
      "PROCESSED": "badge-primary",
      "PAID": "badge-success",
    };
    return statusMap[status] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading payroll run...</span>
      </div>
    );
  }

  if (!run) return null;

  const isDraft = run.status === "DRAFT";

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Human Resources</div>
          <h1 className="page-title">{MONTHS[run.period_month - 1]} {run.period_year}</h1>
          <p className="page-subtitle">Payroll Run</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/hr/payroll")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Payroll
          </button>
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
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-cash-stack fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{MONTHS[run.period_month - 1]} {run.period_year}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-people me-1"></i> {run.employee_count} employees
                </span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(run.status)}`}>
                  <span className="badge-dot"></span>
                  {run.status}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm font-bold">{formatCurrency(run.total_net_pay)}</span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Status</div>
              <div className="info-item__value">
                <span className={`badge ${getStatusBadge(run.status)}`}>
                  <span className="badge-dot"></span>
                  {run.status}
                </span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Total Net Pay</div>
              <div className="info-item__value font-bold">{formatCurrency(run.total_net_pay)}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Employees</div>
              <div className="info-item__value">{run.employee_count}</div>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap" style={{ marginTop: "var(--space-3)" }}>
            {run.status === "DRAFT" && (
              <button className="btn btn-primary" onClick={handleProcess}>
                <i className="bi bi-check-circle me-2"></i> Process Payroll
              </button>
            )}
            {run.status === "PROCESSED" && (
              <button className="btn btn-success" onClick={handleMarkPaid}>
                <i className="bi bi-cash-stack me-2"></i> Mark as Paid
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Payslips</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {run.payslips.length} payslip{run.payslips.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Employee #</th>
                  <th>Name</th>
                  <th className="cell-numeric">Basic Salary</th>
                  <th className="cell-numeric">Allowances</th>
                  <th className="cell-numeric">Overtime</th>
                  <th className="cell-numeric">Gross Pay</th>
                  <th className="cell-numeric">PAYE</th>
                  <th className="cell-numeric">NHIF</th>
                  <th className="cell-numeric">NSSF</th>
                  <th className="cell-numeric">Other Deductions</th>
                  <th className="cell-numeric">Total Deductions</th>
                  <th className="cell-numeric">Net Pay</th>
                  {isDraft && <th className="cell-actions"></th>}
                </tr>
              </thead>
              <tbody>
                {run.payslips.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-mono">{p.employee_number}</td>
                    <td className="cell-primary">{p.employee_name}</td>
                    <td className="cell-numeric">{formatCurrency(p.basic_salary)}</td>
                    <td className="cell-numeric">
                      {isDraft ? (
                        <input
                          type="number"
                          className="input"
                          value={editValues[p.id]?.allowances ?? ""}
                          onChange={handleFieldChange(p.id, "allowances")}
                          style={{ width: "100px" }}
                        />
                      ) : (
                        formatCurrency(p.allowances)
                      )}
                    </td>
                    <td className="cell-numeric">
                      {isDraft ? (
                        <input
                          type="number"
                          className="input"
                          value={editValues[p.id]?.overtime ?? ""}
                          onChange={handleFieldChange(p.id, "overtime")}
                          style={{ width: "100px" }}
                        />
                      ) : (
                        formatCurrency(p.overtime)
                      )}
                    </td>
                    <td className="cell-numeric">{formatCurrency(p.gross_pay)}</td>
                    <td className="cell-numeric">
                      {isDraft ? (
                        <input
                          type="number"
                          className="input"
                          value={editValues[p.id]?.paye_tax ?? ""}
                          onChange={handleFieldChange(p.id, "paye_tax")}
                          style={{ width: "100px" }}
                        />
                      ) : (
                        formatCurrency(p.paye_tax)
                      )}
                    </td>
                    <td className="cell-numeric">
                      {isDraft ? (
                        <input
                          type="number"
                          className="input"
                          value={editValues[p.id]?.nhif_deduction ?? ""}
                          onChange={handleFieldChange(p.id, "nhif_deduction")}
                          style={{ width: "100px" }}
                        />
                      ) : (
                        formatCurrency(p.nhif_deduction)
                      )}
                    </td>
                    <td className="cell-numeric">
                      {isDraft ? (
                        <input
                          type="number"
                          className="input"
                          value={editValues[p.id]?.nssf_deduction ?? ""}
                          onChange={handleFieldChange(p.id, "nssf_deduction")}
                          style={{ width: "100px" }}
                        />
                      ) : (
                        formatCurrency(p.nssf_deduction)
                      )}
                    </td>
                    <td className="cell-numeric">
                      {isDraft ? (
                        <input
                          type="number"
                          className="input"
                          value={editValues[p.id]?.other_deductions ?? ""}
                          onChange={handleFieldChange(p.id, "other_deductions")}
                          style={{ width: "100px" }}
                        />
                      ) : (
                        formatCurrency(p.other_deductions)
                      )}
                    </td>
                    <td className="cell-numeric">{formatCurrency(p.total_deductions)}</td>
                    <td className="cell-numeric">{formatCurrency(p.net_pay)}</td>
                    {isDraft && (
                      <td className="cell-actions">
                        <button className="btn btn-primary btn-sm" onClick={() => saveRow(p.id)}>
                          <i className="bi bi-floppy me-1"></i> Save
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {run.payslips.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {run.payslips.length} payslip{run.payslips.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}