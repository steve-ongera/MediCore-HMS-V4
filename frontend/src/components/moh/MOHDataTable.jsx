// src/components/moh/MOHDataTable.jsx
import { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import { formatNumber } from "../../utils/formatters";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

export default function MOHDataTable({ endpoint, columns, filters = [], searchPlaceholder = "Search...", dateFrom, dateTo, title }) {
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [filterValues, setFilterValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const buildParams = useCallback((extra = {}) => {
    const params = { page, page_size: pageSize, date_from: dateFrom, date_to: dateTo, ...extra };
    if (search) params.search = search;
    Object.entries(filterValues).forEach(([key, value]) => {
      if (value) params[key] = value;
    });
    return params;
  }, [page, pageSize, search, filterValues, dateFrom, dateTo]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get(endpoint, { params: buildParams() });
      setRows(data.results || []);
      setCount(data.count || 0);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [endpoint, buildParams]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 whenever filters/search/date range change underneath the table
  useEffect(() => { setPage(1); }, [search, filterValues, dateFrom, dateTo]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleFilterChange = (key, value) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const response = await api.get(endpoint, {
        params: buildParams({ export: "csv" }),
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${endpoint.split("/").filter(Boolean).pop()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setDownloading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  return (
    <div className="card" style={{ marginBottom: "var(--space-6)" }}>
      <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--space-3)" }}>
        <h5 className="card-title">{title || "Detailed Records"}</h5>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap", alignItems: "center" }}>
          <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "var(--space-2)" }}>
            <input
              type="text"
              className="input"
              placeholder={searchPlaceholder}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{ width: "220px" }}
            />
            <button type="submit" className="btn btn-secondary btn-sm">
              <i className="bi bi-search"></i>
            </button>
          </form>

          {filters.map((f) => (
            <select
              key={f.key}
              className="input"
              style={{ width: "160px" }}
              value={filterValues[f.key] || ""}
              onChange={(e) => handleFilterChange(f.key, e.target.value)}
            >
              <option value="">{f.label} (All)</option>
              {f.options.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ))}

          <button className="btn btn-secondary btn-sm" onClick={handleDownload} disabled={downloading}>
            <i className={`bi ${downloading ? "bi-hourglass-split" : "bi-download"} me-1`}></i>
            {downloading ? "Preparing..." : "Download CSV"}
          </button>
        </div>
      </div>

      <div className="card-body" style={{ padding: 0 }}>
        {error && (
          <div style={{ padding: "var(--space-4)" }}>
            <div className="text-danger"><i className="bi bi-exclamation-circle me-2"></i>{error}</div>
          </div>
        )}

        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%" }}>
            <thead>
              <tr>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length} style={{ textAlign: "center", padding: "var(--space-6)" }}>
                  <div className="spinner"></div>
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={columns.length} style={{ textAlign: "center", padding: "var(--space-6)" }}>
                  No records found for the current filters.
                </td></tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={row.id ?? i}>
                    {columns.map((c) => (
                      <td key={c.key}>{c.render ? c.render(row) : (row[c.key] ?? "—")}</td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "var(--space-4)", borderTop: "1px solid var(--border)", flexWrap: "wrap", gap: "var(--space-3)"
        }}>
          <span className="text-sm text-muted">
            {count === 0 ? "0 records" : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, count)} of ${formatNumber(count)}`}
          </span>

          <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
            <select
              className="input"
              style={{ width: "90px" }}
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n} / page</option>)}
            </select>
            <button className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <i className="bi bi-chevron-left"></i>
            </button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <button className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <i className="bi bi-chevron-right"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}