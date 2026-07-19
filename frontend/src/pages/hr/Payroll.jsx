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

  return (
    <div>
      <h1>Payroll</h1>
      {error && <p>Error: {error}</p>}

      <h2>Generate Payroll Run</h2>
      <form onSubmit={handleGenerate}>
        <select value={form.period_month} onChange={handleChange("period_month")}>
          {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
        </select>
        <input type="number" value={form.period_year} onChange={handleChange("period_year")} />
        <button type="submit" disabled={submitting}>{submitting ? "Generating..." : "Generate Payroll Run"}</button>
      </form>
      <p>This creates a draft payslip for every active employee, seeded from their basic salary. Edit individual payslips afterward.</p>

      <h2>Payroll Runs</h2>
      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Period</th><th>Status</th><th>Employees</th><th>Total Net Pay</th><th></th></tr></thead>
          <tbody>
            {runs.map((r) => (
              <tr key={r.id}>
                <td>{MONTHS[r.period_month - 1]} {r.period_year}</td>
                <td>{r.status}</td><td>{r.employee_count}</td><td>KES {r.total_net_pay}</td>
                <td><Link to={`/hr/payroll/${r.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && runs.length === 0 && <p>No payroll runs yet.</p>}
    </div>
  );
}