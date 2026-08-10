// src/pages/moh/MOHReportBase.jsx
import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { exportTableToExcel, exportTableToPDF } from "../../utils/reportExport";
import { formatNumber } from "../../utils/formatters";
import MOHDataTable from "../../components/moh/MOHDataTable";

const COLORS = ["#2962FF", "#00C48C", "#FFAB00", "#FF5252", "#7C4DFF", "#00BCD4", "#FF7043", "#9333EA"];

export default function MOHReportBase({ title, subtitle, fetchFn, cardsConfig, chartsConfig, exportFilename, detailTable }) {
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const buildExportRows = () => {
    if (!data) return [];
    return cardsConfig.map((c) => ({ Indicator: c.label, Value: data[c.key] ?? "N/A" }));
  };

  if (loading || !data) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading report...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Reports & Analytics</div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        <div className="page-header__actions">
          <input
            type="date"
            className="input"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={{ width: "160px" }}
          />
          <input
            type="date"
            className="input"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={{ width: "160px" }}
          />
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise  me-1"></i> Refresh
          </button>
          <button className="btn btn-secondary" onClick={() => exportTableToExcel(buildExportRows(), exportFilename)}>
            <i className="bi bi-file-earmark-excel  me-1"></i> Excel
          </button>
          <button className="btn btn-secondary" onClick={() => exportTableToPDF(buildExportRows(), title, exportFilename)}>
            <i className="bi bi-file-earmark-pdf  me-1"></i> PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle  me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stat-grid" style={{ marginBottom: "var(--space-6)" }}>
        {cardsConfig.map((c) => (
          <div className="stat-card" key={c.key}>
            <div className="stat-card__top">
              <span className="stat-card__label">{c.label}</span>
              {c.icon && (
                <div className={`stat-card__icon tone-${c.iconVariant || "primary"}`}>
                  <i className={c.icon}></i>
                </div>
              )}
            </div>
            <div className="stat-card__value">
              {data[c.key] === null || data[c.key] === undefined ? "N/A" : formatNumber(data[c.key])}
              {c.suffix && <span style={{ fontSize: "14px", marginLeft: "4px" }}>{c.suffix}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))",
        gap: "var(--space-6)",
        marginBottom: "var(--space-6)"
      }}>
        {chartsConfig.map((chart) => {
          const chartData = data[chart.dataKey];
          if (!chartData || chartData.length === 0) return null;
          return (
            <div className="card" key={chart.dataKey}>
              <div className="card-header">
                <h5 className="card-title">{chart.title}</h5>
              </div>
              <div className="card-body">
                <ResponsiveContainer width="100%" height={260}>
                  {chart.type === "line" ? (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                      <YAxis tickFormatter={(v) => formatNumber(v)} />
                      <Tooltip formatter={(value) => formatNumber(value)} />
                      <Line type="monotone" dataKey="value" stroke="#2962FF" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  ) : chart.type === "pie" ? (
                    <PieChart>
                      <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        outerRadius={85}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {chartData.map((e, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => formatNumber(value)} />
                      <Legend />
                    </PieChart>
                  ) : (
                    <BarChart
                      data={chartData}
                      layout={chart.horizontal ? "vertical" : "horizontal"}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      {chart.horizontal ? (
                        <>
                          <XAxis type="number" tickFormatter={(v) => formatNumber(v)} />
                          <YAxis dataKey="name" type="category" width={140} tick={{ fontSize: 9 }} />
                        </>
                      ) : (
                        <>
                          <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={60} />
                          <YAxis tickFormatter={(v) => formatNumber(v)} />
                        </>
                      )}
                      <Tooltip formatter={(value) => formatNumber(value)} />
                      <Bar dataKey="value" fill="#00C48C" radius={chart.horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]} />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>

      {/* Detailed, paginated/searchable/filterable/downloadable record table */}
      {detailTable && (
        <MOHDataTable
          endpoint={detailTable.endpoint}
          columns={detailTable.columns}
          filters={detailTable.filters}
          searchPlaceholder={detailTable.searchPlaceholder}
          title={detailTable.title}
          dateFrom={dateFrom}
          dateTo={dateTo}
        />
      )}

      {/* Export Options Card */}
      <div className="card">
        <div className="card-body">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-muted">
              <i className="bi bi-info-circle  me-1"></i>
              Export this report data for further analysis.
            </span>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => exportTableToExcel(buildExportRows(), exportFilename)}>
                <i className="bi bi-file-earmark-excel  me-1"></i> Excel
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => exportTableToPDF(buildExportRows(), title, exportFilename)}>
                <i className="bi bi-file-earmark-pdf  me-1"></i> PDF
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}