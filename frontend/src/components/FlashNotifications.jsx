import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getUnreadNotifications } from "../services/api";

const PRIORITY_COLOR = { CRITICAL: "#dc2626", HIGH: "#f59e0b", NORMAL: "#3b82f6", LOW: "#9ca3af" };
const AUTO_DISMISS_MS = 6000;

export default function FlashNotifications() {
  const navigate = useNavigate();
  const [flashes, setFlashes] = useState([]);
  const seenIds = useRef(new Set());
  const isFirstLoad = useRef(true);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, []);

  const poll = async () => {
    try {
      const data = await getUnreadNotifications();
      if (isFirstLoad.current) {
        // On first load, mark everything already-unread as "seen" so we
        // don't flash-toast a huge backlog the moment the app opens —
        // only genuinely NEW notifications from here on get a flash.
        data.forEach((n) => seenIds.current.add(n.id));
        isFirstLoad.current = false;
        return;
      }
      const fresh = data.filter((n) => !seenIds.current.has(n.id));
      fresh.forEach((n) => seenIds.current.add(n.id));
      if (fresh.length > 0) {
        setFlashes((prev) => [...fresh, ...prev].slice(0, 5));
        fresh.forEach((n) => {
          setTimeout(() => {
            setFlashes((prev) => prev.filter((f) => f.id !== n.id));
          }, AUTO_DISMISS_MS);
        });
      }
    } catch { /* silent */ }
  };

  const dismiss = (id) => setFlashes((prev) => prev.filter((f) => f.id !== id));

  const handleClick = (n) => {
    dismiss(n.id);
    if (n.link) navigate(n.link);
  };

  if (flashes.length === 0) return null;

  return (
    <div style={{
      position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
      zIndex: 2000, display: "flex", flexDirection: "column", gap: "8px", width: 360,
    }}>
      {flashes.map((n) => (
        <div
          key={n.id}
          onClick={() => handleClick(n)}
          style={{
            background: "white", border: `1px solid ${PRIORITY_COLOR[n.priority]}`,
            borderLeft: `5px solid ${PRIORITY_COLOR[n.priority]}`,
            borderRadius: "6px", padding: "10px 14px", boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
            cursor: "pointer", animation: "flashSlideIn 0.3s ease-out",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{n.title}</strong>
            <button type="button" onClick={(e) => { e.stopPropagation(); dismiss(n.id); }} style={{ border: "none", background: "none", cursor: "pointer" }}>×</button>
          </div>
          {n.message && <div style={{ fontSize: "0.85em", color: "#555" }}>{n.message}</div>}
        </div>
      ))}
      <style>{`
        @keyframes flashSlideIn {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}