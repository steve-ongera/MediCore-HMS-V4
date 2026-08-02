import { useEffect, useState } from "react";
import { getDischargeSummaries, getIncompleteDischargeSummaries, updateDischargeSummary, completeDischargeSummary } from "../../services/api";

export default function DischargeSummaries() {
  const [summaries, setSummaries] = useState([]);
  const [incomplete, setIncomplete] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [all, inc] = await Promise.all([getDischargeSummaries({ page_size: 100 }), getIncompleteDischargeSummaries()]);
      setSummaries(all.results ?? all);
      setIncomplete(inc);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (s) => {
    setEditingId(s.id);
    setEditForm({
      diagnosis_on_admission: s.diagnosis_on_admission || "",
      diagnosis_on_discharge: s.diagnosis_on_discharge || "",
      procedures_performed: s.procedures_performed || "",
      treatment_summary: s.treatment_summary || "",
      condition_on_discharge: s.condition_on_discharge || "",
      discharge_medications: s.discharge_medications || "",
      followup_instructions: s.followup_instructions || "",
    });
  };

  const saveEdit = async () => {
    setSubmitting(true);
    try {
      await updateDischargeSummary(editingId, editForm);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleComplete = async (id) => {
    if (!window.confirm("Mark this discharge summary complete? It should be fully filled in first.")) return;
    try {
      await completeDischargeSummary(id);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (isComplete) => {
    return isComplete ? "badge-success" : "badge-warning";
  };

  if (loading && summaries.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading discharge summaries...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Medical Records</div>
          <h1 className="page-title">Discharge Summaries</h1>
          <p className="page-subtitle">Manage patient discharge summaries</p>
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

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-exclamation-triangle me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Incomplete Summaries ({incomplete.length})</h5>
          </div>
          <div>
            <span className="badge badge-warning">
              <span className="badge-dot"></span>
              Needs Attention
            </span>
          </div>
        </div>
        <div className="card-body">
          <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            <i className="bi bi-info-circle me-1"></i>
            These summaries need to be completed before the patient's file can be fully archived.
          </div>
          {incomplete.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <h3 className="empty-state__title">No incomplete summaries</h3>
              <p className="empty-state__desc">All discharge summaries are complete.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Admission #</th>
                    <th>Patient</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {incomplete.map((s) => (
                    <tr key={s.id} style={{ background: "var(--warning-soft)" }}>
                      <td className="cell-mono">{s.admission_number}</td>
                      <td className="cell-primary">{s.patient_name}</td>
                      <td>
                        <span className="badge badge-warning">
                          <span className="badge-dot"></span>
                          Incomplete
                        </span>
                      </td>
                      <td className="cell-actions">
                        <div className="flex gap-1 justify-end">
                          <button className="btn btn-primary btn-sm" onClick={() => openEdit(s)}>
                            <i className="bi bi-pencil me-1"></i> Edit
                          </button>
                          <button className="btn btn-success btn-sm" onClick={() => handleComplete(s.id)}>
                            <i className="bi bi-check-circle me-1"></i> Complete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>All Discharge Summaries</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {summaries.length} summary{summaries.length !== 1 ? "ies" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {summaries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-file-text"></i>
              </div>
              <h3 className="empty-state__title">No discharge summaries</h3>
              <p className="empty-state__desc">Discharge summaries will appear here once created.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Admission #</th>
                    <th>Patient</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {summaries.map((s) => (
                    <tr key={s.id}>
                      <td className="cell-mono">{s.admission_number}</td>
                      <td className="cell-primary">{s.patient_name}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(s.is_complete)}`}>
                          <span className="badge-dot"></span>
                          {s.is_complete ? "Complete" : "Incomplete"}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <div className="flex gap-1 justify-end">
                          <button className="btn btn-secondary btn-sm" onClick={() => openEdit(s)}>
                            <i className="bi bi-pencil me-1"></i> Edit
                          </button>
                          {!s.is_complete && (
                            <button className="btn btn-success btn-sm" onClick={() => handleComplete(s.id)}>
                              <i className="bi bi-check-circle me-1"></i> Complete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {summaries.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {summaries.length} discharge summar{summaries.length !== 1 ? "ies" : "y"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Complete
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Incomplete
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingId && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditingId(null); }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <h5 className="modal-title">Edit Discharge Summary</h5>
                <p className="modal-desc">Update the discharge summary details</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setEditingId(null)} aria-label="Close">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="field">
                <label className="field-label">Diagnosis on Admission</label>
                <textarea
                  className="textarea"
                  placeholder="Diagnosis on admission"
                  value={editForm.diagnosis_on_admission}
                  onChange={(e) => setEditForm((p) => ({ ...p, diagnosis_on_admission: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label">Diagnosis on Discharge</label>
                <textarea
                  className="textarea"
                  placeholder="Diagnosis on discharge"
                  value={editForm.diagnosis_on_discharge}
                  onChange={(e) => setEditForm((p) => ({ ...p, diagnosis_on_discharge: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label">Procedures Performed</label>
                <textarea
                  className="textarea"
                  placeholder="Procedures performed"
                  value={editForm.procedures_performed}
                  onChange={(e) => setEditForm((p) => ({ ...p, procedures_performed: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label">Treatment Summary</label>
                <textarea
                  className="textarea"
                  placeholder="Treatment summary"
                  value={editForm.treatment_summary}
                  onChange={(e) => setEditForm((p) => ({ ...p, treatment_summary: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label">Condition on Discharge</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Condition on discharge"
                  value={editForm.condition_on_discharge}
                  onChange={(e) => setEditForm((p) => ({ ...p, condition_on_discharge: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label">Discharge Medications</label>
                <textarea
                  className="textarea"
                  placeholder="Discharge medications"
                  value={editForm.discharge_medications}
                  onChange={(e) => setEditForm((p) => ({ ...p, discharge_medications: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label">Follow-up Instructions</label>
                <textarea
                  className="textarea"
                  placeholder="Follow-up instructions"
                  value={editForm.followup_instructions}
                  onChange={(e) => setEditForm((p) => ({ ...p, followup_instructions: e.target.value }))}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>
                Cancel
              </button>
              <button type="button" className="btn btn-primary" onClick={saveEdit} disabled={submitting}>
                {submitting ? (
                  <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                ) : (
                  <>
                    <i className="bi bi-save me-2"></i> Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}