import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getInsuranceClaim, submitInsuranceClaim, applyClaimResponse, settleInsuranceClaim, cancelInsuranceClaim } from "../../services/api";

export default function ClaimDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [claim, setClaim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [responseForm, setResponseForm] = useState({ status: "APPROVED", approved_amount: "", rejection_reason: "" });
  const [itemApprovals, setItemApprovals] = useState({});

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getInsuranceClaim(id);
      setClaim(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleSubmitClaim = async () => {
    try {
      await submitInsuranceClaim(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleCancel = async () => {
    try {
      await cancelInsuranceClaim(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleItemApprovalChange = (itemId) => (e) => {
    setItemApprovals((p) => ({ ...p, [itemId]: e.target.value }));
  };

  const handleApplyResponse = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        status: responseForm.status,
        rejection_reason: responseForm.rejection_reason,
      };
      const filledItems = Object.fromEntries(
        Object.entries(itemApprovals).filter(([, v]) => v !== "" && v !== undefined)
      );
      if (Object.keys(filledItems).length > 0) {
        payload.item_approvals = filledItems;
      } else if (responseForm.approved_amount) {
        payload.approved_amount = parseFloat(responseForm.approved_amount);
      }
      await applyClaimResponse(id, payload);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleSettle = async () => {
    try {
      const result = await settleInsuranceClaim(id);
      alert(`Settled — ${result.payments_created} payment(s) created.`);
      load();
    } catch (err) { setError(err.message); }
  };

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
        <span className="loading-screen__label">Loading claim details...</span>
      </div>
    );
  }

  if (!claim) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Billing & Insurance</div>
          <h1 className="page-title">{claim.claim_number}</h1>
          <p className="page-subtitle">
            {claim.patient_name} • {claim.insurer_name}
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/insurance/claims")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Claims
          </button>
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
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-file-earmark-text fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{claim.claim_number}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-person me-1"></i> {claim.patient_name}
                </span>
                <span>•</span>
                <span>{claim.hospital_number}</span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(claim.status)}`}>
                  <span className="badge-dot"></span>
                  {claim.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-building me-1"></i> {claim.insurer_name}
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Insurer</div>
              <div className="info-item__value">{claim.insurer_name}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Member Number</div>
              <div className="info-item__value">{claim.member_number}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Total Claimed</div>
              <div className="info-item__value font-bold">KES {claim.total_claimed}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Total Approved</div>
              <div className="info-item__value font-bold">KES {claim.total_approved}</div>
            </div>
            {claim.gateway_reference && (
              <div className="info-item">
                <div className="info-item__label">Gateway Reference</div>
                <div className="info-item__value cell-mono">{claim.gateway_reference}</div>
              </div>
            )}
            {claim.rejection_reason && (
              <div className="info-item" style={{ gridColumn: "span 2" }}>
                <div className="info-item__label">Rejection Reason</div>
                <div className="info-item__value" style={{ color: "var(--danger)" }}>{claim.rejection_reason}</div>
              </div>
            )}
          </div>

          {claim.notes && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <div className="text-sm text-muted">Notes</div>
              <div className="diagnosis-chip">
                <span className="diagnosis-chip__code">📝</span>
                {claim.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Claim Items</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {claim.items.length} item{claim.items.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Description</th>
                  <th>Type</th>
                  <th className="cell-numeric">Claimed</th>
                  <th className="cell-numeric">Approved</th>
                </tr>
              </thead>
              <tbody>
                {claim.items.map((item) => (
                  <tr key={item.id}>
                    <td className="cell-mono">{item.invoice_number}</td>
                    <td>{item.invoice_description}</td>
                    <td>
                      <span className="tag">{item.invoice_source_type}</span>
                    </td>
                    <td className="cell-numeric">KES {item.amount_claimed}</td>
                    <td className="cell-numeric">KES {item.amount_approved}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {claim.status === "DRAFT" && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-send me-2"></i> Actions
            </h5>
          </div>
          <div className="card-body">
            <div className="flex gap-3 flex-wrap">
              <button className="btn btn-primary" onClick={handleSubmitClaim}>
                <i className="bi bi-send me-2"></i> Submit Claim
              </button>
              <button className="btn btn-danger" onClick={handleCancel}>
                <i className="bi bi-x-circle me-2"></i> Cancel Claim
              </button>
            </div>
          </div>
        </div>
      )}

      {(claim.status === "SUBMITTED" || claim.status === "UNDER_REVIEW") && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-pencil-square me-2"></i> Record Insurer Response
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleApplyResponse}>
              <div className="field">
                <label className="field-label">Response Status <span className="required">*</span></label>
                <select 
                  className="select" 
                  value={responseForm.status} 
                  onChange={(e) => setResponseForm((p) => ({ ...p, status: e.target.value }))}
                  required
                >
                  <option value="APPROVED">Approved</option>
                  <option value="PARTIALLY_APPROVED">Partially Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              {responseForm.status !== "REJECTED" && (
                <>
                  <div className="field">
                    <label className="field-label">Per-item Approved Amounts (optional)</label>
                    <div className="table-scroll" style={{ marginBottom: "var(--space-3)" }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Invoice #</th>
                            <th>Claimed</th>
                            <th>Approved Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {claim.items.map((item) => (
                            <tr key={item.id}>
                              <td className="cell-mono">{item.invoice_number}</td>
                              <td className="cell-numeric">KES {item.amount_claimed}</td>
                              <td>
                                <input
                                  type="number"
                                  className="input"
                                  placeholder="Approved amount"
                                  value={itemApprovals[item.id] || ""}
                                  onChange={handleItemApprovalChange(item.id)}
                                  style={{ width: "150px" }}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="field">
                    <label className="field-label">Or Total Approved Amount</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Total approved amount"
                      value={responseForm.approved_amount}
                      onChange={(e) => setResponseForm((p) => ({ ...p, approved_amount: e.target.value }))}
                      style={{ maxWidth: "300px" }}
                    />
                  </div>
                </>
              )}

              {responseForm.status === "REJECTED" && (
                <div className="field">
                  <label className="field-label">Rejection Reason <span className="required">*</span></label>
                  <textarea
                    className="textarea"
                    placeholder="Enter rejection reason..."
                    value={responseForm.rejection_reason}
                    onChange={(e) => setResponseForm((p) => ({ ...p, rejection_reason: e.target.value }))}
                    required
                  />
                </div>
              )}

              <div className="form-actions">
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-check-circle me-2"></i> Record Response
                </button>
                <button type="button" className="btn btn-danger" onClick={handleCancel}>
                  <i className="bi bi-x-circle me-2"></i> Cancel Claim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {(claim.status === "APPROVED" || claim.status === "PARTIALLY_APPROVED") && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-cash-stack me-2"></i> Settlement
            </h5>
          </div>
          <div className="card-body">
            <div className="flex gap-3 flex-wrap">
              <button className="btn btn-success" onClick={handleSettle}>
                <i className="bi bi-cash-stack me-2"></i> Settle Claim (Create Payments)
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}