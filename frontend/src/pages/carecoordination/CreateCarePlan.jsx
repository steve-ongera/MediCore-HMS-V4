import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { getPatients, getUsers, getDepartments, createCarePlan } from "../../services/api";

export default function CreateCarePlan() {
  const navigate = useNavigate();
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: "",
    condition: "",
    is_chronic: false,
    notes: "",
    responsible_doctor: "",
    responsible_department: "",
    first_task_description: "",
    first_task_due_date: "",
    first_task_type: "CLINIC_REVIEW",
  });

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [d, dept] = await Promise.all([
          getUsers({ role: "DOCTOR" }),
          getDepartments()
        ]);
        setDoctors(d.results ?? d);
        setDepartments(dept.results ?? dept);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    setLoading(true);
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError("Select a patient first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const plan = await createCarePlan({
        patient: selectedPatient.id,
        ...form,
        responsible_doctor: form.responsible_doctor || undefined,
        responsible_department: form.responsible_department || undefined,
        first_task_due_date: form.first_task_due_date || undefined,
      });
      navigate(`/care-coordination/care-plans/${plan.id}`);
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
          <div className="page-eyebrow">Clinical / Care Coordination</div>
          <h1 className="page-title">Create Care Plan</h1>
          <p className="page-subtitle">Create a new patient care plan with follow-up tasks</p>
        </div>
        <div className="page-header__actions">
          <Link to="/care-coordination/care-plans" className="btn btn-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>
            Back to Care Plans
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
          <form onSubmit={handleSubmit}>
            {/* Patient Selection */}
            <div className="field">
              <label className="field-label">
                Patient <span className="required">*</span>
              </label>
              <form onSubmit={handlePatientSearch} className="flex gap-2">
                <div className="input-icon-wrap" style={{ flex: 1 }}>
                  <i className="bi bi-person icon"></i>
                  <input
                    type="text"
                    className="input"
                    placeholder="Search patient by name or hospital #..."
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <i className="bi bi-search"></i>
                </button>
              </form>

              {patientResults.length > 0 && (
                <div className="card" style={{ marginTop: "var(--space-2)" }}>
                  <div className="card-body p-0">
                    <div className="table-wrap">
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Patient</th>
                            <th>Hospital #</th>
                            <th style={{ textAlign: "right" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {patientResults.map((p) => (
                            <tr key={p.id}>
                              <td>
                                <div className="table-row-avatar">
                                  <span className="avatar avatar-sm">
                                    {(p.full_name || "?").charAt(0).toUpperCase()}
                                  </span>
                                  <span className="cell-primary">{p.full_name}</span>
                                </div>
                              </td>
                              <td className="cell-mono">{p.hospital_number}</td>
                              <td style={{ textAlign: "right" }}>
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm"
                                  onClick={() => {
                                    setSelectedPatient(p);
                                    setPatientResults([]);
                                    setPatientQuery("");
                                  }}
                                >
                                  <i className="bi bi-check me-1"></i>
                                  Select
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {selectedPatient && (
                <div className="patient-header" style={{ marginTop: "var(--space-2)", marginBottom: 0 }}>
                  <div className="patient-header__meta">
                    <div className="patient-header__name">{selectedPatient.full_name}</div>
                    <div className="patient-header__sub">
                      <span className="patient-header__id">
                        <i className="bi bi-hash me-1"></i>
                        {selectedPatient.hospital_number}
                      </span>
                    </div>
                  </div>
                  <div className="patient-header__actions">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setSelectedPatient(null);
                        setPatientQuery("");
                      }}
                    >
                      <i className="bi bi-x"></i>
                      Change
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="title">
                  Title <span className="required">*</span>
                </label>
                <input
                  id="title"
                  type="text"
                  className="input"
                  placeholder="e.g. Diabetes Management"
                  value={form.title}
                  onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="condition">Condition</label>
                <input
                  id="condition"
                  type="text"
                  className="input"
                  placeholder="e.g. Type 2 Diabetes"
                  value={form.condition}
                  onChange={(e) => setForm((p) => ({ ...p, condition: e.target.value }))}
                />
              </div>
            </div>

            <div className="field">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.is_chronic}
                  onChange={(e) => setForm((p) => ({ ...p, is_chronic: e.target.checked }))}
                />
                Chronic disease (ongoing monitoring)
              </label>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="notes">Notes</label>
              <textarea
                id="notes"
                className="textarea"
                placeholder="Additional notes about the care plan"
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="responsible_doctor">Responsible Doctor</label>
                <select
                  id="responsible_doctor"
                  className="select"
                  value={form.responsible_doctor}
                  onChange={(e) => setForm((p) => ({ ...p, responsible_doctor: e.target.value }))}
                >
                  <option value="">Assign responsible doctor</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="responsible_department">Clinic / Department</label>
                <select
                  id="responsible_department"
                  className="select"
                  value={form.responsible_department}
                  onChange={(e) => setForm((p) => ({ ...p, responsible_department: e.target.value }))}
                >
                  <option value="">Assign clinic/department</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <hr className="border-t" style={{ margin: "var(--space-4) 0" }} />

            <h5 className="h5" style={{ marginBottom: "var(--space-3)" }}>
              First Follow-up Task <span className="text-muted text-sm">(optional, can add later)</span>
            </h5>

            <div className="field">
              <label className="field-label" htmlFor="first_task_type">Task Type</label>
              <select
                id="first_task_type"
                className="select"
                value={form.first_task_type}
                onChange={(e) => setForm((p) => ({ ...p, first_task_type: e.target.value }))}
              >
                <option value="CLINIC_REVIEW">Clinic Review</option>
                <option value="PENDING_INVESTIGATION">Pending Investigation</option>
                <option value="SPECIALIST_REVIEW">Specialist Review</option>
                <option value="POST_DISCHARGE_CHECK">Post-Discharge Check</option>
                <option value="MEDICATION_REVIEW">Medication Review</option>
                <option value="OUTREACH_CALL">Outreach Call</option>
              </select>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="first_task_description">Task Description</label>
                <input
                  id="first_task_description"
                  type="text"
                  className="input"
                  placeholder="e.g. Review after 14 days"
                  value={form.first_task_description}
                  onChange={(e) => setForm((p) => ({ ...p, first_task_description: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="first_task_due_date">Due Date</label>
                <input
                  id="first_task_due_date"
                  type="date"
                  className="input"
                  value={form.first_task_due_date}
                  onChange={(e) => setForm((p) => ({ ...p, first_task_due_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-actions">
              <Link to="/care-coordination/care-plans" className="btn btn-secondary">
                Cancel
              </Link>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !selectedPatient}
              >
                {submitting ? (
                  <>
                    <span
                      className="spinner"
                      style={{
                        width: "16px",
                        height: "16px",
                        borderWidth: "2px",
                        marginRight: "var(--space-2)",
                      }}
                    ></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle me-2"></i>
                    Create Care Plan
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