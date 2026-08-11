import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getVisitDetail, updateVisit, deleteVisit } from "../../services/api";
import { formatDateTime } from "../../utils/formatters";

export default function VisitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getVisitDetail(id);
      setVisit(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      setUpdating(true);
      await updateVisit(id, { status });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete visit ${visit?.visit_number}? This cannot be undone.`)) return;
    try {
      await deleteVisit(id);
      navigate("/visits");
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "WAITING": "badge-warning",
      "IN_CONSULTATION": "badge-info",
      "COMPLETED": "badge-success",
      "CANCELLED": "badge-neutral",
      "REGISTERED": "badge-info",
      "IN_QUEUE": "badge-warning",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getStatusLabel = (status) => {
    return status?.replace("_", " ") || status;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading visit details...</span>
      </div>
    );
  }

  if (!visit) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Clinical / Visits</div>
          <h1 className="page-title">{visit.visit_number}</h1>
          <p className="page-subtitle">{visit.patient_name}</p>
        </div>
        <div className="page-header__actions">
          <Link to={`/patients/${visit.patient_id}`} className="btn btn-secondary btn-sm">
            <i className="bi bi-person me-1"></i>
            View Patient
          </Link>
          <Link to={`/visits/${id}/edit`} className="btn btn-primary btn-sm">
            <i className="bi bi-pencil me-1"></i>
            Edit Visit
          </Link>
          <button className="btn btn-danger btn-sm" onClick={handleDelete}>
            <i className="bi bi-trash me-1"></i>
            Delete
          </button>
        
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-clipboard2-pulse fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{visit.patient_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {visit.hospital_number || "—"}
                </span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(visit.status)}`}>
                  <span className="badge-dot"></span>
                  {getStatusLabel(visit.status)}
                </span>
                <span>•</span>
                <span className="tag">{visit.consultation_type}</span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-calendar me-1"></i> {formatDateTime(visit.visit_date)}
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Department</div>
              <div className="info-item__value">{visit.department_name}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Doctor</div>
              <div className="info-item__value">{visit.doctor_name || "Unassigned"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Visit Type</div>
              <div className="info-item__value">{visit.visit_type || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Priority</div>
              <div className="info-item__value">
                {visit.priority ? (
                  <span className={`badge ${visit.priority === "EMERGENCY" ? "badge-danger" : visit.priority === "HIGH" ? "badge-warning" : "badge-info"}`}>
                    <span className="badge-dot"></span>
                    {visit.priority}
                  </span>
                ) : "—"}
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Created At</div>
              <div className="info-item__value text-sm text-muted">{formatDateTime(visit.created_at)}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Last Updated</div>
              <div className="info-item__value text-sm text-muted">{formatDateTime(visit.updated_at)}</div>
            </div>
          </div>

          {visit.notes && (
            <div className="field" style={{ marginTop: "var(--space-3)" }}>
              <label className="field-label">Notes</label>
              <div className="consult-notes-field" style={{ padding: "var(--space-3)", background: "var(--surface-sunken)", borderRadius: "var(--radius-md)", fontSize: "var(--fs-sm)", whiteSpace: "pre-wrap" }}>
                {visit.notes}
              </div>
            </div>
          )}

          <div className="field" style={{ marginTop: "var(--space-3)" }}>
            <label className="field-label">Status</label>
            <select
              className="select"
              value={visit.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{ maxWidth: "250px" }}
              disabled={updating}
            >
              <option value="WAITING">Waiting</option>
              <option value="IN_CONSULTATION">In Consultation</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Timeline</h5>
          </div>
        </div>
        <div className="card-body p-0" style={{ padding: "var(--space-4)" }}>
          <div className="timeline" style={{ padding: "var(--space-4)" }}>
            <div className="timeline-item">
              <div className="timeline-item__title">Visit Created</div>
              <div className="timeline-item__time">{formatDateTime(visit.created_at)}</div>
            </div>
            {visit.status === "IN_CONSULTATION" && (
              <div className="timeline-item">
                <div className="timeline-item__title">In Consultation</div>
                <div className="timeline-item__time">{formatDateTime(visit.updated_at)}</div>
              </div>
            )}
            {visit.status === "COMPLETED" && (
              <div className="timeline-item">
                <div className="timeline-item__title">Completed</div>
                <div className="timeline-item__time">{formatDateTime(visit.updated_at)}</div>
              </div>
            )}
            {visit.status === "CANCELLED" && (
              <div className="timeline-item">
                <div className="timeline-item__title">Cancelled</div>
                <div className="timeline-item__time">{formatDateTime(visit.updated_at)}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}