import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getUsers, registerDialysisPatient } from "../../services/api";

export default function RegisterDialysisPatient() {
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [nephrologists, setNephrologists] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    primary_diagnosis: "", dry_weight_kg: "", vascular_access_type: "AV_FISTULA",
    access_site_notes: "", sessions_per_week: "3", session_duration_hours: "4.0",
    dialyzer_type: "", anticoagulation_protocol: "", nephrologist: "",
    started_on: new Date().toISOString().slice(0, 10),
  });

  useEffect(() => { loadDoctors(); }, []);

  const loadDoctors = async () => {
    try {
      const data = await getUsers({ role: "DOCTOR" });
      setNephrologists(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError("Select a patient first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const profile = await registerDialysisPatient({
        patient: selectedPatient.id,
        ...form,
        dry_weight_kg: form.dry_weight_kg || undefined,
        sessions_per_week: Number(form.sessions_per_week),
        session_duration_hours: Number(form.session_duration_hours),
        nephrologist: form.nephrologist || undefined,
      });
      navigate(`/dialysis/patients/${profile.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading nephrologists...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Dialysis</div>
          <h1 className="page-title">Register Dialysis Patient</h1>
          <p className="page-subtitle">Enroll a patient in the dialysis program</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/dialysis/patients")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Patients
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
            <i className="bi bi-clipboard-plus me-2"></i> Step 2: Dialysis Prescription
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="field-label">Primary Diagnosis</label>
              <textarea
                className="textarea"
                placeholder="Primary diagnosis"
                value={form.primary_diagnosis}
                onChange={handleChange("primary_diagnosis")}
              />
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Dry Weight (kg)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Dry weight"
                  value={form.dry_weight_kg}
                  onChange={handleChange("dry_weight_kg")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Vascular Access Type <span className="required">*</span></label>
                <select className="select" value={form.vascular_access_type} onChange={handleChange("vascular_access_type")}>
                  <option value="AV_FISTULA">AV Fistula</option>
                  <option value="AV_GRAFT">AV Graft</option>
                  <option value="CENTRAL_CATHETER">Central Venous Catheter</option>
                  <option value="PERITONEAL">Peritoneal Dialysis Catheter</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Access Site Notes</label>
              <input
                type="text"
                className="input"
                placeholder="Access site notes"
                value={form.access_site_notes}
                onChange={handleChange("access_site_notes")}
              />
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Sessions per Week <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  placeholder="3"
                  value={form.sessions_per_week}
                  onChange={handleChange("sessions_per_week")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Session Duration (hours) <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  step="0.5"
                  placeholder="4.0"
                  value={form.session_duration_hours}
                  onChange={handleChange("session_duration_hours")}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Dialyzer Type</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Dialyzer type"
                  value={form.dialyzer_type}
                  onChange={handleChange("dialyzer_type")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Anticoagulation Protocol</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Anticoagulation protocol"
                  value={form.anticoagulation_protocol}
                  onChange={handleChange("anticoagulation_protocol")}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Nephrologist</label>
                <select className="select" value={form.nephrologist} onChange={handleChange("nephrologist")}>
                  <option value="">Assign nephrologist later</option>
                  {nephrologists.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Started On <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={form.started_on}
                  onChange={handleChange("started_on")}
                  required
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/dialysis/patients")}
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
                    <i className="bi bi-person-plus me-2"></i> Register Patient
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