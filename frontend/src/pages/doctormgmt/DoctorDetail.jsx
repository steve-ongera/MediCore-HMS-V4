import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getDoctorProfile, updateDoctorProfile, deleteDoctorProfile } from "../../services/api";

export default function DoctorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doctor, setDoctor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDoctorProfile(id);
      setDoctor(data);
      setForm(data);
    } catch (err) { 
      setError(err.message); 
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSubmitting(true);
    setError("");
    try {
      await updateDoctorProfile(id, {
        specialty: form.specialty, 
        qualifications: form.qualifications, 
        license_number: form.license_number,
        years_of_experience: form.years_of_experience || undefined,
        bio: form.bio, 
        consultation_fee_override: form.consultation_fee_override || undefined,
        commission_rate_percent: form.commission_rate_percent, 
        is_available_for_booking: form.is_available_for_booking,
      });
      setEditing(false);
      await load();
    } catch (err) { 
      setError(err.message); 
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this doctor's management profile? Their login account is unaffected.")) return;
    try {
      await deleteDoctorProfile(id);
      navigate("/doctors");
    } catch (err) { 
      setError(err.message); 
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading doctor details...</span>
      </div>
    );
  }

  if (!doctor) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Clinical / Doctors</div>
          <h1 className="page-title">Dr. {doctor.full_name}</h1>
          <p className="page-subtitle">{doctor.specialty || "General Practitioner"}</p>
        </div>
        <div className="page-header__actions">
          <Link to="/doctors" className="btn btn-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>
            Back to Doctors
          </Link>
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
          {!editing && (
            <>
              <button className="btn btn-primary btn-sm" onClick={() => setEditing(true)}>
                <i className="bi bi-pencil me-1"></i>
                Edit
              </button>
              <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                <i className="bi bi-trash me-1"></i>
                Delete
              </button>
            </>
          )}
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
          {editing ? (
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="field">
                <label className="field-label" htmlFor="specialty">Specialty</label>
                <input
                  id="specialty"
                  type="text"
                  className="input"
                  placeholder="e.g. Cardiology, Pediatrics"
                  value={form.specialty || ""}
                  onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="qualifications">Qualifications</label>
                <textarea
                  id="qualifications"
                  className="textarea"
                  placeholder="e.g. MBChB, MMed, Fellowship"
                  value={form.qualifications || ""}
                  onChange={(e) => setForm((p) => ({ ...p, qualifications: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label" htmlFor="license_number">License Number</label>
                  <input
                    id="license_number"
                    type="text"
                    className="input"
                    placeholder="License #"
                    value={form.license_number || ""}
                    onChange={(e) => setForm((p) => ({ ...p, license_number: e.target.value }))}
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="years_of_experience">Years of Experience</label>
                  <input
                    id="years_of_experience"
                    type="number"
                    className="input"
                    placeholder="Years"
                    value={form.years_of_experience || ""}
                    onChange={(e) => setForm((p) => ({ ...p, years_of_experience: e.target.value }))}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  className="textarea"
                  placeholder="Brief professional bio"
                  value={form.bio || ""}
                  onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                  rows={4}
                />
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label" htmlFor="consultation_fee_override">Consultation Fee Override</label>
                  <div className="input-group">
                    <span className="input-addon">KES</span>
                    <input
                      id="consultation_fee_override"
                      type="number"
                      className="input"
                      placeholder="Leave blank for default"
                      value={form.consultation_fee_override || ""}
                      onChange={(e) => setForm((p) => ({ ...p, consultation_fee_override: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="commission_rate_percent">Commission Rate %</label>
                  <input
                    id="commission_rate_percent"
                    type="number"
                    className="input"
                    placeholder="Commission percentage"
                    value={form.commission_rate_percent || 0}
                    onChange={(e) => setForm((p) => ({ ...p, commission_rate_percent: e.target.value }))}
                  />
                </div>
              </div>

              <div className="field">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={form.is_available_for_booking || false}
                    onChange={(e) => setForm((p) => ({ ...p, is_available_for_booking: e.target.checked }))}
                  />
                  Available for booking
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditing(false)}>
                  Cancel
                </button>
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
          ) : (
            <>
              <div className="patient-header">
                <div className="avatar avatar-lg">
                  <i className="bi bi-person-badge fs-2xl"></i>
                </div>
                <div className="patient-header__meta">
                  <div className="patient-header__name">Dr. {doctor.full_name}</div>
                  <div className="patient-header__sub">
                    <span className="patient-header__id">
                      <i className="bi bi-tag me-1"></i> {doctor.license_number || "No license #"}
                    </span>
                    <span>•</span>
                    <span className="tag">{doctor.specialty || "General"}</span>
                    <span>•</span>
                    <span className={`badge ${doctor.is_available_for_booking ? "badge-success" : "badge-neutral"}`}>
                      <span className="badge-dot"></span>
                      {doctor.is_available_for_booking ? "Available" : "Unavailable"}
                    </span>
                    <span>•</span>
                    <span className={`badge ${doctor.is_active_staff ? "badge-success" : "badge-danger"}`}>
                      <span className="badge-dot"></span>
                      {doctor.is_active_staff ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
                <div className="patient-header__actions">
                  <span className="text-sm text-muted">
                    <i className="bi bi-calendar me-1"></i> {doctor.years_of_experience || 0} years experience
                  </span>
                </div>
              </div>

              <div className="info-grid">
                <div className="info-item">
                  <div className="info-item__label">Specialty</div>
                  <div className="info-item__value">{doctor.specialty || "—"}</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Qualifications</div>
                  <div className="info-item__value">{doctor.qualifications || "—"}</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">License Number</div>
                  <div className="info-item__value cell-mono">{doctor.license_number || "—"}</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Years of Experience</div>
                  <div className="info-item__value">{doctor.years_of_experience ?? "—"}</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Consultation Fee Override</div>
                  <div className="info-item__value">
                    {doctor.consultation_fee_override ? `KES ${doctor.consultation_fee_override}` : "Uses department default"}
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Commission Rate</div>
                  <div className="info-item__value">{doctor.commission_rate_percent || 0}%</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Available for Booking</div>
                  <div className="info-item__value">
                    <span className={`badge ${doctor.is_available_for_booking ? "badge-success" : "badge-neutral"}`}>
                      {doctor.is_available_for_booking ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Status</div>
                  <div className="info-item__value">
                    <span className={`badge ${doctor.is_active_staff ? "badge-success" : "badge-danger"}`}>
                      {doctor.is_active_staff ? "Active" : "Inactive"}
                    </span>
                  </div>
                </div>
              </div>

              {doctor.bio && (
                <div className="field" style={{ marginTop: "var(--space-3)" }}>
                  <label className="field-label">Bio</label>
                  <div className="consult-notes-field" style={{ padding: "var(--space-3)", background: "var(--surface-sunken)", borderRadius: "var(--radius-md)", fontSize: "var(--fs-sm)", whiteSpace: "pre-wrap" }}>
                    {doctor.bio}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}