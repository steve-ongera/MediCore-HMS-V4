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

  if (loading) return <div>Loading...</div>;
  if (!run) return null;

  const isDraft = run.status === "DRAFT";

  return (
    <div>
      <button type="button" onClick={() => navigate("/hr/payroll")}>&larr; Back</button>
      <h1>Payroll — {MONTHS[run.period_month - 1]} {run.period_year}</h1>
      {error && <p>Error: {error}</p>}

      <p>Status: {run.status} — Total Net Pay: KES {run.total_net_pay}</p>

      {run.status === "DRAFT" && <button type="button" onClick={handleProcess}>Process Payroll</button>}
      {run.status === "PROCESSED" && <button type="button" onClick={handleMarkPaid}>Mark as Paid</button>}

      <h2>Payslips</h2>
      <table>
        <thead>
          <tr>
            <th>Employee #</th><th>Name</th><th>Basic Salary</th><th>Allowances</th><th>Overtime</th>
            <th>Gross Pay</th><th>PAYE</th><th>NHIF</th><th>NSSF</th><th>Other Deductions</th>
            <th>Total Deductions</th><th>Net Pay</th>{isDraft && <th></th>}
          </tr>
        </thead>
        <tbody>
          {run.payslips.map((p) => (
            <tr key={p.id}>
              <td>{p.employee_number}</td><td>{p.employee_name}</td>
              <td>KES {p.basic_salary}</td>
              <td>
                {isDraft ? (
                  <input type="number" value={editValues[p.id]?.allowances ?? ""} onChange={handleFieldChange(p.id, "allowances")} />
                ) : `KES ${p.allowances}`}
              </td>
              <td>
                {isDraft ? (
                  <input type="number" value={editValues[p.id]?.overtime ?? ""} onChange={handleFieldChange(p.id, "overtime")} />
                ) : `KES ${p.overtime}`}
              </td>
              <td>KES {p.gross_pay}</td>
              <td>
                {isDraft ? (
                  <input type="number" value={editValues[p.id]?.paye_tax ?? ""} onChange={handleFieldChange(p.id, "paye_tax")} />
                ) : `KES ${p.paye_tax}`}
              </td>
              <td>
                {isDraft ? (
                  <input type="number" value={editValues[p.id]?.nhif_deduction ?? ""} onChange={handleFieldChange(p.id, "nhif_deduction")} />
                ) : `KES ${p.nhif_deduction}`}
              </td>
              <td>
                {isDraft ? (
                  <input type="number" value={editValues[p.id]?.nssf_deduction ?? ""} onChange={handleFieldChange(p.id, "nssf_deduction")} />
                ) : `KES ${p.nssf_deduction}`}
              </td>
              <td>
                {isDraft ? (
                  <input type="number" value={editValues[p.id]?.other_deductions ?? ""} onChange={handleFieldChange(p.id, "other_deductions")} />
                ) : `KES ${p.other_deductions}`}
              </td>
              <td>KES {p.total_deductions}</td>
              <td>KES {p.net_pay}</td>
              {isDraft && <td><button type="button" onClick={() => saveRow(p.id)}>Save</button></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}