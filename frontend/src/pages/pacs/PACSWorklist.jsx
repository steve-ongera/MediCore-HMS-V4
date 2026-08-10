import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPACSWorklist, schedulePACSStudy, getPatients } from "../../services/api";

export default function PACSWorklist() {
  const [studies, setStudies] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [form, setForm] = useState({ modality: "CT", description: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { 
      const data = await getPACSWorklist(); 
      setStudies(data); 
    } catch (err) { 
      setError(err.message); 
    } finally {
      setLoading(false);
    }
  };

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

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedPatient) { 
      setError("Select a patient first."); 
      return; 
    }
    setSubmitting(true);
    try {
      await schedulePACSStudy({ patient: selectedPatient.id, ...form });
      setSelectedPatient(null);
      setPatientQuery("");
      setForm({ modality: "CT", description: "" });
      await load();
    } catch (err) { 
      setError(err.message); 
    } finally {
      setSubmitting(false);
    }
  };

  // Modality options with labels
  const modalityOptions = [
    { value: "CR", label: "Computed Radiography (X-Ray)" },
    { value: "CT", label: "CT" },
    { value: "MR", label: "MRI" },
    { value: "US", label: "Ultrasound" },
    { value: "MG", label: "Mammography" },
    { value: "DX", label: "Digital Radiography" },
    { value: "OT", label: "Other" },
  ];

  // Status badge mapping
  const getStatusBadge = (status) => {
    const statusMap = {
      'SCHEDULED': 'badge-info',
      'IN_PROGRESS': 'badge-warning',
      'COMPLETED': 'badge-success',
      'CANCELLED': 'badge-neutral',
      'PENDING': 'badge-warning',
    };
    return statusMap[status] || 'badge-neutral';
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Imaging</div>
          <h1 className="page-title">PACS Worklist</h1>
          <p className="page-subtitle">Manage imaging studies and radiology workflow</p>
        </div>
        <div className="page-header__actions">
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={load}
            disabled={loading}
          >
            <i className={`bi ${loading ? 'bi-arrow-repeat spin' : 'bi-arrow-repeat'}`}></i>
            Refresh
          </button>
        </div>
      </div>

      {/* Demo Mode Alert */}
      <div className="alert alert-warning" style={{ marginBottom: "var(--space-4)" }}>
        <i className="bi bi-exclamation-triangle-fill alert-icon"></i>
        <div>
          <div className="alert-title">Demo Mode</div>
          <div className="alert-message">
            This system is not yet connected to real imaging equipment. Studies are simulated for
            demonstration purposes. See a facility's Orthanc/PACS server configuration to enable real 
            modality integration.
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: "var(--space-4)" }}>
          <i className="bi bi-exclamation-circle-fill alert-icon"></i>
          <div>
            <div className="alert-title">Error</div>
            <div className="alert-message">{error}</div>
          </div>
          <button 
            className="btn-icon-only" 
            onClick={() => setError("")}
            style={{ marginLeft: "auto", color: "var(--text-tertiary)" }}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      )}

      {/* Schedule Study Section */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">Schedule a Study</h5>
          <span className="badge badge-primary">New</span>
        </div>
        <div className="card-body">
          {/* Patient Search */}
          <form onSubmit={handlePatientSearch} className="field-row" style={{ marginBottom: "var(--space-4)" }}>
            <div className="field" style={{ flex: 1 }}>
              <label className="field-label" htmlFor="patientSearch">
                Search Patient <span className="required">*</span>
              </label>
              <div className="flex gap-2">
                <div className="input-icon-wrap" style={{ flex: 1 }}>
                  <i className="bi bi-person icon"></i>
                  <input
                    id="patientSearch"
                    type="text"
                    className="input"
                    placeholder="Search by name or hospital #..."
                    value={patientQuery}
                    onChange={(e) => setPatientQuery(e.target.value)}
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  <i className="bi bi-search"></i>
                </button>
              </div>
            </div>
          </form>

          {/* Patient Search Results */}
          {patientResults.length > 0 && (
            <div className="card" style={{ marginBottom: "var(--space-4)" }}>
              <div className="card-body p-0">
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Hospital #</th>
                        <th>Phone</th>
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
                          <td>{p.phone || "—"}</td>
                          <td style={{ textAlign: "right" }}>
                            <button 
                              type="button" 
                              className="btn btn-primary btn-sm"
                              onClick={() => { 
                                setSelectedPatient(p); 
                                setPatientResults([]); 
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

          {/* Selected Patient & Study Form */}
          {selectedPatient && (
            <form onSubmit={submit} className="grid-2">
              {/* Patient Info */}
              <div>
                <div className="patient-header" style={{ marginBottom: 0 }}>
                  <div className="patient-header__meta">
                    <div className="patient-header__name">{selectedPatient.full_name}</div>
                    <div className="patient-header__sub">
                      <span className="patient-header__id">
                        <i className="bi bi-hash me-1"></i>
                        {selectedPatient.hospital_number}
                      </span>
                      {selectedPatient.gender && (
                        <span className="badge badge-neutral">{selectedPatient.gender}</span>
                      )}
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
              </div>

              {/* Study Details */}
              <div>
                <div className="field">
                  <label className="field-label" htmlFor="modality">
                    Modality <span className="required">*</span>
                  </label>
                  <select
                    id="modality"
                    className="select"
                    value={form.modality}
                    onChange={(e) => setForm((p) => ({ ...p, modality: e.target.value }))}
                    required
                  >
                    {modalityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="field">
                  <label className="field-label" htmlFor="description">
                    Study Description <span className="required">*</span>
                  </label>
                  <input
                    id="description"
                    type="text"
                    className="input"
                    placeholder="e.g. Chest X-Ray PA"
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-actions" style={{ marginTop: 0, borderTop: 0, paddingTop: 0 }}>
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-block"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner" style={{ 
                          width: "16px", 
                          height: "16px", 
                          borderWidth: "2px",
                          marginRight: "var(--space-2)"
                        }}></span>
                        Scheduling...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-calendar-plus me-2"></i>
                        Schedule Study
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Worklist Table */}
      <div className="card">
        <div className="card-header">
          <h5 className="card-title">Awaiting Imaging</h5>
          <span className="pill-count">{studies.length}</span>
        </div>
        <div className="card-body p-0">
          {loading && studies.length === 0 ? (
            <div className="loading-screen" style={{ minHeight: "200px" }}>
              <div className="spinner spinner-lg"></div>
              <span className="loading-screen__label">Loading studies...</span>
            </div>
          ) : studies.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-images"></i>
              </div>
              <div className="empty-state__title">No studies awaiting imaging</div>
              <div className="empty-state__desc">
                Schedule a new study to get started. All scheduled studies will appear here.
              </div>
              <button 
                className="btn btn-primary" 
                onClick={() => document.querySelector('[for="patientSearch"]')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <i className="bi bi-plus-circle me-2"></i>
                Schedule First Study
              </button>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Accession #</th>
                      <th>Patient</th>
                      <th>Modality</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studies.map((s) => (
                      <tr key={s.id} className="is-clickable">
                        <td className="cell-mono">{s.accession_number}</td>
                        <td className="cell-primary">{s.patient_name}</td>
                        <td>
                          <span className="badge badge-info">{s.modality}</span>
                        </td>
                        <td>{s.description}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(s.status)}`}>
                            {s.status?.replace('_', ' ') || 'PENDING'}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link 
                            to={`/pacs/studies/${s.id}`} 
                            className="btn btn-secondary btn-sm"
                          >
                            <i className="bi bi-eye me-1"></i>
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}