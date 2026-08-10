import { useEffect, useState } from "react";
import { getMaintenanceRecords, createMaintenanceRecord, completeMaintenanceRecord, getEquipment } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";

export default function Maintenance() {
  const [records, setRecords] = useState([]);
  const [equipment, setEquipment] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({ equipment: "", maintenance_type: "PREVENTIVE", scheduled_date: "" });
  const [completingId, setCompletingId] = useState(null);
  const [completeForm, setCompleteForm] = useState({ work_done: "", cost: "" });

  useEffect(() => { loadEquipment(); }, []);
  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getMaintenanceRecords(params);
      setRecords(data.results ?? data);
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
      await createMaintenanceRecord(form);
      setForm({ equipment: "", maintenance_type: "PREVENTIVE", scheduled_date: "" });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openComplete = (id) => {
    setCompletingId(id);
    setCompleteForm({ work_done: "", cost: "" });
  };

  const submitComplete = async () => {
    try {
      await completeMaintenanceRecord(completingId, { ...completeForm, cost: Number(completeForm.cost || 0) });
      setCompletingId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "SCHEDULED": "badge-warning",
      "IN_PROGRESS": "badge-info",
      "COMPLETED": "badge-success",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      "PREVENTIVE": "badge-primary",
      "CORRECTIVE": "badge-danger",
    };
    return typeMap[type] || "badge-neutral";
  };

  if (loading && records.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading maintenance records...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Biomedical Engineering</div>
          <h1 className="page-title">Maintenance</h1>
          <p className="page-subtitle">Schedule and track equipment maintenance</p>
        </div>
        <div className="page-header__actions">
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

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle  me-1"></i> Schedule Maintenance
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1.5 }}>
                <label className="field-label">Equipment <span className="required">*</span></label>
                <select className="select" value={form.equipment} onChange={(e) => setForm((p) => ({ ...p, equipment: e.target.value }))} required>
                  <option value="">Select equipment</option>
                  {equipment.map((eq) => <option key={eq.id} value={eq.id}>{eq.asset_tag} - {eq.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Maintenance Type <span className="required">*</span></label>
                <select className="select" value={form.maintenance_type} onChange={(e) => setForm((p) => ({ ...p, maintenance_type: e.target.value }))}>
                  <option value="PREVENTIVE">Preventive</option>
                  <option value="CORRECTIVE">Corrective</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Scheduled Date <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={form.scheduled_date}
                  onChange={(e) => setForm((p) => ({ ...p, scheduled_date: e.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Scheduling...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle  me-1"></i> Schedule
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
            <i className="bi bi-funnel  me-1"></i>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>Filter by Status</label>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "180px" }}
              >
                <option value="">All</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {records.length} record{records.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {records.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-wrench"></i>
              </div>
              <h3 className="empty-state__title">No maintenance records found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No records with status "${statusFilter}" found.` 
                  : "Schedule a maintenance task using the form above."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Equipment</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Scheduled</th>
                    <th className="cell-numeric">Cost</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id}>
                      <td className="cell-primary">{r.equipment_name}</td>
                      <td>
                        <span className={`badge ${getTypeBadge(r.maintenance_type)}`}>
                          <span className="badge-dot"></span>
                          {r.maintenance_type}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(r.status)}`}>
                          <span className="badge-dot"></span>
                          {r.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{r.scheduled_date || "—"}</td>
                      <td className="cell-numeric">{formatCurrency(r.cost)}</td>
                      <td className="cell-actions">
                        {r.status !== "COMPLETED" && r.status !== "CANCELLED" && (
                          completingId === r.id ? (
                            <div className="flex gap-1" style={{ flexWrap: "wrap", minWidth: "250px" }}>
                              <input
                                type="text"
                                className="input"
                                placeholder="Work done"
                                value={completeForm.work_done}
                                onChange={(e) => setCompleteForm((p) => ({ ...p, work_done: e.target.value }))}
                                style={{ width: "140px" }}
                              />
                              <input
                                type="number"
                                className="input"
                                placeholder="Cost"
                                value={completeForm.cost}
                                onChange={(e) => setCompleteForm((p) => ({ ...p, cost: e.target.value }))}
                                style={{ width: "100px" }}
                              />
                              <button className="btn btn-success btn-sm" onClick={submitComplete}>
                                <i className="bi bi-check  me-1"></i> Confirm
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setCompletingId(null)}>
                                <i className="bi bi-x"></i>
                              </button>
                            </div>
                          ) : (
                            <button className="btn btn-success btn-sm" onClick={() => openComplete(r.id)}>
                              <i className="bi bi-check-circle  me-1"></i> Complete
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {records.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {records.length} maintenance record{records.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Scheduled
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                In Progress
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Completed
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}