import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getVisitDetail, updateVisit } from "../../services/api";

export default function VisitEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const data = await getVisitDetail(id);
        setForm({ 
          status: data.status, 
          consultation_type: data.consultation_type,
          doctor_id: data.doctor_id || "",
          priority: data.priority || "NORMAL",
        });
      } catch (err) { 
        setError(err.message); 
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await updateVisit(id, form);
      navigate(`/visits/${id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading visit details...</span>
      </div>
    );
  }

  if (!form) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Clinical / Visits</div>
          <h1 className="page-title">Edit Visit</h1>
          <p className="page-subtitle">Update visit details</p>
        </div>
        <div className="page-header__actions">
          <Link to={`/visits/${id}`} className="btn btn-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>
            Back to Visit
          </Link>
          <button className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
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

      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="field-label" htmlFor="status">
                Status <span className="required">*</span>
              </label>
              <select
                id="status"
                className="select"
                value={form.status}
                onChange={(e) => setForm((p) => ({ ...p, status: e.target.value }))}
                required
              >
                <option value="WAITING">Waiting</option>
                <option value="IN_CONSULTATION">In Consultation</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="consultation_type">
                Consultation Type <span className="required">*</span>
              </label>
              <select
                id="consultation_type"
                className="select"
                value={form.consultation_type}
                onChange={(e) => setForm((p) => ({ ...p, consultation_type: e.target.value }))}
                required
              >
                <option value="GENERAL">General</option>
                <option value="SPECIALIST">Specialist</option>
                <option value="EMERGENCY">Emergency</option>
                <option value="FOLLOW_UP">Follow Up</option>
                <option value="REFERRAL">Referral</option>
              </select>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="priority">
                Priority
              </label>
              <select
                id="priority"
                className="select"
                value={form.priority || "NORMAL"}
                onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}
              >
                <option value="LOW">Low</option>
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High</option>
                <option value="EMERGENCY">Emergency</option>
              </select>
            </div>

            <div className="form-actions">
              <Link to={`/visits/${id}`} className="btn btn-secondary">
                Cancel
              </Link>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px", marginRight: "var(--space-2)" }}></span>
                    Saving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}