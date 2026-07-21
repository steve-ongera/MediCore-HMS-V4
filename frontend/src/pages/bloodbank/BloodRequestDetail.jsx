import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getBloodRequest, getCompatibleUnits, issueBloodUnit, cancelBloodRequest } from "../../services/api";

export default function BloodRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [compatibleUnits, setCompatibleUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getBloodRequest(id);
      setRequest(data);
      if (data.status === "PENDING" || data.status === "CROSS_MATCHED") {
        const units = await getCompatibleUnits(id);
        setCompatibleUnits(units);
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleIssue = async (unitId) => {
    try {
      await issueBloodUnit(id, { unit: unitId });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel this blood request?")) return;
    try {
      await cancelBloodRequest(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "PENDING": "badge-warning",
      "CROSS_MATCHED": "badge-primary",
      "ISSUED": "badge-success",
      "CANCELLED": "badge-neutral",
      "REJECTED": "badge-danger",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      "EMERGENCY": "badge-danger",
      "URGENT": "badge-warning",
      "ROUTINE": "badge-info",
    };
    return priorityMap[priority] || "badge-neutral";
  };

  const getBloodGroupBadge = (group) => {
    const groupMap = {
      "A+": "badge-danger",
      "A-": "badge-danger",
      "B+": "badge-primary",
      "B-": "badge-primary",
      "AB+": "badge-info",
      "AB-": "badge-info",
      "O+": "badge-success",
      "O-": "badge-success",
    };
    return groupMap[group] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading blood request...</span>
      </div>
    );
  }

  if (!request) return null;

  const canIssue = request.status === "PENDING" || request.status === "CROSS_MATCHED";

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Blood Bank</div>
          <h1 className="page-title">{request.request_number}</h1>
          <p className="page-subtitle">{request.patient_name}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/bloodbank/requests")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Requests
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
              <i className="bi bi-droplet fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{request.patient_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {request.hospital_number}
                </span>
                <span>•</span>
                <span>
                  <span className={`badge ${getBloodGroupBadge(request.patient_blood_group)}`}>
                    <span className="badge-dot"></span>
                    {request.patient_blood_group}
                  </span>
                </span>
                <span>•</span>
                <span className={`badge ${getPriorityBadge(request.priority)}`}>
                  <span className="badge-dot"></span>
                  {request.priority}
                </span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(request.status)}`}>
                  <span className="badge-dot"></span>
                  {request.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-box me-1"></i> {request.units_requested} unit{request.units_requested !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Component Type</div>
              <div className="info-item__value">{request.component_type}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Units Requested</div>
              <div className="info-item__value">{request.units_requested}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Priority</div>
              <div className="info-item__value">
                <span className={`badge ${getPriorityBadge(request.priority)}`}>
                  <span className="badge-dot"></span>
                  {request.priority}
                </span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Status</div>
              <div className="info-item__value">
                <span className={`badge ${getStatusBadge(request.status)}`}>
                  <span className="badge-dot"></span>
                  {request.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="info-item" style={{ gridColumn: "span 2" }}>
              <div className="info-item__label">Clinical Indication</div>
              <div className="info-item__value">{request.clinical_indication || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Requested By</div>
              <div className="info-item__value">{request.requested_by_name}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Requested At</div>
              <div className="info-item__value">{new Date(request.requested_at).toLocaleString()}</div>
            </div>
          </div>

          {canIssue && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <button className="btn btn-danger" onClick={handleCancel}>
                <i className="bi bi-x-circle me-2"></i> Cancel Request
              </button>
            </div>
          )}
        </div>
      </div>

      {canIssue && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <div className="flex items-center gap-3 flex-wrap">
              <i className="bi bi-box me-1"></i>
              <h5 className="card-title" style={{ marginBottom: 0 }}>Compatible Available Units</h5>
            </div>
            <div>
              <span className="text-tertiary text-sm">
                {compatibleUnits.length} unit{compatibleUnits.length !== 1 ? "s" : ""} available
              </span>
            </div>
          </div>
          <div className="card-body p-0">
            {compatibleUnits.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">
                  <i className="bi bi-box"></i>
                </div>
                <h3 className="empty-state__title">No compatible units available</h3>
                <p className="empty-state__desc">There are no compatible units currently in stock.</p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Unit #</th>
                      <th>Blood Group</th>
                      <th>Component</th>
                      <th>Expiry</th>
                      <th className="cell-numeric">Price</th>
                      <th className="cell-actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {compatibleUnits.map((u) => (
                      <tr key={u.id}>
                        <td className="cell-mono">{u.unit_number}</td>
                        <td>
                          <span className={`badge ${getBloodGroupBadge(u.blood_group)}`}>
                            <span className="badge-dot"></span>
                            {u.blood_group}
                          </span>
                        </td>
                        <td>{u.component_type}</td>
                        <td>{u.expiry_date}</td>
                        <td className="cell-numeric">{formatCurrency(u.unit_price)}</td>
                        <td className="cell-actions">
                          <button className="btn btn-success btn-sm" onClick={() => handleIssue(u.id)}>
                            <i className="bi bi-check-circle me-1"></i> Issue This Unit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Units Issued</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {request.issues.length} issue{request.issues.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {request.issues.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No units issued yet</h3>
              <p className="empty-state__desc">Units will appear here once issued.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Unit #</th>
                    <th>Blood Group</th>
                    <th>Issued By</th>
                    <th>Issued At</th>
                  </tr>
                </thead>
                <tbody>
                  {request.issues.map((iss) => (
                    <tr key={iss.id}>
                      <td className="cell-mono">{iss.unit_number}</td>
                      <td>
                        <span className={`badge ${getBloodGroupBadge(iss.unit_blood_group)}`}>
                          <span className="badge-dot"></span>
                          {iss.unit_blood_group}
                        </span>
                      </td>
                      <td>{iss.issued_by_name}</td>
                      <td>{new Date(iss.issued_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {request.issues.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {request.issues.length} issue{request.issues.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}