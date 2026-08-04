import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PAGE_REGISTRY } from "../config/pageRegistry.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function PageSearch() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Only pages this user is actually allowed to see — search never leaks
  // a page's existence to someone without access to it.
  const visiblePages = useMemo(
    () => PAGE_REGISTRY.filter((p) => (p.roles === undefined ? true : hasRole(...p.roles))),
    [hasRole]
  );

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return visiblePages
      .filter((p) => p.label.toLowerCase().includes(q) || p.group.toLowerCase().includes(q))
      .slice(0, 10);
  }, [query, visiblePages]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Global keyboard shortcut: Ctrl+K / Cmd+K focuses the search box, same
  // convention as most modern dashboards.
  useEffect(() => {
    const handleKeydown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, []);

  const goTo = (page) => {
    setQuery("");
    setOpen(false);
    navigate(page.to);
  };

  const handleKeyDown = (e) => {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIndex]) goTo(results[activeIndex]);
    }
  };

  return (
    <div className="navbar__search" ref={containerRef}>
      <div className="dropdown" style={{ width: "100%" }}>
        <div className="search-bar">
          <i className="bi bi-search search-bar__icon" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            className="search-bar__input"
            placeholder="Search pages... (Ctrl+K)"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
          />
          {query && (
            <button
              type="button"
              className="search-bar__clear"
              aria-label="Clear search"
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
            >
              <i className="bi bi-x-lg" style={{ fontSize: 12 }} aria-hidden="true" />
            </button>
          )}
        </div>

        {open && query.trim() && (
          <div className="dropdown-menu align-left" style={{ width: "100%", maxHeight: 360, overflowY: "auto" }}>
            {results.length === 0 ? (
              <div className="dropdown-label" style={{ padding: "var(--space-3)", textTransform: "none", letterSpacing: 0 }}>
                No matching pages.
              </div>
            ) : (
              results.map((page, i) => (
                <button
                  type="button"
                  key={page.to}
                  className="dropdown-item"
                  onClick={() => goTo(page)}
                  onMouseEnter={() => setActiveIndex(i)}
                  style={{
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: 2,
                    background: i === activeIndex ? "var(--surface-hover)" : "transparent",
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                    <i className={`bi ${page.icon}`} aria-hidden="true" />
                    {page.label}
                  </span>
                  <small className="text-faint" style={{ marginLeft: 22 }}>{page.group}</small>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}