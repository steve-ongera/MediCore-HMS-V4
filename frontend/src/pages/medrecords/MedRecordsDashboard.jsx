import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { getMedRecordsStats } from "../../services/api";

const COLORS = ["#2962FF", "#00C48C", "#FFAB00", "#FF5252", "#7C4DFF", "#00BCD4"];

export default function MedRecordsDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const result = await getMedRecordsStats(); setData(result); } catch (err) { setError(err.message); }
  };

  if (!data) return <div>Loading...</div>;
  const c = data.cards;

  return (
    <div>
      <h1>Medical Records Dashboard</h1>
      {error && <p>Error: {error}</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
        <div><strong>Total Files</strong><h2>{c.total_files}</h2></div>
        <div><strong>Checked Out</strong><h2>{c.checked_out}</h2></div>
        <div><strong>Overdue Files</strong><h2 style={{ color: c.overdue > 0 ? "red" : "inherit" }}>{c.overdue}</h2></div>
        <div><strong>Pending Requests</strong><h2>{c.pending_requests}</h2></div>
        <div><strong>Incomplete Discharge Summaries</strong><h2>{c.incomplete_discharges}</h2></div>
        <div><strong>Births (30d)</strong><h2>{c.births_30d}</h2></div>
        <div><strong>Deaths (30d)</strong><h2>{c.deaths_30d}</h2></div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "16px", marginTop: "20px" }}>
        <div>
          <h3>File Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={data.file_status_breakdown} dataKey="value" nameKey="name" outerRadius={85} label>
                {data.file_status_breakdown.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip /><Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3>Record Access — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data.access_trend_7d}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip />
              <Line type="monotone" dataKey="value" stroke="#2962FF" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div>
          <h3>Record Requests by Purpose</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.request_purpose_breakdown.map((r) => ({ name: r.purpose, value: r.count }))}>
              <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} /><YAxis /><Tooltip />
              <Bar dataKey="value" fill="#00C48C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}