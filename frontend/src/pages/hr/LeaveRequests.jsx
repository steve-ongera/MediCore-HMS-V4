import { useEffect, useState } from "react";
import { getLeaveRequests, approveLeaveRequest, rejectLeaveRequest } from "../../services/api";

export default function LeaveRequests() {
  const [requests, setRequests] = useState([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getLeaveRequests(params);
      setRequests(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleApprove = async (id) => {
    try {
      await approveLeaveRequest(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const submitRejection = async (id) => {
    try {
      await rejectLeaveRequest(id, { rejection_reason: rejectionReason });
      setRejectingId(null);
      setRejectionReason("");
      load();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "PENDING": "badge-warning",
      "APPROVED": "badge-success",
      "REJECTED": "badge-danger",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading && requests.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading leave requests...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Human Resources</div>
          <h1 className="page-title">Leave Requests</h1>
          <p className="page-subtitle">Manage employee leave requests</p>
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

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-funnel me-1"></i>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>Filter by Status</label>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "180px" }}
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {requests.length} request{requests.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-calendar-check"></i>
              </div>
              <h3 className="empty-state__title">No leave requests found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No requests with status "${statusFilter}" found.` 
                  : "Leave requests will appear here once submitted."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee</th>
                    <th>Leave Type</th>
                    <th>Start</th>
                    <th>End</th>
                    <th className="cell-numeric">Days</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-primary">{r.employee_name}</td>
                      <td>{r.leave_type_name}</td>
                      <td>{r.start_date}</td>
                      <td>{r.end_date}</td>
                      <td className="cell-numeric">{r.days_requested}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(r.status)}`}>
                          <span className="badge-dot"></span>
                          {r.status}
                        </span>
                      </td>
                      <td>{r.reason || "—"}</td>
                      <td className="cell-actions">
                        {r.status === "PENDING" && (
                          <div className="flex gap-1 justify-end">
                            <button className="btn btn-success btn-sm" onClick={() => handleApprove(r.id)}>
                              <i className="bi bi-check me-1"></i> Approve
                            </button>
                            {rejectingId === r.id ? (
                              <>
                                <input
                                  type="text"
                                  className="input"
                                  placeholder="Reason"
                                  value={rejectionReason}
                                  onChange={(e) => setRejectionReason(e.target.value)}
                                  style={{ width: "120px" }}
                                />
                                <button className="btn btn-danger btn-sm" onClick={() => submitRejection(r.id)}>
                                  <i className="bi bi-check me-1"></i> Confirm
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => setRejectingId(null)}>
                                  <i className="bi bi-x"></i>
                                </button>
                              </>
                            ) : (
                              <button className="btn btn-danger btn-sm" onClick={() => setRejectingId(r.id)}>
                                <i className="bi bi-x me-1"></i> Reject
                              </button>
                            )}
                          </div>
                        )}
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
                Showing {requests.length} request{requests.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Pending
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Approved
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Rejected
              </span>
              <span className="badge badge-neutral">
                <span className="badge-dot"></span>
                Cancelled
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}