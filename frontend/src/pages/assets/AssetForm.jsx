import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAssetCategories, getSuppliers, getDepartments, createAsset } from "../../services/api";

export default function AssetForm() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "", category: "", description: "", serial_number: "", manufacturer: "", model_number: "",
    supplier: "", purchase_date: "", purchase_cost: "", useful_life_years: "", salvage_value: "0",
    warranty_expiry: "", department: "", location_notes: "", condition: "GOOD",
  });

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadCategories(), loadSuppliers(), loadDepartments()]);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await getAssetCategories();
      setCategories(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const asset = await createAsset({
        ...form,
        purchase_cost: Number(form.purchase_cost),
        useful_life_years: form.useful_life_years ? Number(form.useful_life_years) : undefined,
        salvage_value: Number(form.salvage_value || 0),
        supplier: form.supplier || undefined,
        department: form.department || undefined,
        warranty_expiry: form.warranty_expiry || undefined,
        purchase_date: form.purchase_date || undefined,
      });
      navigate(`/assets/${asset.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
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
          <div className="page-eyebrow">Asset Management</div>
          <h1 className="page-title">Register Asset</h1>
          <p className="page-subtitle">Add a new asset to the register</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/assets")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Register
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

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> Asset Details
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {/* Basic Information */}
            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)" }}>
              Basic Information
            </h6>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                <label className="field-label">Asset Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Ultrasound Machine"
                  value={form.name}
                  onChange={handleChange("name")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Category <span className="required">*</span></label>
                <select className="select" value={form.category} onChange={handleChange("category")} required>
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Description</label>
              <textarea
                className="textarea"
                placeholder="Asset description"
                value={form.description}
                onChange={handleChange("description")}
              />
            </div>

            {/* Manufacturer Details */}
            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              Manufacturer Details
            </h6>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Serial Number</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Serial number"
                  value={form.serial_number}
                  onChange={handleChange("serial_number")}
                />
              </div>
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
                  placeholder="Model number"
                  value={form.model_number}
                  onChange={handleChange("model_number")}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Supplier</label>
              <select className="select" value={form.supplier} onChange={handleChange("supplier")}>
                <option value="">Select supplier (optional)</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            {/* Financial Details */}
            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              Financial Details
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
                <label className="field-label">Purchase Cost (KES) <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  value={form.purchase_cost}
                  onChange={handleChange("purchase_cost")}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Useful Life (years)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Leave blank for category default"
                  value={form.useful_life_years}
                  onChange={handleChange("useful_life_years")}
                />
                <div className="text-2xs text-tertiary" style={{ marginTop: "var(--space-1)" }}>
                  Override the category default useful life
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Salvage Value</label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  value={form.salvage_value}
                  onChange={handleChange("salvage_value")}
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

            {/* Location & Assignment */}
            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              Location & Assignment
            </h6>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Department</label>
                <select className="select" value={form.department} onChange={handleChange("department")}>
                  <option value="">Select department (optional)</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Condition</label>
                <select className="select" value={form.condition} onChange={handleChange("condition")}>
                  <option value="EXCELLENT">Excellent</option>
                  <option value="GOOD">Good</option>
                  <option value="FAIR">Fair</option>
                  <option value="POOR">Poor</option>
                  <option value="NON_FUNCTIONAL">Non-Functional</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Location Notes</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., Ward 3, Room 4, Building A"
                value={form.location_notes}
                onChange={handleChange("location_notes")}
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/assets")}
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
                    <i className="bi bi-plus-circle me-2"></i> Register Asset
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