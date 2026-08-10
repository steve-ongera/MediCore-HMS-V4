import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getPACSStudyDetail, simulatePACSImages, savePACSReport, finalizePACSReport } from "../../services/api";

export default function StudyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [study, setStudy] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [reportForm, setReportForm] = useState({ findings: "", impression: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getPACSStudyDetail(id);
      setStudy(data);
      if (data.report) setReportForm({ 
        findings: data.report.findings || "", 
        impression: data.report.impression || "" 
      });
    } catch (err) { 
      setError(err.message); 
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    setSimulating(true);
    setError("");
    try {
      await simulatePACSImages(id, { series_count: 1, images_per_series: 3 });
      await load();
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setSimulating(false); 
    }
  };

  const saveReport = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await savePACSReport(id, reportForm);
      await load();
    } catch (err) { 
      setError(err.message); 
    } finally {
      setSaving(false);
    }
  };

  const finalize = async () => {
    if (!window.confirm("Finalize this report? It cannot be edited afterward.")) return;
    setSaving(true);
    try {
      await finalizePACSReport(id);
      await load();
    } catch (err) { 
      setError(err.message); 
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: "60vh" }}>
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading study details...</span>
      </div>
    );
  }

  if (!study) {
    return (
      <div className="empty-state" style={{ padding: "var(--space-12)" }}>
        <div className="empty-state__icon">
          <i className="bi bi-image"></i>
        </div>
        <div className="empty-state__title">Study not found</div>
        <div className="empty-state__desc">The requested study could not be found.</div>
        <Link to="/pacs" className="btn btn-primary">
          <i className="bi bi-arrow-left me-2"></i>
          Back to Worklist
        </Link>
      </div>
    );
  }

  const isReportFinal = study.report?.status === "FINAL";
  const canEditReport = study.status === "COMPLETED" || study.status === "REPORTED";
  const canSimulate = study.status !== "COMPLETED" && study.status !== "REPORTED";

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div className="flex items-center gap-3">
          <Link to="/pacs" className="btn btn-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>
            Back
          </Link>
          <div>
            <div className="page-eyebrow">Imaging / PACS</div>
            <h1 className="page-title">{study.accession_number}</h1>
            <p className="page-subtitle">{study.description}</p>
          </div>
        </div>
        <div className="page-header__actions">
          <span className={`badge ${study.status === 'COMPLETED' ? 'badge-success' : study.status === 'IN_PROGRESS' ? 'badge-warning' : 'badge-info'}`}>
            {study.status?.replace('_', ' ') || 'PENDING'}
          </span>
        </div>
      </div>

      {/* Demo Alert */}
      {study.source === "DEMO" && (
        <div className="alert alert-warning" style={{ marginBottom: "var(--space-4)" }}>
          <i className="bi bi-exclamation-triangle-fill alert-icon"></i>
          <div>
            <div className="alert-title">Demo Mode</div>
            <div className="alert-message">
              This study contains simulated demo images, not a real patient scan.
            </div>
          </div>
        </div>
      )}

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

      {/* Study Info Card */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-body">
          <div className="grid-2">
            {/* Patient Info */}
            <div>
              <div className="patient-header" style={{ marginBottom: 0 }}>
                <div className="patient-header__meta">
                  <div className="patient-header__name">{study.patient_name}</div>
                  <div className="patient-header__sub">
                    <span className="patient-header__id">
                      <i className="bi bi-hash me-1"></i>
                      {study.hospital_number}
                    </span>
                  </div>
                </div>
              </div>
              <div className="info-grid" style={{ marginTop: "var(--space-3)" }}>
                <div>
                  <div className="info-item__label">Referring Physician</div>
                  <div className="info-item__value">{study.referring_physician_name || "—"}</div>
                </div>
                {study.study_date && (
                  <div>
                    <div className="info-item__label">Study Date</div>
                    <div className="info-item__value">{new Date(study.study_date).toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Study Details */}
            <div>
              <div className="info-grid">
                <div>
                  <div className="info-item__label">Modality</div>
                  <div className="info-item__value">
                    <span className="badge badge-info">{study.modality}</span>
                  </div>
                </div>
                <div>
                  <div className="info-item__label">Study UID</div>
                  <div className="info-item__value font-mono text-sm" style={{ wordBreak: "break-all" }}>
                    {study.study_instance_uid}
                  </div>
                </div>
                <div>
                  <div className="info-item__label">Images</div>
                  <div className="info-item__value">{study.image_count || 0}</div>
                </div>
              </div>

              {/* Simulate Button */}
              {canSimulate && (
                <div style={{ marginTop: "var(--space-3)" }}>
                  <button 
                    type="button" 
                    className="btn btn-warning"
                    onClick={handleSimulate} 
                    disabled={simulating}
                  >
                    {simulating ? (
                      <>
                        <span className="spinner" style={{ 
                          width: "16px", 
                          height: "16px", 
                          borderWidth: "2px",
                          marginRight: "var(--space-2)"
                        }}></span>
                        Simulating...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-sim me-2"></i>
                        Simulate Modality Sending Images (Demo)
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Images Section */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            Images 
            <span className="pill-count" style={{ marginLeft: "var(--space-2)" }}>
              {study.image_count || 0}
            </span>
          </h5>
        </div>
        <div className="card-body">
          {study.series_set?.length > 0 ? (
            <div className="flex flex-col gap-6">
              {study.series_set.map((series) => (
                <div key={series.id}>
                  <h6 className="h6" style={{ marginBottom: "var(--space-2)" }}>
                    {series.series_description || `Series ${series.series_number}`}
                    <span className="text-xs text-muted" style={{ marginLeft: "var(--space-2)" }}>
                      ({series.images?.length || 0} images)
                    </span>
                  </h6>
                  <div className="image-grid">
                    {series.images?.map((img) => (
                      <div key={img.id} className="image-card">
                        <div className="image-card__container">
                          <img 
                            src={img.file} 
                            alt={`Instance ${img.instance_number}`} 
                            className="image-card__image"
                            loading="lazy"
                          />
                          {img.is_simulated && (
                            <span className="image-card__badge image-card__badge--simulated">
                              <i className="bi bi-sim me-1"></i>
                              Simulated
                            </span>
                          )}
                        </div>
                        <div className="image-card__info">
                          <span className="image-card__number">#{img.instance_number}</span>
                          {img.is_simulated && (
                            <span className="text-2xs text-muted">(simulated)</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-image"></i>
              </div>
              <div className="empty-state__title">No images available</div>
              <div className="empty-state__desc">
                {canSimulate 
                  ? "Use the 'Simulate Modality' button above to generate demo images."
                  : "This study has no images yet."}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Report Section */}
      {canEditReport ? (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              Report
              {study.report?.status === "FINAL" && (
                <span className="badge badge-success" style={{ marginLeft: "var(--space-2)" }}>
                  <i className="bi bi-check-circle me-1"></i>
                  Finalized
                </span>
              )}
              {study.report?.status === "DRAFT" && (
                <span className="badge badge-warning" style={{ marginLeft: "var(--space-2)" }}>
                  <i className="bi bi-pencil me-1"></i>
                  Draft
                </span>
              )}
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={saveReport}>
              <div className="field">
                <label className="field-label" htmlFor="findings">
                  Findings
                  {isReportFinal && <span className="text-muted text-sm" style={{ marginLeft: "var(--space-2)" }}>(Read-only)</span>}
                </label>
                <textarea
                  id="findings"
                  className="textarea"
                  placeholder="Describe the findings..."
                  value={reportForm.findings}
                  onChange={(e) => setReportForm((p) => ({ ...p, findings: e.target.value }))}
                  disabled={isReportFinal}
                  rows={4}
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="impression">
                  Impression
                  {isReportFinal && <span className="text-muted text-sm" style={{ marginLeft: "var(--space-2)" }}>(Read-only)</span>}
                </label>
                <textarea
                  id="impression"
                  className="textarea"
                  placeholder="Summarize the clinical impression..."
                  value={reportForm.impression}
                  onChange={(e) => setReportForm((p) => ({ ...p, impression: e.target.value }))}
                  disabled={isReportFinal}
                  rows={4}
                />
              </div>

              {!isReportFinal && (
                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="btn btn-secondary"
                    disabled={saving}
                  >
                    {saving ? (
                      <>
                        <span className="spinner" style={{ 
                          width: "16px", 
                          height: "16px", 
                          borderWidth: "2px",
                          marginRight: "var(--space-2)"
                        }}></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-save me-2"></i>
                        Save Draft
                      </>
                    )}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={finalize}
                    disabled={saving || !reportForm.findings.trim()}
                  >
                    <i className="bi bi-check-circle me-2"></i>
                    Finalize Report
                  </button>
                </div>
              )}

              {/* Finalized Report Info */}
              {isReportFinal && study.report && (
                <div className="alert alert-success" style={{ marginTop: "var(--space-4)" }}>
                  <i className="bi bi-check-circle-fill alert-icon"></i>
                  <div>
                    <div className="alert-title">Report Finalized</div>
                    <div className="alert-message">
                      Report finalized by {study.report.radiologist_name || "Unknown"} on{" "}
                      {new Date(study.report.finalized_at).toLocaleString()}.
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <div className="empty-state" style={{ padding: "var(--space-6)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-file-text"></i>
              </div>
              <div className="empty-state__title">Report Not Available</div>
              <div className="empty-state__desc">
                Images must be received before a report can be written. 
                {canSimulate && " Use the 'Simulate Modality' button to generate demo images."}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}