import { useEffect, useState } from "react";
import { getAmbulances, createAmbulance, updateAmbulance, getAmbulanceMaintenanceLogs, createAmbulanceMaintenanceLog } from "../../services/api";

export default function FleetManagement() {
  const [ambulances, setAmbulances] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    registration_number: "", ambulance_type: "BASIC", make_model: "",
    capacity: "1", base_fee: "", rate_per_km: "",
  });

  const [maintenanceForm, setMaintenanceForm] = useState({
    ambulance: "", maintenance_type: "SERVICE", service_date: "",
    odometer_reading: "", vendor: "", cost: "", description: "",
  });

  useEffect(() => { load(); loadLogs(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAmbulances();
      setAmbulances(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadLogs = async () => {
    try {
      const data = await getAmbulanceMaintenanceLogs({ page_size: 50 });
      setLogs(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleFormChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createAmbulance({
        ...form,
        capacity: Number(form.capacity),
        base_fee: Number(form.base_fee || 0),
        rate_per_km: Number(form.rate_per_km || 0),
      });
      setForm({ registration_number: "", ambulance_type: "BASIC", make_model: "", capacity: "1", base_fee: "", rate_per_km: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await updateAmbulance(id, { status });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleMaintenanceChange = (f) => (e) => setMaintenanceForm((p) => ({ ...p, [f]: e.target.value }));

  const submitMaintenance = async (e) => {
    e.preventDefault();
    try {
      await createAmbulanceMaintenanceLog({
        ...maintenanceForm,
        odometer_reading: maintenanceForm.odometer_reading || undefined,
        cost: maintenanceForm.cost || undefined,
      });
      setMaintenanceForm({ ambulance: "", maintenance_type: "SERVICE", service_date: "", odometer_reading: "", vendor: "", cost: "", description: "" });
      loadLogs();
      load();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "AVAILABLE": "badge-success",
      "ON_CALL": "badge-primary",
      "UNDER_MAINTENANCE": "badge-warning",
      "OUT_OF_SERVICE": "badge-danger",
    };
    return statusMap[status] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading && ambulances.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading fleet data...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Ambulance Services</div>
          <h1 className="page-title">Fleet Management</h1>
          <p className="page-subtitle">Manage ambulances and maintenance</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => { load(); loadLogs(); }}>
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
            <i className="bi bi-plus-circle me-2"></i> Register Ambulance
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Registration Number <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., KCA 123A"
                  value={form.registration_number}
                  onChange={handleFormChange("registration_number")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1.5 }}>
                <label className="field-label">Ambulance Type <span className="required">*</span></label>
                <select className="select" value={form.ambulance_type} onChange={handleFormChange("ambulance_type")}>
                  <option value="BASIC">Basic Life Support (BLS)</option>
                  <option value="ADVANCED">Advanced Life Support (ALS)</option>
                  <option value="NEONATAL">Neonatal / ICU Transport</option>
                  <option value="PATIENT_TRANSPORT">Non-Emergency Patient Transport</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Make / Model</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Toyota Hiace"
                  value={form.make_model}
                  onChange={handleFormChange("make_model")}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Capacity <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  placeholder="Number of patients"
                  value={form.capacity}
                  onChange={handleFormChange("capacity")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Base Callout Fee (KES)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Base fee"
                  value={form.base_fee}
                  onChange={handleFormChange("base_fee")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Rate per km (KES)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Rate per km"
                  value={form.rate_per_km}
                  onChange={handleFormChange("rate_per_km")}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-plus-circle me-2"></i> Register Ambulance
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-truck me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Fleet</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {ambulances.length} ambulance{ambulances.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {ambulances.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-truck"></i>
              </div>
              <h3 className="empty-state__title">No ambulances registered</h3>
              <p className="empty-state__desc">Register your first ambulance using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Registration</th>
                    <th>Type</th>
                    <th className="cell-numeric">Capacity</th>
                    <th className="cell-numeric">Base Fee</th>
                    <th className="cell-numeric">Rate/km</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {ambulances.map((a) => (
                    <tr key={a.id}>
                      <td className="cell-mono">{a.registration_number}</td>
                      <td>{a.ambulance_type}</td>
                      <td className="cell-numeric">{a.capacity}</td>
                      <td className="cell-numeric">{formatCurrency(a.base_fee)}</td>
                      <td className="cell-numeric">{formatCurrency(a.rate_per_km)}</td>
                      <td>
                        <select
                          className="select"
                          value={a.status}
                          onChange={(e) => handleStatusChange(a.id, e.target.value)}
                          style={{ width: "180px" }}
                        >
                          <option value="AVAILABLE">Available</option>
                          <option value="ON_CALL">On Call</option>
                          <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                          <option value="OUT_OF_SERVICE">Out of Service</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {ambulances.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {ambulances.length} ambulance{ambulances.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Available
              </span>
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                On Call
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Maintenance
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Out of Service
              </span>
            </div>
          </div>
        )}
      </div>

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
                <label className="field-label">Ambulance <span className="required">*</span></label>
                <select className="select" value={maintenanceForm.ambulance} onChange={handleMaintenanceChange("ambulance")} required>
                  <option value="">Select ambulance</option>
                  {ambulances.map((a) => <option key={a.id} value={a.id}>{a.registration_number}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Maintenance Type <span className="required">*</span></label>
                <select className="select" value={maintenanceForm.maintenance_type} onChange={handleMaintenanceChange("maintenance_type")}>
                  <option value="SERVICE">Routine Service</option>
                  <option value="REPAIR">Repair</option>
                  <option value="INSPECTION">Inspection</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Service Date <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={maintenanceForm.service_date}
                  onChange={handleMaintenanceChange("service_date")}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Odometer Reading</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Odometer reading"
                  value={maintenanceForm.odometer_reading}
                  onChange={handleMaintenanceChange("odometer_reading")}
                />
              </div>
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
                placeholder="Description of maintenance work"
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

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Maintenance History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {logs.length} record{logs.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {logs.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No maintenance logs</h3>
              <p className="empty-state__desc">Log the first maintenance record above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ambulance</th>
                    <th>Type</th>
                    <th>Date</th>
                    <th>Vendor</th>
                    <th className="cell-numeric">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((l) => (
                    <tr key={l.id}>
                      <td className="cell-primary">{l.ambulance_registration}</td>
                      <td>{l.maintenance_type}</td>
                      <td>{l.service_date}</td>
                      <td>{l.vendor || "—"}</td>
                      <td className="cell-numeric">{l.cost ? formatCurrency(l.cost) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {logs.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {logs.length} maintenance record{logs.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}