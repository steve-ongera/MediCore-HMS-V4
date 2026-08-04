import { useEffect, useState } from "react";
import { getFacilityLicense, updateFacilityLicense } from "../../services/api";

export default function LicenseStatus() {
  const [license, setLicense] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getFacilityLicense();
      setLicense(data);
      if (data) setForm(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      await updateFacilityLicense(form);
      setEditing(false);
      load();
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
        <span className="loading-screen__label">Loading license information...</span>
      </div>
    );
  }

  if (!license) {
    return (
      <>
        <div className="page-header">
          <div>
            <div className="page-eyebrow">Administration</div>
            <h1 className="page-title">License Status</h1>
            <p className="page-subtitle">No license configured</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-shield-x"></i>
              </div>
              <h3 className="empty-state__title">No license configured</h3>
              <p className="empty-state__desc">Contact MediCore support to activate your facility license.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const bedPct = (license.current_bed_count / license.max_beds) * 100;
  const userPct = (license.current_user_count / license.max_users) * 100;
  const isExpired = license.is_expired;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Administration</div>
          <h1 className="page-title">License Status</h1>
          <p className="page-subtitle">Facility license and usage overview</p>
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

      {isExpired && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger" style={{ fontWeight: "bold" }}>
              <i className="bi bi-exclamation-triangle me-2"></i>
              This license has expired. Please contact MediCore support to renew.
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-shield-check fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{license.package}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-building me-1"></i> {license.licensed_to || "—"}
                </span>
                <span>•</span>
                <span className={`badge ${isExpired ? "badge-danger" : "badge-success"}`}>
                  <span className="badge-dot"></span>
                  {isExpired ? "Expired" : "Active"}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-calendar me-1"></i> Valid until {license.valid_until || "—"}
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Package</div>
              <div className="info-item__value">
                <span className="badge badge-primary">
                  <span className="badge-dot"></span>
                  {license.package}
                </span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Licensed To</div>
              <div className="info-item__value">{license.licensed_to || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Valid From</div>
              <div className="info-item__value">{license.valid_from || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Valid Until</div>
              <div className="info-item__value">{license.valid_until || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: "var(--space-6)" }}>
        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Bed Capacity</span>
            <div className="stat-card__icon tone-primary">
              <i className="bi bi-bed"></i>
            </div>
          </div>
          <div className="stat-card__value">
            {license.current_bed_count} / {license.max_beds}
          </div>
          <div className="stat-card__footnote">{license.beds_remaining} beds remaining</div>
          <div style={{ marginTop: "var(--space-2)" }}>
            <div style={{ background: "var(--bg-secondary)", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
              <div 
                style={{ 
                  width: `${Math.min(bedPct, 100)}%`, 
                  background: bedPct >= 90 ? "var(--danger-strong)" : "var(--primary)",
                  height: "100%",
                  borderRadius: "4px",
                  transition: "width 0.3s ease"
                }} 
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <span className="text-2xs text-tertiary">{bedPct.toFixed(0)}% used</span>
              <span className="text-2xs text-tertiary">{license.max_beds} total</span>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">User Capacity</span>
            <div className="stat-card__icon tone-info">
              <i className="bi bi-people"></i>
            </div>
          </div>
          <div className="stat-card__value">
            {license.current_user_count} / {license.max_users}
          </div>
          <div className="stat-card__footnote">{license.users_remaining} accounts remaining</div>
          <div style={{ marginTop: "var(--space-2)" }}>
            <div style={{ background: "var(--bg-secondary)", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
              <div 
                style={{ 
                  width: `${Math.min(userPct, 100)}%`, 
                  background: userPct >= 90 ? "var(--danger-strong)" : "var(--primary)",
                  height: "100%",
                  borderRadius: "4px",
                  transition: "width 0.3s ease"
                }} 
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <span className="text-2xs text-tertiary">{userPct.toFixed(0)}% used</span>
              <span className="text-2xs text-tertiary">{license.max_users} total</span>
            </div>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-pencil me-2"></i> Update License
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="field">
                <label className="field-label">Package</label>
                <select className="select" value={form.package} onChange={(e) => setForm((p) => ({ ...p, package: e.target.value }))}>
                  <option value="STARTER">Starter</option>
                  <option value="STANDARD">Standard</option>
                  <option value="PROFESSIONAL">Professional</option>
                  <option value="ENTERPRISE">Enterprise</option>
                  <option value="CUSTOM">Custom</option>
                </select>
              </div>

              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Max Beds</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Max Beds"
                    value={form.max_beds}
                    onChange={(e) => setForm((p) => ({ ...p, max_beds: Number(e.target.value) }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Max Users</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Max Users"
                    value={form.max_users}
                    onChange={(e) => setForm((p) => ({ ...p, max_users: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Licensed To</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Licensed To"
                  value={form.licensed_to}
                  onChange={(e) => setForm((p) => ({ ...p, licensed_to: e.target.value }))}
                />
              </div>

              <div className="field">
                <label className="field-label">Valid Until</label>
                <input
                  type="date"
                  className="input"
                  value={form.valid_until || ""}
                  onChange={(e) => setForm((p) => ({ ...p, valid_until: e.target.value }))}
                />
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditing(false)}
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
                      Saving...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-save me-2"></i> Save
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-gear me-2"></i> Actions
            </h5>
          </div>
          <div className="card-body">
            <button className="btn btn-primary" onClick={() => setEditing(true)}>
              <i className="bi bi-pencil me-2"></i> Edit License
            </button>
          </div>
        </div>
      )}
    </>
  );
}