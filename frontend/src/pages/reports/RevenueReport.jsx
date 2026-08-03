import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { getReports } from "../../services/api";
import { exportTableToExcel, exportTableToPDF } from "../../utils/reportExport";
import { formatDisplayValue, formatCurrency } from "../../utils/formatters";

const COLORS = ["#2962FF", "#00C48C", "#FFAB00", "#FF5252", "#7C4DFF", "#00BCD4"];
const PAGE_SIZE = 10;

// Formats numeric chart values (tooltips, axis ticks) with comma separators
const formatChartValue = (value) => {
  const num = Number(value);
  return isNaN(num) ? value : num.toLocaleString("en-US");
};

export default function RevenueReport() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [page, setPage] = useState(1);

  useEffect(() => {
    load();
  }, [dateFrom, dateTo]);

  // Reset to page 1 whenever the underlying data changes (new date range, etc.)
  useEffect(() => {
    setPage(1);
  }, [data]);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getReports("revenue_report", { date_from: dateFrom, date_to: dateTo });
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
        <span className="loading-screen__label">Loading revenue report...</span>
      </div>
    );
  }

  const totalRows = data.table.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageRows = data.table.slice(startIdx, startIdx + PAGE_SIZE);

  const goToPage = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Reports & Analytics</div>
          <h1 className="page-title">Revenue Report</h1>
          <p className="page-subtitle">Payments, outstanding balances, and revenue breakdown</p>
        </div>
        <div className="page-header__actions">
          <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          <button className="btn btn-secondary" onClick={() => exportTableToExcel(data.table, "revenue_report")}>
            <i className="bi bi-file-earmark-excel me-2"></i> Excel
          </button>
          <button className="btn btn-secondary" onClick={() => exportTableToPDF(data.table, "Revenue Report", "revenue_report")}>
            <i className="bi bi-file-earmark-pdf me-2"></i> PDF
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: "var(--space-6)" }}>
        {data.cards.map((c) => (
          <div className="stat-card" key={c.label}>
            <div className="stat-card__top"><span className="stat-card__label">{c.label}</span></div>
            <div className="stat-card__value">{formatDisplayValue(c.value)}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        <div className="card">
          <div className="card-header"><h5 className="card-title">{data.charts.by_method.title}</h5></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={data.charts.by_method.data} dataKey="value" nameKey="name" outerRadius={90} label>
                  {data.charts.by_method.data.map((entry, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={formatChartValue} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h5 className="card-title">{data.charts.by_source.title}</h5></div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.charts.by_source.data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={formatChartValue} />
                <Tooltip formatter={formatChartValue} />
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
                <YAxis tickFormatter={formatChartValue} />
                <Tooltip formatter={formatChartValue} />
                <Line type="monotone" dataKey="value" stroke="#00C48C" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h5 className="card-title">Payment Summary</h5></div>
        <div className="card-body p-0">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Receipt #</th>
                  <th>Invoice #</th>
                  <th className="cell-numeric">Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row, i) => (
                  <tr key={startIdx + i}>
                    <td className="cell-mono">{row.receipt_number}</td>
                    <td className="cell-mono">{row.invoice__invoice_number}</td>
                    <td className="cell-numeric">{formatCurrency(row.amount)}</td>
                    <td>{row.method}</td>
                    <td>{new Date(row.paid_at).toLocaleString()}</td>
                  </tr>
                ))}
                {totalRows === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "var(--space-6)" }}>
                      No payments found for this date range.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {totalRows > 0 && (
            <div
              className="pagination"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "var(--space-4)",
                borderTop: "1px solid var(--border-color, #e5e7eb)",
              }}
            >
              <span className="pagination__summary" style={{ fontSize: "0.875rem", color: "var(--text-muted, #6b7280)" }}>
                Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, totalRows)} of {totalRows}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <i className="bi bi-chevron-left"></i> Prev
                </button>
                <span style={{ fontSize: "0.875rem" }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next <i className="bi bi-chevron-right"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}