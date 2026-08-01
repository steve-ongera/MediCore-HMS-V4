// src/layouts/DashboardLayout.jsx
import { useContext, useState } from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/Navbar.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { SidebarContext } from "../context/SidebarContext.jsx";
import useIdleLogout from "../hooks/useIdleLogout.js";

export default function DashboardLayout() {
  const { collapsed, toggleCollapsed } = useContext(SidebarContext);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Enforces the same 5-minute inactivity timeout the backend already
  // applies (security.middleware.SessionIdleTimeoutMiddleware) — this hook
  // just makes the frontend redirect to /login cleanly the moment the idle
  // window expires, instead of the user's next click silently 401ing.
  useIdleLogout();

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
      <Sidebar onNavigate={closeMobile} />
      <div className="app-main">
        <Navbar onToggleSidebar={toggleSidebar} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}