import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import { getMyDashboard } from "../../services/api";

const COLORS = ["#4f46e5", "#16a34a", "#0891b2", "#d97706", "#dc2626", "#64748b", "#9333ea", "#0d9488"];

export default function RoleDashboardBase({ eyebrow, title, subtitle, quickActions }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getMyDashboard();
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
        <span className="loading-screen__label">Loading dashboard...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="card" style={{ padding: "var(--space-6)", textAlign: "center" }}>
        <div className="text-danger font-semibold">Error loading dashboard</div>
        <p className="text-sm text-muted" style={{ marginTop: "var(--space-2)" }}>{error}</p>
        <button className="btn btn-primary mt-4" onClick={load}>Retry</button>
      </div>
    );
  }
  if (!data) return null;

  const { cards = [], line, bar, pie } = data;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">{eyebrow}</div>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">{subtitle}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: "var(--space-6)" }}>
        {cards.map((c) => (
          <div className="stat-card" key={c.label}>
            <div className="stat-card__top"><span className="stat-card__label">{c.label}</span></div>
            <div className="stat-card__value">{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "var(--space-6)", marginBottom: "var(--space-6)" }}>
        {line && (
          <div className="card">
            <div className="card-header"><h5 className="card-title">{line.title}</h5></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={line.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {bar && (
          <div className="card">
            <div className="card-header"><h5 className="card-title">{bar.title}</h5></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={bar.data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {pie && (
          <div className="card">
            <div className="card-header"><h5 className="card-title">{pie.title}</h5></div>
            <div className="card-body">
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={pie.data} dataKey="value" nameKey="name" outerRadius={85} label>
                    {pie.data.map((entry, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <div className="stat-grid">
        {quickActions.map((action) => (
          <Link key={action.to} to={action.to} className="card card-interactive">
            <div className="card-body text-center">
              <div
                className="rounded-full flex items-center justify-center mb-3 mx-auto"
                style={{ width: 48, height: 48, background: "var(--primary-50)" }}
              >
                <i className={`bi ${action.icon}`} style={{ fontSize: "1.25rem", color: "var(--primary-600)" }}></i>
              </div>
              <h6>{action.title}</h6>
              <small className="text-tertiary">{action.desc}</small>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}