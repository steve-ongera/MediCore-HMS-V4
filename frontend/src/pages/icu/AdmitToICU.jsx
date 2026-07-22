import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getAvailableICUBeds, getUsers, admitToICU } from "../../services/api";

export default function AdmitToICU() {
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [beds, setBeds] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    ward_admission: "", bed: "", admission_reason: "OTHER",
    admission_diagnosis: "", severity_score: "", attending_physician: "",
  });

  useEffect(() => {
    loadBeds();
    loadDoctors();
  }, []);

  const loadBeds = async () => {
    try {
      const data = await getAvailableICUBeds();
      setBeds(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadDoctors = async () => {
    try {
      const data = await getUsers({ role: "DOCTOR" });
      setDoctors(data.results ?? data);
    } catch (err) { setError(err.message); }
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
      setError("Please select a patient first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const icuAdmission = await admitToICU({
        patient: selectedPatient.id,
        ward_admission: form.ward_admission || undefined,
        bed: form.bed,
        admission_reason: form.admission_reason,
        admission_diagnosis: form.admission_diagnosis,
        severity_score: form.severity_score || undefined,
        attending_physician: form.attending_physician || undefined,
      });
      navigate(`/icu/${icuAdmission.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading ICU data...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">ICU / HDU</div>
          <h1 className="page-title">Admit to ICU / HDU</h1>
          <p className="page-subtitle">Admit a patient to intensive care</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/icu")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Board
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
            <i className="bi bi-clipboard-plus me-2"></i> Step 2: Admission Details
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="field-label">Ward Admission ID (optional)</label>
              <input
                type="text"
                className="input"
                placeholder="Existing ward admission ID (if transferring from a ward)"
                value={form.ward_admission}
                onChange={handleChange("ward_admission")}
              />
              <div className="text-2xs text-tertiary" style={{ marginTop: "var(--space-1)" }}>
                If the patient is being transferred from a ward, enter the ward admission ID
              </div>
            </div>

            <div className="field">
              <label className="field-label">Select Bed <span className="required">*</span></label>
              <select className="select" value={form.bed} onChange={handleChange("bed")} required>
                <option value="">Select bed</option>
                {beds.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.bed_number} ({b.unit_type}) - {formatCurrency(b.daily_rate)}/day
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <label className="field-label">Admission Reason <span className="required">*</span></label>
              <select className="select" value={form.admission_reason} onChange={handleChange("admission_reason")} required>
                <option value="RESPIRATORY_FAILURE">Respiratory Failure</option>
                <option value="SEPSIS">Sepsis / Septic Shock</option>
                <option value="POST_SURGICAL">Post-Surgical Monitoring</option>
                <option value="TRAUMA">Trauma</option>
                <option value="CARDIAC">Cardiac Event</option>
                <option value="NEUROLOGICAL">Neurological Event</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="field">
              <label className="field-label">Admission Diagnosis</label>
              <textarea
                className="textarea"
                placeholder="Admission diagnosis"
                value={form.admission_diagnosis}
                onChange={handleChange("admission_diagnosis")}
              />
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Severity Score</label>
                <input
                  type="number"
                  className="input"
                  placeholder="e.g. APACHE II / SOFA"
                  value={form.severity_score}
                  onChange={handleChange("severity_score")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Attending Physician</label>
                <select className="select" value={form.attending_physician} onChange={handleChange("attending_physician")}>
                  <option value="">Assign attending physician later</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/icu")}
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
                    Admitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-hospital me-2"></i> Admit to ICU / HDU
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