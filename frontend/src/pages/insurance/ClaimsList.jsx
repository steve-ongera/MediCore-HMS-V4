import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getInsuranceClaims } from "../../services/api";

export default function ClaimsList() {
  const [claims, setClaims] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getInsuranceClaims(params);
      setClaims(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  // Status badge mapping
  const getStatusBadge = (status) => {
    const statusMap = {
      "DRAFT": "badge-neutral",
      "SUBMITTED": "badge-primary",
      "UNDER_REVIEW": "badge-info",
      "APPROVED": "badge-success",
      "PARTIALLY_APPROVED": "badge-warning",
      "REJECTED": "badge-danger",
      "SETTLED": "badge-success",
      "CANCELLED": "badge-neutral"
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading claims...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Billing & Insurance</div>
          <h1 className="page-title">Insurance Claims</h1>
          <p className="page-subtitle">Manage insurance claims</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
          <Link to="/insurance/claims/new" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i> File Claim
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
                <option value="DRAFT">Draft</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="APPROVED">Approved</option>
                <option value="PARTIALLY_APPROVED">Partially Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="SETTLED">Settled</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {claims.length} claim{claims.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {claims.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-file-earmark-text"></i>
              </div>
              <h3 className="empty-state__title">No claims found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No claims with status "${statusFilter.replace("_", " ")}" found.` 
                  : "Start by filing a new insurance claim."}
              </p>
              {!statusFilter && (
                <Link to="/insurance/claims/new" className="btn btn-primary">
                  <i className="bi bi-plus-circle me-2"></i> File Claim
                </Link>
              )}
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Claim #</th>
                    <th>Patient</th>
                    <th>Insurer</th>
                    <th>Status</th>
                    <th className="cell-numeric">Claimed</th>
                    <th className="cell-numeric">Approved</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {claims.map((c) => (
                    <tr key={c.id}>
                      <td className="cell-mono">{c.claim_number}</td>
                      <td className="cell-primary">{c.patient_name}</td>
                      <td>{c.insurer_name}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(c.status)}`}>
                          <span className="badge-dot"></span>
                          {c.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="cell-numeric">KES {c.total_claimed}</td>
                      <td className="cell-numeric">KES {c.total_approved}</td>
                      <td className="cell-actions">
                        <Link to={`/insurance/claims/${c.id}`} className="btn btn-secondary btn-sm">
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
        {claims.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {claims.length} claim{claims.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Approved
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Partial
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Rejected
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                Under Review
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}