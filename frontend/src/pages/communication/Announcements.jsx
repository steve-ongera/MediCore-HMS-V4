import { useEffect, useState } from "react";
import { getAnnouncements, createAnnouncement, sendAnnouncement } from "../../services/api";

const ROLES_LIST = [
  "RECEPTIONIST", "CASHIER", "NURSE", "DOCTOR", "LAB_TECHNOLOGIST", "RADIOLOGIST",
  "PHARMACIST", "ACCOUNTANT", "MORTUARY_ATTENDANT", "HR_OFFICER", "PROCUREMENT_OFFICER",
  "AMBULANCE_DISPATCHER", "HEALTH_RECORDS_OFFICER", "MEDICAL_RECORDS_OFFICER", "BIOMEDICAL_ENGINEER",
];

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
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
    try {
      const data = await getAnnouncements({ page_size: 100 });
      setAnnouncements(data.results ?? data);
    } catch (err) { setError(err.message); }
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

  return (
    <div>
      <h1>Announcements & Communication</h1>
      <p>Send hospital-wide or role-targeted announcements — delivered as in-app notifications and bulk email simultaneously.</p>
      {error && <p>Error: {error}</p>}
      {success && <p style={{ color: "green" }}>{success}</p>}

      <h2>New Announcement</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
        <textarea placeholder="Message body" value={form.body} onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))} required rows={5} />

        <select value={form.announcement_type} onChange={(e) => setForm((p) => ({ ...p, announcement_type: e.target.value }))}>
          <option value="GENERAL">General Announcement</option>
          <option value="TRAINING">Training / Event</option>
          <option value="MAINTENANCE">System Maintenance</option>
          <option value="POLICY">Policy Update</option>
          <option value="EMERGENCY">Emergency / Critical Incident</option>
          <option value="HR_NOTICE">HR Notice</option>
        </select>

        <label>Event Date/Time (optional — for trainings, maintenance windows)</label>
        <input type="datetime-local" value={form.event_date} onChange={(e) => setForm((p) => ({ ...p, event_date: e.target.value }))} />

        <label>Attach Image (optional)</label>
        <input type="file" accept="image/*" onChange={(e) => setImage(e.target.files[0])} />

        <h3>Target Audience</h3>
        <p>Leave all unchecked to send to every active staff member.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {ROLES_LIST.map((role) => (
            <label key={role}>
              <input type="checkbox" checked={form.target_roles.includes(role)} onChange={() => toggleRole(role)} /> {role}
            </label>
          ))}
        </div>

        <h3>Delivery Channels</h3>
        <label><input type="checkbox" checked={form.send_in_app} onChange={(e) => setForm((p) => ({ ...p, send_in_app: e.target.checked }))} /> In-app notification</label>
        <label><input type="checkbox" checked={form.send_email} onChange={(e) => setForm((p) => ({ ...p, send_email: e.target.checked }))} /> Email</label>

        <button type="submit" disabled={submitting}>{submitting ? "Sending..." : "Send Announcement"}</button>
      </form>

      <h2>Sent Announcements</h2>
      <table>
        <thead><tr><th>Title</th><th>Type</th><th>Target</th><th>Recipients</th><th>Emails Sent</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          {announcements.map((a) => (
            <tr key={a.id}>
              <td>{a.title}</td><td>{a.announcement_type}</td>
              <td>{a.target_roles.length === 0 ? "All Staff" : a.target_roles.join(", ")}</td>
              <td>{a.recipient_count}</td><td>{a.email_sent_count}{a.email_failed_count > 0 && ` (${a.email_failed_count} failed)`}</td>
              <td>{a.status}</td><td>{new Date(a.created_at_display).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {announcements.length === 0 && <p>No announcements sent yet.</p>}
    </div>
  );
}