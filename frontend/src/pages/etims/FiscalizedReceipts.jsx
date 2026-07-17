import { useEffect, useState } from "react";
import { getFiscalizedReceipts, retryFiscalization } from "../../services/api";

export default function FiscalizedReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getFiscalizedReceipts(params);
      setReceipts(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleRetry = async (id) => {
    try {
      await retryFiscalization(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "PENDING": "badge-warning",
      "FISCALIZED": "badge-success",
      "FAILED": "badge-danger",
      "VOIDED": "badge-neutral"
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading fiscalized receipts...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Billing & Insurance</div>
          <h1 className="page-title">Fiscalized Receipts (eTIMS)</h1>
          <p className="page-subtitle">Manage KRA fiscalized receipts</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-2"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-funnel me-1"></i>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>Filter by Status</label>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "180px" }}
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="FISCALIZED">Fiscalized</option>
                <option value="FAILED">Failed</option>
                <option value="VOIDED">Voided</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {receipts.length} receipt{receipts.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {receipts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-receipt"></i>
              </div>
              <h3 className="empty-state__title">No receipts found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No receipts with status "${statusFilter}" found.` 
                  : "Fiscalized receipts will appear here once generated."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Patient/Customer</th>
                    <th className="cell-numeric">Amount</th>
                    <th>Status</th>
                    <th>KRA Invoice #</th>
                    <th>Fiscalized At</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-primary">{r.source_description}</td>
                      <td>{r.patient_name || "—"}</td>
                      <td className="cell-numeric">KES {r.total_amount}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(r.status)}`}>
                          <span className="badge-dot"></span>
                          {r.status}
                        </span>
                      </td>
                      <td className="cell-mono">{r.kra_invoice_number || "—"}</td>
                      <td>{r.fiscalized_at ? new Date(r.fiscalized_at).toLocaleString() : "—"}</td>
                      <td className="cell-actions">
                        <div className="flex gap-1 justify-end">
                          {r.status === "FAILED" && (
                            <button 
                              className="btn btn-warning btn-sm" 
                              onClick={() => handleRetry(r.id)}
                            >
                              <i className="bi bi-arrow-clockwise me-1"></i> Retry
                            </button>
                          )}
                          {r.qr_code_url && (
                            <a 
                              href={r.qr_code_url} 
                              target="_blank" 
                              rel="noreferrer"
                              className="btn btn-secondary btn-sm"
                            >
                              <i className="bi bi-qr-code me-1"></i> QR
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {receipts.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {receipts.length} receipt{receipts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Fiscalized
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Pending
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Failed
              </span>
              <span className="badge badge-neutral">
                <span className="badge-dot"></span>
                Voided
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}