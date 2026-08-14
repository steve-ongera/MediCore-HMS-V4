import { useEffect, useRef, useState } from "react";

/**
 * Generic searchable dropdown. `options` is an array of objects; `getLabel`
 * renders the option's visible text (can return JSX for badges/status),
 * `getSearchText` returns the plain string used for filtering.
 */
export default function SearchableSelect({
  options, value, onChange, getLabel, getSearchText, getKey,
  placeholder = "Search and select...", disabled = false,
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const selected = options.find((o) => getKey(o) === value);

  const filtered = options.filter((o) =>
    getSearchText(o).toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option) => {
    onChange(getKey(option));
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%" }}>
      <div
        onClick={() => !disabled && setOpen((o) => !o)}
        style={{
          border: "1px solid #ccc", borderRadius: 4, padding: "8px 10px",
          cursor: disabled ? "not-allowed" : "pointer", background: disabled ? "#f5f5f5" : "white",
        }}
      >
        {selected ? getLabel(selected) : <span style={{ color: "#888" }}>{placeholder}</span>}
      </div>

      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, marginTop: 4,
          background: "white", border: "1px solid #ccc", borderRadius: 4,
          maxHeight: 280, overflowY: "auto", zIndex: 1000, boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}>
          <input
            type="text"
            autoFocus
            placeholder="Type to search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: "100%", padding: "8px", border: "none", borderBottom: "1px solid #eee" }}
          />
          {filtered.length === 0 ? (
            <div style={{ padding: "10px" }}>No matches.</div>
          ) : (
            filtered.map((o) => (
              <div
                key={getKey(o)}
                onClick={() => handleSelect(o)}
                style={{
                  padding: "8px 10px", cursor: "pointer",
                  background: getKey(o) === value ? "#eef4ff" : "white",
                  borderBottom: "1px solid #f5f5f5",
                }}
              >
                {getLabel(o)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}