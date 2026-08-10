import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { getReports } from "../../services/api";
import { exportTableToExcel, exportTableToPDF } from "../../utils/reportExport";

const COLORS = ["#2962FF", "#00C48C", "#FFAB00", "#FF5252", "#7C4DFF", "#00BCD4"];

export default function RoleReportBase({ reportType, title, subtitle, tableColumns }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getReports(reportType, { date_from: dateFrom, date_to: dateTo });
      setData(result);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  if (loading || !data) return <div className="loading-screen"><div className="spinner spinner-lg"></div><span className="loading-screen__label">Loading report...</span></div>;

  const chartKeys = Object.keys(data.charts);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">My Reports</div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        <div className="page-header__actions">
          <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button className="btn btn-secondary" onClick={() => exportTableToExcel(data.table, reportType)}><i className="bi bi-file-earmark-excel  me-1"></i>Excel</button>
          <button className="btn btn-secondary" onClick={() => exportTableToPDF(data.table, title, reportType)}><i className="bi bi-file-earmark-pdf  me-1"></i>PDF</button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: "var(--space-6)" }}>
        {data.cards.map((c) => (
          <div className="stat-card" key={c.label}><div className="stat-card__top"><span className="stat-card__label">{c.label}</span></div><div className="stat-card__value">{c.value}</div></div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        {chartKeys.map((key) => {
          const chart = data.charts[key];
          return (
            <div className="card" key={key}>
              <div className="card-header"><h5 className="card-title">{chart.title}</h5></div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={260}>
                  {chart.type === "line" ? (
                    <LineChart data={chart.data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis /><Tooltip /><Line type="monotone" dataKey="value" stroke="#2962FF" strokeWidth={2} /></LineChart>
                  ) : chart.type === "bar" ? (
                    <BarChart data={chart.data}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} /><YAxis /><Tooltip /><Bar dataKey="value" fill="#00C48C" radius={[4, 4, 0, 0]} /></BarChart>
                  ) : (
                    <PieChart><Pie data={chart.data} dataKey="value" nameKey="name" outerRadius={85} label>{chart.data.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /><Legend /></PieChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header"><h5 className="card-title">Detail</h5></div>
        <div className="card-body p-0">
          <div className="table-scroll">
            <table className="data-table">
              <thead><tr>{tableColumns.map((c) => <th key={c.key}>{c.label}</th>)}</tr></thead>
              <tbody>
                {data.table.map((row, i) => (
                  <tr key={i}>{tableColumns.map((c) => <td key={c.key}>{c.render ? c.render(row) : row[c.key]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}