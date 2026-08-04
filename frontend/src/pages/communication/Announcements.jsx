import { useEffect, useState } from "react";
import { getAnnouncements, createAnnouncement, sendAnnouncement } from "../../services/api";
import { formatDateTime } from "../../utils/formatters";

const ROLES_LIST = [
  "RECEPTIONIST", "CASHIER", "NURSE", "DOCTOR", "LAB_TECHNOLOGIST", "RADIOLOGIST",
  "PHARMACIST", "ACCOUNTANT", "MORTUARY_ATTENDANT", "HR_OFFICER", "PROCUREMENT_OFFICER",
  "AMBULANCE_DISPATCHER", "HEALTH_RECORDS_OFFICER", "MEDICAL_RECORDS_OFFICER", "BIOMEDICAL_ENGINEER",
];

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sendingId, setSendingId] = useState(null);

  const [form, setForm] = useState({
    title: "", body: "", announcement_type: "GENERAL", event_date: "",
    target_roles: [], send_email: true, send_in_app: true,
  });
  const [image, setImage] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAnnouncements({ page_size: 100 });
      setAnnouncements(data?.results ?? data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = (role) => {
    setForm((p) => ({
      ...p,
      target_roles: p.target_roles.includes(role) ? p.target_roles.filter((r) => r !== role) : [...p.target_roles, role],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const formData = new FormData();
      formData.append("title", form.title);
      formData.append("body", form.body);
      formData.append("announcement_type", form.announcement_type);
      if (form.event_date) formData.append("event_date", form.event_date);
      formData.append("send_email", form.send_email);
      formData.append("send_in_app", form.send_in_app);
      form.target_roles.forEach((r) => formData.append("target_roles", r));
      if (image) formData.append("image", image);

      const announcement = await createAnnouncement(formData);
      await sendAnnouncement(announcement.id);

      setSuccess(`Announcement sent to ${form.target_roles.length === 0 ? "all staff" : form.target_roles.join(", ")}.`);
      setForm({ title: "", body: "", announcement_type: "GENERAL", event_date: "", target_roles: [], send_email: true, send_in_app: true });
      setImage(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "SENT": "badge-success",
      "PENDING": "badge-warning",
      "FAILED": "badge-danger",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      "GENERAL": "badge-info",
      "TRAINING": "badge-primary",
      "MAINTENANCE": "badge-warning",
      "POLICY": "badge-secondary",
      "EMERGENCY": "badge-danger",
      "HR_NOTICE": "badge-success",
    };
    return typeMap[type] || "badge-neutral";
  };

  if (loading && announcements.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading announcements...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Communication</div>
          <h1 className="page-title">Announcements & Communication</h1>
          <p className="page-subtitle">Send hospital-wide or role-targeted announcements</p>
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

      {success && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--success)", background: "var(--success-soft)" }}>
          <div className="card-body">
            <div className="text-success">
              <i className="bi bi-check-circle me-2"></i> {success}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-megaphone me-2"></i> New Announcement
          </h5>
        </div>
        <div className="card-body">
          <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            <i className="bi bi-info-circle me-1"></i>
            Send hospital-wide or role-targeted announcements — delivered as in-app notifications and bulk email simultaneously.
          </div>

          <form onSubmit={handleSubmit}>
            <div className="field">
              <label className="field-label">Title <span className="required">*</span></label>
              <input
                type="text"
                className="input"
                placeholder="Announcement title"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                required
              />
            </div>

            <div className="field">
              <label className="field-label">Message Body <span className="required">*</span></label>
              <textarea
                className="textarea"
                placeholder="Message body"
                value={form.body}
                onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                required
                rows={5}
              />
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Announcement Type <span className="required">*</span></label>
                <select className="select" value={form.announcement_type} onChange={(e) => setForm((p) => ({ ...p, announcement_type: e.target.value }))}>
                  <option value="GENERAL">General Announcement</option>
                  <option value="TRAINING">Training / Event</option>
                  <option value="MAINTENANCE">System Maintenance</option>
                  <option value="POLICY">Policy Update</option>
                  <option value="EMERGENCY">Emergency / Critical Incident</option>
                  <option value="HR_NOTICE">HR Notice</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Event Date/Time</label>
                <input
                  type="datetime-local"
                  className="input"
                  value={form.event_date}
                  onChange={(e) => setForm((p) => ({ ...p, event_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Attach Image (optional)</label>
              <input
                type="file"
                className="input"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0])}
                style={{ padding: "var(--space-2)" }}
              />
            </div>

            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <i className="bi bi-people me-1"></i> Target Audience
            </h6>
            <div className="text-sm text-muted" style={{ marginBottom: "var(--space-2)" }}>
              Leave all unchecked to send to every active staff member.
            </div>
            <div className="flex flex-wrap gap-3" style={{ marginBottom: "var(--space-3)" }}>
              {ROLES_LIST.map((role) => (
                <label key={role} className="checkbox-row" style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    className="checkbox"
                    checked={form.target_roles.includes(role)}
                    onChange={() => toggleRole(role)}
                  />
                  <span className="checkbox-label">{role}</span>
                </label>
              ))}
            </div>

            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)" }}>
              <i className="bi bi-broadcast me-1"></i> Delivery Channels
            </h6>
            <div className="flex gap-4" style={{ marginBottom: "var(--space-3)" }}>
              <label className="checkbox-row" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.send_in_app}
                  onChange={(e) => setForm((p) => ({ ...p, send_in_app: e.target.checked }))}
                />
                <span className="checkbox-label">In-app notification</span>
              </label>
              <label className="checkbox-row" style={{ cursor: "pointer" }}>
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={form.send_email}
                  onChange={(e) => setForm((p) => ({ ...p, send_email: e.target.checked }))}
                />
                <span className="checkbox-label">Email</span>
              </label>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Sending...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-2"></i> Send Announcement
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
            <i className="bi bi-clock-history me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Sent Announcements</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {announcements.length} announcement{announcements.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {announcements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-megaphone"></i>
              </div>
              <h3 className="empty-state__title">No announcements sent</h3>
              <p className="empty-state__desc">Send your first announcement using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Target</th>
                    <th className="cell-numeric">Recipients</th>
                    <th>Emails Sent</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {announcements.map((a) => (
                    <tr key={a.id}>
                      <td className="cell-primary">{a.title}</td>
                      <td>
                        <span className={`badge ${getTypeBadge(a.announcement_type)}`}>
                          <span className="badge-dot"></span>
                          {a.announcement_type}
                        </span>
                      </td>
                      <td>{a.target_roles.length === 0 ? "All Staff" : a.target_roles.join(", ")}</td>
                      <td className="cell-numeric">{a.recipient_count}</td>
                      <td>
                        {a.email_sent_count}
                        {a.email_failed_count > 0 && (
                          <span className="text-danger text-2xs"> ({a.email_failed_count} failed)</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(a.status)}`}>
                          <span className="badge-dot"></span>
                          {a.status}
                        </span>
                      </td>
                      <td>{formatDateTime(a.created_at_display)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {announcements.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {announcements.length} announcement{announcements.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Sent
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Pending
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Failed
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}