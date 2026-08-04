import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createTicket } from "../../services/api";

export default function RaiseTicket() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ category: "OTHER", priority: "MEDIUM", location: "", subject: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const ticket = await createTicket(form);
      navigate(`/tickets/${ticket.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">IT Support</div>
          <h1 className="page-title">Raise IT Support Ticket</h1>
          <p className="page-subtitle">Report an IT issue for assistance</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/tickets")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Tickets
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
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> Ticket Details
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Category <span className="required">*</span></label>
                <select className="select" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                  <option value="HARDWARE">Hardware (Printer, Scanner, PC)</option>
                  <option value="NETWORK">Network / WiFi</option>
                  <option value="SOFTWARE">Software / HMIS System</option>
                  <option value="CCTV">CCTV / Security Systems</option>
                  <option value="TELEPHONY">Telephone / Intercom</option>
                  <option value="ACCOUNT_ACCESS">Account / Login Access</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Priority <span className="required">*</span></label>
                <select className="select" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical (Department Down)</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Location</label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Ward 3, Reception Desk 2"
                value={form.location}
                onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
              />
            </div>

            <div className="field">
              <label className="field-label">Subject <span className="required">*</span></label>
              <input
                type="text"
                className="input"
                placeholder="Brief subject"
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
                required
              />
            </div>

            <div className="field">
              <label className="field-label">Description <span className="required">*</span></label>
              <textarea
                className="textarea"
                placeholder="Describe the issue in detail..."
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                required
                rows={5}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/tickets")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-2"></i> Submit Ticket
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}