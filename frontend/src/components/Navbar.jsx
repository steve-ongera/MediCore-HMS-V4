import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import BranchSwitcher from "./BranchSwitcher.jsx";
import ChatDropdown from "./ChatDropdown.jsx";
import NotificationBell from "./NotificationBell.jsx";
import PageSearch from "./PageSearch.jsx";
import useFullscreen from "../hooks/useFullscreen.js";

// "/billing/payments" -> "Billing / Payments"
function useBreadcrumbs() {
  const { pathname } = useLocation();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return [{ label: "Dashboard", to: "/" }];

  return segments.map((segment, i) => ({
    label: segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    to: "/" + segments.slice(0, i + 1).join("/"),
  }));
}

function formatRole(role = "") {
  return role
    .split("_")
    .map((w) => w[0] + w.slice(1).toLowerCase())
    .join(" ");
}

function initials(user) {
  if (!user) return "?";
  const a = user.first_name?.[0] || user.username?.[0] || "";
  const b = user.last_name?.[0] || "";
  return (a + b).toUpperCase() || "?";
}

export default function Navbar({ onToggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const crumbs = useBreadcrumbs();

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const { isFullscreen, wantsFullscreen, enter, toggle } = useFullscreen();

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setMenuOpen(false);
    await logout();
  };

  return (
    <>
      {/* Shown after a refresh if the user was in fullscreen before —
          browsers won't let us re-enter fullscreen without a click */}
      {wantsFullscreen && !isFullscreen && (
        <div className="fullscreen-resume-banner" onClick={enter}>
          <i className="bi bi-arrows-fullscreen  me-1" aria-hidden="true" />
          Click to resume fullscreen
        </div>
      )}

      <header className="navbar">
        <div className="navbar__left">
          <button
            type="button"
            className="navbar__toggle"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
          >
            <i className="bi bi-list" style={{ fontSize: 20 }} aria-hidden="true" />
          </button>

          <nav className="navbar__breadcrumbs" aria-label="Breadcrumb">
            {crumbs.map((crumb, i) => (
              <span key={crumb.to} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                {i > 0 && <i className="bi bi-chevron-right" style={{ fontSize: 10 }} aria-hidden="true" />}
                {i === crumbs.length - 1 ? (
                  <span className="is-current">{crumb.label}</span>
                ) : (
                  <Link to={crumb.to}>{crumb.label}</Link>
                )}
              </span>
            ))}
          </nav>
        </div>

        {/* Global page search — filtered against the logged-in user's role */}
        <PageSearch />

        <div className="navbar__right">
          <BranchSwitcher />

          <ChatDropdown />

          <button
            type="button"
            className="navbar__icon-btn"
            aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            onClick={toggle}
            title={isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
          >
            <i
              className={`bi ${isFullscreen ? "bi-fullscreen-exit" : "bi-arrows-fullscreen"}`}
              style={{ fontSize: 17 }}
              aria-hidden="true"
            />
          </button>

          <NotificationBell />

          <div className="navbar__divider" />

          <div className="dropdown" ref={menuRef}>
            <button
              type="button"
              className="navbar__user"
              onClick={() => setMenuOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={menuOpen}
            >
              <span className="avatar avatar-sm">{initials(user)}</span>
              <span className="navbar__user-meta">
                <span className="navbar__user-name">{user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : user?.username}</span>
                <span className="navbar__user-role">{formatRole(user?.role)}</span>
              </span>
              <i className="bi bi-chevron-down text-faint" style={{ fontSize: 11 }} aria-hidden="true" />
            </button>

            {menuOpen && (
              <div className="dropdown-menu">
                <button type="button" className="dropdown-item" onClick={() => { setMenuOpen(false); navigate("/profile"); }}>
                  <i className="bi bi-person-circle" aria-hidden="true" />
                  My Profile
                </button>
                <button type="button" className="dropdown-item" onClick={() => { setMenuOpen(false); navigate("/settings"); }}>
                  <i className="bi bi-gear" aria-hidden="true" />
                  Settings
                </button>
                <div className="dropdown-divider" />
                <button type="button" className="dropdown-item is-danger" onClick={handleLogout}>
                  <i className="bi bi-box-arrow-right" aria-hidden="true" />
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}