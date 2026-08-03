// src/components/Pagination.jsx
export default function Pagination({ page, count, pageSize = 20, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));
  if (totalPages <= 1) return null;

  const currentPage = Math.min(Math.max(1, page), totalPages);
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, count);

  const goToPage = (p) => onPageChange(Math.min(Math.max(1, p), totalPages));

  return (
    <div
      className="pagination"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "var(--space-4)",
        borderTop: "1px solid var(--border-color, #e5e7eb)",
      }}
    >
      <span className="pagination__summary" style={{ fontSize: "0.875rem", color: "var(--text-muted, #6b7280)" }}>
        Showing {startIdx + 1}–{endIdx} of {count}
      </span>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => goToPage(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <i className="bi bi-chevron-left"></i> Prev
        </button>
        <span style={{ fontSize: "0.875rem" }}>
          Page {currentPage} of {totalPages}
        </span>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => goToPage(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next <i className="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>
  );
}