import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getAvailableEmergencyBays, getUsers, registerEmergencyVisit } from "../../services/api";

export default function RegisterEmergency() {
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [bays, setBays] = useState([]);
  const [doctors, setDoctors] = useState([]);

  const [form, setForm] = useState({
    bay: "", triage_level: "3", arrival_mode: "WALK_IN",
    chief_complaint: "", attending_doctor: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadBays();
    loadDoctors();
  }, []);

  const loadBays = async () => {
    try {
      const data = await getAvailableEmergencyBays();
      setBays(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadDoctors = async () => {
    try {
      const data = await getUsers({ role: "DOCTOR" });
      setDoctors(data.results ?? data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFormChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError("Please select a patient first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const ed = await registerEmergencyVisit({
        patient: selectedPatient.id,
        bay: form.bay || undefined,
        triage_level: Number(form.triage_level),
        arrival_mode: form.arrival_mode,
        chief_complaint: form.chief_complaint,
        attending_doctor: form.attending_doctor || undefined,
      });
      navigate(`/emergency/${ed.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Triage level labels for display
  const triageLabels = {
    "1": "1 - Resuscitation (Immediate)",
    "2": "2 - Emergent (< 10 min)",
    "3": "3 - Urgent (< 30 min)",
    "4": "4 - Less Urgent (< 60 min)",
    "5": "5 - Non-Urgent"
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Emergency Department</div>
          <h1 className="page-title">Register Emergency Patient</h1>
          <p className="page-subtitle">Register a new emergency visit</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/emergency")}>
            <i className="bi bi-arrow-left me-2"></i> Back to ED Board
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
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-search me-2"></i> Step 1: Find Patient
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handlePatientSearch}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Search Patient</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Search by name / phone / hospital number"
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-search me-2"></i> Search
                </button>
              </div>
            </div>
          </form>

          {patientResults.length > 0 && (
            <div style={{ marginTop: "var(--space-4)" }}>
              <div className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)" }}>
                Search Results ({patientResults.length})
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Hospital #</th>
                      <th>Phone</th>
                      <th className="cell-actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {patientResults.map((p) => (
                      <tr key={p.id}>
                        <td className="cell-primary">{p.full_name}</td>
                        <td className="cell-mono">{p.hospital_number}</td>
                        <td>{p.phone}</td>
                        <td className="cell-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setSelectedPatient(p)}
                          >
                            <i className="bi bi-check me-1"></i> Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedPatient && (
            <div className="card" style={{ borderColor: "var(--success)", background: "var(--success-soft)", marginTop: "var(--space-4)" }}>
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="avatar avatar-sm">
                    <i className="bi bi-person-check fs-xl"></i>
                  </div>
                  <div>
                    <div className="text-sm text-success font-semibold">
                      <i className="bi bi-check-circle me-1"></i> Selected Patient
                    </div>
                    <div className="font-bold">{selectedPatient.full_name}</div>
                    <div className="text-sm text-muted">
                      {selectedPatient.hospital_number} • {selectedPatient.phone}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm ml-auto"
                    onClick={() => setSelectedPatient(null)}
                  >
                    <i className="bi bi-x me-1"></i> Change
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-clipboard-plus me-2"></i> Step 2: Triage & Registration
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field">
                <label className="field-label">Bay (optional)</label>
                <select className="select" value={form.bay} onChange={handleFormChange("bay")}>
                  <option value="">No bay yet</option>
                  {bays.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.zone} - {b.bay_number} (KES {b.hourly_rate}/hr)
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Triage Level <span className="required">*</span></label>
                <select className="select" value={form.triage_level} onChange={handleFormChange("triage_level")} required>
                  <option value="1">1 - Resuscitation (Immediate)</option>
                  <option value="2">2 - Emergent (&lt; 10 min)</option>
                  <option value="3">3 - Urgent (&lt; 30 min)</option>
                  <option value="4">4 - Less Urgent (&lt; 60 min)</option>
                  <option value="5">5 - Non-Urgent</option>
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label">Arrival Mode <span className="required">*</span></label>
                <select className="select" value={form.arrival_mode} onChange={handleFormChange("arrival_mode")} required>
                  <option value="WALK_IN">Walk-in</option>
                  <option value="AMBULANCE">Ambulance</option>
                  <option value="POLICE">Police</option>
                  <option value="REFERRAL">Referral</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">Attending Doctor</label>
                <select className="select" value={form.attending_doctor} onChange={handleFormChange("attending_doctor")}>
                  <option value="">Unassigned</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Chief Complaint <span className="required">*</span></label>
              <textarea
                className="textarea"
                placeholder="Describe the chief complaint..."
                value={form.chief_complaint}
                onChange={handleFormChange("chief_complaint")}
                required
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/emergency")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !selectedPatient}
              >
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Registering...
                  </>
                ) : (
                  <>
                    <i className="bi bi-hospital me-2"></i> Register Emergency Visit
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