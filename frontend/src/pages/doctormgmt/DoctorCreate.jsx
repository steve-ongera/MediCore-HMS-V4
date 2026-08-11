import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getUsers, createDoctorProfile } from "../../services/api";

export default function DoctorCreate() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    user: "",
    specialty: "",
    qualifications: "",
    license_number: "",
    years_of_experience: "",
    bio: "",
    consultation_fee_override: "",
    commission_rate_percent: "0",
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { 
        const data = await getUsers({ role: "DOCTOR" }); 
        setUsers(data.results ?? data); 
      } catch (err) { 
        setError(err.message); 
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const profile = await createDoctorProfile({
        ...form,
        years_of_experience: form.years_of_experience || undefined,
        consultation_fee_override: form.consultation_fee_override || undefined,
        commission_rate_percent: Number(form.commission_rate_percent),
      });
      navigate(`/doctors/${profile.id}`);
    } catch (err) { 
      setError(err.message); 
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Clinical / Doctors</div>
          <h1 className="page-title">Add New Doctor Profile</h1>
          <p className="page-subtitle">Create a new doctor profile linked to a user account</p>
        </div>
        <div className="page-header__actions">
          <Link to="/doctors" className="btn btn-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>
            Back to Doctors
          </Link>
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
          {loading ? (
            <div className="loading-screen" style={{ minHeight: "200px" }}>
              <div className="spinner spinner-lg"></div>
              <span className="loading-screen__label">Loading user accounts...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="field">
                <label className="field-label" htmlFor="user">
                  Doctor Account <span className="required">*</span>
                </label>
                <select
                  id="user"
                  className="select"
                  value={form.user}
                  onChange={(e) => setForm((p) => ({ ...p, user: e.target.value }))}
                  required
                >
                  <option value="">Select doctor account</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name} {u.email ? `(${u.email})` : ""}
                    </option>
                  ))}
                </select>
                {users.length === 0 && (
                  <div className="field-hint text-warning">
                    <i className="bi bi-info-circle me-1"></i>
                    No doctor accounts available. Please create a user account with the DOCTOR role first.
                  </div>
                )}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="specialty">Specialty</label>
                <input
                  id="specialty"
                  type="text"
                  className="input"
                  placeholder="e.g. Cardiology, Pediatrics, Surgery"
                  value={form.specialty}
                  onChange={(e) => setForm((p) => ({ ...p, specialty: e.target.value }))}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="qualifications">Qualifications</label>
                <textarea
                  id="qualifications"
                  className="textarea"
                  placeholder="e.g. MBChB, MMed (Internal Medicine), Fellowship in Cardiology"
                  value={form.qualifications}
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
                    value={form.license_number}
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
                    value={form.years_of_experience}
                    onChange={(e) => setForm((p) => ({ ...p, years_of_experience: e.target.value }))}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="bio">Bio</label>
                <textarea
                  id="bio"
                  className="textarea"
                  placeholder="Brief professional bio and background"
                  value={form.bio}
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
                      value={form.consultation_fee_override}
                      onChange={(e) => setForm((p) => ({ ...p, consultation_fee_override: e.target.value }))}
                    />
                  </div>
                  <div className="field-hint">Leave empty to use department default</div>
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="commission_rate_percent">Commission Rate %</label>
                  <input
                    id="commission_rate_percent"
                    type="number"
                    className="input"
                    placeholder="Commission percentage"
                    value={form.commission_rate_percent}
                    onChange={(e) => setForm((p) => ({ ...p, commission_rate_percent: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-actions">
                <Link to="/doctors" className="btn btn-secondary">
                  Cancel
                </Link>
                <button type="submit" className="btn btn-primary" disabled={submitting || users.length === 0}>
                  {submitting ? (
                    <>
                      <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px", marginRight: "var(--space-2)" }}></span>
                      Creating...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i>
                      Create Profile
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>
  );
}