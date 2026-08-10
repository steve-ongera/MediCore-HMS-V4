import { Link } from "react-router-dom";

const PACKAGES = [
  {
    name: "Starter",
    tier: "Essential",
    beds: "Up to 20 beds",
    users: "Up to 10 staff accounts",
    price: "KSH 15,000",
    pricePeriod: "/ month",
    featured: false,
    modules: [
      "Core clinical modules (OPD, Inpatient, Pharmacy, Lab, Radiology)",
      "Billing & Payments",
      "Basic Reports"
    ],
  },
  {
    name: "Standard",
    tier: "Professional",
    beds: "Up to 50 beds",
    users: "Up to 30 staff accounts",
    price: "KSH 35,000",
    pricePeriod: "/ month",
    featured: true,
    modules: [
      "Everything in Starter",
      "MCH, Emergency, Theatre",
      "Insurance / SHA Claims",
      "HR & Procurement",
      "Ambulance & Mortuary"
    ],
  },
  {
    name: "Professional",
    tier: "Advanced",
    beds: "Up to 150 beds",
    users: "Up to 100 staff accounts",
    price: "KSH 65,000",
    pricePeriod: "/ month",
    featured: false,
    modules: [
      "Everything in Standard",
      "ICU/HDU, Dialysis, Blood Bank",
      "Dental & Eye Clinic",
      "Executive Dashboard & Revenue Leakage Detection",
      "AI Business Insights",
      "Medical Records (HIM) & MOH Reporting"
    ],
  },
  {
    name: "Enterprise",
    tier: "Custom",
    beds: "Unlimited / Custom",
    users: "Unlimited / Custom",
    price: "Custom",
    pricePeriod: "",
    featured: false,
    modules: [
      "Everything in Professional",
      "Biomedical Engineering",
      "Multi-facility support",
      "Custom integrations (KHIS/DHIS2, eTIMS, SHA)",
      "Dedicated support & training"
    ],
  },
];

