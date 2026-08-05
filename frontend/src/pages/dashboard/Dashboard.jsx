//src/pages/dashboard/Dashboard.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "../../context/ToastContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { getDashboard } from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import { formatCurrency, formatDate } from "../../utils/formatters";

const RADIAN = Math.PI / 180;

const DEPARTMENT_COLORS = ["#4f46e5", "#16a34a", "#0891b2", "#d97706", "#dc2626", "#64748b", "#7c3aed", "#db2777"];
const SERVICE_COLORS = ["#4f46e5", "#0891b2", "#16a34a", "#d97706", "#dc2626", "#7c3aed", "#64748b", "#db2777"];

const VARIANT_STYLES = {
  primary: { bg: "var(--primary-50)", color: "var(--primary-600)" },
  success: { bg: "var(--success-soft)", color: "var(--success-strong)" },
  warning: { bg: "var(--warning-soft)", color: "var(--warning-strong)" },
  danger: { bg: "var(--danger-soft)", color: "var(--danger-strong)" },
  info: { bg: "var(--info-soft)", color: "var(--info-strong)" },
  secondary: { bg: "var(--gray-100, #f1f5f9)", color: "var(--gray-600, #475569)" },
};

const QUICK_ACTIONS = [
  {
    to: "/patients/register",
    icon: "bi-person-plus",
    title: "Register Patient",
    desc: "New patient registration",
    iconBg: "var(--primary-50)",
    iconColor: "var(--primary-600)",
  },
  {
    to: "/visits/register",
    icon: "bi-clipboard-plus",
    title: "Register Visit",
    desc: "New patient visit",
    iconBg: "var(--success-soft)",
    iconColor: "var(--success-strong)",
  },
  {
    to: "/queue",
    icon: "bi-hourglass-split",
    title: "View Queue",
    desc: "Current waiting patients",
    iconBg: "var(--warning-soft)",
    iconColor: "var(--warning-strong)",
  },
  {
    to: "/billing",
    icon: "bi-receipt",
    title: "Billing",
    desc: "Invoices & payments",
    iconBg: "var(--info-soft)",
    iconColor: "var(--info-strong)",
  },
];

function MetricCard({ icon, variant = "primary", label, value, sub }) {
  const { bg, color } = VARIANT_STYLES[variant] || VARIANT_STYLES.primary;
  return (
    <div className="card">
      <div className="card-body">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="rounded-full flex items-center justify-center"
            style={{ width: 40, height: 40, background: bg, flexShrink: 0 }}
          >
            <i className={`bi ${icon}`} style={{ fontSize: "1.05rem", color }}></i>
          </div>
          <span className="text-tertiary text-xs">{label}</span>
        </div>
        <div className="text-2xl font-semibold">{value}</div>
        {sub && <div className="text-tertiary text-xs mt-1">{sub}</div>}
      </div>
    </div>
  );
}

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{formatDate(label, { day: "numeric", month: "short" })}</div>
      <div className="chart-tooltip__value">{formatCurrency(payload[0].value)}</div>
    </div>
  );
}

function VisitsTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{formatDate(label, { day: "numeric", month: "short" })}</div>
      <div className="chart-tooltip__value">{payload[0].value} visit{payload[0].value === 1 ? "" : "s"}</div>
    </div>
  );
}

function MonthlyRevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      <div className="chart-tooltip__value">{formatCurrency(payload[0].value)}</div>
    </div>
  );
}

function DiagnosisTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{item.payload.name}</div>
      <div className="chart-tooltip__value">{item.value} case{item.value === 1 ? "" : "s"}</div>
    </div>
  );
}

function PieValueTooltip({ active, payload, formatter }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{item.name}</div>
      <div className="chart-tooltip__value">{formatter ? formatter(item.value) : item.value}</div>
    </div>
  );
}

