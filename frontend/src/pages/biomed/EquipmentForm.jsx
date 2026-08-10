import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createEquipment, getSuppliers } from "../../services/api";

export default function EquipmentForm() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "", category: "OTHER", manufacturer: "", model_number: "", serial_number: "",
    department: "", risk_class: "MEDIUM", supplier: "", purchase_date: "", purchase_cost: "",
    warranty_expiry: "", preventive_maintenance_interval_days: "90", calibration_interval_days: "",
  });

  useEffect(() => {
    (async () => {
      try { 
        const data = await getSuppliers(); 
        setSuppliers(data.results ?? data); 
      } catch (err) { 
        setError(err.message); 
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const equipment = await createEquipment({
        ...form,
        supplier: form.supplier || undefined,
        purchase_cost: form.purchase_cost || undefined,
        purchase_date: form.purchase_date || undefined,
        warranty_expiry: form.warranty_expiry || undefined,
        preventive_maintenance_interval_days: Number(form.preventive_maintenance_interval_days),
        calibration_interval_days: form.calibration_interval_days ? Number(form.calibration_interval_days) : undefined,
      });
      navigate(`/biomed/equipment/${equipment.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading form data...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Biomedical Engineering</div>
          <h1 className="page-title">Register Equipment</h1>
          <p className="page-subtitle">Add new medical equipment to the register</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/biomed/equipment")}>
            <i className="bi bi-arrow-left  me-1"></i> Back to Register
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

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle  me-1"></i> Equipment Details
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)" }}>
              <i className="bi bi-info-circle  me-1"></i> Basic Information
            </h6>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1.5 }}>
                <label className="field-label">Equipment Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Equipment Name"
                  value={form.name}
                  onChange={handleChange("name")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Category <span className="required">*</span></label>
                <select className="select" value={form.category} onChange={handleChange("category")}>
                  <option value="DIAGNOSTIC">Diagnostic</option>
                  <option value="THERAPEUTIC">Therapeutic</option>
                  <option value="LIFE_SUPPORT">Life Support</option>
                  <option value="LABORATORY">Laboratory</option>
                  <option value="IMAGING">Imaging</option>
                  <option value="STERILIZATION">Sterilization</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Manufacturer</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Manufacturer"
                  value={form.manufacturer}
                  onChange={handleChange("manufacturer")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Model Number</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Model Number"
                  value={form.model_number}
                  onChange={handleChange("model_number")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Serial Number</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Serial Number"
                  value={form.serial_number}
                  onChange={handleChange("serial_number")}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Department / Location</label>
              <input
                type="text"
                className="input"
                placeholder="Department / Location"
                value={form.department}
                onChange={handleChange("department")}
              />
            </div>

            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <i className="bi bi-shield-check  me-1"></i> Classification
            </h6>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Risk Class <span className="required">*</span></label>
                <select className="select" value={form.risk_class} onChange={handleChange("risk_class")}>
                  <option value="LOW">Low Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="HIGH">High Risk (Life-Critical)</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Supplier</label>
                <select className="select" value={form.supplier} onChange={handleChange("supplier")}>
                  <option value="">Supplier (optional)</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <i className="bi bi-calendar  me-1"></i> Purchase & Warranty
            </h6>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Purchase Date</label>
                <input
                  type="date"
                  className="input"
                  value={form.purchase_date}
                  onChange={handleChange("purchase_date")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Purchase Cost</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Purchase Cost"
                  value={form.purchase_cost}
                  onChange={handleChange("purchase_cost")}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Warranty Expiry</label>
              <input
                type="date"
                className="input"
                value={form.warranty_expiry}
                onChange={handleChange("warranty_expiry")}
                style={{ maxWidth: "300px" }}
              />
            </div>

            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <i className="bi bi-tools  me-1"></i> Maintenance Schedule
            </h6>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Preventive Maintenance Interval (days) <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  placeholder="90"
                  value={form.preventive_maintenance_interval_days}
                  onChange={handleChange("preventive_maintenance_interval_days")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Calibration Interval (days)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Leave blank if not applicable"
                  value={form.calibration_interval_days}
                  onChange={handleChange("calibration_interval_days")}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/biomed/equipment")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Registering...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle  me-1"></i> Register Equipment
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}