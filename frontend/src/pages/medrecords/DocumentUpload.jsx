import { useEffect, useState } from "react";
import { getPatients, uploadDocument, getDocumentAttachments } from "../../services/api";
import { formatDateTime } from "../../utils/formatters";

export default function DocumentUpload() {
  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [documents, setDocuments] = useState([]);

  const [documentType, setDocumentType] = useState("OTHER");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (selectedPatient) loadDocuments();
  }, [selectedPatient]);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const data = await getDocumentAttachments({ patient: selectedPatient.id });
      setDocuments(data.results ?? data);
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

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedPatient || !file) { setError("Select a patient and a file."); return; }
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("patient", selectedPatient.id);
      formData.append("document_type", documentType);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("file", file);
      await uploadDocument(formData);
      setTitle("");
      setDescription("");
      setFile(null);
      loadDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      "REFERRAL_LETTER": "badge-primary",
      "EXTERNAL_RESULT": "badge-info",
      "ID_DOCUMENT": "badge-success",
      "CONSENT_FORM": "badge-warning",
      "INSURANCE_DOCUMENT": "badge-info",
      "DISCHARGE_SUMMARY": "badge-success",
      "OTHER": "badge-neutral",
    };
    return typeMap[type] || "badge-neutral";
  };

  if (loading && documents.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading documents...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Medical Records</div>
          <h1 className="page-title">Document Scanning & Attachments</h1>
          <p className="page-subtitle">Upload and manage patient documents</p>
        </div>
        <div className="page-header__actions">
          {selectedPatient && (
            <button className="btn btn-secondary" onClick={loadDocuments}>
              <i className="bi bi-arrow-clockwise me-2"></i> Refresh
            </button>
          )}
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
            <i className="bi bi-search me-2"></i> Find Patient
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
                            onClick={() => { setSelectedPatient(p); setPatientResults([]); setPatientQuery(""); }}
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
                    onClick={() => { setSelectedPatient(null); setDocuments([]); }}
                  >
                    <i className="bi bi-x me-1"></i> Change
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedPatient && (
        <>
          <div className="card" style={{ marginBottom: "var(--space-6)" }}>
            <div className="card-header">
              <h5 className="card-title">
                <i className="bi bi-cloud-upload me-2"></i> Upload Document
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleUpload}>
                <div className="field-row">
                  <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="field-label">Document Type <span className="required">*</span></label>
                    <select className="select" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                      <option value="REFERRAL_LETTER">Referral Letter</option>
                      <option value="EXTERNAL_RESULT">External Lab/Imaging Result</option>
                      <option value="ID_DOCUMENT">ID Document</option>
                      <option value="CONSENT_FORM">Consent Form</option>
                      <option value="INSURANCE_DOCUMENT">Insurance Document</option>
                      <option value="DISCHARGE_SUMMARY">Discharge Summary</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="field-label">Document Title <span className="required">*</span></label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Document title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="field">
                  <label className="field-label">Description</label>
                  <textarea
                    className="textarea"
                    placeholder="Description (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="field">
                  <label className="field-label">File <span className="required">*</span></label>
                  <input
                    type="file"
                    className="input"
                    onChange={(e) => setFile(e.target.files[0])}
                    required
                    style={{ padding: "var(--space-2)" }}
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={uploading || !selectedPatient || !file}
                  >
                    {uploading ? (
                      <>
                        <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-upload me-2"></i> Upload
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
                <i className="bi bi-files me-1"></i>
                <h5 className="card-title" style={{ marginBottom: 0 }}>Documents on File</h5>
              </div>
              <div>
                <span className="text-tertiary text-sm">
                  {documents.length} document{documents.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="card-body p-0">
              {documents.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-files"></i>
                  </div>
                  <h3 className="empty-state__title">No documents on file</h3>
                  <p className="empty-state__desc">Upload documents for this patient using the form above.</p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Title</th>
                        <th>Uploaded By</th>
                        <th>Date</th>
                        <th className="cell-actions"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((d) => (
                        <tr key={d.id}>
                          <td>
                            <span className={`badge ${getTypeBadge(d.document_type)}`}>
                              <span className="badge-dot"></span>
                              {d.document_type.replace("_", " ")}
                            </span>
                          </td>
                          <td className="cell-primary">{d.title}</td>
                          <td>{d.uploaded_by_name}</td>
                          <td>{formatDateTime(d.uploaded_at)}</td>
                          <td className="cell-actions">
                            <a
                              href={d.file}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                            >
                              <i className="bi bi-eye me-1"></i> View
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            {documents.length > 0 && (
              <div className="card-footer">
                <span className="text-tertiary text-sm">
                  Showing {documents.length} document{documents.length !== 1 ? "s" : ""}
                </span>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}