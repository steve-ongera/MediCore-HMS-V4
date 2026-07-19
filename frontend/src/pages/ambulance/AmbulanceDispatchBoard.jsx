import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getActiveDispatches, getAmbulances } from "../../services/api";

export default function AmbulanceDispatchBoard() {
  const [dispatches, setDispatches] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [dispatchData, ambulanceData] = await Promise.all([
        getActiveDispatches(),
        getAmbulances(),
      ]);
      setDispatches(dispatchData);
      setAmbulances(ambulanceData.results ?? ambulanceData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "AVAILABLE": "badge-success",
      "ON_CALL": "badge-primary",
      "UNDER_MAINTENANCE": "badge-warning",
      "OUT_OF_SERVICE": "badge-danger",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getDispatchStatusBadge = (status) => {
    const statusMap = {
      "REQUESTED": "badge-warning",
      "ASSIGNED": "badge-primary",
      "EN_ROUTE": "badge-info",
      "ON_SCENE": "badge-warning",
      "EN_ROUTE_TO_FACILITY": "badge-info",
      "ARRIVED": "badge-success",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading dispatch board...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Ambulance Services</div>
          <h1 className="page-title">Ambulance Dispatch Board</h1>
          <p className="page-subtitle">Real-time ambulance dispatch and fleet status</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
          <Link to="/ambulance/request" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i> Request Dispatch
          </Link>
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
            <i className="bi bi-truck me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Fleet Status</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {ambulances.length} ambulance{ambulances.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {ambulances.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-truck"></i>
              </div>
              <h3 className="empty-state__title">No ambulances registered</h3>
              <p className="empty-state__desc">Fleet management needs to register ambulances.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Registration</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Active Dispatch</th>
                  </tr>
                </thead>
                <tbody>
                  {ambulances.map((a) => (
                    <tr key={a.id}>
                      <td className="cell-mono">{a.registration_number}</td>
                      <td>{a.ambulance_type}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(a.status)}`}>
                          <span className="badge-dot"></span>
                          {a.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{a.current_location || "—"}</td>
                      <td>
                        {a.active_dispatch ? (
                          <Link to={`/ambulance/${a.active_dispatch.dispatch_id}`} className="btn btn-secondary btn-sm">
                            <i className="bi bi-eye me-1"></i>
                            {a.active_dispatch.dispatch_number} - {a.active_dispatch.patient_name}
                          </Link>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {ambulances.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {ambulances.length} ambulance{ambulances.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Available
              </span>
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                On Call
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Maintenance
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Out of Service
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Active Dispatches</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {dispatches.length} dispatch{dispatches.length !== 1 ? "es" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {dispatches.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No active dispatches</h3>
              <p className="empty-state__desc">All ambulances are available. Request a dispatch to get started.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Dispatch #</th>
                    <th>Patient</th>
                    <th>Ambulance</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Pickup</th>
                    <th>Destination</th>
                    <th>Requested</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {dispatches.map((d) => (
                    <tr key={d.id}>
                      <td className="cell-mono">{d.dispatch_number}</td>
                      <td className="cell-primary">{d.patient_display_name}</td>
                      <td>{d.ambulance_registration || "Unassigned"}</td>
                      <td>{d.dispatch_type}</td>
                      <td>
                        <span className={`badge ${getDispatchStatusBadge(d.status)}`}>
                          <span className="badge-dot"></span>
                          {d.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{d.pickup_location}</td>
                      <td>{d.destination}</td>
                      <td>{new Date(d.requested_at).toLocaleString()}</td>
                      <td className="cell-actions">
                        <Link to={`/ambulance/${d.id}`} className="btn btn-secondary btn-sm">
                          <i className="bi bi-eye me-1"></i> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {dispatches.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {dispatches.length} active dispatch{dispatches.length !== 1 ? "es" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Requested
              </span>
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                Assigned
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                En Route
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Arrived
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}