export default function Subscriptions() {
  return (
    <>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Licensing</div>
          <h1 className="page-title">Subscription Packages</h1>
          <p className="page-subtitle">
            MediCore HMIS is licensed by package tier, with each tier setting your facility's bed and staff
            account capacity. Your current package and real-time usage can be viewed at{" "}
            <Link to="/settings/license">License Status</Link>.
          </p>
          <p className="text-sm text-muted mt-2">
            To upgrade your package or discuss custom terms, please visit <Link to="/contact-us">Contact Us</Link>.
          </p>
        </div>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid" style={{ 
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", 
        gap: "var(--space-4)",
        marginTop: "var(--space-4)"
      }}>
        {PACKAGES.map((pkg) => (
          <div 
            key={pkg.name} 
            className={`card ${pkg.featured ? 'card-featured' : ''}`}
            style={{
              position: "relative",
              display: "flex",
              flexDirection: "column",
              borderColor: pkg.featured ? "var(--primary-500)" : "var(--border-subtle)",
              boxShadow: pkg.featured ? "var(--shadow-lg)" : "var(--shadow-xs)",
              transform: pkg.featured ? "scale(1.02)" : "scale(1)",
              transition: "transform var(--duration-base) var(--ease-standard), box-shadow var(--duration-base) var(--ease-standard)",
            }}
          >
            {/* Featured Badge */}
            {pkg.featured && (
              <div style={{
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
              }}>
                <i className="bi bi-star-fill" style={{ marginRight: "var(--space-1)" }}></i>
                Most Popular
              </div>
            )}

            {/* Card Body */}
            <div className="card-body" style={{ flex: 1 }}>
              {/* Package Header */}
              <div style={{ marginBottom: "var(--space-4)" }}>
                <div style={{
                  fontSize: "var(--fs-2xs)",
                  fontWeight: "var(--fw-semibold)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-tertiary)",
                  marginBottom: "var(--space-1)"
                }}>
                  {pkg.tier}
                </div>
                <h3 className="h3" style={{ marginBottom: "var(--space-1)" }}>
                  {pkg.name}
                </h3>
                
                {/* Price */}
                <div style={{ 
                  display: "flex", 
                  alignItems: "baseline", 
                  gap: "var(--space-1)",
                  marginTop: "var(--space-3)"
                }}>
                  <span style={{
                    fontSize: "var(--fs-2xl)",
                    fontWeight: "var(--fw-bold)",
                    color: "var(--text-primary)",
                    fontFamily: "var(--font-mono)",
                  }}>
                    {pkg.price}
                  </span>
                  {pkg.pricePeriod && (
                    <span style={{
                      fontSize: "var(--fs-sm)",
                      color: "var(--text-tertiary)",
                    }}>
                      {pkg.pricePeriod}
                    </span>
                  )}
                </div>
              </div>

              {/* Package Specs */}
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: "var(--space-2)",
                marginBottom: "var(--space-4)",
                padding: "var(--space-3)",
                background: "var(--surface-sunken)",
                borderRadius: "var(--radius-md)"
              }}>
                <div className="flex items-center gap-2">
                  <i className="bi bi-hospital" style={{ color: "var(--text-tertiary)" }}></i>
                  <span className="text-sm font-medium">{pkg.beds}</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="bi bi-people" style={{ color: "var(--text-tertiary)" }}></i>
                  <span className="text-sm font-medium">{pkg.users}</span>
                </div>
              </div>

              {/* Modules List */}
              <div style={{ marginBottom: "var(--space-4)" }}>
                <div style={{
                  fontSize: "var(--fs-2xs)",
                  fontWeight: "var(--fw-semibold)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "var(--text-tertiary)",
                  marginBottom: "var(--space-2)"
                }}>
                  Included Modules
                </div>
                <ul style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  gap: "var(--space-2)",
                  padding: 0,
                  margin: 0,
                  listStyle: "none"
                }}>
                  {pkg.modules.map((m, index) => (
                    <li key={index} className="flex items-start gap-2" style={{ fontSize: "var(--fs-sm)" }}>
                      <i className="bi bi-check-circle-fill" style={{ 
                        color: "var(--primary-500)", 
                        fontSize: "14px",
                        marginTop: "2px",
                        flexShrink: 0
                      }}></i>
                      <span style={{ color: "var(--text-secondary)" }}>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Card Footer with Action */}
            <div className="card-footer" style={{ 
              flexShrink: 0,
              flexDirection: "column",
              gap: "var(--space-2)"
            }}>
              <Link 
                to="/contact-us" 
                className={`btn ${pkg.featured ? 'btn-primary' : 'btn-secondary'} btn-block`}
              >
                {pkg.name === "Enterprise" ? "Contact Sales" : "Get Started"}
                <i className="bi bi-arrow-right" style={{ marginLeft: "var(--space-2)" }}></i>
              </Link>
              {pkg.featured && (
                <span className="text-2xs text-muted text-center">
                  Most popular choice for growing hospitals
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Additional Information */}
      <div className="card" style={{ marginTop: "var(--space-6)" }}>
        <div className="card-body" style={{ 
          display: "flex", 
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: "var(--space-3)"
        }}>
          <div className="stat-card__icon tone-info" style={{ width: "48px", height: "48px" }}>
            <i className="bi bi-question-circle" style={{ fontSize: "24px" }}></i>
          </div>
          <h4 className="h4">Need help choosing the right package?</h4>
          <p className="text-sm text-muted" style={{ maxWidth: "600px" }}>
            Our team can help you assess your facility's needs and recommend the best package
            for your hospital size and requirements.
          </p>
          <Link to="/contact-us" className="btn btn-primary">
            <i className="bi bi-chat-dots  me-1"></i>
            Talk to Our Team
          </Link>
        </div>
      </div>
    </>
  );
}