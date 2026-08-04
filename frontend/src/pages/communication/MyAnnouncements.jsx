import { useEffect, useState } from "react";
import { getMyAnnouncements, markAnnouncementRead } from "../../services/api";

export default function MyAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const data = await getMyAnnouncements();
      setAnnouncements(data);
    } catch (err) { setError(err.message); }
  };

  const openAnnouncement = async (a) => {
    try { await markAnnouncementRead(a.id); } catch { /* silent */ }
  };

  return (
    <div>
      <h1>Announcements</h1>
      {error && <p>Error: {error}</p>}

      {announcements.map((a) => (
        <div key={a.id} onClick={() => openAnnouncement(a)} style={{ border: "1px solid #ddd", padding: "12px", margin: "8px 0" }}>
          <h3>{a.title}</h3>
          <small>{a.announcement_type} — {new Date(a.created_at_display).toLocaleString()} — from {a.created_by_name}</small>
          <p>{a.body}</p>
          {a.image && <img src={a.image} alt={a.title} style={{ maxWidth: "100%" }} />}
          {a.event_date && <p><strong>Event:</strong> {new Date(a.event_date).toLocaleString()}</p>}
        </div>
      ))}
      {announcements.length === 0 && <p>No announcements yet.</p>}
    </div>
  );
}