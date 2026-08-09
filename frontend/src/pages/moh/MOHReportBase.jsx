import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { exportTableToExcel, exportTableToPDF } from "../../utils/reportExport";

const COLORS = ["#2962FF", "#00C48C", "#FFAB00", "#FF5252", "#7C4DFF", "#00BCD4", "#FF7043", "#9333EA"];

export default function MOHReportBase({ title, subtitle, fetchFn, cardsConfig, chartsConfig, exportFilename }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().slice(0, 8) + "01");
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await fetchFn({ date_from: dateFrom, date_to: dateTo });
      setData(result);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const buildExportRows = () => {
    if (!data) return [];
    return cardsConfig.map((c) => ({ Indicator: c.label, Value: data[c.key] ?? "N/A" }));
  };

  if (loading || !data) return <div>Loading report...</div>;

  return (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
      <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      <button type="button" onClick={load}>Refresh</button>
      <button type="button" onClick={() => exportTableToExcel(buildExportRows(), exportFilename)}>Export Excel</button>
      <button type="button" onClick={() => exportTableToPDF(buildExportRows(), title, exportFilename)}>Export PDF</button>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", margin: "16px 0" }}>
        {cardsConfig.map((c) => (
          <div key={c.key}>
            <strong>{c.label}</strong>
            <h3>{data[c.key] === null || data[c.key] === undefined ? "N/A" : data[c.key]}{c.suffix || ""}</h3>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
        {chartsConfig.map((chart) => {
          const chartData = data[chart.dataKey];
          if (!chartData || chartData.length === 0) return null;
          return (
            <div key={chart.dataKey}>
              <h3>{chart.title}</h3>
              <ResponsiveContainer width="100%" height={260}>
                {chart.type === "line" ? (
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 9 }} /><YAxis /><Tooltip />
                    <Line type="monotone" dataKey="value" stroke="#2962FF" strokeWidth={2} />
                  </LineChart>
                ) : chart.type === "pie" ? (
                  <PieChart>
                    <Pie data={chartData} dataKey="value" nameKey="name" outerRadius={85} label>
                      {chartData.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip /><Legend />
                  </PieChart>
                ) : (
                  <BarChart data={chartData} layout={chart.horizontal ? "vertical" : "horizontal"}>
                    <CartesianGrid strokeDasharray="3 3" />
                    {chart.horizontal ? (
                      <><XAxis type="number" /><YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 9 }} /></>
                    ) : (
                      <><XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={60} /><YAxis /></>
                    )}
                    <Tooltip />
                    <Bar dataKey="value" fill="#00C48C" radius={chart.horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          );
        })}
      </div>
    </div>
  );
}