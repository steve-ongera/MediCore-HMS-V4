import { useEffect, useState } from "react";
import { getRefunds, approveRefund, rejectRefund, getPayments } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";

export default function RefundsManagement() {
  const [refunds, setRefunds] = useState([]);
  const [statusFilter, setStatusFilter] = useState("REQUESTED");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getRefunds(params);
      setRefunds(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!window.confirm("Approve and process this refund immediately?")) return;
    setSubmitting(true);
    try { 
      await approveRefund(id); 
      load(); 
    } catch (err) { 
      setError(err.message); 
    } finally {
      setSubmitting(false);
    }
  };

  const submitReject = async (id) => {
    setSubmitting(true);
    try {
      await rejectRefund(id, { rejection_reason: rejectionReason });
      setRejectingId(null);
      setRejectionReason("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "REQUESTED": "badge-warning",
      "APPROVED": "badge-primary",
      "PROCESSED": "badge-success",
      "REJECTED": "badge-danger",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading && refunds.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading refunds...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1 className="page-title">Refunds</h1>
          <p className="page-subtitle">Manage refund requests</p>
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
                <option value="REQUESTED">Requested</option>
                <option value="APPROVED">Approved</option>
                <option value="PROCESSED">Processed</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {refunds.length} refund{refunds.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {refunds.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-arrow-counterclockwise"></i>
              </div>
              <h3 className="empty-state__title">No refunds found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No refunds with status "${statusFilter}" found.` 
                  : "Refund requests will appear here."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Refund #</th>
                    <th>Patient</th>
                    <th>Receipt #</th>
                    <th className="cell-numeric">Amount</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {refunds.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-mono">{r.refund_number}</td>
                      <td className="cell-primary">{r.patient_name}</td>
                      <td className="cell-mono">{r.receipt_number}</td>
                      <td className="cell-numeric">{formatCurrency(r.amount)}</td>
                      <td>{r.reason}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(r.status)}`}>
                          <span className="badge-dot"></span>
                          {r.status}
                        </span>
                      </td>
                      <td className="cell-actions">
                        {r.status === "REQUESTED" && (
                          <div className="flex gap-1 justify-end" style={{ flexWrap: "wrap" }}>
                            <button 
                              className="btn btn-success btn-sm" 
                              onClick={() => handleApprove(r.id)}
                              disabled={submitting}
                            >
                              <i className="bi bi-check-circle me-1"></i> Approve
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
                                <button 
                                  className="btn btn-danger btn-sm" 
                                  onClick={() => submitReject(r.id)}
                                  disabled={submitting}
                                >
                                  <i className="bi bi-check me-1"></i> Confirm
                                </button>
                                <button 
                                  className="btn btn-secondary btn-sm" 
                                  onClick={() => setRejectingId(null)}
                                >
                                  <i className="bi bi-x"></i>
                                </button>
                              </>
                            ) : (
                              <button 
                                className="btn btn-danger btn-sm" 
                                onClick={() => setRejectingId(r.id)}
                              >
                                <i className="bi bi-x-circle me-1"></i> Reject
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
        {refunds.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {refunds.length} refund{refunds.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Requested
              </span>
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                Approved
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Processed
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Rejected
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}