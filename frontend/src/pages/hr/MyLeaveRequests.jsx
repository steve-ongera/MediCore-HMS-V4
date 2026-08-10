import { useEffect, useState } from "react";
import { getMyEmployeeProfile, getLeaveTypes, createLeaveRequest, getLeaveRequests } from "../../services/api";
import { formatDate } from "../../utils/formatters";

export default function MyLeaveRequests() {
  const [employee, setEmployee] = useState(null);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({ leave_type: "", start_date: "", end_date: "", reason: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const emp = await getMyEmployeeProfile();
      setEmployee(emp);

      const types = await getLeaveTypes();
      setLeaveTypes(types.results ?? types);

      if (emp) {
        const requests = await getLeaveRequests({ employee: emp.id, page_size: 100 });
        setMyRequests(requests.results ?? requests);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const daysRequested = () => {
    if (!form.start_date || !form.end_date) return null;
    const start = new Date(form.start_date);
    const end = new Date(form.end_date);
    const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? diff : null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!employee) {
      setError("No HR employee profile is linked to your account. Contact HR to have one created before requesting leave.");
      return;
    }
    if (form.end_date < form.start_date) {
      setError("End date cannot be before the start date.");
      return;
    }

    setSubmitting(true);
    try {
      await createLeaveRequest({
        employee: employee.id,
        leave_type: form.leave_type,
        start_date: form.start_date,
        end_date: form.end_date,
        reason: form.reason,
      });
      setSuccess("Leave request submitted. HR will review it and you'll see the status update below.");
      setForm({ leave_type: "", start_date: "", end_date: "", reason: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "PENDING": "badge-warning",
      "APPROVED": "badge-success",
      "REJECTED": "badge-danger",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading leave requests...</span>
      </div>
    );
  }

  if (!employee) {
    return (
      <>
        <div className="page-header">
          <div>
            <div className="page-eyebrow">Human Resources</div>
            <h1 className="page-title">My Leave Requests</h1>
            <p className="page-subtitle">Manage your leave requests</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-person-x"></i>
              </div>
              <h3 className="empty-state__title">No employee profile found</h3>
              <p className="empty-state__desc">
                Your user account isn't yet linked to an HR employee profile, so you can't file a leave request from here.
              </p>
              <p className="text-sm text-muted">
                Please contact your HR Officer to have your employee record created and linked to your login.
              </p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const days = daysRequested();

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Human Resources</div>
          <h1 className="page-title">My Leave Requests</h1>
          <p className="page-subtitle">{employee.full_name} — {employee.job_title} {employee.department_name ? `(${employee.department_name})` : ""}</p>
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

      {success && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--success)", background: "var(--success-soft)" }}>
          <div className="card-body">
            <div className="text-success">
              <i className="bi bi-check-circle  me-1"></i> {success}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle  me-1"></i> Request Leave
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="field-label">Leave Type <span className="required">*</span></label>
              <select className="select" value={form.leave_type} onChange={handleChange("leave_type")} required>
                <option value="">Select leave type</option>
                {leaveTypes.map((lt) => (
                  <option key={lt.id} value={lt.id}>
                    {lt.name} ({lt.default_days_per_year} days/year, {lt.is_paid ? "Paid" : "Unpaid"})
                  </option>
                ))}
              </select>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Start Date <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={form.start_date}
                  onChange={handleChange("start_date")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">End Date <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={form.end_date}
                  onChange={handleChange("end_date")}
                  required
                />
              </div>
            </div>

            {days && (
              <div className="card" style={{ marginBottom: "var(--space-3)", background: "var(--primary-soft)", borderColor: "var(--primary)" }}>
                <div className="card-body" style={{ padding: "var(--space-2) var(--space-3)" }}>
                  <div className="text-sm">
                    <i className="bi bi-calendar-check  me-1" style={{ color: "var(--primary)" }}></i>
                    Days requested: <strong>{days}</strong>
                  </div>
                </div>
              </div>
            )}

            <div className="field">
              <label className="field-label">Reason</label>
              <textarea
                className="textarea"
                placeholder="Brief reason for your leave request"
                value={form.reason}
                onChange={handleChange("reason")}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send  me-1"></i> Submit Leave Request
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
            <i className="bi bi-clock-history  me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>My Leave History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {myRequests.length} request{myRequests.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {myRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No leave requests</h3>
              <p className="empty-state__desc">You haven't requested any leave yet.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Leave Type</th>
                    <th>Start</th>
                    <th>End</th>
                    <th className="cell-numeric">Days</th>
                    <th>Status</th>
                    <th>Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {myRequests.map((r) => (
                    <tr key={r.id}>
                      <td>{r.leave_type_name}</td>
                      <td>{formatDate(r.start_date)}</td>
                      <td>{formatDate(r.end_date)}</td>
                      <td className="cell-numeric">{r.days_requested}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(r.status)}`}>
                          <span className="badge-dot"></span>
                          {r.status}
                        </span>
                        {r.status === "REJECTED" && r.rejection_reason && (
                          <div className="text-2xs text-danger mt-1">{r.rejection_reason}</div>
                        )}
                      </td>
                      <td>{r.reason || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {myRequests.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {myRequests.length} leave request{myRequests.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Pending
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Approved
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Rejected
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}