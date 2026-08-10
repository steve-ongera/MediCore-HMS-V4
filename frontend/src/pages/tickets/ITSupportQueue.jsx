import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTickets, assignTicket } from "../../services/api";

export default function ITSupportQueue() {
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [statusFilter, priorityFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 200 };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const data = await getTickets(params);
      setTickets(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAssign = async (id) => {
    try { await assignTicket(id); load(); } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "OPEN": "badge-warning",
      "ASSIGNED": "badge-primary",
      "IN_PROGRESS": "badge-info",
      "RESOLVED": "badge-success",
      "CLOSED": "badge-neutral",
      "REOPENED": "badge-danger",
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

  if (loading && tickets.length === 0) {
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
          <h1 className="page-title">IT Support Queue</h1>
          <p className="page-subtitle">Manage all support tickets</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise  me-1"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle  me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-funnel  me-1"></i>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>Status</label>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "150px" }}
              >
                <option value="">All</option>
                <option value="OPEN">Open</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="REOPENED">Reopened</option>
              </select>
            </div>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>Priority</label>
              <select
                className="select"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                style={{ width: "150px" }}
              >
                <option value="">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
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
              <h3 className="empty-state__title">No tickets found</h3>
              <p className="empty-state__desc">
                {statusFilter || priorityFilter 
                  ? "No tickets match your filters." 
                  : "The support queue is currently empty."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticket #</th>
                    <th>Raised By</th>
                    <th>Category</th>
                    <th>Priority</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((t) => (
                    <tr key={t.id} style={t.priority === "CRITICAL" ? { background: "var(--danger-soft)" } : {}}>
                      <td className="cell-mono">{t.ticket_number}</td>
                      <td>
                        {t.raised_by_name}
                        <div className="text-2xs text-tertiary">{t.raised_by_role}</div>
                      </td>
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
                      <td className="cell-primary">{t.subject}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(t.status)}`}>
                          <span className="badge-dot"></span>
                          {t.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{t.assigned_to_name || "—"}</td>
                      <td className="cell-actions">
                        <div className="flex gap-1 justify-end">
                          {t.status === "OPEN" && (
                            <button className="btn btn-primary btn-sm" onClick={() => handleAssign(t.id)}>
                              <i className="bi bi-person-check  me-1"></i> Assign
                            </button>
                          )}
                          <Link to={`/tickets/${t.id}`} className="btn btn-secondary btn-sm">
                            <i className="bi bi-eye  me-1"></i> View
                          </Link>
                        </div>
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
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Reopened
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}