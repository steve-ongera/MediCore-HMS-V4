import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUnreadNotifications, getNotificationUnreadCount, markNotificationRead, markAllNotificationsRead } from "../services/api";

const PRIORITY_COLOR = { CRITICAL: "#dc2626", HIGH: "#f59e0b", NORMAL: "#3b82f6", LOW: "#9ca3af" };

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  useEffect(() => {
    loadCount();
    const interval = setInterval(loadCount, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (open) loadNotifications();
  }, [open]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const loadCount = async () => {
    try {
      const data = await getNotificationUnreadCount();
      setUnreadCount(data.unread_count);
    } catch { /* silent */ }
  };

  const loadNotifications = async () => {
    try {
      const data = await getUnreadNotifications();
      setNotifications(data);
    } catch { /* silent */ }
  };

  const handleClickNotification = async (n) => {
    try {
      await markNotificationRead(n.id);
      loadCount();
      setNotifications((prev) => prev.filter((x) => x.id !== n.id));
      if (n.link) {
        setOpen(false);
        navigate(n.link);
      }
    } catch { /* silent */ }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications([]);
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  return (
    <div ref={dropdownRef} style={{ position: "relative", display: "inline-block" }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{ position: "relative" }}>
        <i className="bi bi-bell-fill"></i>
        {unreadCount > 0 && (
          <span style={{
            position: "absolute", top: -4, right: -4, background: "red", color: "white",
            borderRadius: "50%", fontSize: "10px", padding: "2px 5px",
          }}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: "absolute", right: 0, top: "100%", width: 340, maxHeight: 420, overflowY: "auto",
          background: "white", border: "1px solid #ccc", zIndex: 1000, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          <div style={{ padding: "8px 12px", borderBottom: "1px solid #eee", display: "flex", justifyContent: "space-between" }}>
            <strong>Notifications</strong>
            <button type="button" onClick={handleMarkAll}>Mark all read</button>
          </div>
          {notifications.length === 0 ? (
            <p style={{ padding: "12px" }}>No unread notifications.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClickNotification(n)}
                style={{ padding: "10px 12px", borderBottom: "1px solid #f0f0f0", cursor: "pointer", borderLeft: `3px solid ${PRIORITY_COLOR[n.priority]}` }}
              >
                <div style={{ fontWeight: "bold" }}>{n.title}</div>
                {n.message && <div style={{ fontSize: "0.85em", color: "#666" }}>{n.message}</div>}
                <div style={{ fontSize: "0.75em", color: "#999" }}>{new Date(n.created_at).toLocaleString()}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}