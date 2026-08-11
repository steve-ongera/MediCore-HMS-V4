import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDoctorProfiles, getDoctorHolidays, createDoctorHoliday, approveDoctorHoliday, rejectDoctorHoliday } from "../../services/api";

export default function DoctorHolidaysAll() {
  const [doctors, setDoctors] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    doctor: "",
    start_date: "",
    end_date: "",
    reason: "",
  });

  useEffect(() => {
    loadDoctors();
    loadHolidays();
  }, []);

  const loadDoctors = async () => {
    try {
      const data = await getDoctorProfiles();
      setDoctors(data.results ?? data);
    } catch (err) {
      setError(err.message);
    }
  };

  const loadHolidays = async () => {
    setLoading(true);
    try {
      const data = await getDoctorHolidays({ page_size: 100 });
      setHolidays(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createDoctorHoliday(form);
      setForm({ doctor: "", start_date: "", end_date: "", reason: "" });
      await loadHolidays();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await approveDoctorHoliday(id);
      await loadHolidays();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReject = async (id) => {
    try {
      await rejectDoctorHoliday(id);
      await loadHolidays();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "REQUESTED": "badge-warning",
      "APPROVED": "badge-success",
      "REJECTED": "badge-danger",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getStatusLabel = (status) => {
    return status?.replace("_", " ") || status;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Clinical / Doctors</div>
          <h1 className="page-title">Doctor Holidays</h1>
          <p className="page-subtitle">Manage doctor leave and holiday requests</p>
        </div>
        <div className="page-header__actions">
          <Link to="/doctors" className="btn btn-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>
            Back to Doctors
          </Link>
          <button className="btn btn-secondary btn-sm" onClick={loadHolidays} disabled={loading}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
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

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">Request Holiday</h5>
        </div>
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="doctor">
                  Doctor <span className="required">*</span>
                </label>
                <select
                  id="doctor"
                  className="select"
                  value={form.doctor}
                  onChange={(e) => setForm((p) => ({ ...p, doctor: e.target.value }))}
                  required
                >
                  <option value="">Select doctor</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.full_name} {d.specialty ? `(${d.specialty})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label className="field-label" htmlFor="start_date">
                  Start Date <span className="required">*</span>
                </label>
                <input
                  id="start_date"
                  type="date"
                  className="input"
                  value={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                  required
                />
              </div>

              <div className="field">
                <label className="field-label" htmlFor="end_date">
                  End Date <span className="required">*</span>
                </label>
                <input
                  id="end_date"
                  type="date"
                  className="input"
                  value={form.end_date}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="reason">Reason</label>
              <input
                id="reason"
                type="text"
                className="input"
                placeholder="Reason for leave"
                value={form.reason}
                onChange={(e) => setForm((p) => ({ ...p, reason: e.target.value }))}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <span
                      className="spinner"
                      style={{
                        width: "16px",
                        height: "16px",
                        borderWidth: "2px",
                        marginRight: "var(--space-2)",
                      }}
                    ></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-calendar-plus me-2"></i>
                    Submit Request
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">All Holidays</h5>
          <div>
            <span className="text-tertiary text-sm">
              {holidays.length} request{holidays.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="loading-screen" style={{ minHeight: "200px" }}>
              <div className="spinner spinner-lg"></div>
              <span className="loading-screen__label">Loading holidays...</span>
            </div>
          ) : holidays.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-calendar-event"></i>
              </div>
              <div className="empty-state__title">No holiday requests</div>
              <div className="empty-state__desc">Submit a holiday request using the form above.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>From</th>
                      <th>To</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidays.map((h) => (
                      <tr key={h.id} className="is-clickable">
                        <td>
                          <div className="table-row-avatar">
                            <span className="avatar avatar-sm">
                              <i className="bi bi-person"></i>
                            </span>
                            <div>
                              <div className="cell-primary">{h.doctor_name}</div>
                              {h.specialty && (
                                <div className="text-2xs text-muted">{h.specialty}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="text-sm">{formatDate(h.start_date)}</td>
                        <td className="text-sm">{formatDate(h.end_date)}</td>
                        <td>{h.reason || "—"}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(h.status)}`}>
                            <span className="badge-dot"></span>
                            {getStatusLabel(h.status)}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {h.status === "REQUESTED" && (
                            <div className="flex gap-1 justify-end">
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleApprove(h.id)}
                              >
                                <i className="bi bi-check me-1"></i>
                                Approve
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleReject(h.id)}
                              >
                                <i className="bi bi-x me-1"></i>
                                Reject
                              </button>
                            </div>
                          )}
                          {h.status !== "REQUESTED" && (
                            <span className="text-sm text-muted">—</span>
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

        {!loading && holidays.length > 0 && (
          <div className="table-footer">
            <span className="table-footer__meta">
              Showing {holidays.length} holiday request{holidays.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}