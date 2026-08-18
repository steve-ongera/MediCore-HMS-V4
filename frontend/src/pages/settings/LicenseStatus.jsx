import { useEffect, useState } from "react";
import { getFacilityLicense } from "../../services/api";
import { formatNumber } from "../../utils/formatters";

export default function LicenseStatus() {
  const [license, setLicense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getFacilityLicense();
      setLicense(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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

  if (error) {
    return (
      <>
        <div className="page-header">
          <div>
            <div className="page-eyebrow">Administration</div>
            <h1 className="page-title">License Status</h1>
            <p className="page-subtitle">Facility license overview</p>
          </div>
        </div>
        <div className="card" style={{ borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-1"></i> {error}
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!license) {
    return (
      <>
        <div className="page-header">
          <div>
            <div className="page-eyebrow">Administration</div>
            <h1 className="page-title">License Status</h1>
            <p className="page-subtitle">Facility license overview</p>
          </div>
        </div>
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-shield-x"></i>
              </div>
              <h3 className="empty-state__title">No license configured</h3>
              <p className="empty-state__desc">Please contact MediCore support to activate your facility license.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const bedPct = license.current_bed_count !== null 
    ? (license.current_bed_count / license.max_beds) * 100 
    : 0;
  const userPct = (license.current_user_count / license.max_users) * 100;
  const patientPct = license.max_patients 
    ? (license.current_patient_count / license.max_patients) * 100 
    : 0;
  const isExpired = license.is_expired;

  const getProgressColor = (pct) => {
    if (pct >= 100) return "var(--danger-strong)";
    if (pct >= 85) return "var(--warning-strong)";
    return "var(--primary)";
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Administration</div>
          <h1 className="page-title">License Status</h1>
          <p className="page-subtitle">Facility license overview</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-1"></i> Refresh
          </button>
        </div>
      </div>

      {isExpired && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger" style={{ fontWeight: "bold" }}>
              <i className="bi bi-exclamation-triangle me-1"></i>
              This license has expired. Contact MediCore to renew.
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-body">
          <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            <i className="bi bi-info-circle me-1"></i>
            This page is read-only. To change your package, bed limit, or user limit, please contact the
            MediCore support team — these changes can only be made by MediCore directly.
          </div>

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
        {/* Bed Capacity */}
        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Bed Capacity</span>
            <div className="stat-card__icon tone-primary">
              <i className="bi bi-bed"></i>
            </div>
          </div>
          <div className="stat-card__value">
            {license.current_bed_count !== null ? (
              `${formatNumber(license.current_bed_count)} / ${formatNumber(license.max_beds)}`
            ) : (
              "— / —"
            )}
          </div>
          <div className="stat-card__footnote">
            {license.current_bed_count !== null 
              ? `${license.beds_remaining} beds remaining` 
              : "Bed count not available"}
          </div>
          {license.current_bed_count !== null ? (
            <>
              <div style={{ marginTop: "var(--space-2)" }}>
                <div style={{ background: "var(--bg-secondary)", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                  <div 
                    style={{ 
                      width: `${Math.min(bedPct, 100)}%`, 
                      background: getProgressColor(bedPct),
                      height: "100%",
                      borderRadius: "4px",
                      transition: "width 0.3s ease"
                    }} 
                  />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
                  <span className="text-2xs text-tertiary">{bedPct.toFixed(0)}% used</span>
                  <span className="text-2xs text-tertiary">{formatNumber(license.max_beds)} total</span>
                </div>
              </div>
              {bedPct >= 85 && bedPct < 100 && (
                <div className="text-sm text-warning" style={{ marginTop: "var(--space-2)" }}>
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  Approaching your bed limit — consider contacting MediCore about upgrading your package.
                </div>
              )}
              {bedPct >= 100 && (
                <div className="text-sm text-danger" style={{ marginTop: "var(--space-2)" }}>
                  <i className="bi bi-exclamation-circle me-1"></i>
                  Bed limit reached — new beds cannot be added until you upgrade. Contact MediCore.
                </div>
              )}
            </>
          ) : (
            <div className="text-sm text-muted" style={{ marginTop: "var(--space-2)" }}>
              <i className="bi bi-info-circle me-1"></i>
              Bed count is not yet available for this deployment. Contact support if this persists.
            </div>
          )}
        </div>

        {/* User Capacity */}
        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">User Capacity</span>
            <div className="stat-card__icon tone-info">
              <i className="bi bi-people"></i>
            </div>
          </div>
          <div className="stat-card__value">
            {formatNumber(license.current_user_count)} / {formatNumber(license.max_users)}
          </div>
          <div className="stat-card__footnote">{license.users_remaining} accounts remaining</div>
          <div style={{ marginTop: "var(--space-2)" }}>
            <div style={{ background: "var(--bg-secondary)", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
              <div 
                style={{ 
                  width: `${Math.min(userPct, 100)}%`, 
                  background: getProgressColor(userPct),
                  height: "100%",
                  borderRadius: "4px",
                  transition: "width 0.3s ease"
                }} 
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <span className="text-2xs text-tertiary">{userPct.toFixed(0)}% used</span>
              <span className="text-2xs text-tertiary">{formatNumber(license.max_users)} total</span>
            </div>
          </div>
          {userPct >= 85 && userPct < 100 && (
            <div className="text-sm text-warning" style={{ marginTop: "var(--space-2)" }}>
              <i className="bi bi-exclamation-triangle me-1"></i>
              Approaching your user limit — consider contacting MediCore about upgrading your package.
            </div>
          )}
          {userPct >= 100 && (
            <div className="text-sm text-danger" style={{ marginTop: "var(--space-2)" }}>
              <i className="bi bi-exclamation-circle me-1"></i>
              User limit reached — new staff accounts cannot be added until you upgrade. Contact MediCore.
            </div>
          )}
        </div>

        {/* Patient Capacity */}
        <div className="stat-card">
          <div className="stat-card__top">
            <span className="stat-card__label">Patient Capacity</span>
            <div className="stat-card__icon tone-success">
              <i className="bi bi-person-vcard"></i>
            </div>
          </div>
          <div className="stat-card__value">
            {formatNumber(license.current_patient_count)} / {formatNumber(license.max_patients)}
          </div>
          <div className="stat-card__footnote">
            {formatNumber(license.patients_remaining)} patient slots remaining
          </div>
          <div style={{ marginTop: "var(--space-2)" }}>
            <div style={{ background: "var(--bg-secondary)", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
              <div 
                style={{ 
                  width: `${Math.min(patientPct, 100)}%`, 
                  background: getProgressColor(patientPct),
                  height: "100%",
                  borderRadius: "4px",
                  transition: "width 0.3s ease"
                }} 
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <span className="text-2xs text-tertiary">{patientPct.toFixed(0)}% used</span>
              <span className="text-2xs text-tertiary">{formatNumber(license.max_patients)} total</span>
            </div>
          </div>
          {patientPct >= 85 && patientPct < 100 && (
            <div className="text-sm text-warning" style={{ marginTop: "var(--space-2)" }}>
              <i className="bi bi-exclamation-triangle me-1"></i>
              Approaching your patient limit — consider contacting MediCore about upgrading your package.
            </div>
          )}
          {patientPct >= 100 && (
            <div className="text-sm text-danger" style={{ marginTop: "var(--space-2)" }}>
              <i className="bi bi-exclamation-circle me-1"></i>
              Patient limit reached — new patients cannot be registered until you upgrade. Contact MediCore.
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="text-sm text-muted" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <i className="bi bi-headset me-1"></i>
            To upgrade your package or adjust limits, contact MediCore support at{' '}
            <a href="mailto:support@medicorehmis.co.ke" style={{ color: "var(--primary)", textDecoration: "none" }}>
              support@medicorehmis.co.ke
            </a>
          </div>
        </div>
      </div>
    </>
  );
}