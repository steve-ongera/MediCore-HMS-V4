import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getEquipmentDetail, getServiceRequests, getMaintenanceRecords, getCalibrations,
  updateEquipment,
} from "../../services/api";
import { formatCurrency, formatDate, formatDateTime } from "../../utils/formatters";

export default function EquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [equipment, setEquipment] = useState(null);
  const [serviceRequests, setServiceRequests] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [calibrations, setCalibrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [eq, sr, mr, cal] = await Promise.all([
        getEquipmentDetail(id),
        getServiceRequests({ equipment: id, page_size: 50 }),
        getMaintenanceRecords({ equipment: id, page_size: 50 }),
        getCalibrations({ equipment: id, page_size: 50 }),
      ]);
      setEquipment(eq);
      setServiceRequests(sr.results ?? sr);
      setMaintenance(mr.results ?? mr);
      setCalibrations(cal.results ?? cal);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (status) => {
    try {
      await updateEquipment(id, { status });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "OPERATIONAL": "badge-success",
      "UNDER_MAINTENANCE": "badge-warning",
      "OUT_OF_SERVICE": "badge-danger",
      "AWAITING_PARTS": "badge-info",
      "DECOMMISSIONED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getRiskBadge = (risk) => {
    const riskMap = {
      "HIGH": "badge-danger",
      "MEDIUM": "badge-warning",
      "LOW": "badge-success",
    };
    return riskMap[risk] || "badge-neutral";
  };

  const getCategoryBadge = (category) => {
    const categoryMap = {
      "DIAGNOSTIC": "badge-primary",
      "THERAPEUTIC": "badge-success",
      "LIFE_SUPPORT": "badge-danger",
      "LABORATORY": "badge-info",
      "IMAGING": "badge-warning",
      "STERILIZATION": "badge-secondary",
      "OTHER": "badge-neutral",
    };
    return categoryMap[category] || "badge-neutral";
  };

  const getServiceStatusBadge = (status) => {
    const statusMap = {
      "REPORTED": "badge-warning",
      "ASSIGNED": "badge-primary",
      "IN_PROGRESS": "badge-info",
      "COMPLETED": "badge-success",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getMaintenanceStatusBadge = (status) => {
    const statusMap = {
      "SCHEDULED": "badge-warning",
      "IN_PROGRESS": "badge-info",
      "COMPLETED": "badge-success",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getCalibrationStatusBadge = (status) => {
    const statusMap = {
      "SCHEDULED": "badge-warning",
      "IN_PROGRESS": "badge-info",
      "COMPLETED": "badge-success",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading equipment details...</span>
      </div>
    );
  }

  if (!equipment) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Biomedical Engineering</div>
          <h1 className="page-title">{equipment.asset_tag}</h1>
          <p className="page-subtitle">{equipment.name}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/biomed/equipment")}>
            <i className="bi bi-arrow-left  me-1"></i> Back to Register
          </button>
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
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-tools fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{equipment.name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-tag  me-1"></i> {equipment.asset_tag}
                </span>
                <span>•</span>
                <span className={`badge ${getCategoryBadge(equipment.category)}`}>
                  <span className="badge-dot"></span>
                  {equipment.category}
                </span>
                <span>•</span>
                <span className={`badge ${getRiskBadge(equipment.risk_class)}`}>
                  <span className="badge-dot"></span>
                  {equipment.risk_class}
                </span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(equipment.status)}`}>
                  <span className="badge-dot"></span>
                  {equipment.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-calendar  me-1"></i> PM Interval: {equipment.preventive_maintenance_interval_days} days
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Manufacturer</div>
              <div className="info-item__value">{equipment.manufacturer || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Model Number</div>
              <div className="info-item__value">{equipment.model_number || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Serial Number</div>
              <div className="info-item__value cell-mono">{equipment.serial_number || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Department</div>
              <div className="info-item__value">{equipment.department || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Supplier</div>
              <div className="info-item__value">{equipment.supplier_name || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Purchase Date</div>
              <div className="info-item__value">{equipment.purchase_date ? formatDate(equipment.purchase_date) : "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Purchase Cost</div>
              <div className="info-item__value">{equipment.purchase_cost ? formatCurrency(equipment.purchase_cost) : "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Warranty Expiry</div>
              <div className="info-item__value">{equipment.warranty_expiry ? formatDate(equipment.warranty_expiry) : "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Last PM</div>
              <div className="info-item__value">{equipment.last_preventive_maintenance ? formatDate(equipment.last_preventive_maintenance) : "Never"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Next PM Due</div>
              <div className="info-item__value">{equipment.next_preventive_maintenance_due || "—"}</div>
            </div>
            {equipment.calibration_interval_days && (
              <>
                <div className="info-item">
                  <div className="info-item__label">Last Calibration</div>
                  <div className="info-item__value">{equipment.last_calibration ? formatDate(equipment.last_calibration) : "Never"}</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Next Calibration Due</div>
                  <div className="info-item__value">{equipment.next_calibration_due || "—"}</div>
                </div>
              </>
            )}
          </div>

          <div className="field" style={{ marginTop: "var(--space-3)" }}>
            <label className="field-label">Status</label>
            <select
              className="select"
              value={equipment.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              style={{ maxWidth: "250px" }}
            >
              <option value="OPERATIONAL">Operational</option>
              <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              <option value="OUT_OF_SERVICE">Out of Service</option>
              <option value="AWAITING_PARTS">Awaiting Parts</option>
              <option value="DECOMMISSIONED">Decommissioned</option>
            </select>
          </div>
        </div>
      </div>

      {/* Service Requests */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clipboard  me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Service Request History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {serviceRequests.length} request{serviceRequests.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {serviceRequests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clipboard"></i>
              </div>
              <h3 className="empty-state__title">No service requests</h3>
              <p className="empty-state__desc">No service requests have been logged for this equipment.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Request #</th>
                    <th>Priority</th>
                    <th>Problem</th>
                    <th>Status</th>
                    <th>Reported</th>
                  </tr>
                </thead>
                <tbody>
                  {serviceRequests.map((sr) => (
                    <tr key={sr.id}>
                      <td className="cell-mono">{sr.request_number}</td>
                      <td>
                        <span className={`badge ${sr.priority === "EMERGENCY" ? "badge-danger" : sr.priority === "HIGH" ? "badge-warning" : "badge-info"}`}>
                          <span className="badge-dot"></span>
                          {sr.priority}
                        </span>
                      </td>
                      <td>{sr.problem_description}</td>
                      <td>
                        <span className={`badge ${getServiceStatusBadge(sr.status)}`}>
                          <span className="badge-dot"></span>
                          {sr.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{formatDateTime(sr.reported_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Maintenance History */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-wrench  me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Maintenance History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {maintenance.length} record{maintenance.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {maintenance.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-wrench"></i>
              </div>
              <h3 className="empty-state__title">No maintenance records</h3>
              <p className="empty-state__desc">No maintenance records have been logged for this equipment.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Scheduled</th>
                    <th>Completed</th>
                    <th className="cell-numeric">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {maintenance.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <span className="tag">{m.maintenance_type}</span>
                      </td>
                      <td>
                        <span className={`badge ${getMaintenanceStatusBadge(m.status)}`}>
                          <span className="badge-dot"></span>
                          {m.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{m.scheduled_date || "—"}</td>
                      <td>{m.completed_at ? formatDateTime(m.completed_at) : "—"}</td>
                      <td className="cell-numeric">{formatCurrency(m.cost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Calibration History */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-rulers  me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Calibration History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {calibrations.length} record{calibrations.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {calibrations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-rulers"></i>
              </div>
              <h3 className="empty-state__title">No calibration records</h3>
              <p className="empty-state__desc">No calibration records have been logged for this equipment.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Scheduled</th>
                    <th>Status</th>
                    <th>Calibrated</th>
                    <th>Certificate #</th>
                  </tr>
                </thead>
                <tbody>
                  {calibrations.map((c) => (
                    <tr key={c.id}>
                      <td>{c.scheduled_date}</td>
                      <td>
                        <span className={`badge ${getCalibrationStatusBadge(c.status)}`}>
                          <span className="badge-dot"></span>
                          {c.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{c.calibrated_at ? formatDateTime(c.calibrated_at) : "—"}</td>
                      <td>{c.certificate_number || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {calibrations.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {calibrations.length} calibration record{calibrations.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}