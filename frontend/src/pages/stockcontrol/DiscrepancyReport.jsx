import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTransferDiscrepancies, getVariancePendingCounts } from "../../services/api";

export default function DiscrepancyReport() {
  const [transferDiscrepancies, setTransferDiscrepancies] = useState([]);
  const [countVariances, setCountVariances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [t, c] = await Promise.all([getTransferDiscrepancies(), getVariancePendingCounts()]);
      setTransferDiscrepancies(t);
      setCountVariances(c);
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
        <span className="loading-screen__label">Loading discrepancy report...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Stock Control</div>
          <h1 className="page-title">Stock Discrepancy Report</h1>
          <p className="page-subtitle">Track transfer mismatches and count variances</p>
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

      <div className="card" style={{ marginBottom: "var(--space-4)" }}>
        <div className="card-body">
          <div className="text-sm text-muted">
            <i className="bi bi-info-circle me-1"></i>
            Every flagged transfer mismatch and every stock count variance, system-wide. Use this as your primary theft/loss early-warning view.
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-exclamation-triangle me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>
              Transfer Discrepancies ({transferDiscrepancies.length})
            </h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {transferDiscrepancies.length} discrepancy{transferDiscrepancies.length !== 1 ? "ies" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {transferDiscrepancies.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <h3 className="empty-state__title">No transfer discrepancies</h3>
              <p className="empty-state__desc">All transfers have been reconciled successfully.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Transfer #</th>
                    <th>From</th>
                    <th>To</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {transferDiscrepancies.map((t) => (
                    <tr key={t.id}>
                      <td className="cell-mono">{t.transfer_number}</td>
                      <td>{t.from_location_name}</td>
                      <td>{t.to_location_name}</td>
                      <td className="cell-actions">
                        <Link to={`/stockcontrol/transfers/${t.id}`} className="btn btn-danger btn-sm">
                          <i className="bi bi-exclamation-triangle me-1"></i> Investigate
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {transferDiscrepancies.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {transferDiscrepancies.length} transfer discrepancy{transferDiscrepancies.length !== 1 ? "ies" : ""}
            </span>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clipboard-check me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>
              Stock Count Variances Pending Approval ({countVariances.length})
            </h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {countVariances.length} variance{countVariances.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {countVariances.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <h3 className="empty-state__title">No pending count variances</h3>
              <p className="empty-state__desc">All stock counts have been approved with no variances.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Count #</th>
                    <th>Location</th>
                    <th>Lines with Variance</th>
                  </tr>
                </thead>
                <tbody>
                  {countVariances.map((c) => (
                    <tr key={c.id}>
                      <td className="cell-mono">{c.count_number}</td>
                      <td>{c.location_name}</td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {c.lines.filter((l) => l.variance !== 0).map((l, idx) => (
                            <span 
                              key={idx} 
                              className={`badge ${l.variance > 0 ? "badge-danger" : "badge-warning"}`}
                            >
                              <span className="badge-dot"></span>
                              {l.medicine_name}: {l.variance > 0 ? "+" : ""}{l.variance}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {countVariances.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {countVariances.length} count variance{countVariances.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Positive Variance (Loss)
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Negative Variance (Gain)
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}