// Renders name + % outside the pie, connected back to the slice by a line (labelLine).
function renderConnectorLabel({ cx, cy, midAngle, outerRadius, percent, name }) {
  if (percent < 0.03) return null; // skip tiny slivers to avoid clutter
  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fontSize={11}
      fill="var(--text-secondary, #475569)"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
    >
      {`${name} (${Math.round(percent * 100)}%)`}
    </text>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const result = await getDashboard();
      setData(result);
    } catch (err) {
      toast.error(err.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;

  const { cards, charts, top_revenue_service, most_reported_case } = data || {};

  const revenueData = (charts?.revenue || []).map((d) => ({
    date: d.date,
    revenue: parseFloat(d.revenue) || 0,
  }));
  const visitsData = (charts?.visits || []).map((d) => ({
    date: d.date,
    visits: d.visits || 0,
  }));
  const departmentData = (charts?.departments || []).map((d) => ({
    name: d.department__name || "Unassigned",
    value: d.count || 0,
  }));
  const monthlyRevenueData = charts?.monthly_revenue_12m || [];
  const revenueByServiceData = charts?.revenue_by_service || [];
  const topDiagnosesData = charts?.top_diagnoses || [];

  return (
    <>
      <div className="page-header flex items-center justify-between flex-wrap gap-4">
        <div>
          <div className="page-eyebrow">Overview</div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Welcome back! Here's what's happening today.</p>
        </div>

        {(most_reported_case || top_revenue_service) && (
          <div className="flex items-center gap-5 flex-wrap">
            {most_reported_case && (
              <div className="text-right">
                <div className="text-tertiary text-xs">Most Reported Case</div>
                <div className="font-semibold text-sm">
                  {most_reported_case.code} — {most_reported_case.description}{" "}
                  <span className="text-tertiary font-normal">({most_reported_case.count})</span>
                </div>
              </div>
            )}
            {top_revenue_service && (
              <div className="text-right">
                <div className="text-tertiary text-xs">Top Revenue Service</div>
                <div className="font-semibold text-sm">
                  {top_revenue_service.name}{" "}
                  <span className="text-tertiary font-normal">({formatCurrency(top_revenue_service.value)})</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ==================== KEY METRICS (10 cards) ==================== */}
      <div className="stat-grid mb-6">
        <MetricCard
          icon="bi-cash-stack"
          variant="success"
          label="Revenue"
          value={formatCurrency(cards?.todays_revenue || 0)}
          sub={`Today • All-time ${formatCurrency(cards?.total_revenue_all_time || 0)}`}
        />
        <MetricCard
          icon="bi-people"
          variant="primary"
          label="Patients"
          value={cards?.total_patients || 0}
          sub={`${cards?.todays_patients || 0} today • ${cards?.male_patients || 0}M / ${cards?.female_patients || 0}F`}
        />
        <MetricCard
          icon="bi-hourglass-split"
          variant="warning"
          label="Queue & Consultations"
          value={cards?.waiting_patients || 0}
          sub={`waiting • ${cards?.todays_consultations || 0} consultations today`}
        />
        <MetricCard
          icon="bi-droplet-half"
          variant="danger"
          label="Pending Diagnostics"
          value={cards?.pending_lab || 0}
          sub={`lab • ${cards?.pending_radiology || 0} radiology`}
        />
        <MetricCard
          icon="bi-exclamation-triangle"
          variant={cards?.medicine_stock_alerts > 0 ? "warning" : "secondary"}
          label="Low Stock Alerts"
          value={cards?.medicine_stock_alerts || 0}
          sub="medicines below reorder level"
        />
        <MetricCard
          icon="bi-person-badge"
          variant="info"
          label="Medical Staff"
          value={cards?.total_doctors || 0}
          sub={`doctors • ${cards?.total_nurses || 0} nurses`}
        />
        <MetricCard
          icon="bi-hospital"
          variant="secondary"
          label="Bed Occupancy"
          value={`${cards?.occupied_beds ?? "—"} / ${cards?.total_beds ?? "—"}`}
          sub="occupied / total beds"
        />
        <MetricCard
          icon="bi-receipt-cutoff"
          variant="primary"
          label="Invoices"
          value={cards?.total_invoices || 0}
          sub={`${cards?.paid_invoices || 0} paid • ${cards?.unpaid_invoices || 0} unpaid`}
        />
        <MetricCard
          icon="bi-cash-coin"
          variant="danger"
          label="Outstanding Amount"
          value={formatCurrency(cards?.unpaid_amount || 0)}
          sub={`across ${cards?.unpaid_invoices || 0} unpaid invoices`}
        />
        <MetricCard
          icon="bi-graph-up-arrow"
          variant="success"
          label="Visits (30 Days)"
          value={departmentData.reduce((sum, d) => sum + d.value, 0)}
          sub={`across ${departmentData.length} department${departmentData.length === 1 ? "" : "s"}`}
        />
      </div>

      {/* ==================== ANALYTICS ==================== */}
      <h2 className="section-title mb-3">Analytics</h2>

      <div className="dashboard-grid mb-5">
        <div className="chart-card">
          <div className="chart-card__header">
            <h5 className="card-title">Revenue (Last 7 Days)</h5>
            <span className="text-tertiary text-xs">Daily revenue trend</span>
          </div>
          <div style={{ height: 240 }}>
            {revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { day: "numeric" })} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} fontSize={12} tickLine={false} axisLine={false} width={40} />
                  <Tooltip content={<RevenueTooltip />} />
                  <Line type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3, fill: "#4f46e5" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-tertiary py-6">No revenue data available</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card__header">
            <h5 className="card-title">Visits (Last 7 Days)</h5>
            <span className="text-tertiary text-xs">Daily visit count</span>
          </div>
          <div style={{ height: 240 }}>
            {visitsData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visitsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { day: "numeric" })} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} width={30} />
                  <Tooltip content={<VisitsTooltip />} cursor={{ fill: "rgba(22, 163, 74, 0.08)" }} />
                  <Bar dataKey="visits" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-tertiary py-6">No visit data available</div>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-grid mb-5">
        <div className="chart-card">
          <div className="chart-card__header">
            <h5 className="card-title">Revenue (Last 12 Months)</h5>
            <span className="text-tertiary text-xs">Monthly revenue trend</span>
          </div>
          <div style={{ height: 260 }}>
            {monthlyRevenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyRevenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-30} textAnchor="end" height={50} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} fontSize={12} tickLine={false} axisLine={false} width={40} />
                  <Tooltip content={<MonthlyRevenueTooltip />} />
                  <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-tertiary py-6">No revenue data available</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card__header">
            <h5 className="card-title">Top Diagnoses</h5>
            <span className="text-tertiary text-xs">Most frequently reported cases</span>
          </div>
          <div style={{ height: 260 }}>
            {topDiagnosesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDiagnosesData} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" width={150} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip content={<DiagnosisTooltip />} cursor={{ fill: "rgba(79, 70, 229, 0.06)" }} />
                  <Bar dataKey="value" fill="#dc2626" radius={[0, 4, 4, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-tertiary py-6">No diagnosis data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Donuts — bigger, no legend list; slice labels connected by lines instead.
          minmax(0, 1fr) (not plain 1fr) forces a true 50/50 split — a bare
          "1fr" track still respects its content's min-content width, so a
          chart with longer labels could stretch its column wider than the
          other; minmax(0, ...) removes that floor. */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "16px" }}>
        <div className="chart-card">
          <div className="chart-card__header">
            <h5 className="card-title">Revenue by Service</h5>
          </div>
          <div style={{ height: 320 }}>
            {revenueByServiceData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueByServiceData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                    label={renderConnectorLabel}
                    labelLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                  >
                    {revenueByServiceData.map((_, index) => (
                      <Cell key={index} fill={SERVICE_COLORS[index % SERVICE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieValueTooltip formatter={(v) => formatCurrency(v)} />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-tertiary py-6">No service revenue data available</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card__header">
            <h5 className="card-title">Departments (Last 30 Days)</h5>
          </div>
          <div style={{ height: 320 }}>
            {departmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={departmentData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                    label={renderConnectorLabel}
                    labelLine={{ stroke: "#cbd5e1", strokeWidth: 1 }}
                  >
                    {departmentData.map((_, index) => (
                      <Cell key={index} fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<PieValueTooltip formatter={(v) => `${v} visits`} />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-tertiary py-6">No department data available</div>
            )}
          </div>
        </div>
      </div>

      {/* ==================== QUICK ACTIONS ==================== */}
      <h2 className="section-title mb-3 mt-6">Quick Actions</h2>
      <div className="stat-grid mt-2">
        {QUICK_ACTIONS.map((action) => (
          <Link key={action.to} to={action.to} className="card card-interactive">
            <div className="card-body text-center">
              <div
                className="rounded-full flex items-center justify-center mb-3 mx-auto"
                style={{ width: 48, height: 48, background: action.iconBg }}
              >
                <i className={`bi ${action.icon}`} style={{ fontSize: "1.25rem", color: action.iconColor }}></i>
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