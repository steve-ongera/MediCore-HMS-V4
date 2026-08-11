import { useEffect, useState } from "react";
import { getDoctorCommissions, markCommissionPaid } from "../../services/api";

export default function DoctorCommissionAll() {
  const [commissions, setCommissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    try {
      const params = { page_size: 200 };
      if (statusFilter) params.status = statusFilter;
      const data = await getDoctorCommissions(params);
      setCommissions(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleMarkPaid = async (id) => { try { await markCommissionPaid(id); load(); } catch (err) { setError(err.message); } };

  const totalOwed = commissions.filter((c) => c.status !== "PAID").reduce((s, c) => s + Number(c.amount_earned), 0);

  return (
    <div>
      <h1>Doctors Commission</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="PENDING">Pending</option>
        <option value="APPROVED">Approved</option>
        <option value="PAID">Paid</option>
      </select>
      <p><strong>Total Outstanding: KES {totalOwed.toLocaleString()}</strong></p>

      <table>
        <thead><tr><th>Doctor</th><th>Patient</th><th>Amount</th><th>Period</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {commissions.map((c) => (
            <tr key={c.id}>
              <td>{c.doctor_name}</td><td>{c.patient_name || "—"}</td>
              <td>KES {Number(c.amount_earned).toLocaleString()}</td>
              <td>{c.period_month}/{c.period_year}</td><td>{c.status}</td>
              <td>{c.status !== "PAID" && <button type="button" onClick={() => handleMarkPaid(c.id)}>Mark Paid</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}