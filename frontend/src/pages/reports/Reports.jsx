import { useEffect, useState, useMemo, useCallback } from "react";
import { toast } from "../../context/ToastContext";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ComposedChart,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getReports } from "../../services/api";
import LoadingSpinner from "../../components/LoadingSpinner";
import { formatCurrency, formatDate } from "../../utils/formatters";

const COLORS = ["#4f46e5", "#16a34a", "#0891b2", "#d97706", "#dc2626", "#64748b"];

const OVERVIEW_TYPES = [
  "daily_revenue",
  "department_revenue",
  "doctor_revenue",
  "medicine_sales",
  "patient_statistics",
];

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const AGE_GROUP_COLORS = {
  "Children (0-12)": "#0891b2",
  "Teenagers (13-19)": "#16a34a",
  "Youth (20-35)": "#4f46e5",
  "Adults (36-59)": "#d97706",
  "Seniors (60+)": "#dc2626",
  "Unknown": "#64748b",
};

const KEY_LABELS = {
  date: "Date",
  total: "Total (KES)",
  hospital_total: "Hospital Total (KES)",
  otc_total: "OTC Total (KES)",
  visit__doctor__first_name: "Doctor First Name",
  visit__doctor__last_name: "Doctor Last Name",
  visit__department__name: "Department",
  prescription__medicine__name: "Medicine",
  total_qty: "Quantity Sold",
  total_patients: "Total Patients",
  new_patients_in_range: "New Patients",
  total_visits_in_range: "Total Visits",
};

const humanizeKey = (key) =>
  KEY_LABELS[key] ||
  key
    .replace(/__/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

function RevenueTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{formatDate(label, { day: "numeric", month: "short" })}</div>
      <div className="chart-tooltip__value">{formatCurrency(payload[0].value)}</div>
    </div>
  );
}

function NamedValueTooltip({ active, payload, valueFormatter }) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{item.payload.name}</div>
      <div className="chart-tooltip__value">
        {valueFormatter ? valueFormatter(item.value) : item.value}
      </div>
    </div>
  );
}

function YearlyTrendTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="chart-tooltip__value" style={{ color: entry.color }}>
          {entry.name}: {formatCurrency(entry.value)}
        </div>
      ))}
    </div>
  );
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState("daily_revenue");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [overview, setOverview] = useState({});
  const [overviewLoading, setOverviewLoading] = useState(true);

  // 12-month trend — deliberately has its own filter (year) and does NOT
  // depend on dateFrom/dateTo above.
  const [trendYear, setTrendYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]);
  const [yearlyTrend, setYearlyTrend] = useState([]);
  const [yearlyTrendLoading, setYearlyTrendLoading] = useState(true);

  // Patient demographics (age group + gender) — follows the same date
  // range filter as the overview charts above.
  const [demographics, setDemographics] = useState({ cards: [], ageData: [], genderData: [] });
  const [demographicsLoading, setDemographicsLoading] = useState(true);

  // Top diseases reported in the last 12 months — rolling window, no
  // filter of its own; clicking a bar drives the drill-down section below.
  const [topDiseases, setTopDiseases] = useState([]);
  const [diseasePeriod, setDiseasePeriod] = useState({ start: "", end: "" });
  const [topDiseasesLoading, setTopDiseasesLoading] = useState(true);

  // Disease drill-down: pick a disease (from the chart above, or defaults
  // to the top one once loaded) plus a specific month/year — its own
  // filter section, independent of everything else on the page.
  const [selectedDisease, setSelectedDisease] = useState(null); // { code, name }
  const [drillMonth, setDrillMonth] = useState(new Date().getMonth() + 1);
  const [drillYear, setDrillYear] = useState(new Date().getFullYear());
  const [drillResult, setDrillResult] = useState(null);
  const [drillLoading, setDrillLoading] = useState(false);

  const reportTypes = [
    { value: "daily_revenue", label: "Daily Revenue" },
    { value: "doctor_revenue", label: "Doctor Revenue" },
    { value: "department_revenue", label: "Department Revenue" },
    { value: "patient_statistics", label: "Patient Statistics" },
    { value: "medicine_sales", label: "Medicine Sales" },
    { value: "lab_revenue", label: "Lab Revenue" },
    { value: "radiology_revenue", label: "Radiology Revenue" },
    { value: "consultation_revenue", label: "Consultation Revenue" },
  ];

  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    setDateFrom(thirtyDaysAgo.toISOString().split("T")[0]);
    setDateTo(today.toISOString().split("T")[0]);
  }, []);

  // -------------------------------------------------------------------
  // Detail report (dropdown-driven table + export)
  // -------------------------------------------------------------------
  const loadReport = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    try {
      const data = await getReports(reportType, { date_from: dateFrom, date_to: dateTo });
      setReportData(data);
    } catch (err) {
      toast.error(err.message || "Failed to load report");
    } finally {
      setLoading(false);
    }
  }, [reportType, dateFrom, dateTo]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  // -------------------------------------------------------------------
  // Overview charts (several report types fetched together)
  // -------------------------------------------------------------------
  const loadOverview = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setOverviewLoading(true);
    try {
      const results = await Promise.all(
        OVERVIEW_TYPES.map((type) => getReports(type, { date_from: dateFrom, date_to: dateTo }))
      );
      const next = {};
      OVERVIEW_TYPES.forEach((type, i) => {
        next[type] = results[i]?.data;
      });
      setOverview(next);
    } catch (err) {
      toast.error(err.message || "Failed to load report overview");
    } finally {
      setOverviewLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  // -------------------------------------------------------------------
  // 12-month revenue trend (its own year filter, independent of the
  // date-range filter and the detail-report dropdown above)
  // -------------------------------------------------------------------
  const loadYearlyTrend = useCallback(async () => {
    setYearlyTrendLoading(true);
    try {
      const result = await getReports("yearly_revenue_trend", { year: trendYear });
      setYearlyTrend(
        (result?.data || []).map((d) => ({
          month: d.month,
          hospital: parseFloat(d.hospital_total) || 0,
          otc: parseFloat(d.otc_total) || 0,
          total: parseFloat(d.total) || 0,
        }))
      );
      if (Array.isArray(result?.available_years) && result.available_years.length > 0) {
        setAvailableYears(result.available_years);
      }
    } catch (err) {
      toast.error(err.message || "Failed to load 12-month trend");
    } finally {
      setYearlyTrendLoading(false);
    }
  }, [trendYear]);

  useEffect(() => {
    loadYearlyTrend();
  }, [loadYearlyTrend]);

  // -------------------------------------------------------------------
  // Patient demographics: age group + gender, for patients seen within
  // the same dateFrom/dateTo range used by the overview charts above.
  // -------------------------------------------------------------------
  const loadDemographics = useCallback(async () => {
    if (!dateFrom || !dateTo) return;
    setDemographicsLoading(true);
    try {
      const result = await getReports("patient_demographics", { date_from: dateFrom, date_to: dateTo });
      setDemographics({
        cards: result?.cards || [],
        ageData: result?.charts?.age_groups?.data || [],
        genderData: result?.charts?.gender?.data || [],
      });
    } catch (err) {
      toast.error(err.message || "Failed to load patient demographics");
    } finally {
      setDemographicsLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => {
    loadDemographics();
  }, [loadDemographics]);

  // -------------------------------------------------------------------
  // Top diseases — rolling last 12 months, no filter of its own.
  // -------------------------------------------------------------------
  const loadTopDiseases = useCallback(async () => {
    setTopDiseasesLoading(true);
    try {
      const result = await getReports("disease_top_12m", {});
      const chartData = result?.charts?.top10?.data || [];
      setTopDiseases(chartData);
      setDiseasePeriod({ start: result?.start, end: result?.end });
      // Default the drill-down to the #1 disease the first time this loads,
      // so the section below isn't empty before the user clicks anything.
      setSelectedDisease((prev) => prev || (chartData[0] ? { code: chartData[0].code, name: chartData[0].name } : null));
    } catch (err) {
      toast.error(err.message || "Failed to load 12-month disease trend");
    } finally {
      setTopDiseasesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTopDiseases();
  }, [loadTopDiseases]);

  // -------------------------------------------------------------------
  // Disease drill-down: one disease + one month/year -> case count and
  // which age group it hit hardest. Own filter section entirely.
  // -------------------------------------------------------------------
  const loadDiseaseDrilldown = useCallback(async () => {
    if (!selectedDisease?.code) return;
    setDrillLoading(true);
    try {
      const result = await getReports("disease_monthly_detail", {
        icd10_code: selectedDisease.code,
        year: drillYear,
        month: drillMonth,
      });
      setDrillResult(result);
    } catch (err) {
      toast.error(err.message || "Failed to load disease detail");
    } finally {
      setDrillLoading(false);
    }
  }, [selectedDisease, drillYear, drillMonth]);

  useEffect(() => {
    loadDiseaseDrilldown();
  }, [loadDiseaseDrilldown]);

  // FIX: backend's daily_revenue rows use `date`, not `paid_at__date`
  // (that key belonged to the old .values("paid_at__date") queryset shape
  // before daily_revenue was merged with OTC sales into {date, hospital_total,
  // otc_total, total}). Mapping the wrong key meant every point's x-value
  // was undefined, so the line chart rendered blank even though data existed.
  const revenueTrend = useMemo(
    () =>
      (overview.daily_revenue || []).map((d) => ({
        date: d.date,
        total: parseFloat(d.total) || 0,
      })),
    [overview.daily_revenue]
  );

  const departmentBreakdown = useMemo(
    () =>
      (overview.department_revenue || []).map((d) => ({
        name: d.visit__department__name || "Unassigned",
        value: parseFloat(d.total) || 0,
      })),
    [overview.department_revenue]
  );

  const doctorRevenue = useMemo(
    () =>
      (overview.doctor_revenue || [])
        .map((d) => ({
          name: `${d.visit__doctor__first_name || ""} ${d.visit__doctor__last_name || ""}`.trim() || "Unknown",
          total: parseFloat(d.total) || 0,
        }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8),
    [overview.doctor_revenue]
  );

  const medicineSales = useMemo(
    () =>
      (overview.medicine_sales || [])
        .map((d) => ({
          name: d.prescription__medicine__name || "Unknown",
          qty: d.total_qty || 0,
        }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 8),
    [overview.medicine_sales]
  );

  const patientStats = overview.patient_statistics || {};
  const patientBarData = [
    { name: "Total Patients", value: patientStats.total_patients || 0 },
    { name: "New Patients", value: patientStats.new_patients_in_range || 0 },
    { name: "Total Visits", value: patientStats.total_visits_in_range || 0 },
  ];

  // -------------------------------------------------------------------
  // Export helpers (operate on the currently selected detail report)
  // -------------------------------------------------------------------
  const getExportRows = () => {
    if (!reportData?.data) return [];
    const raw = Array.isArray(reportData.data) ? reportData.data : [reportData.data];
    return raw.map((row) => {
      const cleaned = {};
      Object.entries(row).forEach(([k, v]) => {
        cleaned[humanizeKey(k)] = v;
      });
      return cleaned;
    });
  };

  const handleExportExcel = () => {
    const rows = getExportRows();
    if (rows.length === 0) {
      toast.info("No data to export");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${reportType}_${dateFrom}_to_${dateTo}.xlsx`);
  };

  const handleExportPDF = () => {
    const rows = getExportRows();
    if (rows.length === 0) {
      toast.info("No data to export");
      return;
    }
    const doc = new jsPDF();
    const title = reportTypes.find((rt) => rt.value === reportType)?.label || "Report";

    doc.setFontSize(16);
    doc.text("City General Hospital", 14, 16);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(title, 14, 23);
    doc.text(`Period: ${dateFrom} to ${dateTo}`, 14, 29);

    const headers = [Object.keys(rows[0])];
    const body = rows.map((row) =>
      Object.values(row).map((v) => (typeof v === "number" ? v.toLocaleString() : v ?? "—"))
    );

    autoTable(doc, {
      startY: 34,
      head: headers,
      body,
      theme: "striped",
      headStyles: { fillColor: [79, 70, 229] },
      styles: { fontSize: 9 },
    });

    doc.save(`${reportType}_${dateFrom}_to_${dateTo}.pdf`);
  };

  // -------------------------------------------------------------------
  // Detail table renderer (unchanged logic from before)
  // -------------------------------------------------------------------
  const renderReportContent = () => {
    if (!reportData || !reportData.data) {
      return <div className="text-center text-muted py-4">No data available for this report</div>;
    }

    const { data } = reportData;

    if (reportType === "patient_statistics") {
      return (
        <div className="row">
          <div className="col-md-4">
            <div className="card">
              <div className="card-body text-center">
                <div className="text-muted text-sm">Total Patients</div>
                <div className="fs-2 fw-bold">{data.total_patients || 0}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card">
              <div className="card-body text-center">
                <div className="text-muted text-sm">New Patients (Range)</div>
                <div className="fs-2 fw-bold text-primary">{data.new_patients_in_range || 0}</div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card">
              <div className="card-body text-center">
                <div className="text-muted text-sm">Total Visits (Range)</div>
                <div className="fs-2 fw-bold text-success">{data.total_visits_in_range || 0}</div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return <div className="text-center text-muted py-4">No records found</div>;
      }

      // FIX: daily_revenue rows are shaped {date, hospital_total, otc_total,
      // total} — was checking `paid_at__date`, which no longer exists on
      // this response, so it always fell through to the generic table below.
      if (data[0]?.date) {
        return (
          <div className="table-wrap">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={index}>
                      <td>{formatDate(item.date)}</td>
                      <td className="cell-numeric">{formatCurrency(item.total || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      if (data[0]?.visit__doctor__first_name || data[0]?.visit__department__name) {
        const nameKey = Object.keys(data[0]).find((k) => k.includes("name") || k.includes("first_name"));
        return (
          <div className="table-wrap">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="text-right">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => {
                    const name =
                      item[nameKey] ||
                      item.visit__doctor__first_name ||
                      item.visit__department__name ||
                      "Unknown";
                    return (
                      <tr key={index}>
                        <td>{name}</td>
                        <td className="cell-numeric">{formatCurrency(item.total || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      if (data[0]?.prescription__medicine__name) {
        return (
          <div className="table-wrap">
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th className="text-right">Quantity Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr key={index}>
                      <td>{item.prescription__medicine__name || "Unknown"}</td>
                      <td className="cell-numeric">{item.total_qty || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      return (
        <div className="table-wrap">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    <th key={key}>{key.replace(/_/g, " ").toUpperCase()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={index}>
                    {Object.values(item).map((val, i) => (
                      <td key={i}>
                        {typeof val === "number" && !isNaN(val) && !String(val).includes("date")
                          ? formatCurrency(val)
                          : val || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    return <div className="text-center text-muted py-4">Data format not supported</div>;
  };

  if (loading && !reportData) return <LoadingSpinner />;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Insights</div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Generate, visualize, and export financial and operational reports</p>
        </div>
        <div className="page-header__actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              loadReport();
              loadOverview();
              loadDemographics();
              loadTopDiseases();
            }}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Date Range (drives both overview and detail) */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <div className="field">
                <label className="field-label" htmlFor="date_from">From Date</label>
                <input
                  id="date_from"
                  type="date"
                  className="input"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
              <div className="field">
                <label className="field-label" htmlFor="date_to">To Date</label>
                <input
                  id="date_to"
                  type="date"
                  className="input"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Overview Charts */}
      <div className="dashboard-grid mb-4">
        <div className="chart-card">
          <div className="chart-card__header">
            <h5 className="card-title">Revenue Trend</h5>
            <span className="text-muted small">Daily revenue in selected range</span>
          </div>
          <div style={{ height: 240 }}>
            {overviewLoading ? (
              <div className="text-center text-muted py-5">Loading…</div>
            ) : revenueTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { day: "numeric" })} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} fontSize={12} tickLine={false} axisLine={false} width={40} />
                  <Tooltip content={<RevenueTooltip />} />
                  <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3, fill: "#4f46e5" }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted py-4">No revenue data available</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card__header">
            <h5 className="card-title">Revenue by Department</h5>
            <span className="text-muted small">Share of consultation revenue</span>
          </div>
          <div style={{ height: 240 }}>
            {overviewLoading ? (
              <div className="text-center text-muted py-5">Loading…</div>
            ) : departmentBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={departmentBreakdown} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {departmentBreakdown.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<NamedValueTooltip valueFormatter={formatCurrency} />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted py-4">No department data available</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card__header">
            <h5 className="card-title">Top Doctors by Revenue</h5>
            <span className="text-muted small">Consultation revenue generated</span>
          </div>
          <div style={{ height: 240 }}>
            {overviewLoading ? (
              <div className="text-center text-muted py-5">Loading…</div>
            ) : doctorRevenue.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={doctorRevenue} layout="vertical" margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                  <XAxis type="number" tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} width={90} />
                  <Tooltip content={<NamedValueTooltip valueFormatter={formatCurrency} />} cursor={{ fill: "rgba(79, 70, 229, 0.06)" }} />
                  <Bar dataKey="total" fill="#4f46e5" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted py-4">No doctor revenue data available</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card__header">
            <h5 className="card-title">Top Medicines Dispensed</h5>
            <span className="text-muted small">By quantity sold</span>
          </div>
          <div style={{ height: 240 }}>
            {overviewLoading ? (
              <div className="text-center text-muted py-5">Loading…</div>
            ) : medicineSales.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={medicineSales} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} width={30} />
                  <Tooltip content={<NamedValueTooltip />} cursor={{ fill: "rgba(22, 163, 74, 0.08)" }} />
                  <Bar dataKey="qty" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted py-4">No medicine sales data available</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card__header">
            <h5 className="card-title">Patient Activity</h5>
            <span className="text-muted small">Totals for the selected range</span>
          </div>
          <div style={{ height: 240 }}>
            {overviewLoading ? (
              <div className="text-center text-muted py-5">Loading…</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patientBarData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} width={30} />
                  <Tooltip content={<NamedValueTooltip />} cursor={{ fill: "rgba(8, 145, 178, 0.08)" }} />
                  <Bar dataKey="value" fill="#0891b2" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* 12-Month Revenue Trend — own year filter, unrelated to the date range above */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
            <div>
              <h5 className="card-title mb-1">Last 12 Months</h5>
              <span className="text-muted small">Monthly revenue for the selected year — not affected by the date range above</span>
            </div>
            <div className="field mb-0" style={{ minWidth: 140 }}>
              <label className="field-label" htmlFor="trend_year">Year</label>
              <select
                id="trend_year"
                className="select"
                value={trendYear}
                onChange={(e) => setTrendYear(Number(e.target.value))}
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ height: 300 }}>
            {yearlyTrendLoading ? (
              <div className="text-center text-muted py-5">Loading…</div>
            ) : yearlyTrend.some((m) => m.total > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={yearlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="month" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} fontSize={12} tickLine={false} axisLine={false} width={40} />
                  <Tooltip content={<YearlyTrendTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="hospital" name="Hospital" stackId="revenue" fill="#4f46e5" maxBarSize={40} />
                  <Bar dataKey="otc" name="OTC Pharmacy" stackId="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Line type="monotone" dataKey="total" name="Total" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted py-4">No revenue data available for {trendYear}</div>
            )}
          </div>
        </div>
      </div>

      {/* Patient Demographics — age group & gender, same date range as the overview charts */}
      <div className="dashboard-grid mb-4">
        <div className="chart-card">
          <div className="chart-card__header">
            <h5 className="card-title">Patients by Age Group</h5>
            <span className="text-muted small">Children, teenagers, youth, adults & seniors seen in the selected range</span>
          </div>
          <div style={{ height: 260 }}>
            {demographicsLoading ? (
              <div className="text-center text-muted py-5">Loading…</div>
            ) : demographics.ageData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={demographics.ageData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} width={30} />
                  <Tooltip content={<NamedValueTooltip />} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                    {demographics.ageData.map((entry, index) => (
                      <Cell key={index} fill={AGE_GROUP_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted py-4">No patient data available</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card__header">
            <h5 className="card-title">Patients by Gender</h5>
            <span className="text-muted small">Same period as the age group chart</span>
          </div>
          <div style={{ height: 260 }}>
            {demographicsLoading ? (
              <div className="text-center text-muted py-5">Loading…</div>
            ) : demographics.genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={demographics.genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                    {demographics.genderData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<NamedValueTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted py-4">No gender data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Top Diseases — rolling last 12 months, own window, click a bar to drill in below */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="mb-3">
            <h5 className="card-title mb-1">Most Reported Diseases — Last 12 Months</h5>
            <span className="text-muted small">
              {diseasePeriod.start && diseasePeriod.end
                ? `${diseasePeriod.start} to ${diseasePeriod.end} — click a bar to see monthly detail below`
                : "Click a bar to see monthly detail below"}
            </span>
          </div>
          <div style={{ height: 300 }}>
            {topDiseasesLoading ? (
              <div className="text-center text-muted py-5">Loading…</div>
            ) : topDiseases.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topDiseases} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} width={30} />
                  <Tooltip content={<NamedValueTooltip />} cursor={{ fill: "rgba(220, 38, 38, 0.06)" }} />
                  <Bar
                    dataKey="value"
                    fill="#dc2626"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={44}
                    cursor="pointer"
                    onClick={(entry) => setSelectedDisease({ code: entry.code, name: entry.name })}
                  >
                    {topDiseases.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={selectedDisease?.code === entry.code ? "#4f46e5" : "#dc2626"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-muted py-4">No diagnoses recorded in the last 12 months</div>
            )}
          </div>
        </div>
      </div>

      {/* Disease Drill-down — pick a disease + a specific month/year, own filter section */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-end flex-wrap gap-3 mb-3">
            <div>
              <h5 className="card-title mb-1">Disease Detail — Specific Month</h5>
              <span className="text-muted small">
                {selectedDisease
                  ? `Showing: ${selectedDisease.name}`
                  : "Click a disease in the chart above to get started"}
              </span>
            </div>
            <div className="d-flex gap-3">
              <div className="field mb-0" style={{ minWidth: 160 }}>
                <label className="field-label" htmlFor="drill_month">Month</label>
                <select
                  id="drill_month"
                  className="select"
                  value={drillMonth}
                  onChange={(e) => setDrillMonth(Number(e.target.value))}
                >
                  {MONTH_NAMES.map((name, i) => (
                    <option key={name} value={i + 1}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="field mb-0" style={{ minWidth: 120 }}>
                <label className="field-label" htmlFor="drill_year">Year</label>
                <select
                  id="drill_year"
                  className="select"
                  value={drillYear}
                  onChange={(e) => setDrillYear(Number(e.target.value))}
                >
                  {availableYears.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {!selectedDisease ? (
            <div className="text-center text-muted py-4">No disease selected yet</div>
          ) : drillLoading ? (
            <div className="text-center text-muted py-5">Loading…</div>
          ) : (
            <>
              <div className="row g-3 mb-4">
                {(drillResult?.cards || []).map((card) => (
                  <div className="col-md-3" key={card.label}>
                    <div className="card">
                      <div className="card-body text-center">
                        <div className="text-muted text-sm">{card.label}</div>
                        <div className="fs-2 fw-bold">{card.value}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="dashboard-grid">
                <div className="chart-card">
                  <div className="chart-card__header">
                    <h5 className="card-title">Cases by Age Group</h5>
                    <span className="text-muted small">
                      {MONTH_NAMES[drillMonth - 1]} {drillYear}
                    </span>
                  </div>
                  <div style={{ height: 240 }}>
                    {drillResult?.charts?.age_groups?.data?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={drillResult.charts.age_groups.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                          <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                          <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} width={30} />
                          <Tooltip content={<NamedValueTooltip />} />
                          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                            {drillResult.charts.age_groups.data.map((entry, index) => (
                              <Cell key={index} fill={AGE_GROUP_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center text-muted py-4">No cases recorded for this month</div>
                    )}
                  </div>
                </div>

                <div className="chart-card">
                  <div className="chart-card__header">
                    <h5 className="card-title">Cases by Gender</h5>
                    <span className="text-muted small">
                      {MONTH_NAMES[drillMonth - 1]} {drillYear}
                    </span>
                  </div>
                  <div style={{ height: 240 }}>
                    {drillResult?.charts?.gender?.data?.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={drillResult.charts.gender.data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                            {drillResult.charts.gender.data.map((_, index) => (
                              <Cell key={index} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip content={<NamedValueTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center text-muted py-4">No cases recorded for this month</div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Detail Report + Export */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-4">
              <div className="field">
                <label className="field-label" htmlFor="report_type">Detail Report</label>
                <select id="report_type" className="select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                  {reportTypes.map((rt) => (
                    <option key={rt.value} value={rt.value}>{rt.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="col-md-8 d-flex gap-2 justify-content-md-end">
              <button type="button" className="btn btn-secondary" onClick={handleExportExcel}>
                <i className="bi bi-file-earmark-excel me-2"></i>
                Export Excel
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleExportPDF}>
                <i className="bi bi-file-earmark-pdf me-2"></i>
                Export PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {reportData && (
        <div className="mb-3">
          <span className="text-muted text-sm">{reportData.type?.replace(/_/g, " ").toUpperCase()}</span>
          <span className="text-muted text-sm ms-3">{reportData.date_from} — {reportData.date_to}</span>
        </div>
      )}

      <div className="card">
        <div className="card-body">{loading ? <LoadingSpinner /> : renderReportContent()}</div>
      </div>
    </>
  );
}