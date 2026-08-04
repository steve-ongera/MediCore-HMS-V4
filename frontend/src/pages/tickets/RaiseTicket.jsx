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
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <h1>Raise IT Support Ticket</h1>
      {error && <p>Error: {error}</p>}
      <form onSubmit={handleSubmit}>
        <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
          <option value="HARDWARE">Hardware (Printer, Scanner, PC)</option>
          <option value="NETWORK">Network / WiFi</option>
          <option value="SOFTWARE">Software / HMIS System</option>
          <option value="CCTV">CCTV / Security Systems</option>
          <option value="TELEPHONY">Telephone / Intercom</option>
          <option value="ACCOUNT_ACCESS">Account / Login Access</option>
          <option value="OTHER">Other</option>
        </select>
        <select value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
          <option value="LOW">Low</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">High</option>
          <option value="CRITICAL">Critical (Department Down)</option>
        </select>
        <input type="text" placeholder="Location (e.g. Ward 3, Reception Desk 2)" value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
        <input type="text" placeholder="Subject" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} required />
        <textarea placeholder="Describe the issue" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} required />
        <button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Ticket"}</button>
      </form>
    </div>
  );
}