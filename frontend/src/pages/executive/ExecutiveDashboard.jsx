import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { getExecutiveDashboard } from "../../services/api";

const COLORS = ["#2962FF", "#00C48C", "#FFAB00", "#FF5252", "#7C4DFF", "#00BCD4", "#FF7043"];

export default function ExecutiveDashboard() {
  const [data, setData] = useState(null);
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getExecutiveDashboard({ date_from: dateFrom, date_to: dateTo });
      setData(result);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const quickRange = (days) => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - days);
    setDateFrom(from.toISOString().slice(0, 10));
    setDateTo(to.toISOString().slice(0, 10));
  };

  if (loading || !data) return <div>Loading executive dashboard...</div>;

  const c = data.cards;
  const isProfit = Number(c.profit) >= 0;

  return (
    <div>
      <h1>Executive Dashboard</h1>
      {error && <p>Error: {error}</p>}

      <div>
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <button type="button" onClick={() => quickRange(0)}>Today</button>
        <button type="button" onClick={() => quickRange(7)}>Last 7 Days</button>
        <button type="button" onClick={() => quickRange(30)}>Last 30 Days</button>
        <button type="button" onClick={load}>Refresh</button>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", margin: "16px 0" }}>
        <div><strong>Revenue</strong><h2>KES {Number(c.revenue).toLocaleString()}</h2></div>
        <div><strong>Expenses</strong><h2>KES {Number(c.expenses).toLocaleString()}</h2></div>
        <div><strong>Profit</strong><h2 style={{ color: isProfit ? "green" : "red" }}>KES {Number(c.profit).toLocaleString()}</h2></div>
        <div><strong>Outstanding Bills</strong><h2>KES {Number(c.outstanding_bills).toLocaleString()}</h2></div>
        <div><strong>Cancelled Bills</strong><h2>KES {Number(c.cancelled_bills_total).toLocaleString()} ({c.cancelled_bills_count})</h2></div>
        <div><strong>Refunds</strong><h2>KES {Number(c.refunds_total).toLocaleString()} ({c.refunds_count})</h2></div>
        <div><strong>Revenue Leakage</strong><h2 style={{ color: "red" }}>KES {Number(c.leakage_total).toLocaleString()}</h2></div>
        <div>
          <strong>Best Doctor</strong>
          <h3>{data.best_doctor ? `${data.best_doctor.name}` : "—"}</h3>
          <p>{data.best_doctor ? `KES ${Number(data.best_doctor.revenue).toLocaleString()} · ${data.best_doctor.patients} patients` : ""}</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        {/* Revenue trend line */}
        <div>
          <h3>Revenue — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.revenue_trend_7d}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip />
              <Line type="monotone" dataKey="value" stroke="#2962FF" strokeWidth={2} name="Revenue" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expense trend line */}
        <div>
          <h3>Expenses — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.expense_trend_7d}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip />
              <Line type="monotone" dataKey="value" stroke="#FF5252" strokeWidth={2} name="Expenses" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Cash vs M-Pesa vs Card pie */}
        <div>
          <h3>Cash vs M-Pesa vs Card</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.payment_methods} dataKey="value" nameKey="name" outerRadius={85} label>
                {data.payment_methods.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Department revenue bar */}
        <div>
          <h3>Department Revenue Ranking</h3>
          <p style={{ fontSize: "0.85em" }}>Worst performer: <strong>{data.worst_department?.name}</strong> (KES {Number(data.worst_department?.revenue || 0).toLocaleString()})</p>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.department_ranking}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} /><YAxis /><Tooltip />
              <Bar dataKey="value" fill="#00C48C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Most prescribed drugs bar */}
        <div>
          <h3>Most Prescribed Drugs</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.top_drugs} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10 }} /><Tooltip />
              <Bar dataKey="value" fill="#7C4DFF" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ marginTop: "24px" }}>
        <h3>Insurance / SHA Pending Claims</h3>
        <p>SHA: KES {Number(data.sha_pending.amount).toLocaleString()} ({data.sha_pending.count} claims)</p>
        <p>All Insurers: KES {Number(data.insurance_pending.amount).toLocaleString()} ({data.insurance_pending.count} claims)</p>
      </div>
    </div>
  );
}