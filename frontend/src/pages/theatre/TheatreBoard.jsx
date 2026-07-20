import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOperatingTheatres, getUpcomingBookings, getInProgressSurgeries } from "../../services/api";

export default function TheatreBoard() {
  const [theatres, setTheatres] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [t, u, s] = await Promise.all([
        getOperatingTheatres(), getUpcomingBookings(), getInProgressSurgeries(),
      ]);
      setTheatres(t.results ?? t);
      setUpcoming(u);
      setInProgress(s);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "AVAILABLE": "badge-success",
      "IN_USE": "badge-danger",
      "CLEANING": "badge-warning",
      "OUT_OF_SERVICE": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      "EMERGENCY": "badge-danger",
      "URGENT": "badge-warning",
      "ELECTIVE": "badge-info",
      "ROUTINE": "badge-success",
    };
    return priorityMap[priority] || "badge-neutral";
  };

  const getBookingStatusBadge = (status) => {
    const statusMap = {
      "REQUESTED": "badge-warning",
      "CONFIRMED": "badge-primary",
      "IN_PROGRESS": "badge-info",
      "COMPLETED": "badge-success",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading && theatres.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading theatre board...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Theatre Management</div>
          <h1 className="page-title">Theatre Board</h1>
          <p className="page-subtitle">Real-time operating theatre status</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
          <Link to="/theatre/book" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i> Book Surgery
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
            <i className="bi bi-building me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Theatres</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {theatres.length} theatre{theatres.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {theatres.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-building"></i>
              </div>
              <h3 className="empty-state__title">No theatres configured</h3>
              <p className="empty-state__desc">Operating theatres need to be set up.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Theatre</th>
                    <th className="cell-numeric">Hourly Rate</th>
                    <th>Status</th>
                    <th>Active Surgery</th>
                  </tr>
                </thead>
                <tbody>
                  {theatres.map((t) => (
                    <tr key={t.id}>
                      <td className="cell-primary">{t.theatre_number}</td>
                      <td className="cell-numeric">{formatCurrency(t.hourly_rate)}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(t.status)}`}>
                          <span className="badge-dot"></span>
                          {t.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        {t.active_surgery ? (
                          <Link to={`/theatre/${t.active_surgery.surgery_id}`} className="btn btn-secondary btn-sm">
                            <i className="bi bi-eye me-1"></i>
                            {t.active_surgery.patient_name} - {t.active_surgery.procedure}
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
        {theatres.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {theatres.length} theatre{theatres.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Available
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                In Use
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Cleaning
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>In-Progress Surgeries</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {inProgress.length} surgery{inProgress.length !== 1 ? "ies" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {inProgress.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No surgeries in progress</h3>
              <p className="empty-state__desc">All theatres are currently idle.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Procedure</th>
                    <th>Theatre</th>
                    <th className="cell-numeric">Duration</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {inProgress.map((s) => (
                    <tr key={s.id}>
                      <td className="cell-primary">{s.patient_name}</td>
                      <td>{s.procedure_name}</td>
                      <td>{s.theatre_number}</td>
                      <td className="cell-numeric">{s.duration_hours} hrs</td>
                      <td className="cell-actions">
                        <Link to={`/theatre/${s.id}`} className="btn btn-secondary btn-sm">
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
        {inProgress.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {inProgress.length} surgery{inProgress.length !== 1 ? "ies" : ""} in progress
            </span>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-calendar-check me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Upcoming Bookings</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {upcoming.length} booking{upcoming.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {upcoming.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-calendar-check"></i>
              </div>
              <h3 className="empty-state__title">No upcoming bookings</h3>
              <p className="empty-state__desc">Schedule a surgery booking to get started.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Booking #</th>
                    <th>Patient</th>
                    <th>Procedure</th>
                    <th>Priority</th>
                    <th>Requested Date</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((b) => (
                    <tr key={b.id}>
                      <td className="cell-mono">{b.booking_number}</td>
                      <td className="cell-primary">{b.patient_name}</td>
                      <td>{b.procedure_name}</td>
                      <td>
                        <span className={`badge ${getPriorityBadge(b.priority)}`}>
                          <span className="badge-dot"></span>
                          {b.priority}
                        </span>
                      </td>
                      <td>{new Date(b.requested_date).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${getBookingStatusBadge(b.status)}`}>
                          <span className="badge-dot"></span>
                          {b.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <Link to={`/theatre/booking/${b.id}`} className="btn btn-secondary btn-sm">
                          <i className="bi bi-eye me-1"></i> Details
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {upcoming.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {upcoming.length} upcoming booking{upcoming.length !== 1 ? "s" : ""}
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
                Elective
              </span>
              <span className="badge badge-success">
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