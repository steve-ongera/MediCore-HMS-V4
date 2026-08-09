// src/components/moh/MOHDataTable.jsx
import { useEffect, useState, useCallback } from "react";
import api from "../../services/api";
import { formatNumber } from "../../utils/formatters";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

export default function MOHDataTable({ 
  endpoint, 
  columns, 
  filters = [], 
  searchPlaceholder = "Search...", 
  dateFrom, 
  dateTo, 
  title 
}) {
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
    <div className="card mb-6">
      {/* Card Header - Using CSS classes */}
      <div className="card-header">
        <h5 className="card-title">{title || "Detailed Records"}</h5>
        <div className="flex gap-2 flex-wrap items-center">
          {/* Search Bar - Using search-bar component from CSS */}
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="search-bar">
              <i className="search-bar__icon bi bi-search"></i>
              <input
                type="text"
                className="search-bar__input"
                placeholder={searchPlaceholder}
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                style={{ width: "220px" }}
              />
            </div>
            <button type="submit" className="btn btn-secondary btn-sm">
              <i className="bi bi-search"></i>
            </button>
          </form>

          {/* Filters */}
          {filters.map((f) => (
            <select
              key={f.key}
              className="select"
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

          {/* Download Button */}
          <button 
            className="btn btn-secondary btn-sm" 
            onClick={handleDownload} 
            disabled={downloading}
          >
            <i className={`bi ${downloading ? "bi-hourglass-split" : "bi-download"} me-1`}></i>
            {downloading ? "Preparing..." : "Download CSV"}
          </button>
        </div>
      </div>

      {/* Card Body - Using table-wrap for table container */}
      <div className="card-body p-0">
        {error && (
          <div className="p-4">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-2"></i>{error}
            </div>
          </div>
        )}

        {/* Table Wrapper */}
        <div className="table-wrap">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="cell-primary">{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center p-6">
                      <div className="spinner"></div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={columns.length} className="text-center p-6">
                      <div className="empty-state">
                        <div className="empty-state__icon">
                          <i className="bi bi-inbox"></i>
                        </div>
                        <div className="empty-state__title">No records found</div>
                        <div className="empty-state__desc">No records found for the current filters.</div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((row, i) => (
                    <tr key={row.id ?? i} className="is-clickable">
                      {columns.map((c) => (
                        <td key={c.key} className="cell-primary">
                          {c.render ? c.render(row) : (row[c.key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table Footer with Pagination */}
        <div className="table-footer">
          <span className="table-footer__meta">
            {count === 0 
              ? "0 records" 
              : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, count)} of ${formatNumber(count)}`
            }
          </span>

          <div className="flex gap-2 items-center">
            <select
              className="select"
              style={{ width: "100px" }}
              value={pageSize}
              onChange={(e) => { 
                setPageSize(Number(e.target.value)); 
                setPage(1); 
              }}
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n} / page</option>
              ))}
            </select>
            
            <div className="pagination">
              <button 
                className="pagination__btn" 
                disabled={page <= 1} 
                onClick={() => setPage((p) => p - 1)}
              >
                <i className="bi bi-chevron-left"></i>
              </button>
              <span className="text-sm text-muted">
                Page {page} of {totalPages}
              </span>
              <button 
                className="pagination__btn" 
                disabled={page >= totalPages} 
                onClick={() => setPage((p) => p + 1)}
              >
                <i className="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}