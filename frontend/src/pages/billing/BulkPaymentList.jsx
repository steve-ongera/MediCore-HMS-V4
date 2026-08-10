import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBulkPayments } from "../../services/api";

const PAGE_SIZE = 20;

export default function BulkPaymentList() {
  const [payments, setPayments] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [page, search]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      const data = await getBulkPayments(params);
      setPayments(data.results ?? data);
      setTotal(data.count ?? (data.results ?? data).length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Billing</div>
          <h1 className="page-title">Bulk Payments</h1>
          <p className="page-subtitle">Every multi-invoice payment processed across the hospital.</p>
        </div>
        <div className="page-header__actions">
          <Link to="/billing/bulk-payment" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i>
            New Bulk Payment
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div 
          className="alert alert-danger" 
          style={{ 
            marginBottom: "var(--space-4)",
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)"
          }}
        >
          <i className="bi bi-exclamation-circle-fill"></i>
          <span>Error: {error}</span>
          <button 
            className="btn-icon-only" 
            onClick={() => setError("")}
            style={{ marginLeft: "auto", color: "var(--text-tertiary)" }}
          >
            <i className="bi bi-x"></i>
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap" style={{ flex: 1 }}>
            <div className="search-bar" style={{ minWidth: "280px" }}>
              <i className="search-bar__icon bi bi-search"></i>
              <input
                type="text"
                className="search-bar__input"
                placeholder="Search by receipt #, patient name, hospital #, reference..."
                value={search}
                onChange={(e) => { 
                  setSearch(e.target.value); 
                  setPage(1); 
                }}
              />
              {search && (
                <button 
                  className="search-bar__clear" 
                  onClick={() => { setSearch(""); setPage(1); }}
                  aria-label="Clear search"
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          </div>
          <div>
            <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
              <i className={`bi ${loading ? 'bi-arrow-repeat spin' : 'bi-arrow-repeat'}`}></i>
              Refresh
            </button>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="loading-screen" style={{ minHeight: "200px" }}>
              <div className="spinner spinner-lg"></div>
              <span className="loading-screen__label">Loading bulk payments...</span>
            </div>
          ) : payments.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-credit-card"></i>
              </div>
              <div className="empty-state__title">No bulk payments found</div>
              <div className="empty-state__desc">
                {search ? "No results match your search criteria." : "Start by creating a new bulk payment."}
              </div>
              <Link to="/billing/bulk-payment" className="btn btn-primary">
                <i className="bi bi-plus-circle me-2"></i>
                Create First Bulk Payment
              </Link>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Patient</th>
                      <th style={{ textAlign: "right" }}>Total Amount</th>
                      <th>Method</th>
                      <th style={{ textAlign: "center" }}>Invoices</th>
                      <th>Cashier</th>
                      <th>Date</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p.id} className="is-clickable">
                        <td className="cell-mono">{p.receipt_number}</td>
                        <td>
                          <div className="table-row-avatar">
                            <span className="avatar avatar-sm">
                              {(p.patient_name || "?").charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <div className="cell-primary">{p.patient_name}</div>
                              <div className="text-2xs text-muted">{p.hospital_number}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <span className="font-mono font-semibold">
                            KES {Number(p.total_amount).toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-info">{p.method}</span>
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <span className="pill-count">{p.lines?.length || 0}</span>
                        </td>
                        <td>{p.cashier_name}</td>
                        <td className="text-sm text-muted">
                          {new Date(p.paid_at).toLocaleString()}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link 
                            to={`/billing/bulk-payment/${p.id}/receipt`} 
                            className="btn btn-secondary btn-sm"
                          >
                            <i className="bi bi-receipt me-1"></i>
                            View Receipt
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Pagination Footer */}
        {!loading && payments.length > 0 && (
          <div className="table-footer">
            <span className="table-footer__meta">
              Showing {Math.min((page - 1) * PAGE_SIZE + 1, total)}–{Math.min(page * PAGE_SIZE, total)} of {total} bulk payments
            </span>

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
        )}
      </div>
    </>
  );
}