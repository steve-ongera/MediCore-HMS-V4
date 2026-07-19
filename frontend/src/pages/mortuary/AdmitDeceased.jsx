import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPatients, getAvailableMortuaryUnits, registerMortuaryCase } from "../../services/api";

export default function AdmitDeceased() {
  const navigate = useNavigate();

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [unidentifiedMode, setUnidentifiedMode] = useState(false);

  const [units, setUnits] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    deceased_name_freetext: "", gender: "UNKNOWN", estimated_age: "",
    date_of_death: "", cause_of_death: "", source: "OTHER",
    compartment: "", brought_by: "", police_ob_number: "",
  });

  useEffect(() => { loadUnits(); }, []);

  const loadUnits = async () => {
    try {
      const data = await getAvailableMortuaryUnits();
      setUnits(data);
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
    if (!selectedPatient && !form.deceased_name_freetext.trim()) {
      setError("Select a registered patient or enter a name for an unidentified case.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const mortuaryCase = await registerMortuaryCase({
        patient: selectedPatient ? selectedPatient.id : undefined,
        deceased_name_freetext: selectedPatient ? "" : form.deceased_name_freetext,
        gender: form.gender,
        estimated_age: form.estimated_age || undefined,
        date_of_death: form.date_of_death,
        cause_of_death: form.cause_of_death,
        source: form.source,
        compartment: form.compartment || undefined,
        brought_by: form.brought_by,
        police_ob_number: form.police_ob_number,
      });
      navigate(`/mortuary/${mortuaryCase.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading mortuary data...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Mortuary Services</div>
          <h1 className="page-title">Admit Deceased</h1>
          <p className="page-subtitle">Register a deceased patient in the mortuary</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/mortuary")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Dashboard
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
            <i className="bi bi-person me-2"></i> Deceased Identity
          </h5>
        </div>
        <div className="card-body">
          <div className="field" style={{ marginBottom: "var(--space-3)" }}>
            <label className="field-label" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
              <input
                type="checkbox"
                className="input"
                style={{ width: "auto", margin: 0 }}
                checked={unidentifiedMode}
                onChange={(e) => { setUnidentifiedMode(e.target.checked); setSelectedPatient(null); }}
              />
              <span>Unidentified / brought-in-dead case</span>
            </label>
          </div>

          {!unidentifiedMode ? (
            <>
              <form onSubmit={handlePatientSearch}>
                <div className="field-row">
                  <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="field-label">Search Patient</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Search by name / hospital number"
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
            </>
          ) : (
            <div className="field">
              <label className="field-label">Name (if known)</label>
              <input
                type="text"
                className="input"
                placeholder="Enter name, or leave blank for unknown"
                value={form.deceased_name_freetext}
                onChange={handleChange("deceased_name_freetext")}
              />
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-file-text me-2"></i> Case Details
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Gender</label>
                <select className="select" value={form.gender} onChange={handleChange("gender")}>
                  <option value="UNKNOWN">Unknown</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Estimated Age</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Age in years"
                  value={form.estimated_age}
                  onChange={handleChange("estimated_age")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Date & Time of Death <span className="required">*</span></label>
                <input
                  type="datetime-local"
                  className="input"
                  value={form.date_of_death}
                  onChange={handleChange("date_of_death")}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Cause of Death</label>
              <textarea
                className="textarea"
                placeholder="Cause of death"
                value={form.cause_of_death}
                onChange={handleChange("cause_of_death")}
              />
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Source <span className="required">*</span></label>
                <select className="select" value={form.source} onChange={handleChange("source")} required>
                  <option value="INPATIENT">Inpatient Ward</option>
                  <option value="EMERGENCY">Emergency Department</option>
                  <option value="MCH">Maternal & Child Health</option>
                  <option value="BROUGHT_IN_DEAD">Brought in Dead (BID)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Compartment</label>
                <select className="select" value={form.compartment} onChange={handleChange("compartment")}>
                  <option value="">Assign compartment later</option>
                  {units.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.compartment_number} (KES {u.daily_storage_rate}/day)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Brought By</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Brought by (ambulance, police, family)"
                  value={form.brought_by}
                  onChange={handleChange("brought_by")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Police OB Number</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Police OB number (if applicable)"
                  value={form.police_ob_number}
                  onChange={handleChange("police_ob_number")}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/mortuary")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Admitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle me-2"></i> Admit to Mortuary
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