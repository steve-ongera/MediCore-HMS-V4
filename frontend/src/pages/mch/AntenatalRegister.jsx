import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPatients, getAntenatalProfiles, registerAntenatal } from "../../services/api";

export default function AntenatalRegister() {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const [form, setForm] = useState({
    gravida: "", para: "", lmp: "", blood_group: "UNKNOWN",
    height_cm: "", booking_weight_kg: "", hiv_status: "UNKNOWN",
    high_risk: false, risk_factors: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    setLoading(true);
    setError("");
    try {
      // Walk every page rather than trusting a single page_size to cover
      // everything — protects against the list silently truncating again
      // if the record count ever exceeds whatever page_size is requested
      // (e.g. if a max_page_size cap gets added later).
      let all = [];
      let page = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const data = await getAntenatalProfiles({ page, page_size: 100 });
        const results = data.results ?? data;
        all = all.concat(results);
        if (!data.next) break;
        page += 1;
      }
      setProfiles(all);
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
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFormChange = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      setError("Please select a mother first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await registerAntenatal({
        mother: selectedPatient.id,
        gravida: Number(form.gravida),
        para: Number(form.para),
        lmp: form.lmp,
        blood_group: form.blood_group,
        height_cm: form.height_cm || undefined,
        booking_weight_kg: form.booking_weight_kg || undefined,
        hiv_status: form.hiv_status,
        high_risk: form.high_risk,
        risk_factors: form.risk_factors,
      });
      setSelectedPatient(null);
      setPatientQuery("");
      setPatientResults([]);
      setForm({
        gravida: "", para: "", lmp: "", blood_group: "UNKNOWN",
        height_cm: "", booking_weight_kg: "", hiv_status: "UNKNOWN",
        high_risk: false, risk_factors: "",
      });
      loadProfiles();
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
        <span className="loading-screen__label">Loading antenatal records...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Maternal & Child Health</div>
          <h1 className="page-title">Antenatal Care</h1>
          <p className="page-subtitle">Register and manage antenatal care records</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={loadProfiles}>
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
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> Register New Pregnancy
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handlePatientSearch} style={{ marginBottom: "var(--space-4)" }}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Search Mother</label>
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
            <div style={{ marginBottom: "var(--space-4)" }}>
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
            <div className="card" style={{ borderColor: "var(--success)", background: "var(--success-soft)", marginBottom: "var(--space-4)" }}>
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="avatar avatar-sm">
                    <i className="bi bi-person-check fs-xl"></i>
                  </div>
                  <div>
                    <div className="text-sm text-success font-semibold">
                      <i className="bi bi-check-circle me-1"></i> Selected Mother
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

          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field">
                <label className="field-label">Gravida <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  placeholder="Number of pregnancies"
                  value={form.gravida}
                  onChange={handleFormChange("gravida")}
                  required
                />
              </div>
              <div className="field">
                <label className="field-label">Para <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  placeholder="Number of deliveries"
                  value={form.para}
                  onChange={handleFormChange("para")}
                  required
                />
              </div>
              <div className="field">
                <label className="field-label">LMP <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={form.lmp}
                  onChange={handleFormChange("lmp")}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label">Blood Group</label>
                <select className="select" value={form.blood_group} onChange={handleFormChange("blood_group")}>
                  <option value="UNKNOWN">Unknown</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">Height (cm)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Height"
                  value={form.height_cm}
                  onChange={handleFormChange("height_cm")}
                />
              </div>
              <div className="field">
                <label className="field-label">Booking Weight (kg)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Weight"
                  value={form.booking_weight_kg}
                  onChange={handleFormChange("booking_weight_kg")}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label">HIV Status</label>
                <select className="select" value={form.hiv_status} onChange={handleFormChange("hiv_status")}>
                  <option value="UNKNOWN">Unknown</option>
                  <option value="POSITIVE">Positive</option>
                  <option value="NEGATIVE">Negative</option>
                </select>
              </div>
              <div className="field" style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
                <label className="field-label" style={{ marginBottom: 0 }}>High Risk Pregnancy</label>
                <input
                  type="checkbox"
                  className="input"
                  style={{ width: "auto", margin: 0 }}
                  checked={form.high_risk}
                  onChange={handleFormChange("high_risk")}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Risk Factors</label>
              <textarea
                className="textarea"
                placeholder="Describe any risk factors"
                value={form.risk_factors}
                onChange={handleFormChange("risk_factors")}
              />
            </div>

            <div className="form-actions">
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
                    <i className="bi bi-plus-circle me-2"></i> Register ANC
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-grid me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Registered Pregnancies</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {profiles.length} pregnancy{profiles.length !== 1 ? "ies" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {profiles.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-person-pregnant"></i>
              </div>
              <h3 className="empty-state__title">No pregnancies registered</h3>
              <p className="empty-state__desc">Start by registering a new pregnancy above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ANC #</th>
                    <th>Mother</th>
                    <th>Hospital #</th>
                    <th className="cell-numeric">Gravida/Para</th>
                    <th>EDD</th>
                    <th className="cell-numeric">Gestation (weeks)</th>
                    <th>High Risk</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-mono">{p.anc_number}</td>
                      <td className="cell-primary">{p.mother_name}</td>
                      <td className="cell-mono">{p.hospital_number}</td>
                      <td className="cell-numeric">{p.gravida}/{p.para}</td>
                      <td>{p.edd || "—"}</td>
                      <td className="cell-numeric">{p.gestational_age_weeks}</td>
                      <td>
                        <span className={`badge ${p.high_risk ? "badge-danger" : "badge-success"}`}>
                          <span className="badge-dot"></span>
                          {p.high_risk ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${p.status === "ACTIVE" ? "badge-primary" : "badge-success"}`}>
                          <span className="badge-dot"></span>
                          {p.status}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <Link to={`/mch/antenatal/${p.id}`} className="btn btn-secondary btn-sm">
                          <i className="bi bi-eye me-1"></i> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {profiles.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {profiles.length} pregnancy{profiles.length !== 1 ? "ies" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}