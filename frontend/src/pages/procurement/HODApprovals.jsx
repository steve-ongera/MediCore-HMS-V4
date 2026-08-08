import { useEffect, useState } from "react";
import { getPendingMyApprovalRequisitions, hodApproveRequisition, hodRejectRequisition, getMyDepartmentBudgets } from "../../services/api";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatCurrency } from "../../utils/formatters";

export default function HODApprovals() {
  const { user, hasRole } = useAuth();
  const isSuperAdmin = hasRole("SUPER_ADMIN");

  const [requisitions, setRequisitions] = useState([]);
  const [isHOD, setIsHOD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPendingMyApprovalRequisitions();
      setRequisitions(data);

      if (isSuperAdmin) {
        setIsHOD(true);
      } else if (data.length > 0) {
        setIsHOD(true);
      } else {
        setIsHOD(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    setSubmitting(true);
    setError("");
    try {
      await hodApproveRequisition(id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitReject = async (id) => {
    setSubmitting(true);
    setError("");
    try {
      await hodRejectRequisition(id, { rejection_reason: rejectionReason });
      setRejectingId(null);
      setRejectionReason("");
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getCategoryBadge = (category) => {
    const categoryMap = {
      "MEDICINE": "badge-primary",
      "IT_EQUIPMENT": "badge-info",
      "ASSET": "badge-warning",
      "CONSTRUCTION": "badge-danger",
      "TENDER": "badge-secondary",
      "SERVICE": "badge-success",
      "CONSUMABLE": "badge-info",
      "OTHER": "badge-neutral",
    };
    return categoryMap[category] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading requisitions...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Procurement</div>
          <h1 className="page-title">Requisitions Awaiting My Approval</h1>
          <p className="page-subtitle">Review and approve requisitions from your department</p>
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
            <i className="bi bi-clipboard-check me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Pending Approval</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {requisitions.length} requisition{requisitions.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body">
          <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            <i className="bi bi-info-circle me-1"></i>
            As Head of Department, requisitions raised by your team wait here for your sign-off before going to Procurement.
          </div>

          {requisitions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <h3 className="empty-state__title">Nothing awaiting your approval</h3>
              <p className="empty-state__desc">
                If you believe this is incorrect, confirm with IT/HR that you are correctly set as the Head of Department 
                for your department — only the designated HOD (or Super Admin) can approve requisitions.
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Requisition #</th>
                    <th>Category</th>
                    <th>Requested By</th>
                    <th className="cell-numeric">Estimated Total</th>
                    <th>Justification</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {requisitions.map((r) => {
                    const estimatedTotal = r.items.reduce(
                      (s, it) => s + it.quantity_requested * (Number(it.estimated_unit_cost) || 0), 0
                    );
                    return (
                      <tr key={r.id}>
                        <td className="cell-mono">{r.requisition_number}</td>
                        <td>
                          <span className={`badge ${getCategoryBadge(r.category)}`}>
                            <span className="badge-dot"></span>
                            {r.category.replace("_", " ")}
                          </span>
                        </td>
                        <td>{r.requested_by_name}</td>
                        <td className="cell-numeric">{formatCurrency(estimatedTotal)}</td>
                        <td>{r.justification || "—"}</td>
                        <td className="cell-actions">
                          <div className="flex gap-1 justify-end" style={{ flexWrap: "wrap" }}>
                            <button 
                              className="btn btn-success btn-sm" 
                              onClick={() => handleApprove(r.id)}
                              disabled={submitting}
                            >
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
                                <i className="bi bi-x me-1"></i> Reject
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {requisitions.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {requisitions.length} requisition{requisitions.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Approve
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Reject
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}