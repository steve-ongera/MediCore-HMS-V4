import { useState } from "react";
import { submitContactInquiry } from "../../services/api";
import { useAuth } from "../../context/AuthContext.jsx";

export default function ContactUs() {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.full_name || "",
    email: user?.email || "",
    phone: "",
    facility_name: "",
    topic: "GENERAL",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await submitContactInquiry(form);
      setSuccess(true);
      setForm((p) => ({ ...p, message: "" }));
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Support</div>
          <h1 className="page-title">Contact Us</h1>
          <p className="page-subtitle">
            Have a question, technical issue, or need to request a license change? 
            Reach out to the MediCore support team directly.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid-4-8">
        {/* Contact Form - Main Column */}
        <div className="grid-4-8__main">
          <div className="card">
            <div className="card-body">
              {/* Success Message */}
              {success && (
                <div className="badge badge-success" style={{ 
                  fontSize: "var(--fs-sm)", 
                  padding: "var(--space-3) var(--space-4)",
                  height: "auto",
                  marginBottom: "var(--space-4)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)"
                }}>
                  <i className="bi bi-check-circle-fill"></i>
                  Your message has been sent. Our team will get back to you shortly.
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="badge badge-danger" style={{ 
                  fontSize: "var(--fs-sm)", 
                  padding: "var(--space-3) var(--space-4)",
                  height: "auto",
                  marginBottom: "var(--space-4)",
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)"
                }}>
                  <i className="bi bi-exclamation-circle-fill"></i>
                  Error: {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Name Field */}
                <div className="field">
                  <label className="field-label" htmlFor="name">
                    Your Name <span className="required">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    className="input"
                    placeholder="Your Name"
                    value={form.name}
                    onChange={handleChange("name")}
                    required
                  />
                </div>

                {/* Email Field */}
                <div className="field">
                  <label className="field-label" htmlFor="email">
                    Your Email <span className="required">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="input"
                    placeholder="Your Email"
                    value={form.email}
                    onChange={handleChange("email")}
                    required
                  />
                </div>

                {/* Phone Field */}
                <div className="field">
                  <label className="field-label" htmlFor="phone">
                    Phone <span className="text-muted text-sm">(optional)</span>
                  </label>
                  <input
                    id="phone"
                    type="text"
                    className="input"
                    placeholder="Phone (optional)"
                    value={form.phone}
                    onChange={handleChange("phone")}
                  />
                </div>

                {/* Facility Name Field */}
                <div className="field">
                  <label className="field-label" htmlFor="facility_name">
                    Facility Name
                  </label>
                  <input
                    id="facility_name"
                    type="text"
                    className="input"
                    placeholder="Facility Name"
                    value={form.facility_name}
                    onChange={handleChange("facility_name")}
                  />
                </div>

                {/* Topic Field */}
                <div className="field">
                  <label className="field-label" htmlFor="topic">
                    Topic <span className="required">*</span>
                  </label>
                  <select
                    id="topic"
                    className="select"
                    value={form.topic}
                    onChange={handleChange("topic")}
                  >
                    <option value="TECHNICAL_SUPPORT">Technical Support</option>
                    <option value="BILLING_LICENSING">Billing / Licensing</option>
                    <option value="FEATURE_REQUEST">Feature Request</option>
                    <option value="TRAINING">Training Request</option>
                    <option value="GENERAL">General Inquiry</option>
                  </select>
                </div>

                {/* Message Field */}
                <div className="field">
                  <label className="field-label" htmlFor="message">
                    Message <span className="required">*</span>
                  </label>
                  <textarea
                    id="message"
                    className="textarea"
                    placeholder="How can we help you?"
                    value={form.message}
                    onChange={handleChange("message")}
                    rows={6}
                    required
                  />
                  <span className="field-hint">
                    Please provide as much detail as possible so we can better assist you.
                  </span>
                </div>

                {/* Form Actions */}
                <div className="form-actions">
                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg" 
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner" style={{ 
                          width: "16px", 
                          height: "16px", 
                          borderWidth: "2px",
                          marginRight: "var(--space-2)"
                        }}></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-send me-2"></i>
                        Send Message
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Sidebar - Contact Info */}
        <div className="grid-4-8__sidebar">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title">Other Ways to Reach Us</h5>
            </div>
            <div className="card-body">
              <div className="flex flex-col gap-4">
                {/* Email */}
                <div className="flex items-center gap-3 p-3" style={{ 
                  background: "var(--surface-sunken)", 
                  borderRadius: "var(--radius-md)"
                }}>
                  <div className="stat-card__icon tone-info" style={{ width: "40px", height: "40px" }}>
                    <i className="bi bi-envelope" style={{ fontSize: "18px" }}></i>
                  </div>
                  <div>
                    <div className="text-2xs text-muted font-semibold uppercase">Email</div>
                    <div className="text-sm font-semibold">
                      <a href="mailto:support@medicorehospital.com" style={{ color: "var(--text-link)" }}>
                        support@medicorehospital.com
                      </a>
                    </div>
                  </div>
                </div>

                {/* Phone */}
                <div className="flex items-center gap-3 p-3" style={{ 
                  background: "var(--surface-sunken)", 
                  borderRadius: "var(--radius-md)"
                }}>
                  <div className="stat-card__icon tone-success" style={{ width: "40px", height: "40px" }}>
                    <i className="bi bi-telephone" style={{ fontSize: "18px" }}></i>
                  </div>
                  <div>
                    <div className="text-2xs text-muted font-semibold uppercase">Phone</div>
                    <div className="text-sm font-semibold">
                      <a href="tel:+254712345678" style={{ color: "var(--text-link)" }}>
                        +254 712 345 678
                      </a>
                    </div>
                  </div>
                </div>

                {/* Hours */}
                <div className="flex items-center gap-3 p-3" style={{ 
                  background: "var(--surface-sunken)", 
                  borderRadius: "var(--radius-md)"
                }}>
                  <div className="stat-card__icon tone-warning" style={{ width: "40px", height: "40px" }}>
                    <i className="bi bi-clock" style={{ fontSize: "18px" }}></i>
                  </div>
                  <div>
                    <div className="text-2xs text-muted font-semibold uppercase">Hours</div>
                    <div className="text-sm font-semibold">
                      Monday – Friday
                    </div>
                    <div className="text-xs text-muted">8:00 AM – 6:00 PM EAT</div>
                  </div>
                </div>

                {/* Divider */}
                <hr className="border-t" style={{ margin: "var(--space-2) 0" }} />

                {/* Quick Actions */}
                <div>
                  <div className="text-2xs text-muted font-semibold uppercase mb-3">Quick Links</div>
                  <div className="flex flex-col gap-2">
                    <a href="/help" className="link-btn" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <i className="bi bi-question-circle"></i>
                      Help Center
                    </a>
                    <a href="/faq" className="link-btn" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <i className="bi bi-file-text"></i>
                      FAQs
                    </a>
                    <a href="/support" className="link-btn" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                      <i className="bi bi-life-preserver"></i>
                      Support Portal
                    </a>
                  </div>
                </div>

                {/* Response Time Note */}
                <div className="p-3" style={{ 
                  background: "var(--primary-soft)", 
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--primary-soft-strong)"
                }}>
                  <div className="flex items-center gap-2">
                    <i className="bi bi-clock-history" style={{ color: "var(--primary-600)" }}></i>
                    <span className="text-xs text-muted">
                      Average response time: <strong>2-4 hours</strong>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}