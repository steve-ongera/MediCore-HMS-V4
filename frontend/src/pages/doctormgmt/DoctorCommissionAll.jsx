import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDoctorCommissions, markCommissionPaid } from "../../services/api";

export default function DoctorCommissionAll() {
  const [commissions, setCommissions] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    load();
  }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page_size: 200 };
      if (statusFilter) params.status = statusFilter;
      const data = await getDoctorCommissions(params);
      setCommissions(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (id) => {
    if (!window.confirm("Mark this commission as paid?")) return;
    setProcessing(true);
    try {
      await markCommissionPaid(id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const totalOwed = commissions
    .filter((c) => c.status !== "PAID")
    .reduce((s, c) => s + Number(c.amount_earned), 0);

  const getStatusBadge = (status) => {
    const statusMap = {
      "PENDING": "badge-warning",
      "APPROVED": "badge-info",
      "PAID": "badge-success",
      "REJECTED": "badge-danger",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getStatusLabel = (status) => {
    return status?.replace("_", " ") || status;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Clinical / Doctors</div>
          <h1 className="page-title">Doctors Commission</h1>
          <p className="page-subtitle">Manage doctor commission payments</p>
        </div>
        <div className="page-header__actions">
          <Link to="/doctors" className="btn btn-secondary btn-sm">
            <i className="bi bi-arrow-left me-1"></i>
            Back to Doctors
          </Link>
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-body">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" htmlFor="statusFilter" style={{ marginBottom: 0 }}>
                Filter by Status
              </label>
              <select
                id="statusFilter"
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "160px" }}
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="PAID">Paid</option>
              </select>
            </div>

            <div className="stat-card" style={{ flex: 1, maxWidth: "300px", background: "var(--surface-sunken)" }}>
              <div className="stat-card__top">
                <div className="stat-card__label">Total Outstanding</div>
                <div className="stat-card__icon tone-warning">
                  <i className="bi bi-currency-dollar"></i>
                </div>
              </div>
              <div className="stat-card__value">
                KES {totalOwed.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">Commission Records</h5>
          <div>
            <span className="text-tertiary text-sm">
              {commissions.length} record{commissions.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="loading-screen" style={{ minHeight: "200px" }}>
              <div className="spinner spinner-lg"></div>
              <span className="loading-screen__label">Loading commissions...</span>
            </div>
          ) : commissions.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-currency-dollar"></i>
              </div>
              <div className="empty-state__title">No commission records</div>
              <div className="empty-state__desc">
                {statusFilter ? "No results match your filter." : "No commissions have been recorded yet."}
              </div>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Doctor</th>
                      <th>Patient</th>
                      <th style={{ textAlign: "right" }}>Amount</th>
                      <th>Period</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((c) => (
                      <tr key={c.id} className="is-clickable">
                        <td>
                          <div className="table-row-avatar">
                            <span className="avatar avatar-sm">
                              <i className="bi bi-person"></i>
                            </span>
                            <div>
                              <div className="cell-primary">{c.doctor_name}</div>
                            </div>
                          </div>
                        </td>
                        <td>{c.patient_name || "—"}</td>
                        <td style={{ textAlign: "right" }}>
                          <span className="font-mono font-semibold">
                            KES {Number(c.amount_earned).toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <span className="text-sm text-muted">
                            {c.period_month}/{c.period_year}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getStatusBadge(c.status)}`}>
                            <span className="badge-dot"></span>
                            {getStatusLabel(c.status)}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          {c.status !== "PAID" && (
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => handleMarkPaid(c.id)}
                              disabled={processing}
                            >
                              <i className="bi bi-check-circle me-1"></i>
                              Mark Paid
                            </button>
                          )}
                          {c.status === "PAID" && (
                            <span className="text-sm text-success">
                              <i className="bi bi-check-circle-fill me-1"></i>
                              Paid
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {!loading && commissions.length > 0 && (
          <div className="table-footer">
            <span className="table-footer__meta">
              Showing {commissions.length} commission record{commissions.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}