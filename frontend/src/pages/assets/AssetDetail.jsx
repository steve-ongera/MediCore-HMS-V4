import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAsset, getDepartments, getUsers, transferAsset, disposeAsset,
  createAssetMaintenance, completeAssetMaintenance,
} from "../../services/api";

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [asset, setAsset] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [transferForm, setTransferForm] = useState({ to_department: "", to_custodian: "", reason: "" });
  const [disposeForm, setDisposeForm] = useState({ disposal_date: "", disposal_method: "SOLD", disposal_value: "0", reason: "" });
  const [maintenanceForm, setMaintenanceForm] = useState({
    maintenance_type: "PREVENTIVE", scheduled_date: "", vendor: "", cost: "", description: "",
  });

  useEffect(() => {
    load();
    loadDepartments();
    loadUsers();
  }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAsset(id);
      setAsset(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleTransferChange = (f) => (e) => setTransferForm((p) => ({ ...p, [f]: e.target.value }));
  const submitTransfer = async (e) => {
    e.preventDefault();
    try {
      await transferAsset(id, {
        to_department: transferForm.to_department || undefined,
        to_custodian: transferForm.to_custodian || undefined,
        reason: transferForm.reason,
      });
      setTransferForm({ to_department: "", to_custodian: "", reason: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleDisposeChange = (f) => (e) => setDisposeForm((p) => ({ ...p, [f]: e.target.value }));
  const submitDispose = async (e) => {
    e.preventDefault();
    if (!window.confirm("Are you sure you want to dispose this asset? This cannot be undone.")) return;
    try {
      await disposeAsset(id, { ...disposeForm, disposal_value: Number(disposeForm.disposal_value) });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleMaintenanceChange = (f) => (e) => setMaintenanceForm((p) => ({ ...p, [f]: e.target.value }));
  const submitMaintenance = async (e) => {
    e.preventDefault();
    try {
      await createAssetMaintenance({
        asset: id, ...maintenanceForm,
        cost: maintenanceForm.cost || undefined,
      });
      setMaintenanceForm({ maintenance_type: "PREVENTIVE", scheduled_date: "", vendor: "", cost: "", description: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleCompleteMaintenance = async (maintenanceId) => {
    try {
      await completeAssetMaintenance(maintenanceId);
      load();
    } catch (err) { setError(err.message); }
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "IN_USE": "badge-success",
      "IN_STORE": "badge-info",
      "UNDER_MAINTENANCE": "badge-warning",
      "DISPOSED": "badge-danger",
      "LOST": "badge-danger",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getConditionBadge = (condition) => {
    const conditionMap = {
      "NEW": "badge-success",
      "GOOD": "badge-primary",
      "FAIR": "badge-info",
      "POOR": "badge-warning",
      "UNUSABLE": "badge-danger",
    };
    return conditionMap[condition] || "badge-neutral";
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

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading asset details...</span>
      </div>
    );
  }

  if (!asset) return null;

  const isDisposed = asset.status === "DISPOSED";

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Asset Management</div>
          <h1 className="page-title">{asset.asset_tag}</h1>
          <p className="page-subtitle">{asset.name}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/assets")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Register
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

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-box fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{asset.name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-tag me-1"></i> {asset.asset_tag}
                </span>
                <span>•</span>
                <span>{asset.category_name}</span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(asset.status)}`}>
                  <span className="badge-dot"></span>
                  {asset.status.replace("_", " ")}
                </span>
                <span>•</span>
                <span className={`badge ${getConditionBadge(asset.condition)}`}>
                  <span className="badge-dot"></span>
                  {asset.condition}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-currency-dollar me-1"></i> {formatCurrency(asset.current_value)}
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Serial Number</div>
              <div className="info-item__value cell-mono">{asset.serial_number || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Manufacturer</div>
              <div className="info-item__value">{asset.manufacturer || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Model Number</div>
              <div className="info-item__value">{asset.model_number || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Supplier</div>
              <div className="info-item__value">{asset.supplier_name || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Purchase Date</div>
              <div className="info-item__value">{asset.purchase_date || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Purchase Cost</div>
              <div className="info-item__value">{formatCurrency(asset.purchase_cost)}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Useful Life</div>
              <div className="info-item__value">{asset.effective_useful_life_years} years</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Salvage Value</div>
              <div className="info-item__value">{formatCurrency(asset.salvage_value)}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Current Value</div>
              <div className="info-item__value font-bold">{formatCurrency(asset.current_value)}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Warranty</div>
              <div className="info-item__value">
                {asset.warranty_expiry || "—"}
                <div className="text-2xs">
                  <span className={`badge ${asset.is_under_warranty ? "badge-success" : "badge-neutral"}`}>
                    <span className="badge-dot"></span>
                    {asset.is_under_warranty ? "Under warranty" : "Expired/none"}
                  </span>
                </div>
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Department</div>
              <div className="info-item__value">{asset.department_name || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Location</div>
              <div className="info-item__value">{asset.location_notes || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Assigned To</div>
              <div className="info-item__value">{asset.assigned_to_name || "Unassigned"}</div>
            </div>
          </div>
        </div>
      </div>

      {!isDisposed && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-arrow-left-right me-2"></i> Transfer Asset
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitTransfer}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">To Department</label>
                  <select className="select" value={transferForm.to_department} onChange={handleTransferChange("to_department")}>
                    <option value="">Keep current department</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">To Custodian</label>
                  <select className="select" value={transferForm.to_custodian} onChange={handleTransferChange("to_custodian")}>
                    <option value="">Unassign custodian</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
              </div>
              <div className="field">
                <label className="field-label">Reason</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Reason for transfer"
                  value={transferForm.reason}
                  onChange={handleTransferChange("reason")}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-arrow-left-right me-2"></i> Transfer Asset
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Transfer History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {(asset.transfers || []).length} transfer{(asset.transfers || []).length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {(asset.transfers || []).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No transfer history</h3>
              <p className="empty-state__desc">This asset has not been transferred yet.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>From Dept</th>
                    <th>To Dept</th>
                    <th>From Custodian</th>
                    <th>To Custodian</th>
                    <th>Reason</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(asset.transfers || []).map((t) => (
                    <tr key={t.id}>
                      <td>{t.from_department_name || "—"}</td>
                      <td>{t.to_department_name || "—"}</td>
                      <td>{t.from_custodian_name || "—"}</td>
                      <td>{t.to_custodian_name || "—"}</td>
                      <td>{t.reason}</td>
                      <td>{new Date(t.transferred_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {!isDisposed && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-tools me-2"></i> Log Maintenance
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitMaintenance}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Maintenance Type <span className="required">*</span></label>
                  <select className="select" value={maintenanceForm.maintenance_type} onChange={handleMaintenanceChange("maintenance_type")}>
                    <option value="PREVENTIVE">Preventive</option>
                    <option value="CORRECTIVE">Corrective / Repair</option>
                    <option value="CALIBRATION">Calibration</option>
                    <option value="INSPECTION">Inspection</option>
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Scheduled Date <span className="required">*</span></label>
                  <input
                    type="date"
                    className="input"
                    value={maintenanceForm.scheduled_date}
                    onChange={handleMaintenanceChange("scheduled_date")}
                    required
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Vendor</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Vendor name"
                    value={maintenanceForm.vendor}
                    onChange={handleMaintenanceChange("vendor")}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Cost</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Cost"
                    value={maintenanceForm.cost}
                    onChange={handleMaintenanceChange("cost")}
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Description</label>
                <textarea
                  className="textarea"
                  placeholder="Description of maintenance"
                  value={maintenanceForm.description}
                  onChange={handleMaintenanceChange("description")}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-plus-circle me-2"></i> Log Maintenance
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clipboard me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Maintenance History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {(asset.maintenance_records || []).length} record{(asset.maintenance_records || []).length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {(asset.maintenance_records || []).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clipboard"></i>
              </div>
              <h3 className="empty-state__title">No maintenance records</h3>
              <p className="empty-state__desc">Log the first maintenance record above.</p>
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
                    <th>Vendor</th>
                    <th className="cell-numeric">Cost</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {(asset.maintenance_records || []).map((m) => (
                    <tr key={m.id}>
                      <td>{m.maintenance_type}</td>
                      <td>
                        <span className={`badge ${getMaintenanceStatusBadge(m.status)}`}>
                          <span className="badge-dot"></span>
                          {m.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{m.scheduled_date || "—"}</td>
                      <td>{m.completed_date || "—"}</td>
                      <td>{m.vendor || "—"}</td>
                      <td className="cell-numeric">{m.cost ? formatCurrency(m.cost) : "—"}</td>
                      <td className="cell-actions">
                        {(m.status === "SCHEDULED" || m.status === "IN_PROGRESS") && (
                          <button className="btn btn-success btn-sm" onClick={() => handleCompleteMaintenance(m.id)}>
                            <i className="bi bi-check me-1"></i> Complete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {!isDisposed ? (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-trash me-2"></i> Dispose Asset
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitDispose}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Disposal Date <span className="required">*</span></label>
                  <input
                    type="date"
                    className="input"
                    value={disposeForm.disposal_date}
                    onChange={handleDisposeChange("disposal_date")}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Disposal Method <span className="required">*</span></label>
                  <select className="select" value={disposeForm.disposal_method} onChange={handleDisposeChange("disposal_method")}>
                    <option value="SOLD">Sold</option>
                    <option value="SCRAPPED">Scrapped</option>
                    <option value="DONATED">Donated</option>
                    <option value="LOST">Lost</option>
                    <option value="STOLEN">Stolen</option>
                    <option value="TRADE_IN">Traded In</option>
                  </select>
                </div>
              </div>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Disposal Value</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="If sold or traded"
                    value={disposeForm.disposal_value}
                    onChange={handleDisposeChange("disposal_value")}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Reason</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Reason for disposal"
                    value={disposeForm.reason}
                    onChange={handleDisposeChange("reason")}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-danger">
                <i className="bi bi-trash me-2"></i> Dispose Asset
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-file-text me-2"></i> Disposal Record
            </h5>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <div className="info-item__label">Disposal Date</div>
                <div className="info-item__value">{asset.disposal?.disposal_date || "—"}</div>
              </div>
              <div className="info-item">
                <div className="info-item__label">Disposal Method</div>
                <div className="info-item__value">{asset.disposal?.disposal_method || "—"}</div>
              </div>
              <div className="info-item">
                <div className="info-item__label">Disposal Value</div>
                <div className="info-item__value">{formatCurrency(asset.disposal?.disposal_value || 0)}</div>
              </div>
              <div className="info-item" style={{ gridColumn: "span 2" }}>
                <div className="info-item__label">Reason</div>
                <div className="info-item__value">{asset.disposal?.reason || "—"}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}