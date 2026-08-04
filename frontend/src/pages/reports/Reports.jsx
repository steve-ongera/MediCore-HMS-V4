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
import { formatCurrency, formatDate, formatNumber } from "../../utils/formatters";

const COLORS = ["#4f46e5", "#16a34a", "#0891b2", "#d97706", "#dc2626", "#64748b"];
const PAGE_SIZE = 10;

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
        {valueFormatter ? valueFormatter(item.value) : formatNumber(item.value)}
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

function PaginationFooter({ totalRows, currentPage, totalPages, startIdx, onPageChange }) {
  if (totalRows === 0) return null;
  return (
    <div className="card-footer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span className="text-tertiary text-sm">
        Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, totalRows)} of {formatNumber(totalRows)}
      </span>
      <div className="flex items-center gap-2">
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <i className="bi bi-chevron-left me-1"></i> Prev
        </button>
        <span className="text-2xs text-tertiary">Page {currentPage} of {totalPages}</span>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next <i className="bi bi-chevron-right ms-1"></i>
        </button>
      </div>
    </div>
  );
}

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  const [reportType, setReportType] = useState("daily_revenue");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [detailPage, setDetailPage] = useState(1);

  const [overview, setOverview] = useState({});
  const [overviewLoading, setOverviewLoading] = useState(true);

  const [trendYear, setTrendYear] = useState(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState([new Date().getFullYear()]);
  const [yearlyTrend, setYearlyTrend] = useState([]);
  const [yearlyTrendLoading, setYearlyTrendLoading] = useState(true);

  const [demographics, setDemographics] = useState({ cards: [], ageData: [], genderData: [] });
  const [demographicsLoading, setDemographicsLoading] = useState(true);

  const [topDiseases, setTopDiseases] = useState([]);
  const [diseasePeriod, setDiseasePeriod] = useState({ start: "", end: "" });
  const [topDiseasesLoading, setTopDiseasesLoading] = useState(true);

  const [selectedDisease, setSelectedDisease] = useState(null);
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

  useEffect(() => {
    setDetailPage(1);
  }, [reportData]);

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

  const loadTopDiseases = useCallback(async () => {
    setTopDiseasesLoading(true);
    try {
      const result = await getReports("disease_top_12m", {});
      const chartData = result?.charts?.top10?.data || [];
      setTopDiseases(chartData);
      setDiseasePeriod({ start: result?.start, end: result?.end });
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

  const goToDetailPage = (p, totalPages) => setDetailPage(Math.min(Math.max(1, p), totalPages));

  const renderReportContent = () => {
    if (!reportData || !reportData.data) {
      return <div className="text-center text-tertiary py-4">No data available for this report</div>;
    }

    const { data } = reportData;

    if (reportType === "patient_statistics") {
      return (
        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-card__top">
              <span className="stat-card__label">Total Patients</span>
              <div className="stat-card__icon tone-primary"><i className="bi bi-people"></i></div>
            </div>
            <div className="stat-card__value">{formatNumber(data.total_patients || 0)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__top">
              <span className="stat-card__label">New Patients</span>
              <div className="stat-card__icon tone-success"><i className="bi bi-person-plus"></i></div>
            </div>
            <div className="stat-card__value">{formatNumber(data.new_patients_in_range || 0)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-card__top">
              <span className="stat-card__label">Total Visits</span>
              <div className="stat-card__icon tone-info"><i className="bi bi-clipboard2-pulse"></i></div>
            </div>
            <div className="stat-card__value">{formatNumber(data.total_visits_in_range || 0)}</div>
          </div>
        </div>
      );
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return <div className="text-center text-tertiary py-4">No records found</div>;
      }

      const totalRows = data.length;
      const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
      const currentPage = Math.min(detailPage, totalPages);
      const startIdx = (currentPage - 1) * PAGE_SIZE;
      const pageRows = data.slice(startIdx, startIdx + PAGE_SIZE);
      const handlePageChange = (p) => goToDetailPage(p, totalPages);

      if (data[0]?.date) {
        return (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="cell-numeric">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((item, index) => (
                    <tr key={startIdx + index}>
                      <td>{formatDate(item.date)}</td>
                      <td className="cell-numeric">{formatCurrency(item.total || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationFooter
              totalRows={totalRows}
              currentPage={currentPage}
              totalPages={totalPages}
              startIdx={startIdx}
              onPageChange={handlePageChange}
            />
          </>
        );
      }

      if (data[0]?.visit__doctor__first_name || data[0]?.visit__department__name) {
        const nameKey = Object.keys(data[0]).find((k) => k.includes("name") || k.includes("first_name"));
        return (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th className="cell-numeric">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((item, index) => {
                    const name =
                      item[nameKey] ||
                      item.visit__doctor__first_name ||
                      item.visit__department__name ||
                      "Unknown";
                    return (
                      <tr key={startIdx + index}>
                        <td>{name}</td>
                        <td className="cell-numeric">{formatCurrency(item.total || 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PaginationFooter
              totalRows={totalRows}
              currentPage={currentPage}
              totalPages={totalPages}
              startIdx={startIdx}
              onPageChange={handlePageChange}
            />
          </>
        );
      }

      if (data[0]?.prescription__medicine__name) {
        return (
          <>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th className="cell-numeric">Quantity Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((item, index) => (
                    <tr key={startIdx + index}>
                      <td>{item.prescription__medicine__name || "Unknown"}</td>
                      <td className="cell-numeric">{formatNumber(item.total_qty || 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <PaginationFooter
              totalRows={totalRows}
              currentPage={currentPage}
              totalPages={totalPages}
              startIdx={startIdx}
              onPageChange={handlePageChange}
            />
          </>
        );
      }

      return (
        <>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(data[0]).map((key) => (
                    <th key={key}>{humanizeKey(key)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageRows.map((item, index) => (
                  <tr key={startIdx + index}>
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
          <PaginationFooter
            totalRows={totalRows}
            currentPage={currentPage}
            totalPages={totalPages}
            startIdx={startIdx}
            onPageChange={handlePageChange}
          />
        </>
      );
    }

    return <div className="text-center text-tertiary py-4">Data format not supported</div>;
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
          <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: "160px" }} />
          <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: "160px" }} />
          <button className="btn btn-secondary" onClick={() => { loadReport(); loadOverview(); loadDemographics(); loadTopDiseases(); }}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
        </div>
      </div>

      {/* Overview Charts - 8x4 Grid */}
      <div className="grid-8-4" style={{ marginBottom: "var(--space-6)" }}>
        <div className="grid-8-4__main">
          {/* Revenue Trend - full width, now that Department Revenue lives in the sidebar */}
          <div className="card" style={{ marginBottom: "var(--space-4)" }}>
            <div className="card-header">
              <h5 className="card-title">Revenue Trend</h5>
              <span className="text-2xs text-tertiary">Daily revenue in selected range</span>
            </div>
            <div className="card-body" style={{ height: "260px" }}>
              {overviewLoading ? (
                <div className="text-center text-tertiary py-5">Loading…</div>
              ) : revenueTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueTrend} margin={{ top: 5, right: 15, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" tickFormatter={(d) => formatDate(d, { day: "numeric" })} fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} fontSize={11} tickLine={false} axisLine={false} width={35} />
                    <Tooltip content={<RevenueTooltip />} />
                    <Line type="monotone" dataKey="total" stroke="#4f46e5" strokeWidth={2.5} dot={{ r: 3, fill: "#4f46e5" }} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-tertiary py-4">No revenue data available</div>
              )}
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: "var(--space-4)" }}>
            {/* Top Doctors */}
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Top Doctors by Revenue</h5>
                <span className="text-2xs text-tertiary">Consultation revenue generated</span>
              </div>
              <div className="card-body" style={{ height: "220px" }}>
                {overviewLoading ? (
                  <div className="text-center text-tertiary py-5">Loading…</div>
                ) : doctorRevenue.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={doctorRevenue} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e5e7eb" />
                      <XAxis type="number" tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis type="category" dataKey="name" fontSize={11} tickLine={false} axisLine={false} width={80} />
                      <Tooltip content={<NamedValueTooltip valueFormatter={formatCurrency} />} cursor={{ fill: "rgba(79, 70, 229, 0.06)" }} />
                      <Bar dataKey="total" fill="#4f46e5" radius={[0, 4, 4, 0]} maxBarSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-tertiary py-4">No doctor revenue data available</div>
                )}
              </div>
            </div>

            {/* Top Medicines */}
            <div className="card">
              <div className="card-header">
                <h5 className="card-title">Top Medicines Dispensed</h5>
                <span className="text-2xs text-tertiary">By quantity sold</span>
              </div>
              <div className="card-body" style={{ height: "220px" }}>
                {overviewLoading ? (
                  <div className="text-center text-tertiary py-5">Loading…</div>
                ) : medicineSales.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={medicineSales} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-20} textAnchor="end" height={50} />
                      <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} width={30} />
                      <Tooltip content={<NamedValueTooltip />} cursor={{ fill: "rgba(22, 163, 74, 0.08)" }} />
                      <Bar dataKey="qty" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={36} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-tertiary py-4">No medicine sales data available</div>
                )}
              </div>
            </div>
          </div>

          {/* Patient Activity - Full width */}
          <div className="card">
            <div className="card-header">
              <h5 className="card-title">Patient Activity</h5>
              <span className="text-2xs text-tertiary">Totals for the selected range</span>
            </div>
            <div className="card-body" style={{ height: "200px" }}>
              {overviewLoading ? (
                <div className="text-center text-tertiary py-5">Loading…</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={patientBarData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} width={30} />
                    <Tooltip content={<NamedValueTooltip />} cursor={{ fill: "rgba(8, 145, 178, 0.08)" }} />
                    <Bar dataKey="value" fill="#0891b2" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* Right Side - 4 columns: Statistics + Department Revenue */}
        <div className="grid-4-8__sidebar">
          <div className="card" style={{ marginBottom: "var(--space-4)" }}>
            <div className="card-header">
              <h5 className="card-title"><i className="bi bi-graph-up me-2"></i>Statistics</h5>
            </div>
            <div className="card-body">
              <div className="info-item" style={{ marginBottom: "var(--space-3)" }}>
                <div className="info-item__label">Total Revenue</div>
                <div className="info-item__value" style={{ fontSize: "20px", fontWeight: 700 }}>
                  {formatCurrency(revenueTrend.reduce((sum, d) => sum + d.total, 0))}
                </div>
              </div>
              <div className="info-item" style={{ marginBottom: "var(--space-3)" }}>
                <div className="info-item__label">Total Patients</div>
                <div className="info-item__value" style={{ fontSize: "20px", fontWeight: 700 }}>
                  {formatNumber(patientStats.total_patients || 0)}
                </div>
              </div>
              <div className="info-item" style={{ marginBottom: "var(--space-3)" }}>
                <div className="info-item__label">Top Department</div>
                <div className="info-item__value">
                  {departmentBreakdown.length > 0 ? (
                    <span>{departmentBreakdown.sort((a, b) => b.value - a.value)[0]?.name || "—"}</span>
                  ) : "—"}
                </div>
              </div>
              <div className="info-item" style={{ marginBottom: "var(--space-3)" }}>
                <div className="info-item__label">Top Doctor</div>
                <div className="info-item__value">
                  {doctorRevenue.length > 0 ? (
                    <span>{doctorRevenue[0]?.name || "—"}</span>
                  ) : "—"}
                </div>
              </div>
              <div className="info-item" style={{ marginBottom: "var(--space-3)" }}>
                <div className="info-item__label">Top Medicine</div>
                <div className="info-item__value">
                  {medicineSales.length > 0 ? (
                    <span>{medicineSales[0]?.name || "—"} ({formatNumber(medicineSales[0]?.qty || 0)} units)</span>
                  ) : "—"}
                </div>
              </div>
              <div className="info-item">
                <div className="info-item__label">Period</div>
                <div className="info-item__value text-2xs text-tertiary">
                  {formatDate(dateFrom)} — {formatDate(dateTo)}
                </div>
              </div>
            </div>
          </div>

          {/* Department Revenue - moved here to fill the empty space under Statistics */}
          <div className="card">
            <div className="card-header">
              <h5 className="card-title">Revenue by Department</h5>
              <span className="text-2xs text-tertiary">Share of consultation revenue</span>
            </div>
            <div className="card-body" style={{ height: "260px" }}>
              {overviewLoading ? (
                <div className="text-center text-tertiary py-5">Loading…</div>
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
                <div className="text-center text-tertiary py-4">No department data available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 12-Month Revenue Trend */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <h5 className="card-title" style={{ marginBottom: 0 }}><i className="bi bi-calendar-month me-2"></i>Last 12 Months</h5>
            <span className="text-2xs text-tertiary">Monthly revenue for the selected year — not affected by the date range above</span>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label className="field-label" style={{ marginBottom: 0, fontSize: "12px" }}>Year</label>
            <select className="select" value={trendYear} onChange={(e) => setTrendYear(Number(e.target.value))} style={{ width: "100px" }}>
              {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="card-body" style={{ height: "280px" }}>
          {yearlyTrendLoading ? (
            <div className="text-center text-tertiary py-5">Loading…</div>
          ) : yearlyTrend.some((m) => m.total > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={yearlyTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="month" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)} fontSize={11} tickLine={false} axisLine={false} width={35} />
                <Tooltip content={<YearlyTrendTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="hospital" name="Hospital" stackId="revenue" fill="#4f46e5" maxBarSize={40} />
                <Bar dataKey="otc" name="OTC Pharmacy" stackId="revenue" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line type="monotone" dataKey="total" name="Total" stroke="#dc2626" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-tertiary py-4">No revenue data available for {trendYear}</div>
          )}
        </div>
      </div>

      {/* Patient Demographics - 8x4 Grid */}
      <div className="grid-8-4" style={{ marginBottom: "var(--space-6)" }}>
        <div className="grid-8-4__main">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title"><i className="bi bi-people me-2"></i>Patients by Age Group</h5>
              <span className="text-2xs text-tertiary">Children, teenagers, youth, adults & seniors seen in the selected range</span>
            </div>
            <div className="card-body" style={{ height: "240px" }}>
              {demographicsLoading ? (
                <div className="text-center text-tertiary py-5">Loading…</div>
              ) : demographics.ageData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={demographics.ageData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} width={30} />
                    <Tooltip content={<NamedValueTooltip />} />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                      {demographics.ageData.map((entry, index) => (
                        <Cell key={index} fill={AGE_GROUP_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-tertiary py-4">No patient data available</div>
              )}
            </div>
          </div>
        </div>
        <div className="grid-4-8__sidebar">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title"><i className="bi bi-gender-ambiguous me-2"></i>Patients by Gender</h5>
            </div>
            <div className="card-body" style={{ height: "240px" }}>
              {demographicsLoading ? (
                <div className="text-center text-tertiary py-5">Loading…</div>
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
                <div className="text-center text-tertiary py-4">No gender data available</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Most Reported Diseases - Full width card with table */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title"><i className="bi bi-heart-pulse me-2"></i>Most Reported Diseases — Last 12 Months</h5>
          <span className="text-2xs text-tertiary">
            {diseasePeriod.start && diseasePeriod.end
              ? `${diseasePeriod.start} to ${diseasePeriod.end} — click a row to see monthly detail`
              : "Click a disease to see monthly detail below"}
          </span>
        </div>
        <div className="card-body" style={{ height: "260px" }}>
          {topDiseasesLoading ? (
            <div className="text-center text-tertiary py-5">Loading…</div>
          ) : topDiseases.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDiseases} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} interval={0} angle={-25} textAnchor="end" height={60} />
                <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} width={30} />
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
                    <Cell key={index} fill={selectedDisease?.code === entry.code ? "#4f46e5" : "#dc2626"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-tertiary py-4">No diagnoses recorded in the last 12 months</div>
          )}
        </div>
      </div>

      {/* Disease Detail - 8x4 Grid */}
      {selectedDisease && (
        <div className="grid-8-4" style={{ marginBottom: "var(--space-6)" }}>
          <div className="grid-8-4__main">
            <div className="card">
              <div className="card-header">
                <div className="flex items-center gap-3 flex-wrap">
                  <h5 className="card-title" style={{ marginBottom: 0 }}><i className="bi bi-clipboard-data me-2"></i>Disease Detail</h5>
                  <span className="text-2xs text-tertiary">{selectedDisease.name} — {MONTH_NAMES[drillMonth - 1]} {drillYear}</span>
                </div>
                <div className="flex gap-2">
                  <div className="field" style={{ marginBottom: 0 }}>
                    <select className="select" value={drillMonth} onChange={(e) => setDrillMonth(Number(e.target.value))} style={{ width: "120px" }}>
                      {MONTH_NAMES.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}
                    </select>
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <select className="select" value={drillYear} onChange={(e) => setDrillYear(Number(e.target.value))} style={{ width: "90px" }}>
                      {availableYears.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="card-body" style={{ height: "240px" }}>
                {drillLoading ? (
                  <div className="text-center text-tertiary py-5">Loading…</div>
                ) : drillResult?.charts?.age_groups?.data?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={drillResult.charts.age_groups.data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} width={30} />
                      <Tooltip content={<NamedValueTooltip />} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
                        {drillResult.charts.age_groups.data.map((entry, index) => (
                          <Cell key={index} fill={AGE_GROUP_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center text-tertiary py-4">No cases recorded for this month</div>
                )}
              </div>
            </div>
          </div>
          <div className="grid-4-8__sidebar">
            <div className="card">
              <div className="card-header">
                <h5 className="card-title"><i className="bi bi-gender-ambiguous me-2"></i>Cases by Gender</h5>
              </div>
              <div className="card-body" style={{ height: "240px" }}>
                {drillLoading ? (
                  <div className="text-center text-tertiary py-5">Loading…</div>
                ) : drillResult?.charts?.gender?.data?.length > 0 ? (
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
                  <div className="text-center text-tertiary py-4">No cases recorded for this month</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Detail Report + Export */}
      <div className="card" style={{ marginBottom: "var(--space-4)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <h5 className="card-title" style={{ marginBottom: 0 }}><i className="bi bi-table me-2"></i>Detail Report</h5>
            <div className="field" style={{ marginBottom: 0, flex: 1, minWidth: "200px" }}>
              <select className="select" value={reportType} onChange={(e) => setReportType(e.target.value)}>
                {reportTypes.map((rt) => <option key={rt.value} value={rt.value}>{rt.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={handleExportExcel}>
              <i className="bi bi-file-earmark-excel me-1"></i> Excel
            </button>
            <button className="btn btn-secondary btn-sm" onClick={handleExportPDF}>
              <i className="bi bi-file-earmark-pdf me-1"></i> PDF
            </button>
          </div>
        </div>
        <div className="card-body p-0">
          {reportData && (
            <div className="card-body" style={{ padding: "var(--space-2) var(--space-4)", borderBottom: "1px solid var(--border-color)" }}>
              <span className="text-2xs text-tertiary">{reportData.type?.replace(/_/g, " ").toUpperCase()}</span>
              <span className="text-2xs text-tertiary ms-3">{reportData.date_from} — {reportData.date_to}</span>
            </div>
          )}
          {loading ? <LoadingSpinner /> : renderReportContent()}
        </div>
      </div>
    </>
  );
}