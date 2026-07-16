import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { getReports } from "../../services/api";
import { exportTableToExcel, exportTableToPDF } from "../../utils/reportExport";

const COLORS = ["#2962FF", "#00C48C", "#FFAB00", "#FF5252", "#7C4DFF", "#00BCD4"];

export default function IPDReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    load();
  }, [dateFrom, dateTo]);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getReports("ipd_report", { date_from: dateFrom, date_to: dateTo });
      setData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading IPD report...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Reports & Analytics</div>
          <h1 className="page-title">IPD Report</h1>
          <p className="page-subtitle">Inpatient admissions, occupancy, and length of stay</p>
        </div>
        <div className="page-header__actions">
          <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button className="btn btn-secondary" onClick={() => exportTableToExcel(data.table, "ipd_report")}>
            <i className="bi bi-file-earmark-excel me-2"></i> Excel
          </button>
          <button className="btn btn-secondary" onClick={() => exportTableToPDF(data.table, "IPD Report", "ipd_report")}>
            <i className="bi bi-file-earmark-pdf me-2"></i> PDF
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: "var(--space-6)" }}>
        {data.cards.map((c) => (
          <div className="stat-card" key={c.label}>
            <div className="stat-card__top"><span className="stat-card__label">{c.label}</span></div>
            <div className="stat-card__value">{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <div className="card">
          <div className="card-header"><h5 className="card-title">{data.charts.occupancy.title}</h5></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.charts.occupancy.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#2962FF" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h5 className="card-title">{data.charts.trend.title}</h5></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.charts.trend.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#00C48C" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h5 className="card-title">{data.charts.by_type.title}</h5></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.charts.by_type.data} dataKey="value" nameKey="name" outerRadius={90} label>
                  {data.charts.by_type.data.map((entry, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h5 className="card-title">Admissions Summary</h5></div>
        <div className="card-body p-0">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Admission #</th>
                  <th>Patient</th>
                  <th>Ward</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.table.map((row, i) => (
                  <tr key={i}>
                    <td className="cell-mono">{row.admission_number}</td>
                    <td className="cell-primary">{row.patient__full_name}</td>
                    <td>{row.bed__ward__name}</td>
                    <td>{row.admission_type}</td>
                    <td>{row.status}</td>
                    <td>{new Date(row.admission_date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}