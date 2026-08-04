import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getServiceRequests, createServiceRequest, assignServiceRequest, resolveServiceRequest, getEquipment } from "../../services/api";
import { useAuth } from "../../context/AuthContext.jsx";
import { formatCurrency } from "../../utils/formatters";

export default function ServiceRequests() {
  const { hasRole } = useAuth();
  const isBiomed = hasRole("BIOMEDICAL_ENGINEER");

  const [requests, setRequests] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ equipment: "", priority: "ROUTINE", problem_description: "" });
  const [submitting, setSubmitting] = useState(false);

  const [resolvingId, setResolvingId] = useState(null);
  const [resolveForm, setResolveForm] = useState({ work_done: "", parts_used: "", cost: "" });

  useEffect(() => { loadEquipment(); }, []);
  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getServiceRequests(params);
      setRequests(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadEquipment = async () => {
    try { 
      const data = await getEquipment({ page_size: 300 }); 
      setEquipment(data.results ?? data); 
    } catch (err) { 
      setError(err.message); 
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createServiceRequest(form);
      setForm({ equipment: "", priority: "ROUTINE", problem_description: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (id) => {
    try { await assignServiceRequest(id); load(); } catch (err) { setError(err.message); }
  };

  const openResolve = (id) => {
    setResolvingId(id);
    setResolveForm({ work_done: "", parts_used: "", cost: "" });
  };

  const submitResolve = async () => {
    try {
      await resolveServiceRequest(resolvingId, { ...resolveForm, cost: Number(resolveForm.cost || 0) });
      setResolvingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "OPEN": "badge-warning",
      "ASSIGNED": "badge-primary",
      "IN_PROGRESS": "badge-info",
      "RESOLVED": "badge-success",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getPriorityBadge = (priority) => {
    const priorityMap = {
      "EMERGENCY": "badge-danger",
      "URGENT": "badge-warning",
      "ROUTINE": "badge-info",
    };
    return priorityMap[priority] || "badge-neutral";
  };

  if (loading && requests.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading service requests...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Biomedical Engineering</div>
          <h1 className="page-title">Service Requests</h1>
          <p className="page-subtitle">Report and manage equipment service requests</p>
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

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> Report a Problem
          </h5>
        </div>
        <div className="card-body">
          <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            <i className="bi bi-info-circle me-1"></i>
            Any staff member can report a breakdown. Biomedical engineers assign and resolve requests.
          </div>
          <form onSubmit={submit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Equipment <span className="required">*</span></label>
                <select className="select" value={form.equipment} onChange={(e) => setForm((p) => ({ ...p, equipment: e.target.value }))} required>
                  <option value="">Select equipment</option>
                  {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.asset_tag} - {eq.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 0.7 }}>
                <label className="field-label">Priority <span className="required">*</span></label>
                <select className="select" value={form.priority} onChange={(e) => setForm((p) => ({ ...p, priority: e.target.value }))}>
                  <option value="ROUTINE">Routine</option>
                  <option value="URGENT">Urgent</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Problem Description <span className="required">*</span></label>
              <textarea
                className="textarea"
                placeholder="Describe the problem..."
                value={form.problem_description}
                onChange={(e) => setForm((p) => ({ ...p, problem_description: e.target.value }))}
                required
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send me-2"></i> Submit Report
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

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
                <option value="OPEN">Open</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {requests.length} request{requests.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clipboard"></i>
              </div>
              <h3 className="empty-state__title">No service requests found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No requests with status "${statusFilter}" found.` 
                  : "Report a problem using the form above."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Request #</th>
                    <th>Equipment</th>
                    <th>Priority</th>
                    <th>Problem</th>
                    <th>Status</th>
                    <th>Assigned To</th>
                    <th className="cell-numeric">Downtime (hrs)</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id} style={r.priority === "EMERGENCY" ? { background: "var(--danger-soft)" } : {}}>
                      <td className="cell-mono">{r.request_number}</td>
                      <td>
                        <div className="cell-primary">{r.equipment_name}</div>
                        <div className="text-2xs text-tertiary">{r.equipment_tag}</div>
                      </td>
                      <td>
                        <span className={`badge ${getPriorityBadge(r.priority)}`}>
                          <span className="badge-dot"></span>
                          {r.priority}
                        </span>
                      </td>
                      <td>{r.problem_description}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(r.status)}`}>
                          <span className="badge-dot"></span>
                          {r.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{r.assigned_to_name || "—"}</td>
                      <td className="cell-numeric">{r.downtime_hours}</td>
                      <td className="cell-actions">
                        <div className="flex gap-1 justify-end" style={{ flexWrap: "wrap", minWidth: "120px" }}>
                          {isBiomed && r.status === "OPEN" && (
                            <button className="btn btn-primary btn-sm" onClick={() => handleAssign(r.id)}>
                              <i className="bi bi-person-check me-1"></i> Assign
                            </button>
                          )}
                          {isBiomed && (r.status === "ASSIGNED" || r.status === "IN_PROGRESS") && (
                            resolvingId === r.id ? (
                              <div className="flex gap-1" style={{ flexWrap: "wrap", minWidth: "250px" }}>
                                <input
                                  type="text"
                                  className="input"
                                  placeholder="Work done"
                                  value={resolveForm.work_done}
                                  onChange={(e) => setResolveForm((p) => ({ ...p, work_done: e.target.value }))}
                                  style={{ width: "140px" }}
                                />
                                <input
                                  type="text"
                                  className="input"
                                  placeholder="Parts used"
                                  value={resolveForm.parts_used}
                                  onChange={(e) => setResolveForm((p) => ({ ...p, parts_used: e.target.value }))}
                                  style={{ width: "120px" }}
                                />
                                <input
                                  type="number"
                                  className="input"
                                  placeholder="Cost"
                                  value={resolveForm.cost}
                                  onChange={(e) => setResolveForm((p) => ({ ...p, cost: e.target.value }))}
                                  style={{ width: "100px" }}
                                />
                                <button className="btn btn-success btn-sm" onClick={submitResolve}>
                                  <i className="bi bi-check me-1"></i> Confirm
                                </button>
                                <button className="btn btn-secondary btn-sm" onClick={() => setResolvingId(null)}>
                                  <i className="bi bi-x"></i>
                                </button>
                              </div>
                            ) : (
                              <button className="btn btn-success btn-sm" onClick={() => openResolve(r.id)}>
                                <i className="bi bi-check-circle me-1"></i> Resolve
                              </button>
                            )
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
        {requests.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {requests.length} service request{requests.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Open
              </span>
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                Assigned
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                In Progress
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Resolved
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}