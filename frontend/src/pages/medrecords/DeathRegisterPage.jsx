import { useEffect, useState } from "react";
import { getDeathRegister, createDeathRegistration, getPatients, getUsers } from "../../services/api";
import { formatDateTime } from "../../utils/formatters";

export default function DeathRegisterPage() {
  const [entries, setEntries] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [unidentified, setUnidentified] = useState(false);

  const [form, setForm] = useState({
    deceased_name: "", date_of_death: "", cause_of_death: "", certifying_doctor: "",
  });

  useEffect(() => { loadDoctors(); }, []);
  useEffect(() => { load(); }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (search) params.search = search;
      const data = await getDeathRegister(params);
      setEntries(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDoctors = async () => {
    try { const data = await getUsers({ role: "DOCTOR" }); setDoctors(data.results ?? data); } catch (err) { setError(err.message); }
  };

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!unidentified && !selectedPatient) { setError("Select the patient or mark as unidentified."); return; }
    try {
      await createDeathRegistration({
        ...form,
        deceased_name: unidentified ? form.deceased_name : selectedPatient.full_name,
        patient: unidentified ? undefined : selectedPatient.id,
        certifying_doctor: form.certifying_doctor || undefined,
      });
      setSelectedPatient(null);
      setPatientQuery("");
      setUnidentified(false);
      setForm({ deceased_name: "", date_of_death: "", cause_of_death: "", certifying_doctor: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading && entries.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading death register...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Maternal & Child Health</div>
          <h1 className="page-title">Death Register</h1>
          <p className="page-subtitle">Register and manage deaths</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise  me-1"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle  me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle  me-1"></i> Register Death
          </h5>
        </div>
        <div className="card-body">
          <div className="field" style={{ marginBottom: "var(--space-3)" }}>
            <label className="field-label" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
              <input
                type="checkbox"
                className="input"
                style={{ width: "auto", margin: 0 }}
                checked={unidentified}
                onChange={(e) => { setUnidentified(e.target.checked); setSelectedPatient(null); }}
              />
              <span>Unidentified / no patient record</span>
            </label>
          </div>

          {!unidentified ? (
            <>
              <form onSubmit={handlePatientSearch} style={{ marginBottom: "var(--space-4)" }}>
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
                      <i className="bi bi-search  me-1"></i> Search
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
                                <i className="bi bi-check  me-1"></i> Select
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
                <div className="card" style={{ borderColor: "var(--danger)", background: "var(--danger-soft)", marginBottom: "var(--space-4)" }}>
                  <div className="card-body">
                    <div className="flex items-center gap-3">
                      <div className="avatar avatar-sm">
                        <i className="bi bi-person fs-xl"></i>
                      </div>
                      <div>
                        <div className="text-sm text-danger font-semibold">
                          <i className="bi bi-exclamation-circle  me-1"></i> Selected Deceased
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
                        <i className="bi bi-x  me-1"></i> Change
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="field">
              <label className="field-label">Deceased Name <span className="required">*</span></label>
              <input
                type="text"
                className="input"
                placeholder="Deceased name (if known)"
                value={form.deceased_name}
                onChange={(e) => setForm((p) => ({ ...p, deceased_name: e.target.value }))}
                required
              />
            </div>
          )}

          <form onSubmit={submit}>
            <div className="field">
              <label className="field-label">Date & Time of Death <span className="required">*</span></label>
              <input
                type="datetime-local"
                className="input"
                value={form.date_of_death}
                onChange={(e) => setForm((p) => ({ ...p, date_of_death: e.target.value }))}
                required
              />
            </div>

            <div className="field">
              <label className="field-label">Cause of Death <span className="required">*</span></label>
              <textarea
                className="textarea"
                placeholder="Cause of death"
                value={form.cause_of_death}
                onChange={(e) => setForm((p) => ({ ...p, cause_of_death: e.target.value }))}
                required
              />
            </div>

            <div className="field">
              <label className="field-label">Certifying Doctor</label>
              <select className="select" value={form.certifying_doctor} onChange={(e) => setForm((p) => ({ ...p, certifying_doctor: e.target.value }))}>
                <option value="">Certifying doctor (optional)</option>
                {doctors.map((d) => <option key={d.id} value={d.id}>{d.full_name}</option>)}
              </select>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
              >
                <i className="bi bi-plus-circle  me-1"></i> Register Death
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="search-bar" style={{ width: "220px" }}>
              <i className="bi bi-search search-bar__icon"></i>
              <input
                type="text"
                className="search-bar__input"
                placeholder="Search by reg #, name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="search-bar__clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {entries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-heart"></i>
              </div>
              <h3 className="empty-state__title">No death entries found</h3>
              <p className="empty-state__desc">
                {search 
                  ? "No entries match your search criteria." 
                  : "Register a death using the form above."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reg #</th>
                    <th>Deceased</th>
                    <th>Date of Death</th>
                    <th>Cause</th>
                    <th>Certifying Doctor</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="cell-mono">{e.registration_number}</td>
                      <td className="cell-primary">{e.deceased_name}</td>
                      <td>{formatDateTime(e.date_of_death)}</td>
                      <td>{e.cause_of_death}</td>
                      <td>{e.certifying_doctor_name || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {entries.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
            </span>
          </div>
        )}
      </div>
    </>
  );
}