// src/layouts/DashboardLayout.jsx
import { useContext, useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import FlashNotifications from "../components/FlashNotifications.jsx";
import { SidebarContext } from "../context/SidebarContext.jsx";
import useIdleLogout from "../hooks/useIdleLogout.js";

export default function DashboardLayout() {
  const { collapsed, toggleCollapsed } = useContext(SidebarContext);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Enforces the same 5-minute inactivity timeout the backend already
  // applies (security.middleware.SessionIdleTimeoutMiddleware) — this hook
  // makes the frontend redirect to /login cleanly the moment the idle
  // window expires, instead of the user's next click silently 401ing, and
  // warns 1 minute ahead so the logout is never a surprise.
  const { showWarning, secondsRemaining, staySignedIn } = useIdleLogout();

  const toggleSidebar = () => {
    if (window.innerWidth < 960) {
      setMobileOpen(!mobileOpen);
    } else {
      toggleCollapsed();
    }
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className={`app-shell ${collapsed ? "is-sidebar-collapsed" : ""} ${mobileOpen ? "is-sidebar-open" : ""}`}>
      <FlashNotifications />
      <Sidebar onNavigate={closeMobile} />
      <div className="app-main">
        <Navbar onToggleSidebar={toggleSidebar} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {showWarning && (
        <div className="modal-overlay">
          <div className="modal modal-sm" role="dialog" aria-modal="true">
            <div className="modal-header">
              <div>
                <h5 className="modal-title">
                  <i className="bi bi-clock-history  me-1" style={{ color: "var(--warning-strong, #b45309)" }}></i>
                  Still there?
                </h5>
                <p className="modal-desc">
                  You've been inactive for a while. You'll be signed out in{" "}
                  <strong>{secondsRemaining}s</strong> unless you stay signed in.
                </p>
              </div>
              <button type="button" className="modal-close" onClick={staySignedIn} aria-label="Close">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-primary" onClick={staySignedIn}>
                <i className="bi bi-check-circle  me-1"></i>
                Stay Signed In
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}