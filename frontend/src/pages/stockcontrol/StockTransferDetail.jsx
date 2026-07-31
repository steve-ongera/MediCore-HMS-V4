import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStockTransfer, approveStockTransfer, dispatchStockTransfer, receiveStockTransfer } from "../../services/api";
import { formatDateTime } from "../../utils/formatters";

export default function StockTransferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [transfer, setTransfer] = useState(null);
  const [quantities, setQuantities] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getStockTransfer(id);
      setTransfer(data);
      const initial = {};
      data.items.forEach((it) => { initial[it.id] = it.quantity_requested; });
      setQuantities(initial);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleApprove = async () => {
    setSubmitting(true);
    try { await approveStockTransfer(id); load(); } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const handleDispatch = async () => {
    setSubmitting(true);
    try { await dispatchStockTransfer(id, { quantities }); load(); } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const handleReceive = async () => {
    setSubmitting(true);
    try { await receiveStockTransfer(id, { quantities }); load(); } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "REQUESTED": "badge-warning",
      "APPROVED": "badge-primary",
      "DISPATCHED": "badge-info",
      "RECEIVED": "badge-success",
      "DISCREPANCY": "badge-danger",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading transfer details...</span>
      </div>
    );
  }

  if (!transfer) return null;

  const isDiscrepancy = transfer.status === "DISCREPANCY";

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Stock Control</div>
          <h1 className="page-title">{transfer.transfer_number}</h1>
          <p className="page-subtitle">{transfer.from_location_name} → {transfer.to_location_name}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/stockcontrol/transfers")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Transfers
          </button>
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

      {isDiscrepancy && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger" style={{ fontWeight: "bold" }}>
              <i className="bi bi-exclamation-triangle me-2"></i>
              DISCREPANCY — dispatched and received quantities do not match. Investigate immediately.
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-arrow-left-right fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{transfer.transfer_number}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-arrow-right me-1"></i> {transfer.from_location_name} → {transfer.to_location_name}
                </span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(transfer.status)}`}>
                  <span className="badge-dot"></span>
                  {transfer.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-person me-1"></i> {transfer.requested_by_name}
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Status</div>
              <div className="info-item__value">
                <span className={`badge ${getStatusBadge(transfer.status)}`}>
                  <span className="badge-dot"></span>
                  {transfer.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Requested By</div>
              <div className="info-item__value">{transfer.requested_by_name}</div>
            </div>
            {transfer.approved_by_name && (
              <div className="info-item">
                <div className="info-item__label">Approved By</div>
                <div className="info-item__value">{transfer.approved_by_name}</div>
              </div>
            )}
            {transfer.dispatched_by_name && (
              <div className="info-item">
                <div className="info-item__label">Dispatched By</div>
                <div className="info-item__value">{transfer.dispatched_by_name}</div>
              </div>
            )}
            {transfer.received_by_name && (
              <div className="info-item">
                <div className="info-item__label">Received By</div>
                <div className="info-item__value">{transfer.received_by_name}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Transfer Items</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {transfer.items.length} item{transfer.items.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Medicine</th>
                  <th className="cell-numeric">Requested</th>
                  <th className="cell-numeric">Dispatched</th>
                  <th className="cell-numeric">Received</th>
                  <th>Discrepancy?</th>
                </tr>
              </thead>
              <tbody>
                {transfer.items.map((it) => (
                  <tr key={it.id} style={it.has_discrepancy ? { background: "var(--danger-soft)" } : {}}>
                    <td className="cell-primary">{it.medicine_name}</td>
                    <td className="cell-numeric">{it.quantity_requested}</td>
                    <td className="cell-numeric">
                      {transfer.status === "APPROVED" ? (
                        <input
                          type="number"
                          className="input"
                          value={quantities[it.id] ?? ""}
                          onChange={(e) => setQuantities((p) => ({ ...p, [it.id]: Number(e.target.value) }))}
                          style={{ width: "100px", display: "inline-block" }}
                        />
                      ) : (it.quantity_dispatched ?? "—")}
                    </td>
                    <td className="cell-numeric">
                      {transfer.status === "DISPATCHED" ? (
                        <input
                          type="number"
                          className="input"
                          value={quantities[it.id] ?? ""}
                          onChange={(e) => setQuantities((p) => ({ ...p, [it.id]: Number(e.target.value) }))}
                          style={{ width: "100px", display: "inline-block" }}
                        />
                      ) : (it.quantity_received ?? "—")}
                    </td>
                    <td>
                      {it.has_discrepancy ? (
                        <span className="badge badge-danger">
                          <span className="badge-dot"></span>
                          YES
                        </span>
                      ) : it.quantity_received != null ? (
                        <span className="badge badge-success">
                          <span className="badge-dot"></span>
                          No
                        </span>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-arrow-right-circle me-2"></i> Actions
          </h5>
        </div>
        <div className="card-body">
          <div className="flex gap-3 flex-wrap">
            {transfer.status === "REQUESTED" && (
              <button className="btn btn-success" onClick={handleApprove} disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Approving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-circle me-2"></i> Approve Transfer
                  </>
                )}
              </button>
            )}
            {transfer.status === "APPROVED" && (
              <button className="btn btn-primary" onClick={handleDispatch} disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Dispatching...
                  </>
                ) : (
                  <>
                    <i className="bi bi-truck me-2"></i> Confirm Dispatch (what actually left)
                  </>
                )}
              </button>
            )}
            {transfer.status === "DISPATCHED" && (
              <button className="btn btn-primary" onClick={handleReceive} disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Receiving...
                  </>
                ) : (
                  <>
                    <i className="bi bi-box-seam me-2"></i> Confirm Receipt (what actually arrived)
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}