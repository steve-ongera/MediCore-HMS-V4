import { useEffect, useState } from "react";
import { getServiceRequests } from "../../services/api";

export default function DowntimeReport() {
  const [requests, setRequests] = useState([]);
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getServiceRequests({ page_size: 300 });
      const all = data.results ?? data;
      const filtered = all.filter((r) => {
        const reported = new Date(r.reported_at);
        return reported >= new Date(dateFrom) && reported <= new Date(dateTo) && r.caused_downtime;
      });
      setRequests(filtered);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalDowntime = requests.reduce((sum, r) => sum + Number(r.downtime_hours || 0), 0);
  const byEquipment = {};
  requests.forEach((r) => {
    const key = `${r.equipment_tag} - ${r.equipment_name}`;
    byEquipment[key] = (byEquipment[key] || 0) + Number(r.downtime_hours || 0);
  });

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      "EMERGENCY": "badge-danger",
      "URGENT": "badge-warning",
      "ROUTINE": "badge-info",
    };
    return priorityMap[priority] || "badge-neutral";
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "OPEN": "badge-warning",
      "ASSIGNED": "badge-primary",
      "IN_PROGRESS": "badge-info",
      "RESOLVED": "badge-success",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading && requests.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading downtime report...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Biomedical Engineering</div>
          <h1 className="page-title">Equipment Downtime Report</h1>
          <p className="page-subtitle">Track equipment downtime incidents</p>
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
          </div>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Total Downtime</span>
            <div className="stat-card__icon tone-danger">
              <i className="bi bi-clock"></i>
            </div>
          </div>
          <div className="stat-card__value">{totalDowntime.toFixed(1)} hrs</div>
          <div className="stat-card__footnote">Across {requests.length} incident{requests.length !== 1 ? "s" : ""}</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Incidents</span>
            <div className="stat-card__icon tone-warning">
              <i className="bi bi-exclamation-triangle"></i>
            </div>
          </div>
          <div className="stat-card__value">{requests.length}</div>
          <div className="stat-card__footnote">Reported incidents</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Avg Downtime</span>
            <div className="stat-card__icon tone-info">
              <i className="bi bi-graph-up"></i>
            </div>
          </div>
          <div className="stat-card__value">
            {requests.length > 0 ? (totalDowntime / requests.length).toFixed(1) : "0"} hrs
          </div>
          <div className="stat-card__footnote">Per incident</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Worst Equipment</span>
            <div className="stat-card__icon tone-primary">
              <i className="bi bi-trophy"></i>
            </div>
          </div>
          <div className="stat-card__value" style={{ fontSize: "16px", fontWeight: 600 }}>
            {Object.entries(byEquipment).length > 0 
              ? Object.entries(byEquipment).sort((a, b) => b[1] - a[1])[0][0].split(" - ")[1] || "—"
              : "—"
            }
          </div>
          <div className="stat-card__footnote">
            {Object.entries(byEquipment).length > 0 
              ? `${Object.entries(byEquipment).sort((a, b) => b[1] - a[1])[0][1].toFixed(1)} hrs downtime`
              : "No data"
            }
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Downtime by Equipment</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {Object.keys(byEquipment).length} equipment{Object.keys(byEquipment).length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {Object.keys(byEquipment).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock"></i>
              </div>
              <h3 className="empty-state__title">No downtime data</h3>
              <p className="empty-state__desc">No downtime incidents recorded in this date range.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th className="cell-numeric">Total Downtime (hrs)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(byEquipment)
                    .sort((a, b) => b[1] - a[1])
                    .map(([name, hours]) => (
                      <tr key={name}>
                        <td className="cell-primary">{name}</td>
                        <td className="cell-numeric">{hours.toFixed(1)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Incident Detail</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {requests.length} incident{requests.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock"></i>
              </div>
              <h3 className="empty-state__title">No incidents found</h3>
              <p className="empty-state__desc">No downtime incidents in this date range.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Request #</th>
                    <th>Equipment</th>
                    <th>Priority</th>
                    <th className="cell-numeric">Downtime (hrs)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-mono">{r.request_number}</td>
                      <td className="cell-primary">{r.equipment_name}</td>
                      <td>
                        <span className={`badge ${getPriorityBadge(r.priority)}`}>
                          <span className="badge-dot"></span>
                          {r.priority}
                        </span>
                      </td>
                      <td className="cell-numeric">{r.downtime_hours}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(r.status)}`}>
                          <span className="badge-dot"></span>
                          {r.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {requests.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {requests.length} incident{requests.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Emergency
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Urgent
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                Routine
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}