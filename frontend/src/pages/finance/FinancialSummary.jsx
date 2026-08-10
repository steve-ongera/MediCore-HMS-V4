import { useEffect, useState } from "react";
import { getFinancialSummary } from "../../services/api";
import { formatCurrency, formatNumber } from "../../utils/formatters";

const PAGE_SIZE = 10;

function PaginationFooter({ totalRows, currentPage, totalPages, startIdx, onPageChange }) {
  if (totalRows === 0) return null;
  return (
    <div className="card-footer" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span className="text-tertiary text-sm">
        Showing {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, totalRows)} of {formatNumber(totalRows)}
      </span>
      <div className="flex items-center gap-2">
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <i className="bi bi-chevron-left  me-1"></i> Prev
        </button>
        <span className="text-2xs text-tertiary">Page {currentPage} of {totalPages}</span>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next <i className="bi bi-chevron-right ms-1"></i>
        </button>
      </div>
    </div>
  );
}

export default function FinancialSummary() {
  const [summary, setSummary] = useState(null);
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accountsPage, setAccountsPage] = useState(1);

  useEffect(() => { load(); }, [dateFrom, dateTo]);

  useEffect(() => { setAccountsPage(1); }, [summary]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getFinancialSummary({ date_from: dateFrom, date_to: dateTo });
      setSummary(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  if (loading && !summary) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading financial summary...</span>
      </div>
    );
  }

  const accounts = summary?.accounts || [];
  const totalRows = accounts.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / PAGE_SIZE));
  const currentPage = Math.min(accountsPage, totalPages);
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageAccounts = accounts.slice(startIdx, startIdx + PAGE_SIZE);
  const goToAccountsPage = (p) => setAccountsPage(Math.min(Math.max(1, p), totalPages));

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1 className="page-title">Financial Summary</h1>
          <p className="page-subtitle">Overview of financial performance</p>
        </div>
        <div className="page-header__actions">
          <input type="date" className="input" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={{ width: "160px" }} />
          <input type="date" className="input" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={{ width: "160px" }} />
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise  me-1"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle  me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      {summary && (
        <>
          <div className="stat-grid" style={{ marginBottom: "var(--space-6)" }}>
            <div className="stat-card">
              <div className="stat-card__top">
                <span className="stat-card__label">Total Revenue</span>
                <div className="stat-card__icon tone-success">
                  <i className="bi bi-arrow-up-circle"></i>
                </div>
              </div>
              <div className="stat-card__value" style={{ color: "var(--success-strong)" }}>
                {formatCurrency(summary.total_revenue)}
              </div>
              <div className="stat-card__footnote">Income generated</div>
            </div>

            <div className="stat-card">
              <div className="stat-card__top">
                <span className="stat-card__label">Total Expenses</span>
                <div className="stat-card__icon tone-danger">
                  <i className="bi bi-arrow-down-circle"></i>
                </div>
              </div>
              <div className="stat-card__value" style={{ color: "var(--danger-strong)" }}>
                {formatCurrency(summary.total_expenses)}
              </div>
              <div className="stat-card__footnote">Costs incurred</div>
            </div>

            <div className="stat-card">
              <div className="stat-card__top">
                <span className="stat-card__label">Net Income</span>
                <div className="stat-card__icon tone-primary">
                  <i className="bi bi-cash-stack"></i>
                </div>
              </div>
              <div className="stat-card__value" style={{ color: Number(summary.net_income) >= 0 ? "var(--success-strong)" : "var(--danger-strong)" }}>
                {formatCurrency(summary.net_income)}
              </div>
              <div className="stat-card__footnote">Profit / Loss</div>
            </div>

            <div className="stat-card">
              <div className="stat-card__top">
                <span className="stat-card__label">Outstanding Receivables</span>
                <div className="stat-card__icon tone-warning">
                  <i className="bi bi-credit-card"></i>
                </div>
              </div>
              <div className="stat-card__value" style={{ color: "var(--warning-strong)" }}>
                {formatCurrency(summary.outstanding_receivables)}
              </div>
              <div className="stat-card__footnote">Pending payments</div>
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div className="flex items-center gap-3 flex-wrap">
                <i className="bi bi-list-ul  me-1"></i>
                <h5 className="card-title" style={{ marginBottom: 0 }}>Chart of Accounts Balances</h5>
              </div>
              <div>
                <span className="text-tertiary text-sm">
                  {formatNumber(accounts.length)} account{accounts.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Type</th>
                      <th className="cell-numeric">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageAccounts.map((a) => (
                      <tr key={a.code}>
                        <td className="cell-mono">{a.code}</td>
                        <td className="cell-primary">{a.name}</td>
                        <td>
                          <span className={`badge ${a.type === "ASSET" ? "badge-success" : a.type === "LIABILITY" ? "badge-danger" : a.type === "EQUITY" ? "badge-primary" : a.type === "REVENUE" ? "badge-info" : "badge-warning"}`}>
                            <span className="badge-dot"></span>
                            {a.type}
                          </span>
                        </td>
                        <td className="cell-numeric">{formatCurrency(a.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <PaginationFooter
              totalRows={totalRows}
              currentPage={currentPage}
              totalPages={totalPages}
              startIdx={startIdx}
              onPageChange={goToAccountsPage}
            />
            {totalRows > 0 && (
              <div className="card-footer">
                <span className="text-tertiary text-sm">Legend</span>
                <div className="flex gap-2">
                  <span className="badge badge-success">
                    <span className="badge-dot"></span>
                    Asset
                  </span>
                  <span className="badge badge-danger">
                    <span className="badge-dot"></span>
                    Liability
                  </span>
                  <span className="badge badge-primary">
                    <span className="badge-dot"></span>
                    Equity
                  </span>
                  <span className="badge badge-info">
                    <span className="badge-dot"></span>
                    Revenue
                  </span>
                  <span className="badge badge-warning">
                    <span className="badge-dot"></span>
                    Expense
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}