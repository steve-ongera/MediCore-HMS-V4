import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  getCarePlanDetail,
  addFollowUpTask,
  addMilestone,
  addMonitoringReading,
  completeFollowUpTask,
  markFollowUpMissed,
  closeCarePlan,
} from "../../services/api";

export default function CarePlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [taskForm, setTaskForm] = useState({
    task_type: "CLINIC_REVIEW",
    description: "",
    due_date: "",
  });
  const [milestoneForm, setMilestoneForm] = useState({
    description: "",
    target_date: "",
  });
  const [readingForm, setReadingForm] = useState({
    metric_name: "",
    value: "",
    unit: "",
  });

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getCarePlanDetail(id);
      setPlan(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submitTask = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addFollowUpTask(id, taskForm);
      setTaskForm({ task_type: "CLINIC_REVIEW", description: "", due_date: "" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitMilestone = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addMilestone(id, milestoneForm);
      setMilestoneForm({ description: "", target_date: "" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitReading = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addMonitoringReading(id, readingForm);
      setReadingForm({ metric_name: "", value: "", unit: "" });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    const notes = window.prompt("Outcome notes (optional):") || "";
    try {
      await completeFollowUpTask(taskId, { outcome_notes: notes });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMarkMissed = async (taskId) => {
    const notes = window.prompt("Why was this missed?");
    if (!notes) return;
    try {
      await markFollowUpMissed(taskId, { outcome_notes: notes });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCloseCarePlan = async () => {
    if (!window.confirm("Close this care plan?")) return;
    try {
      await closeCarePlan(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "PENDING": "badge-warning",
      "DUE_TODAY": "badge-info",
      "OVERDUE": "badge-danger",
      "ESCALATED": "badge-danger",
      "COMPLETED": "badge-success",
      "MISSED": "badge-neutral",
      "CANCELLED": "badge-neutral",
      "ACTIVE": "badge-success",
      "COMPLETED_PLAN": "badge-info",
      "DISCONTINUED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getStatusLabel = (status) => {
    return status?.replace("_", " ") || status;
  };

  const getTaskTypeLabel = (type) => {
    return type?.replace("_", " ") || type;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading care plan...</span>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Clinical / Care Coordination</div>
          <h1 className="page-title">{plan.title}</h1>
          <p className="page-subtitle">
            {plan.patient_name} — {plan.hospital_number}
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary btn-sm" onClick={() => navigate(-1)}>
            <i className="bi bi-arrow-left me-1"></i>
            Back
          </button>
          <Link to="/care-coordination/care-plans" className="btn btn-secondary btn-sm">
            <i className="bi bi-list me-1"></i>
            All Plans
          </Link>
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
          {plan.status === "ACTIVE" && (
            <button className="btn btn-danger btn-sm" onClick={handleCloseCarePlan}>
              <i className="bi bi-x-circle me-1"></i>
              Close Plan
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      {/* Plan Info */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-file-medical fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{plan.patient_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {plan.hospital_number}
                </span>
                <span>•</span>
                <span className="tag">{plan.condition || "No condition"}</span>
                <span>•</span>
                <span className={`badge ${plan.is_chronic ? "badge-warning" : "badge-neutral"}`}>
                  {plan.is_chronic ? "Chronic" : "Acute"}
                </span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(plan.status)}`}>
                  <span className="badge-dot"></span>
                  {getStatusLabel(plan.status)}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-person me-1"></i>
                {plan.responsible_doctor_name || "No doctor assigned"}
              </span>
            </div>
          </div>

          {plan.notes && (
            <div className="field" style={{ marginTop: "var(--space-3)" }}>
              <label className="field-label">Notes</label>
              <div
                className="consult-notes-field"
                style={{
                  padding: "var(--space-3)",
                  background: "var(--surface-sunken)",
                  borderRadius: "var(--radius-md)",
                  fontSize: "var(--fs-sm)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {plan.notes}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tasks */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">Follow-up Tasks</h5>
          <div>
            <span className="text-tertiary text-sm">
              {plan.tasks?.length || 0} tasks
            </span>
          </div>
        </div>
        <div className="card-body">
          {plan.status === "ACTIVE" && (
            <form onSubmit={submitTask} className="field-row" style={{ marginBottom: "var(--space-4)" }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <select
                  className="select"
                  value={taskForm.task_type}
                  onChange={(e) => setTaskForm((p) => ({ ...p, task_type: e.target.value }))}
                >
                  <option value="CLINIC_REVIEW">Clinic Review</option>
                  <option value="PENDING_INVESTIGATION">Pending Investigation</option>
                  <option value="SPECIALIST_REVIEW">Specialist Review</option>
                  <option value="REFERRAL_FOLLOWUP">Referral Follow-up</option>
                  <option value="POST_DISCHARGE_CHECK">Post-Discharge Check</option>
                  <option value="MEDICATION_REVIEW">Medication Review</option>
                  <option value="OUTREACH_CALL">Outreach Call</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Description (e.g. 'Review after 14 days')"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <input
                  type="date"
                  className="input"
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm((p) => ({ ...p, due_date: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <i className="bi bi-plus-circle me-1"></i>
                  Add Task
                </button>
              </div>
            </form>
          )}

          {plan.tasks?.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-4)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-clipboard"></i>
              </div>
              <div className="empty-state__title">No tasks</div>
              <div className="empty-state__desc">No follow-up tasks have been added yet.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Description</th>
                      <th>Due</th>
                      <th>Status</th>
                      <th>Assigned</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plan.tasks.map((t) => (
                      <tr
                        key={t.id}
                        className="is-clickable"
                        style={{
                          background: ["OVERDUE", "ESCALATED"].includes(t.status)
                            ? "var(--danger-soft)"
                            : "inherit",
                        }}
                      >
                        <td>
                          <span className="tag">{getTaskTypeLabel(t.task_type)}</span>
                        </td>
                        <td>{t.description}</td>
                        <td className="text-sm text-muted">{t.due_date}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(t.status)}`}>
                            <span className="badge-dot"></span>
                            {getStatusLabel(t.status)}
                          </span>
                        </td>
                        <td>{t.assigned_to_name || "—"}</td>
                        <td style={{ textAlign: "right" }}>
                          {!["COMPLETED", "CANCELLED", "MISSED"].includes(t.status) && (
                            <div className="flex gap-1 justify-end">
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleCompleteTask(t.id)}
                              >
                                <i className="bi bi-check me-1"></i>
                                Complete
                              </button>
                              <button
                                className="btn btn-danger-outline btn-sm"
                                onClick={() => handleMarkMissed(t.id)}
                              >
                                <i className="bi bi-x me-1"></i>
                                Missed
                              </button>
                            </div>
                          )}
                          {t.outcome_notes && (
                            <div className="text-2xs text-muted mt-1">{t.outcome_notes}</div>
                          )}
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

      {/* Milestones */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">Milestones</h5>
          <div>
            <span className="text-tertiary text-sm">
              {plan.milestones?.length || 0} milestones
            </span>
          </div>
        </div>
        <div className="card-body">
          {plan.status === "ACTIVE" && (
            <form onSubmit={submitMilestone} className="field-row" style={{ marginBottom: "var(--space-4)" }}>
              <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Milestone (e.g. HbA1c < 7%)"
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm((p) => ({ ...p, description: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <input
                  type="date"
                  className="input"
                  value={milestoneForm.target_date}
                  onChange={(e) => setMilestoneForm((p) => ({ ...p, target_date: e.target.value }))}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <i className="bi bi-plus-circle me-1"></i>
                  Add
                </button>
              </div>
            </form>
          )}

          {plan.milestones?.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-4)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-flag"></i>
              </div>
              <div className="empty-state__title">No milestones</div>
              <div className="empty-state__desc">No milestones have been set yet.</div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {plan.milestones.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center gap-3 p-3"
                  style={{
                    background: m.is_achieved ? "var(--success-soft)" : "var(--surface-sunken)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <span style={{ fontSize: "20px" }}>
                    {m.is_achieved ? "✅" : "⬜"}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div className="text-sm font-medium">{m.description}</div>
                    {m.target_date && (
                      <div className="text-2xs text-muted">Target: {m.target_date}</div>
                    )}
                  </div>
                  {m.achieved_at && (
                    <span className="text-2xs text-success">
                      <i className="bi bi-check-circle me-1"></i>
                      Achieved
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Monitoring Readings (Chronic only) */}
      {plan.is_chronic && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">Monitoring Readings</h5>
            <div>
              <span className="text-tertiary text-sm">
                {plan.monitoring_readings?.length || 0} readings
              </span>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={submitReading} className="field-row" style={{ marginBottom: "var(--space-4)" }}>
              <div className="field" style={{ marginBottom: 0 }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Metric (e.g. Blood Glucose)"
                  value={readingForm.metric_name}
                  onChange={(e) => setReadingForm((p) => ({ ...p, metric_name: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Value"
                  value={readingForm.value}
                  onChange={(e) => setReadingForm((p) => ({ ...p, value: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <input
                  type="text"
                  className="input"
                  placeholder="Unit (e.g. mg/dL)"
                  value={readingForm.unit}
                  onChange={(e) => setReadingForm((p) => ({ ...p, unit: e.target.value }))}
                />
              </div>
              <div className="field" style={{ marginBottom: 0 }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <i className="bi bi-plus-circle me-1"></i>
                  Add
                </button>
              </div>
            </form>

            {plan.monitoring_readings?.length === 0 ? (
              <div className="empty-state" style={{ padding: "var(--space-4)" }}>
                <div className="empty-state__icon">
                  <i className="bi bi-graph-up"></i>
                </div>
                <div className="empty-state__title">No readings</div>
                <div className="empty-state__desc">No monitoring readings have been recorded yet.</div>
              </div>
            ) : (
              <div className="table-wrap">
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Metric</th>
                        <th>Value</th>
                        <th>Recorded By</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {plan.monitoring_readings.map((r) => (
                        <tr key={r.id}>
                          <td className="font-medium">{r.metric_name}</td>
                          <td>
                            <span className="font-mono">
                              {r.value} {r.unit}
                            </span>
                          </td>
                          <td>{r.recorded_by_name}</td>
                          <td className="text-sm text-muted">
                            {new Date(r.recorded_at).toLocaleString()}
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
      )}
    </>
  );
}