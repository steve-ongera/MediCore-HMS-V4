import { useEffect, useState } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { getExecutiveDashboard } from "../../services/api";

const COLORS = ["#2962FF", "#00C48C", "#FFAB00", "#FF5252", "#7C4DFF", "#00BCD4", "#FF7043"];

const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return "KES 0";
  const value = Number(amount);
  if (isNaN(value) || !isFinite(value)) return "KES 0";
  return `KES ${value.toLocaleString('en-US')}`;
};

const formatNumber = (value) => {
  if (value === undefined || value === null) return "0";
  const num = Number(value);
  if (isNaN(num) || !isFinite(num)) return "0";
  return num.toLocaleString('en-US');
};

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

  if (loading || !data) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading executive dashboard...</span>
      </div>
    );
  }

  const c = data.cards;
  const isProfit = Number(c.profit) >= 0;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Executive</div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">High-level overview of organizational performance</p>
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

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-calendar me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Date Range</h5>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>From</label>
              <input
                type="date"
                className="input"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{ width: "160px" }}
              />
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>To</label>
              <input
                type="date"
                className="input"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{ width: "160px" }}
              />
            </div>
            <div className="flex gap-2">
              <button className="btn btn-secondary btn-sm" onClick={() => quickRange(0)}>Today</button>
              <button className="btn btn-secondary btn-sm" onClick={() => quickRange(7)}>7 Days</button>
              <button className="btn btn-secondary btn-sm" onClick={() => quickRange(30)}>30 Days</button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stat-grid" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Revenue</span>
            <div className="stat-card__icon tone-success">
              <i className="bi bi-arrow-up-circle"></i>
            </div>
          </div>
          <div className="stat-card__value">{formatCurrency(c.revenue)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Expenses</span>
            <div className="stat-card__icon tone-danger">
              <i className="bi bi-arrow-down-circle"></i>
            </div>
          </div>
          <div className="stat-card__value">{formatCurrency(c.expenses)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Profit</span>
            <div className="stat-card__icon tone-primary">
              <i className="bi bi-cash-stack"></i>
            </div>
          </div>
          <div className="stat-card__value" style={{ color: isProfit ? "var(--success-strong)" : "var(--danger-strong)" }}>
            {formatCurrency(c.profit)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Outstanding Bills</span>
            <div className="stat-card__icon tone-warning">
              <i className="bi bi-credit-card"></i>
            </div>
          </div>
          <div className="stat-card__value">{formatCurrency(c.outstanding_bills)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Cancelled Bills</span>
            <div className="stat-card__icon tone-danger">
              <i className="bi bi-x-circle"></i>
            </div>
          </div>
          <div className="stat-card__value">{formatCurrency(c.cancelled_bills_total)}</div>
          <div className="stat-card__footnote">{c.cancelled_bills_count} cancelled</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Refunds</span>
            <div className="stat-card__icon tone-info">
              <i className="bi bi-arrow-counterclockwise"></i>
            </div>
          </div>
          <div className="stat-card__value">{formatCurrency(c.refunds_total)}</div>
          <div className="stat-card__footnote">{c.refunds_count} refunds</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Revenue Leakage</span>
            <div className="stat-card__icon tone-danger">
              <i className="bi bi-exclamation-triangle"></i>
            </div>
          </div>
          <div className="stat-card__value" style={{ color: "var(--danger-strong)" }}>
            {formatCurrency(c.leakage_total)}
          </div>
        </div>

        {data.best_doctor && (
          <div className="stat-card">
            <div className="stat-card__top">
              <span className="stat-card__label">Best Doctor</span>
              <div className="stat-card__icon tone-primary">
                <i className="bi bi-trophy"></i>
              </div>
            </div>
            <div className="stat-card__value" style={{ fontSize: "20px", fontWeight: 600 }}>
              {data.best_doctor.name}
            </div>
            <div className="stat-card__footnote">
              {formatCurrency(data.best_doctor.revenue)} · {data.best_doctor.patients} patients
            </div>
          </div>
        )}
      </div>

      {/* Charts Section */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", 
        gap: "var(--space-6)", 
        marginBottom: "var(--space-6)" 
      }}>
        {/* Revenue Trend */}
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">Revenue — Last 7 Days</h5>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.revenue_trend_7d}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Line type="monotone" dataKey="value" stroke="#2962FF" strokeWidth={2} name="Revenue" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Trend */}
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">Expenses — Last 7 Days</h5>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={data.expense_trend_7d}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Line type="monotone" dataKey="value" stroke="#FF5252" strokeWidth={2} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">Cash vs M-Pesa vs Card</h5>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={data.payment_methods}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={85}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {data.payment_methods.map((e, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Department Ranking */}
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">Department Revenue Ranking</h5>
          </div>
          <div className="card-body">
            {data.worst_department && (
              <div className="text-sm text-muted" style={{ marginBottom: "var(--space-2)" }}>
                <i className="bi bi-arrow-down me-1"></i>
                Worst performer: <strong>{data.worst_department.name}</strong> ({formatCurrency(data.worst_department?.revenue || 0)})
              </div>
            )}
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.department_ranking}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={60} />
                <YAxis tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#00C48C" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Drugs */}
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">Most Prescribed Drugs</h5>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={data.top_drugs} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(v) => formatNumber(v)} />
                <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 9 }} />
                <Tooltip formatter={(value) => formatNumber(value)} />
                <Bar dataKey="value" fill="#7C4DFF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insurance / SHA Pending Claims */}
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">Pending Insurance Claims</h5>
          </div>
          <div className="card-body">
            <div className="info-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
              <div className="info-item">
                <div className="info-item__label">SHA</div>
                <div className="info-item__value">{formatCurrency(data.sha_pending.amount)}</div>
                <div className="text-2xs text-tertiary">{data.sha_pending.count} claims</div>
              </div>
              <div className="info-item">
                <div className="info-item__label">All Insurers</div>
                <div className="info-item__value">{formatCurrency(data.insurance_pending.amount)}</div>
                <div className="text-2xs text-tertiary">{data.insurance_pending.count} claims</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}