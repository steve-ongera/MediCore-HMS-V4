import { useEffect, useState } from "react";
import { getUnverifiedDiagnoses, getUncodedDiagnoses, verifyDiagnosisCoding, correctDiagnosisCoding, searchICD10Codes } from "../../services/api";
import { formatDate } from "../../utils/formatters";

export default function ICDCodingReview() {
  const [tab, setTab] = useState("unverified");
  const [diagnoses, setDiagnoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [correctingId, setCorrectingId] = useState(null);
  const [codeSearch, setCodeSearch] = useState("");
  const [codeOptions, setCodeOptions] = useState([]);
  const [selectedCode, setSelectedCode] = useState("");
  const [correctionNotes, setCorrectionNotes] = useState("");

  useEffect(() => { load(); }, [tab]);

  const load = async () => {
    setLoading(true);
    try {
      const data = tab === "unverified" ? await getUnverifiedDiagnoses() : await getUncodedDiagnoses();
      setDiagnoses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (id) => {
    try { await verifyDiagnosisCoding(id); load(); } catch (err) { setError(err.message); }
  };

  const searchCodes = async (query) => {
    setCodeSearch(query);
    if (query.length < 2) { setCodeOptions([]); return; }
    try {
      const data = await searchICD10Codes(query);
      setCodeOptions(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const submitCorrection = async (id) => {
    try {
      await correctDiagnosisCoding(id, { icd10_code: selectedCode, coding_correction_notes: correctionNotes });
      setCorrectingId(null);
      setSelectedCode("");
      setCorrectionNotes("");
      setCodeSearch("");
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading && diagnoses.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading coding review...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Medical Records</div>
          <h1 className="page-title">ICD-10 Coding Review</h1>
          <p className="page-subtitle">Quality assurance over diagnosis coding</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
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

      <div className="card">
        <div className="card-header" style={{ padding: 0 }}>
          <div className="tabs" style={{ padding: "0 var(--space-4)" }}>
            <button
              type="button"
              className={`tabs__item ${tab === "unverified" ? "is-active" : ""}`}
              onClick={() => setTab("unverified")}
            >
              <i className="bi bi-shield-check me-2"></i>
              Unverified
              <span className="pill-count">{diagnoses.length}</span>
            </button>
            <button
              type="button"
              className={`tabs__item ${tab === "uncoded" ? "is-active" : ""}`}
              onClick={() => setTab("uncoded")}
            >
              <i className="bi bi-exclamation-triangle me-2"></i>
              Uncoded
              <span className="pill-count">{diagnoses.length}</span>
            </button>
          </div>
        </div>
        <div className="card-body">
          <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            <i className="bi bi-info-circle me-1"></i>
            Quality assurance over diagnosis coding entered by doctors — verify correct codes, or correct miscoded diagnoses.
          </div>

          {diagnoses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <h3 className="empty-state__title">Nothing in this queue</h3>
              <p className="empty-state__desc">
                {tab === "unverified" 
                  ? "All diagnoses have been verified." 
                  : "All diagnoses have ICD-10 codes assigned."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Diagnosis Notes</th>
                    <th>ICD10 Code</th>
                    <th>Doctor</th>
                    <th>Date</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {diagnoses.map((d) => (
                    <tr key={d.id}>
                      <td className="cell-primary">{d.patient_name}</td>
                      <td>{d.notes}</td>
                      <td>
                        {d.icd10_code_display ? (
                          <span className="badge badge-primary">
                            <span className="badge-dot"></span>
                            {d.icd10_code_display}
                          </span>
                        ) : (
                          <span className="badge badge-danger">
                            <span className="badge-dot"></span>
                            Not coded
                          </span>
                        )}
                      </td>
                      <td>{d.doctor_name}</td>
                      <td>{formatDate(d.created_at)}</td>
                      <td className="cell-actions">
                        {tab === "unverified" && (
                          <button className="btn btn-success btn-sm" onClick={() => handleVerify(d.id)}>
                            <i className="bi bi-check-circle me-1"></i> Verify
                          </button>
                        )}
                        {correctingId === d.id ? (
                          <div className="flex gap-1" style={{ flexWrap: "wrap", minWidth: "300px" }}>
                            <input
                              type="text"
                              className="input"
                              placeholder="Search ICD10 code"
                              value={codeSearch}
                              onChange={(e) => searchCodes(e.target.value)}
                              style={{ width: "150px" }}
                            />
                            {codeOptions.length > 0 && (
                              <select
                                className="select"
                                value={selectedCode}
                                onChange={(e) => setSelectedCode(e.target.value)}
                                style={{ width: "140px" }}
                              >
                                <option value="">Select code</option>
                                {codeOptions.map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.code} - {c.description}
                                  </option>
                                ))}
                              </select>
                            )}
                            <input
                              type="text"
                              className="input"
                              placeholder="Correction reason"
                              value={correctionNotes}
                              onChange={(e) => setCorrectionNotes(e.target.value)}
                              style={{ width: "140px" }}
                            />
                            <button className="btn btn-primary btn-sm" onClick={() => submitCorrection(d.id)}>
                              <i className="bi bi-save me-1"></i> Save
                            </button>
                            <button className="btn btn-secondary btn-sm" onClick={() => setCorrectingId(null)}>
                              <i className="bi bi-x"></i>
                            </button>
                          </div>
                        ) : (
                          <button className="btn btn-warning btn-sm" onClick={() => setCorrectingId(d.id)}>
                            <i className="bi bi-pencil me-1"></i> Correct
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {diagnoses.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {diagnoses.length} diagnosis{diagnoses.length !== 1 ? "es" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Verified
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Uncoded
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Correction
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}