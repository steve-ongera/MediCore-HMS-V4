import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getUnreadNotifications } from "../services/api";

const PRIORITY_CLASS = {
  CRITICAL: "flash-notification--critical",
  HIGH: "flash-notification--high",
  NORMAL: "flash-notification--normal",
  LOW: "flash-notification--low",
};

const PRIORITY_ICON_CLASS = {
  CRITICAL: "flash-notification__icon--critical",
  HIGH: "flash-notification__icon--high",
  NORMAL: "flash-notification__icon--normal",
  LOW: "flash-notification__icon--low",
};

const PRIORITY_ICON = {
  CRITICAL: "bi-exclamation-triangle-fill",
  HIGH: "bi-exclamation-circle-fill",
  NORMAL: "bi-info-circle-fill",
  LOW: "bi-circle-fill",
};

const AUTO_DISMISS_MS = 6000;

export default function FlashNotifications() {
  const navigate = useNavigate();
  const [flashes, setFlashes] = useState([]);
  const [exitingIds, setExitingIds] = useState(new Set());
  const seenIds = useRef(new Set());
  const isFirstLoad = useRef(true);
  const timeoutRefs = useRef({});

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, []);

  const poll = async () => {
    try {
      const data = await getUnreadNotifications();
      if (isFirstLoad.current) {
        data.forEach((n) => seenIds.current.add(n.id));
        isFirstLoad.current = false;
        return;
      }
      const fresh = data.filter((n) => !seenIds.current.has(n.id));
      fresh.forEach((n) => seenIds.current.add(n.id));
      if (fresh.length > 0) {
        setFlashes((prev) => [...fresh, ...prev].slice(0, 5));
        fresh.forEach((n) => {
          const timeoutId = setTimeout(() => {
            dismiss(n.id);
          }, AUTO_DISMISS_MS);
          timeoutRefs.current[n.id] = timeoutId;
        });
      }
    } catch { /* silent */ }
  };

  const dismiss = (id) => {
    if (timeoutRefs.current[id]) {
      clearTimeout(timeoutRefs.current[id]);
      delete timeoutRefs.current[id];
    }
    
    setExitingIds((prev) => new Set(prev).add(id));
    
    setTimeout(() => {
      setFlashes((prev) => prev.filter((f) => f.id !== id));
      setExitingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }, 250);
  };

  const handleClick = (n) => {
    dismiss(n.id);
    if (n.link) navigate(n.link);
  };

  if (flashes.length === 0) return null;

  return (
    <div className="flash-notifications">
      {flashes.map((n) => {
        const isExiting = exitingIds.has(n.id);
        const priorityClass = PRIORITY_CLASS[n.priority] || "";
        const iconClass = PRIORITY_ICON_CLASS[n.priority] || "";
        const icon = PRIORITY_ICON[n.priority] || "bi-info-circle-fill";

        return (
          <div
            key={n.id}
            className={`flash-notification ${priorityClass} ${isExiting ? "flash-notification--exiting" : ""}`}
            onClick={() => handleClick(n)}
          >
            <div className="flash-notification__header">
              <div className="flash-notification__title">
                <i className={`bi ${icon} ${iconClass}`}></i>
                {n.title}
              </div>
              <button
                type="button"
                className="flash-notification__close"
                onClick={(e) => {
                  e.stopPropagation();
                  dismiss(n.id);
                }}
                aria-label="Dismiss notification"
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            {n.message && (
              <div className="flash-notification__message">
                {n.message}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}