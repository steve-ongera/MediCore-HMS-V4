import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getUnreadNotifications, getNotificationUnreadCount, markNotificationRead, markAllNotificationsRead } from "../services/api";

const PRIORITY_CLASS = {
  CRITICAL: "notification-bell__item--critical",
  HIGH: "notification-bell__item--high",
  NORMAL: "notification-bell__item--normal",
  LOW: "notification-bell__item--low",
};

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
    <div ref={dropdownRef} className="notification-bell">
      <button 
        type="button" 
        className="notification-bell__btn" 
        onClick={() => setOpen((o) => !o)}
        aria-label="Notifications"
      >
        <i className="bi bi-bell"></i>
        {unreadCount > 0 && (
          <span className="notification-bell__badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-bell__dropdown">
          <div className="notification-bell__header">
            <strong>Notifications</strong>
            {notifications.length > 0 && (
              <button 
                type="button" 
                className="notification-bell__mark-all" 
                onClick={handleMarkAll}
              >
                <i className="bi bi-check-all me-1"></i> Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="notification-bell__empty">
              <i className="bi bi-bell-slash icon"></i>
              No unread notifications
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`notification-bell__item ${PRIORITY_CLASS[n.priority] || ""}`}
                onClick={() => handleClickNotification(n)}
              >
                <div className="notification-bell__title">{n.title}</div>
                {n.message && <div className="notification-bell__message">{n.message}</div>}
                <div className="notification-bell__time">
                  <i className="bi bi-clock me-1"></i>
                  {new Date(n.created_at).toLocaleString()}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}