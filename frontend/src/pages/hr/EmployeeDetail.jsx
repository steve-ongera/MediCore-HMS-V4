import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getEmployee, terminateEmployee, getLeaveTypes, createLeaveRequest,
  createPerformanceReview, createDisciplinaryRecord,
} from "../../services/api";

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [leaveForm, setLeaveForm] = useState({ leave_type: "", start_date: "", end_date: "", reason: "" });
  const [reviewForm, setReviewForm] = useState({
    review_period_start: "", review_period_end: "", score: "",
    strengths: "", areas_for_improvement: "", goals_next_period: "",
  });
  const [disciplinaryForm, setDisciplinaryForm] = useState({
    severity: "VERBAL_WARNING", incident_date: "", description: "", action_taken: "",
  });

  useEffect(() => { load(); loadLeaveTypes(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getEmployee(id);
      setEmployee(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadLeaveTypes = async () => {
    try {
      const data = await getLeaveTypes();
      setLeaveTypes(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleTerminate = async () => {
    if (!window.confirm("Terminate this employee's employment?")) return;
    try {
      await terminateEmployee(id, {});
      load();
    } catch (err) { setError(err.message); }
  };

  const submitLeave = async (e) => {
    e.preventDefault();
    try {
      await createLeaveRequest({ employee: id, ...leaveForm });
      setLeaveForm({ leave_type: "", start_date: "", end_date: "", reason: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitReview = async (e) => {
    e.preventDefault();
    try {
      await createPerformanceReview({ employee: id, ...reviewForm, score: Number(reviewForm.score) });
      setReviewForm({ review_period_start: "", review_period_end: "", score: "", strengths: "", areas_for_improvement: "", goals_next_period: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitDisciplinary = async (e) => {
    e.preventDefault();
    try {
      await createDisciplinaryRecord({ employee: id, ...disciplinaryForm });
      setDisciplinaryForm({ severity: "VERBAL_WARNING", incident_date: "", description: "", action_taken: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "ACTIVE": "badge-success",
      "ON_LEAVE": "badge-warning",
      "SUSPENDED": "badge-danger",
      "TERMINATED": "badge-neutral",
      "RESIGNED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      "FULL_TIME": "badge-primary",
      "PART_TIME": "badge-info",
      "CONTRACT": "badge-warning",
      "INTERN": "badge-neutral",
      "CASUAL": "badge-secondary",
    };
    return typeMap[type] || "badge-neutral";
  };

  const getLeaveStatusBadge = (status) => {
    const statusMap = {
      "PENDING": "badge-warning",
      "APPROVED": "badge-success",
      "REJECTED": "badge-danger",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getSeverityBadge = (severity) => {
    const severityMap = {
      "VERBAL_WARNING": "badge-warning",
      "WRITTEN_WARNING": "badge-warning",
      "FINAL_WARNING": "badge-danger",
      "SUSPENSION": "badge-danger",
      "TERMINATION": "badge-danger",
    };
    return severityMap[severity] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading employee details...</span>
      </div>
    );
  }

  if (!employee) return null;

  const isActive = employee.employment_status !== "TERMINATED" && employee.employment_status !== "RESIGNED";

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Human Resources</div>
          <h1 className="page-title">{employee.employee_number}</h1>
          <p className="page-subtitle">{employee.full_name}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/hr/employees")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Employees
          </button>
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
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-person fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{employee.full_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {employee.employee_number}
                </span>
                <span>•</span>
                <span>{employee.job_title}</span>
                <span>•</span>
                <span className={`badge ${getTypeBadge(employee.employment_type)}`}>
                  <span className="badge-dot"></span>
                  {employee.employment_type.replace("_", " ")}
                </span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(employee.employment_status)}`}>
                  <span className="badge-dot"></span>
                  {employee.employment_status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm font-bold">{formatCurrency(employee.basic_salary)}</span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Department</div>
              <div className="info-item__value">{employee.department_name || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Date Hired</div>
              <div className="info-item__value">{employee.date_hired}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Years of Service</div>
              <div className="info-item__value">{employee.years_of_service}</div>
            </div>
            {employee.date_terminated && (
              <div className="info-item">
                <div className="info-item__label">Date Terminated</div>
                <div className="info-item__value">{employee.date_terminated}</div>
              </div>
            )}
            <div className="info-item">
              <div className="info-item__label">Phone</div>
              <div className="info-item__value">{employee.phone || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Email</div>
              <div className="info-item__value">{employee.email || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">National ID</div>
              <div className="info-item__value">{employee.national_id || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Gender</div>
              <div className="info-item__value">{employee.gender || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Date of Birth</div>
              <div className="info-item__value">{employee.date_of_birth || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Bank</div>
              <div className="info-item__value">{employee.bank_name || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Bank Account</div>
              <div className="info-item__value cell-mono">{employee.bank_account_number || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Next of Kin</div>
              <div className="info-item__value">
                {employee.next_of_kin_name || "—"}
                {employee.next_of_kin_relationship && (
                  <div className="text-2xs text-tertiary">{employee.next_of_kin_relationship} • {employee.next_of_kin_phone || "—"}</div>
                )}
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">System Login</div>
              <div className="info-item__value">{employee.user_username || "None"}</div>
            </div>
          </div>

          {isActive && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <button className="btn btn-danger" onClick={handleTerminate}>
                <i className="bi bi-x-circle me-2"></i> Terminate Employment
              </button>
            </div>
          )}
        </div>
      </div>

      {isActive && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-plus-circle me-2"></i> Request Leave
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitLeave}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Leave Type <span className="required">*</span></label>
                  <select className="select" value={leaveForm.leave_type} onChange={(e) => setLeaveForm((p) => ({ ...p, leave_type: e.target.value }))} required>
                    <option value="">Select leave type</option>
                    {leaveTypes.map((lt) => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Start Date <span className="required">*</span></label>
                  <input
                    type="date"
                    className="input"
                    value={leaveForm.start_date}
                    onChange={(e) => setLeaveForm((p) => ({ ...p, start_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">End Date <span className="required">*</span></label>
                  <input
                    type="date"
                    className="input"
                    value={leaveForm.end_date}
                    onChange={(e) => setLeaveForm((p) => ({ ...p, end_date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Reason</label>
                <textarea
                  className="textarea"
                  placeholder="Reason for leave"
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((p) => ({ ...p, reason: e.target.value }))}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-send me-2"></i> Submit Leave Request
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-calendar-check me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Leave History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {(employee.leave_requests || []).length} request{(employee.leave_requests || []).length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {(employee.leave_requests || []).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-calendar-check"></i>
              </div>
              <h3 className="empty-state__title">No leave requests</h3>
              <p className="empty-state__desc">This employee has not requested any leave.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Start</th>
                    <th>End</th>
                    <th className="cell-numeric">Days</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(employee.leave_requests || []).map((l) => (
                    <tr key={l.id}>
                      <td>{l.leave_type_name}</td>
                      <td>{l.start_date}</td>
                      <td>{l.end_date}</td>
                      <td className="cell-numeric">{l.days_requested}</td>
                      <td>
                        <span className={`badge ${getLeaveStatusBadge(l.status)}`}>
                          <span className="badge-dot"></span>
                          {l.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> Record Performance Review
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submitReview}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Period Start <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={reviewForm.review_period_start}
                  onChange={(e) => setReviewForm((p) => ({ ...p, review_period_start: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Period End <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={reviewForm.review_period_end}
                  onChange={(e) => setReviewForm((p) => ({ ...p, review_period_end: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 0.5 }}>
                <label className="field-label">Score /100 <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  max="100"
                  placeholder="Score"
                  value={reviewForm.score}
                  onChange={(e) => setReviewForm((p) => ({ ...p, score: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Strengths</label>
              <textarea
                className="textarea"
                placeholder="Strengths demonstrated"
                value={reviewForm.strengths}
                onChange={(e) => setReviewForm((p) => ({ ...p, strengths: e.target.value }))}
              />
            </div>
            <div className="field">
              <label className="field-label">Areas for Improvement</label>
              <textarea
                className="textarea"
                placeholder="Areas needing improvement"
                value={reviewForm.areas_for_improvement}
                onChange={(e) => setReviewForm((p) => ({ ...p, areas_for_improvement: e.target.value }))}
              />
            </div>
            <div className="field">
              <label className="field-label">Goals for Next Period</label>
              <textarea
                className="textarea"
                placeholder="Goals for next period"
                value={reviewForm.goals_next_period}
                onChange={(e) => setReviewForm((p) => ({ ...p, goals_next_period: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              <i className="bi bi-plus-circle me-2"></i> Save Review
            </button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-star me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Performance History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {(employee.performance_reviews || []).length} review{(employee.performance_reviews || []).length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {(employee.performance_reviews || []).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-star"></i>
              </div>
              <h3 className="empty-state__title">No performance reviews</h3>
              <p className="empty-state__desc">Record the first performance review above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Period</th>
                    <th className="cell-numeric">Score</th>
                    <th>Reviewer</th>
                  </tr>
                </thead>
                <tbody>
                  {(employee.performance_reviews || []).map((r) => (
                    <tr key={r.id}>
                      <td>{r.review_period_start} to {r.review_period_end}</td>
                      <td className="cell-numeric">
                        <span className={`badge ${Number(r.score) >= 70 ? "badge-success" : Number(r.score) >= 50 ? "badge-warning" : "badge-danger"}`}>
                          {r.score}/100
                        </span>
                      </td>
                      <td>{r.reviewer_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> Log Disciplinary Record
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submitDisciplinary}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Severity <span className="required">*</span></label>
                <select className="select" value={disciplinaryForm.severity} onChange={(e) => setDisciplinaryForm((p) => ({ ...p, severity: e.target.value }))}>
                  <option value="VERBAL_WARNING">Verbal Warning</option>
                  <option value="WRITTEN_WARNING">Written Warning</option>
                  <option value="FINAL_WARNING">Final Warning</option>
                  <option value="SUSPENSION">Suspension</option>
                  <option value="TERMINATION">Termination</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Incident Date <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={disciplinaryForm.incident_date}
                  onChange={(e) => setDisciplinaryForm((p) => ({ ...p, incident_date: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="field">
              <label className="field-label">Description <span className="required">*</span></label>
              <textarea
                className="textarea"
                placeholder="Description of incident"
                value={disciplinaryForm.description}
                onChange={(e) => setDisciplinaryForm((p) => ({ ...p, description: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label className="field-label">Action Taken</label>
              <textarea
                className="textarea"
                placeholder="Action taken"
                value={disciplinaryForm.action_taken}
                onChange={(e) => setDisciplinaryForm((p) => ({ ...p, action_taken: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn btn-primary">
              <i className="bi bi-plus-circle me-2"></i> Log Record
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-file-text me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Disciplinary History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {(employee.disciplinary_records || []).length} record{(employee.disciplinary_records || []).length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {(employee.disciplinary_records || []).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-file-text"></i>
              </div>
              <h3 className="empty-state__title">No disciplinary records</h3>
              <p className="empty-state__desc">This employee has no disciplinary history.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Severity</th>
                    <th>Description</th>
                    <th>Issued By</th>
                  </tr>
                </thead>
                <tbody>
                  {(employee.disciplinary_records || []).map((d) => (
                    <tr key={d.id}>
                      <td>{d.incident_date}</td>
                      <td>
                        <span className={`badge ${getSeverityBadge(d.severity)}`}>
                          <span className="badge-dot"></span>
                          {d.severity.replace("_", " ")}
                        </span>
                      </td>
                      <td>{d.description}</td>
                      <td>{d.issued_by_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}