import { useEffect, useState } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";
import { getMedRecordsStats } from "../../services/api";
import { formatNumber } from "../../utils/formatters";

const COLORS = ["#2962FF", "#00C48C", "#FFAB00", "#FF5252", "#7C4DFF", "#00BCD4"];

export default function MedRecordsDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const result = await getMedRecordsStats();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading medical records dashboard...</span>
      </div>
    );
  }

  if (!data) return null;
  const c = data.cards;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Medical Records</div>
          <h1 className="page-title">Medical Records Dashboard</h1>
          <p className="page-subtitle">Overview of medical records activity</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-2"></i> {error}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="stat-grid" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Total Files</span>
            <div className="stat-card__icon tone-primary">
              <i className="bi bi-files"></i>
            </div>
          </div>
          <div className="stat-card__value">{formatNumber(c.total_files)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Checked Out</span>
            <div className="stat-card__icon tone-info">
              <i className="bi bi-box-arrow-right"></i>
            </div>
          </div>
          <div className="stat-card__value">{formatNumber(c.checked_out)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Overdue Files</span>
            <div className="stat-card__icon tone-danger">
              <i className="bi bi-exclamation-triangle"></i>
            </div>
          </div>
          <div className="stat-card__value" style={{ color: c.overdue > 0 ? "var(--danger-strong)" : "var(--text-color)" }}>
            {formatNumber(c.overdue)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Pending Requests</span>
            <div className="stat-card__icon tone-warning">
              <i className="bi bi-clock-history"></i>
            </div>
          </div>
          <div className="stat-card__value">{formatNumber(c.pending_requests)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Incomplete Discharge Summaries</span>
            <div className="stat-card__icon tone-danger">
              <i className="bi bi-file-earmark-x"></i>
            </div>
          </div>
          <div className="stat-card__value">{formatNumber(c.incomplete_discharges)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Births (30d)</span>
            <div className="stat-card__icon tone-success">
              <i className="bi bi-baby"></i>
            </div>
          </div>
          <div className="stat-card__value">{formatNumber(c.births_30d)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Deaths (30d)</span>
            <div className="stat-card__icon tone-danger">
              <i className="bi bi-heart"></i>
            </div>
          </div>
          <div className="stat-card__value">{formatNumber(c.deaths_30d)}</div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", 
        gap: "var(--space-6)", 
        marginBottom: "var(--space-6)" 
      }}>
        {/* File Status Breakdown - Pie Chart */}
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">File Status Breakdown</h5>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={data.file_status_breakdown}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={85}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.file_status_breakdown.map((e, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatNumber(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Record Access Trend - Line Chart */}
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">Record Access — Last 7 Days</h5>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.access_trend_7d}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(value) => formatNumber(value)} />
                <Line type="monotone" dataKey="value" stroke="#2962FF" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Request Purpose Breakdown - Bar Chart */}
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">Record Requests by Purpose</h5>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.request_purpose_breakdown.map((r) => ({ name: r.purpose, value: r.count }))}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tickFormatter={(v) => formatNumber(v)} />
                <Tooltip formatter={(value) => formatNumber(value)} />
                <Bar dataKey="value" fill="#00C48C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}