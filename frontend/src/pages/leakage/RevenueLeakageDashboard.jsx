import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getLeakageDashboard, scanForLeaksNow } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";

const SOURCE_LABELS = {
  LAB: "Laboratory", RADIOLOGY: "Radiology", PHARMACY_DISPENSE: "Pharmacy",
  CONSULTATION_PROCEDURE: "Consultation Procedures", THEATRE: "Theatre",
  DENTAL: "Dental", EYE_CLINIC: "Eye Clinic", MCH_DELIVERY: "MCH Delivery",
  MCH_IMMUNIZATION: "Immunization", DIALYSIS: "Dialysis", ICU_PROCEDURE: "ICU",
  BLOOD_BANK: "Blood Bank", AMBULANCE: "Ambulance", MORTUARY: "Mortuary",
};

export default function RevenueLeakageDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await getLeakageDashboard();
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScanNow = async () => {
    setScanning(true);
    setError("");
    try {
      await scanForLeaksNow();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading revenue leakage dashboard...</span>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Revenue Protection</div>
          <h1 className="page-title">Revenue Leakage Detection</h1>
          <p className="page-subtitle">Automatically catches services performed that never made it onto a bill</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
          <button className="btn btn-primary" onClick={handleScanNow} disabled={scanning}>
            {scanning ? (
              <>
                <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                Scanning...
              </>
            ) : (
              <>
                <i className="bi bi-search me-2"></i> Scan Now
              </>
            )}
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

      {data.last_scan && (
        <div className="card" style={{ marginBottom: "var(--space-4)" }}>
          <div className="card-body">
            <div className="text-sm text-muted">
              <i className="bi bi-clock-history me-1"></i>
              Last scan: {new Date(data.last_scan.started_at).toLocaleString()} — found <strong>{data.last_scan.new_leaks_found}</strong> new leak(s)
            </div>
          </div>
        </div>
      )}

      {/* Today's Leakage Stats */}
      <div className="stat-grid" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card" style={{ borderColor: "var(--danger)" }}>
          <div className="stat-card__top">
            <span className="stat-card__label">Total Lost Today</span>
            <div className="stat-card__icon tone-danger">
              <i className="bi bi-exclamation-triangle"></i>
            </div>
          </div>
          <div className="stat-card__value" style={{ color: "var(--danger-strong)" }}>
            {formatCurrency(data.today_total_leaked)}
          </div>
          <div className="stat-card__footnote">{data.today_leak_count} unbilled event(s) today</div>
        </div>

        <div className="stat-card" style={{ borderColor: "var(--warning)" }}>
          <div className="stat-card__top">
            <span className="stat-card__label">All-Time Open Leakage</span>
            <div className="stat-card__icon tone-warning">
              <i className="bi bi-clock-history"></i>
            </div>
          </div>
          <div className="stat-card__value" style={{ color: "var(--warning-strong)" }}>
            {formatCurrency(data.all_time_open_total)}
          </div>
          <div className="stat-card__footnote">{data.all_time_open_count} unresolved leak(s)</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Leak Count Today</span>
            <div className="stat-card__icon tone-info">
              <i className="bi bi-list-ul"></i>
            </div>
          </div>
          <div className="stat-card__value">{data.today_leak_count}</div>
          <div className="stat-card__footnote">Unbilled events</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Status</span>
            <div className="stat-card__icon tone-success">
              <i className={`bi ${data.today_leak_count === 0 ? "bi-check-circle" : "bi-exclamation-circle"}`}></i>
            </div>
          </div>
          <div className="stat-card__value" style={{ fontSize: "20px", fontWeight: 600 }}>
            {data.today_leak_count === 0 ? "All Clear" : "Leaks Found"}
          </div>
          <div className="stat-card__footnote">{data.today_leak_count === 0 ? "No leakage detected today 🎉" : "Action required"}</div>
        </div>
      </div>

      {/* Missing Bills by Source */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-building me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Missing Bills by Source (Today)</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {data.by_source_today.length} source{data.by_source_today.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {data.by_source_today.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <h3 className="empty-state__title">No leakage detected today</h3>
              <p className="empty-state__desc">All services have been properly billed. 🎉</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th className="cell-numeric">Count</th>
                    <th className="cell-numeric">Amount Lost</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_source_today.map((s) => (
                    <tr key={s.name}>
                      <td className="cell-primary">{SOURCE_LABELS[s.name] || s.name}</td>
                      <td className="cell-numeric">{s.count}</td>
                      <td className="cell-numeric" style={{ color: "var(--danger-strong)", fontWeight: 600 }}>
                        {formatCurrency(s.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {data.by_source_today.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {data.by_source_today.length} source{data.by_source_today.length !== 1 ? "s" : ""} with leakage
            </span>
          </div>
        )}
      </div>

      {/* Last 7 Days Trend */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-graph-up me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Last 7 Days Trend</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {data.trend_7_days.length} day{data.trend_7_days.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {data.trend_7_days.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-graph-up"></i>
              </div>
              <h3 className="empty-state__title">No trend data available</h3>
              <p className="empty-state__desc">Data will appear as scans are performed.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="cell-numeric">Amount Leaked</th>
                  </tr>
                </thead>
                <tbody>
                  {data.trend_7_days.map((t) => (
                    <tr key={t.name}>
                      <td>{t.name}</td>
                      <td className="cell-numeric" style={{ color: Number(t.value) > 0 ? "var(--danger-strong)" : "var(--success-strong)", fontWeight: 600 }}>
                        {formatCurrency(t.value)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {data.trend_7_days.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing 7-day leakage trend
            </span>
          </div>
        )}
      </div>

      {/* View All Leaks */}
      <div className="card">
        <div className="card-body text-center">
          <Link to="/leakage/records" className="btn btn-primary">
            <i className="bi bi-list-ul me-2"></i>
            View & Resolve Individual Leaks
          </Link>
        </div>
      </div>
    </>
  );
}