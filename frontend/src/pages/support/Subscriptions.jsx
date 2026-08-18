import { Link } from "react-router-dom";

const PACKAGES = [
  {
    name: "Essential",
    tier: "Clinics & Small OPD",
    patients: "Up to 300 Patients",
    beds: "0 Beds (Outpatient Only)",
    users: "Up to 5 Users",
    branches: "Single Branch",
    setupFee: "KES 30,000",
    slaFee: "KES 3,000",
    featured: false,
    modules: [
      "patients",
      "icd10",
      "Pharmacy",
      "POS",
      "medrecords",
      "licensing",
      "notifications",
      "messaging",
      "communication",
      "tickets",
      "support",
    ],
  },
  {
    name: "Professional",
    tier: "Small Hospitals & Medical Centers",
    patients: "Up to 10,000 Patients",
    beds: "Up to 30 Beds",
    users: "Up to 25 Users",
    branches: "Single Branch",
    setupFee: "KES 150,000",
    slaFee: "KES 15,000",
    featured: false,
    modules: [
      "Includes Essential modules",
      "inpatient",
      "mch",
      "etims",
      "stockcontrol",
      "leakage",
      "doctormgmt",
      "carecoordination",
      "SHA",
      "procurment",
      "Dialysis",
    ],
  },
  {
    name: "Advanced",
    tier: "Medium Level 3 & 4 Hospitals",
    patients: "Up to 50,000 Patients",
    beds: "30 – 80 Beds",
    users: "Up to 60 Users",
    branches: "Up to 2 Branches",
    setupFee: "KES 350,000",
    slaFee: "KES 35,000",
    featured: true,
    modules: [
      "Includes Professional modules",
      "emergency",
      "insurance",
      "theatre",
      "bloodbank",
      "dental",
      "eyeclinic",
      "moh",
      "pacs",
    ],
  },
  {
    name: "Enterprise",
    tier: "Level 4 Hospitals & Regional Centers",
    patients: "Up to 200,000 Patients",
    beds: "80 – 150 Beds",
    users: "Up to 150 Users",
    branches: "Multi-Branch Support",
    setupFee: "KES 650,000",
    slaFee: "KES 75,000",
    featured: false,
    modules: [
      "Includes Advanced modules",
      "assets",
      "procurement",
      "hr",
      "ambulance",
      "dialysis",
      "icu",
      "biomed",
      "branches",
      "SHA & Etims",
    ],
  },
  {
    name: "Prestige",
    tier: "Level 5 & Referral Facilities",
    patients: "Up to 600,000 Patients",
    beds: "150+ Beds (Unlimited)",
    users: "Unlimited Users",
    branches: "Multi-Hospital Mgmt",
    setupFee: "KES 1,000,000",
    slaFee: "KES 200,000",
    featured: false,
    modules: [
      "Includes Enterprise modules",
      "finance",
      "mortuary",
      "security",
      "executive",
      "insights",
      "api",
    ],
  },
];

