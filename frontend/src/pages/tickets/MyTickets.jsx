import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyTickets } from "../../services/api";

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMyTickets();
      setTickets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
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

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      "CRITICAL": "badge-danger",
      "HIGH": "badge-warning",
      "MEDIUM": "badge-primary",
      "LOW": "badge-info",
    };
    return priorityMap[priority] || "badge-neutral";
  };

  const getCategoryBadge = (category) => {
    const categoryMap = {
      "HARDWARE": "badge-primary",
      "NETWORK": "badge-info",
      "SOFTWARE": "badge-success",
      "CCTV": "badge-warning",
      "TELEPHONY": "badge-secondary",
      "ACCOUNT_ACCESS": "badge-danger",
      "OTHER": "badge-neutral",
    };
    return categoryMap[category] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading tickets...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">IT Support</div>
          <h1 className="page-title">My Tickets</h1>
          <p className="page-subtitle">View your support tickets</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
          <Link to="/tickets/raise" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i> Raise Ticket
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

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-ticket me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Your Tickets</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {tickets.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-ticket"></i>
              </div>
              <h3 className="empty-state__title">No tickets raised</h3>
              <p className="empty-state__desc">You haven't raised any support tickets yet.</p>
              <Link to="/tickets/raise" className="btn btn-primary">
                <i className="bi bi-plus-circle me-2"></i> Raise Ticket
              </Link>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Subject</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id}>
                      <td className="cell-mono">{t.ticket_number}</td>
                      <td className="cell-primary">{t.subject}</td>
                      <td>
                        <span className={`badge ${getCategoryBadge(t.category)}`}>
                          <span className="badge-dot"></span>
                          {t.category}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getPriorityBadge(t.priority)}`}>
                          <span className="badge-dot"></span>
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(t.status)}`}>
                          <span className="badge-dot"></span>
                          {t.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <Link to={`/tickets/${t.id}`} className="btn btn-secondary btn-sm">
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
        {tickets.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {tickets.length} ticket{tickets.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Open
              </span>
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                Assigned
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                In Progress
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Resolved
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}