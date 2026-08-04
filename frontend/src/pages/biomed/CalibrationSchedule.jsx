import { useEffect, useState } from "react";
import { getCalibrations, createCalibration, completeCalibration, getEquipment } from "../../services/api";
import { formatDate } from "../../utils/formatters";

export default function CalibrationSchedule() {
  const [calibrations, setCalibrations] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ equipment: "", scheduled_date: "" });
  const [completingId, setCompletingId] = useState(null);
  const [completeForm, setCompleteForm] = useState({ status: "COMPLETED", reference_standard: "", result_notes: "", certificate_number: "" });

  useEffect(() => { loadEquipment(); }, []);
  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getCalibrations(params);
      setCalibrations(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEquipment = async () => {
    try {
      const data = await getEquipment({ page_size: 300 });
      setEquipmentList((data.results ?? data).filter((e) => e.next_calibration_due !== undefined));
    } catch (err) {
      setError(err.message);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createCalibration(form);
      setForm({ equipment: "", scheduled_date: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openComplete = (id) => {
    setCompletingId(id);
    setCompleteForm({ status: "COMPLETED", reference_standard: "", result_notes: "", certificate_number: "" });
  };

  const submitComplete = async () => {
    try {
      await completeCalibration(completingId, completeForm);
      setCompletingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "SCHEDULED": "badge-warning",
      "COMPLETED": "badge-success",
      "FAILED": "badge-danger",
      "OVERDUE": "badge-danger",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading && calibrations.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading calibrations...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Biomedical Engineering</div>
          <h1 className="page-title">Calibration Schedule</h1>
          <p className="page-subtitle">Manage equipment calibration schedule</p>
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
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> Schedule Calibration
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1.5 }}>
                <label className="field-label">Equipment <span className="required">*</span></label>
                <select className="select" value={form.equipment} onChange={(e) => setForm((p) => ({ ...p, equipment: e.target.value }))} required>
                  <option value="">Select equipment</option>
                  {equipmentList.map((eq) => <option key={eq.id} value={eq.id}>{eq.asset_tag} - {eq.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Scheduled Date <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={form.scheduled_date}
                  onChange={(e) => setForm((p) => ({ ...p, scheduled_date: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                      Scheduling...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle me-2"></i> Schedule
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-funnel me-1"></i>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>Filter by Status</label>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "180px" }}
              >
                <option value="">All</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="COMPLETED">Completed</option>
                <option value="FAILED">Failed — Out of Tolerance</option>
                <option value="OVERDUE">Overdue</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {calibrations.length} record{calibrations.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {calibrations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-rulers"></i>
              </div>
              <h3 className="empty-state__title">No calibration records found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No records with status "${statusFilter}" found.` 
                  : "Schedule a calibration using the form above."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>Scheduled</th>
                    <th>Status</th>
                    <th>Certificate #</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {calibrations.map((c) => (
                    <tr key={c.id} style={c.status === "OVERDUE" || c.status === "FAILED" ? { background: "var(--danger-soft)" } : {}}>
                      <td className="cell-primary">{c.equipment_name}</td>
                      <td>{c.scheduled_date ? formatDate(c.scheduled_date) : "—"}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(c.status)}`}>
                          <span className="badge-dot"></span>
                          {c.status}
                        </span>
                      </td>
                      <td>{c.certificate_number || "—"}</td>
                      <td className="cell-actions">
                        {c.status === "SCHEDULED" && (
                          completingId === c.id ? (
                            <div className="flex gap-1" style={{ flexWrap: "wrap", minWidth: "300px" }}>
                              <select
                                className="select"
                                value={completeForm.status}
                                onChange={(e) => setCompleteForm((p) => ({ ...p, status: e.target.value }))}
                                style={{ width: "140px" }}
                              >
                                <option value="COMPLETED">Completed</option>
                                <option value="FAILED">Failed</option>
                              </select>
                              <input
                                type="text"
                                className="input"
                                placeholder="Reference standard"
                                value={completeForm.reference_standard}
                                onChange={(e) => setCompleteForm((p) => ({ ...p, reference_standard: e.target.value }))}
                                style={{ width: "140px" }}
                              />
                              <input
                                type="text"
                                className="input"
                                placeholder="Certificate #"
                                value={completeForm.certificate_number}
                                onChange={(e) => setCompleteForm((p) => ({ ...p, certificate_number: e.target.value }))}
                                style={{ width: "120px" }}
                              />
                              <textarea
                                className="textarea"
                                placeholder="Result notes"
                                value={completeForm.result_notes}
                                onChange={(e) => setCompleteForm((p) => ({ ...p, result_notes: e.target.value }))}
                                style={{ width: "160px", minHeight: "30px" }}
                              />
                              <button className="btn btn-success btn-sm" onClick={submitComplete}>
                                <i className="bi bi-check me-1"></i> Save
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setCompletingId(null)}>
                                <i className="bi bi-x"></i>
                              </button>
                            </div>
                          ) : (
                            <button className="btn btn-primary btn-sm" onClick={() => openComplete(c.id)}>
                              <i className="bi bi-pencil me-1"></i> Record Result
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {calibrations.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {calibrations.length} calibration record{calibrations.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Scheduled
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Completed
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Failed / Overdue
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}