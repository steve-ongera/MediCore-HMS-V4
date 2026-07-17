import { useEffect, useState } from "react";
import { getFiscalizationConfig, updateFiscalizationConfig, createFiscalizationConfig } from "../../services/api";

export default function ETIMSConfig() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({
    kra_pin: "",
    branch_id: "00",
    cu_serial: "",
    default_vat_category: "A",
    is_active: true,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getFiscalizationConfig();
      // API returns an array; take the first active config or the first one
      if (data && data.length > 0) {
        const configData = data[0];
        setConfig(configData);
        setForm({
          kra_pin: configData.kra_pin || "",
          branch_id: configData.branch_id || "00",
          cu_serial: configData.cu_serial || "",
          default_vat_category: configData.default_vat_category || "A",
          is_active: configData.is_active !== undefined ? configData.is_active : true,
        });
      } else {
        // No config exists yet
        setConfig(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      // Validate required fields
      if (!form.kra_pin) {
        setError("KRA PIN is required.");
        setSaving(false);
        return;
      }

      if (config) {
        // Update existing config
        await updateFiscalizationConfig(config.id, form);
        setSuccess("Configuration updated successfully!");
      } else {
        // Create new config
        await createFiscalizationConfig(form);
        setSuccess("Configuration created successfully!");
      }
      await loadConfig();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getVATLabel = (code) => {
    const labels = {
      "A": "A - Exempt (0%)",
      "B": "B - Standard Rate (16%)",
      "C": "C - Zero Rated (0%)",
      "D": "D - Non-VATable",
      "E": "E - Reduced Rate (8%)",
    };
    return labels[code] || code;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading eTIMS configuration...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Billing & Insurance</div>
          <h1 className="page-title">eTIMS Configuration</h1>
          <p className="page-subtitle">KRA fiscalization settings</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={loadConfig}>
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

      {success && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--success)", background: "var(--success-soft)" }}>
          <div className="card-body">
            <div className="text-success">
              <i className="bi bi-check-circle me-2"></i> {success}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-gear me-2"></i> 
            {config ? "Update eTIMS Configuration" : "Create eTIMS Configuration"}
          </h5>
          {config && (
            <div>
              <span className={`badge ${config.is_active ? "badge-success" : "badge-neutral"}`}>
                <span className="badge-dot"></span>
                {config.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          )}
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">KRA PIN <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., A123456789Z"
                  value={form.kra_pin}
                  onChange={handleChange("kra_pin")}
                  required
                />
                <div className="text-2xs text-tertiary" style={{ marginTop: "var(--space-1)" }}>
                  The facility's KRA PIN (usually 11 characters)
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Branch ID</label>
                <input
                  type="text"
                  className="input"
                  placeholder="00"
                  value={form.branch_id}
                  onChange={handleChange("branch_id")}
                />
                <div className="text-2xs text-tertiary" style={{ marginTop: "var(--space-1)" }}>
                  Branch identifier (default: 00)
                </div>
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Control Unit Serial</label>
                <input
                  type="text"
                  className="input"
                  placeholder="CU serial number"
                  value={form.cu_serial}
                  onChange={handleChange("cu_serial")}
                />
                <div className="text-2xs text-tertiary" style={{ marginTop: "var(--space-1)" }}>
                  The Control Unit serial number provided by KRA
                </div>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Default VAT Category <span className="required">*</span></label>
                <select
                  className="select"
                  value={form.default_vat_category}
                  onChange={handleChange("default_vat_category")}
                  required
                >
                  <option value="A">A - Exempt (0%)</option>
                  <option value="B">B - Standard Rate (16%)</option>
                  <option value="C">C - Zero Rated (0%)</option>
                  <option value="D">D - Non-VATable</option>
                  <option value="E">E - Reduced Rate (8%)</option>
                </select>
                <div className="text-2xs text-tertiary" style={{ marginTop: "var(--space-1)" }}>
                  Default VAT category for fiscalized receipts
                </div>
              </div>
            </div>

            <div className="field" style={{ marginBottom: "var(--space-3)" }}>
              <label className="field-label" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  className="input"
                  style={{ width: "auto", margin: 0 }}
                  checked={form.is_active}
                  onChange={handleChange("is_active")}
                />
                <span>Enable eTIMS Fiscalization</span>
              </label>
              <div className="text-2xs text-tertiary" style={{ marginTop: "var(--space-1)" }}>
                Uncheck to temporarily disable all KRA fiscalization
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    {config ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <i className="bi bi-save me-2"></i>
                    {config ? "Update Configuration" : "Create Configuration"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {config && (
        <div className="card" style={{ marginTop: "var(--space-6)" }}>
          <div className="card-header">
            <div className="flex items-center gap-3 flex-wrap">
              <i className="bi bi-info-circle me-1"></i>
              <h5 className="card-title" style={{ marginBottom: 0 }}>Current Configuration Details</h5>
            </div>
          </div>
          <div className="card-body">
            <div className="info-grid">
              <div className="info-item">
                <div className="info-item__label">KRA PIN</div>
                <div className="info-item__value cell-mono">{config.kra_pin}</div>
              </div>
              <div className="info-item">
                <div className="info-item__label">Branch ID</div>
                <div className="info-item__value">{config.branch_id}</div>
              </div>
              <div className="info-item">
                <div className="info-item__label">Control Unit Serial</div>
                <div className="info-item__value cell-mono">{config.cu_serial || "—"}</div>
              </div>
              <div className="info-item">
                <div className="info-item__label">Default VAT Category</div>
                <div className="info-item__value">{getVATLabel(config.default_vat_category)}</div>
              </div>
              <div className="info-item">
                <div className="info-item__label">Status</div>
                <div className="info-item__value">
                  <span className={`badge ${config.is_active ? "badge-success" : "badge-neutral"}`}>
                    <span className="badge-dot"></span>
                    {config.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
              <div className="info-item">
                <div className="info-item__label">Last Updated</div>
                <div className="info-item__value">{new Date(config.updated_at).toLocaleString()}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}