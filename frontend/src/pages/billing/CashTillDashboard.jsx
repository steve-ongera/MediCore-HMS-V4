import { useEffect, useState } from "react";
import {
  getMyOpenShift, openCashierShift, closeCashierShift, recordCashDrop, getCashierShifts,
} from "../../services/api";
import { formatCurrency, formatDateTime } from "../../utils/formatters";

export default function CashTillDashboard() {
  const [shift, setShift] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [openingFloat, setOpeningFloat] = useState("");
  const [dropAmount, setDropAmount] = useState("");
  const [dropReason, setDropReason] = useState("");
  const [countedCash, setCountedCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [current, hist] = await Promise.all([getMyOpenShift(), getCashierShifts({ page_size: 50 })]);
      setShift(current);
      setHistory(hist.results ?? hist);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleOpen = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await openCashierShift({ opening_float: Number(openingFloat) });
      setOpeningFloat("");
      load();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await recordCashDrop(shift.id, { amount: Number(dropAmount), reason: dropReason });
      setDropAmount("");
      setDropReason("");
      load();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const handleClose = async (e) => {
    e.preventDefault();
    if (!window.confirm("Close your till? This cannot be undone.")) return;
    setSubmitting(true);
    setError("");
    try {
      await closeCashierShift(shift.id, { counted_cash: Number(countedCash), notes: closeNotes });
      setCountedCash("");
      setCloseNotes("");
      load();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "OPEN": "badge-success",
      "CLOSED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading cash till...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1 className="page-title">Cash Till</h1>
          <p className="page-subtitle">Manage your cash drawer</p>
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

      {!shift ? (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-plus-circle me-2"></i> Open Till
            </h5>
          </div>
          <div className="card-body">
            <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
              <i className="bi bi-info-circle me-1"></i>
              Count your starting cash float before beginning your shift and enter it here.
            </div>
            <form onSubmit={handleOpen}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Opening Float (KES) <span className="required">*</span></label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Enter float amount"
                    value={openingFloat}
                    onChange={(e) => setOpeningFloat(e.target.value)}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                        Opening...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cash-coin me-2"></i> Open Till
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: "var(--space-6)" }}>
            <div className="card-header">
              <div className="flex items-center gap-3 flex-wrap">
                <i className="bi bi-cash-stack me-1"></i>
                <h5 className="card-title" style={{ marginBottom: 0 }}>Current Shift</h5>
              </div>
              <div>
                <span className={`badge ${getStatusBadge(shift.status)}`}>
                  <span className="badge-dot"></span>
                  {shift.status}
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-item__label">Opened At</div>
                  <div className="info-item__value">{formatDateTime(shift.opened_at)}</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Opening Float</div>
                  <div className="info-item__value">{formatCurrency(shift.opening_float)}</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Expected Cash</div>
                  <div className="info-item__value">{formatCurrency(shift.running_expected_cash)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "var(--space-6)" }}>
            <div className="card-header">
              <h5 className="card-title">
                <i className="bi bi-arrow-up-circle me-2"></i> Cash Drops
              </h5>
            </div>
            <div className="card-body">
              <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
                <i className="bi bi-info-circle me-1"></i>
                Record mid-shift cash removal to the safe.
              </div>
              <form onSubmit={handleDrop} style={{ marginBottom: "var(--space-4)" }}>
                <div className="field-row">
                  <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="field-label">Amount <span className="required">*</span></label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Amount"
                      value={dropAmount}
                      onChange={(e) => setDropAmount(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="field-label">Reason</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Reason"
                      value={dropReason}
                      onChange={(e) => setDropReason(e.target.value)}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? (
                        <>
                          <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-arrow-up-circle me-2"></i> Record Drop
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {shift.cash_drops.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-arrow-up-circle"></i>
                  </div>
                  <h3 className="empty-state__title">No cash drops recorded</h3>
                  <p className="empty-state__desc">Record cash drops when removing money from the till.</p>
                </div>
              ) : (
                <div className="table-scroll">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th className="cell-numeric">Amount</th>
                        <th>Reason</th>
                        <th>Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shift.cash_drops.map((d) => (
                        <tr key={d.id}>
                          <td className="cell-numeric">{formatCurrency(d.amount)}</td>
                          <td>{d.reason || "—"}</td>
                          <td>{formatDateTime(d.dropped_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5 className="card-title">
                <i className="bi bi-x-circle me-2"></i> Close Till
              </h5>
            </div>
            <div className="card-body">
              <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
                <i className="bi bi-info-circle me-1"></i>
                Physically count all cash in your drawer and enter the total. The system will compare it to what's expected.
              </div>
              <form onSubmit={handleClose}>
                <div className="field-row">
                  <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="field-label">Counted Cash (KES) <span className="required">*</span></label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Counted amount"
                      value={countedCash}
                      onChange={(e) => setCountedCash(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="field-label">Notes</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Optional notes"
                      value={closeNotes}
                      onChange={(e) => setCloseNotes(e.target.value)}
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                    <button type="submit" className="btn btn-danger" disabled={submitting}>
                      {submitting ? (
                        <>
                          <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                          Closing...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-x-circle me-2"></i> Close Till
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      <div className="card" style={{ marginTop: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Shift History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {history.length} shift{history.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {history.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No shift history</h3>
              <p className="empty-state__desc">Your completed shifts will appear here.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Opened</th>
                    <th>Closed</th>
                    <th className="cell-numeric">Expected</th>
                    <th className="cell-numeric">Counted</th>
                    <th className="cell-numeric">Variance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((s) => (
                    <tr key={s.id}>
                      <td>{formatDateTime(s.opened_at)}</td>
                      <td>{s.closed_at ? formatDateTime(s.closed_at) : "—"}</td>
                      <td className="cell-numeric">{s.expected_cash != null ? formatCurrency(s.expected_cash) : "—"}</td>
                      <td className="cell-numeric">{s.counted_cash != null ? formatCurrency(s.counted_cash) : "—"}</td>
                      <td className="cell-numeric">
                        {s.variance != null ? (
                          <span className={s.variance < 0 ? "text-danger" : "text-success"}>
                            {formatCurrency(s.variance)}
                          </span>
                        ) : "—"}
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(s.status)}`}>
                          <span className="badge-dot"></span>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {history.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {history.length} shift{history.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}