export default function Subscriptions() {
  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Licensing & Service</div>
          <h1 className="page-title">Subscription Packages</h1>
          <p className="page-subtitle">
            MediCore HMIS deployment involves a one-time initial setup fee alongside a monthly SLA & maintenance contract. View your current status at{" "}
            <Link to="/settings/license">License Status</Link>.
          </p>
          <p className="text-sm text-muted mt-2">
            To upgrade your package or request customized deployment terms, please visit <Link to="/contact-us">Contact Us</Link>.
          </p>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "var(--space-4)",
          marginTop: "var(--space-4)",
        }}
      >
        {PACKAGES.map((pkg) => (
          <div
            key={pkg.name}
            className={`card ${pkg.featured ? "card-featured" : ""}`}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              borderColor: pkg.featured ? "var(--primary-500)" : "var(--border-subtle)",
              boxShadow: pkg.featured ? "var(--shadow-lg)" : "var(--shadow-xs)",
              transform: pkg.featured ? "scale(1.02)" : "scale(1)",
              transition:
                "transform var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard)",
            }}
          >
            {/* Featured Badge */}
            {pkg.featured && (
              <div
                style={{
                  position: "absolute",
                  top: "-12px",
                  right: "var(--space-4)",
                  background: "var(--primary-600)",
                  color: "var(--text-inverse)",
                  padding: "var(--space-1) var(--space-3)",
                  borderRadius: "var(--radius-full)",
                  fontSize: "var(--fs-2xs)",
                  fontWeight: "var(--fw-semibold)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                <i className="bi bi-star-fill" style={{ marginRight: "var(--space-1)" }}></i>
                Most Popular
              </div>
            )}

            {/* Card Body */}
            <div className="card-body" style={{ flex: 1 }}>
              {/* Package Header */}
              <div style={{ marginBottom: "var(--space-4)" }}>
                <div
                  style={{
                    fontSize: "var(--fs-2xs)",
                    fontWeight: "var(--fw-semibold)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-tertiary)",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  {pkg.tier}
                </div>
                <h3 className="h3" style={{ marginBottom: "var(--space-1)" }}>
                  {pkg.name}
                </h3>

                {/* Pricing Breakdown: One-time Setup + Monthly SLA */}
                <div
                  style={{
                    marginTop: "var(--space-3)",
                    padding: "var(--space-2) var(--space-3)",
                    background: "var(--surface-subtle)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ marginBottom: "var(--space-1)" }}>
                    <span style={{ fontSize: "var(--fs-2xs)", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                      Setup Fee (One-Time)
                    </span>
                    <div
                      style={{
                        fontSize: "var(--fs-xl)",
                        fontWeight: "var(--fw-bold)",
                        color: "var(--text-primary)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {pkg.setupFee}
                    </div>
                  </div>
                  <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "var(--space-1)" }}>
                    <span style={{ fontSize: "var(--fs-2xs)", color: "var(--text-tertiary)", textTransform: "uppercase" }}>
                      Monthly SLA & Maintenance
                    </span>
                    <div
                      style={{
                        fontSize: "var(--fs-md)",
                        fontWeight: "var(--fw-semibold)",
                        color: "var(--primary-600)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {pkg.slaFee} <span style={{ fontSize: "var(--fs-xs)", fontWeight: "normal" }}>/ month</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Package Specs */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                  marginBottom: "var(--space-4)",
                  padding: "var(--space-3)",
                  background: "var(--surface-sunken)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <div className="flex items-center gap-2">
                  <i className="bi bi-person-badge" style={{ color: "var(--text-tertiary)" }}></i>
                  <span className="text-sm font-medium">{pkg.patients}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="bi bi-hospital" style={{ color: "var(--text-tertiary)" }}></i>
                  <span className="text-sm font-medium">{pkg.beds}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="bi bi-people" style={{ color: "var(--text-tertiary)" }}></i>
                  <span className="text-sm font-medium">{pkg.users}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="bi bi-diagram-3" style={{ color: "var(--text-tertiary)" }}></i>
                  <span className="text-sm font-medium">{pkg.branches}</span>
                </div>
              </div>

              {/* Modules List */}
              <div style={{ marginBottom: "var(--space-4)" }}>
                <div
                  style={{
                    fontSize: "var(--fs-2xs)",
                    fontWeight: "var(--fw-semibold)",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    color: "var(--text-tertiary)",
                    marginBottom: "var(--space-2)",
                  }}
                >
                  Enabled System Modules ({pkg.modules.length})
                </div>
                <ul
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--space-2)",
                    padding: 0,
                    margin: 0,
                    listStyle: "none",
                  }}
                >
                  {pkg.modules.map((m, index) => (
                    <li key={index} className="flex items-start gap-2" style={{ fontSize: "var(--fs-sm)" }}>
                      <i
                        className="bi bi-check-circle-fill"
                        style={{
                          color: "var(--primary-500)",
                          fontSize: "14px",
                          marginTop: "2px",
                          flexShrink: 0,
                        }}
                      ></i>
                      <span
                        style={{
                          color: m.startsWith("Includes") ? "var(--text-primary)" : "var(--text-secondary)",
                          fontWeight: m.startsWith("Includes") ? "var(--fw-semibold)" : "normal",
                          fontFamily: m.startsWith("Includes") ? "inherit" : "var(--font-mono)",
                        }}
                      >
                        {m}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Card Footer */}
            <div
              className="card-footer"
              style={{
                flexShrink: 0,
                flexDirection: "column",
                gap: "var(--space-2)",
              }}
            >
              <Link
                to="/contact-us"
                className={`btn ${pkg.featured ? "btn-primary" : "btn-secondary"} btn-block`}
              >
                {pkg.name === "Prestige" ? "Contact Enterprise Sales" : "Request Deployment"}
                <i className="bi bi-arrow-right" style={{ marginLeft: "var(--space-2)" }}></i>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* SLA & Support Card */}
      <div className="card" style={{ marginTop: "var(--space-6)" }}>
        <div
          className="card-body"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: "var(--space-3)",
          }}
        >
          <div className="stat-card__icon tone-info" style={{ width: "48px", height: "48px" }}>
            <i className="bi bi-shield-check" style={{ fontSize: "24px" }}></i>
          </div>
          <h4 className="h4">What does the Monthly SLA & Maintenance Cover?</h4>
          <p className="text-sm text-muted" style={{ maxWidth: "650px" }}>
            Monthly SLA coverage includes uninterrupted access to cloud backups, security updates, eTIMS and SHA regulatory compliance updates, module extensions, and 24/7 technical support.
          </p>
          <Link to="/contact-us" className="btn btn-primary">
            <i className="bi bi-chat-dots me-1"></i>
            Talk to Our Deployment Team
          </Link>
        </div>
      </div>
    </>
  );
}