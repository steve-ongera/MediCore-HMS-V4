import { NavLink } from "react-router-dom";
import { useAuth, ROLES } from "../context/AuthContext";
import medicoreLogo from "../assets/logo.png";

// Each link declares which roles can see it. Omit `roles` to show it to
// everyone (Super Admin always sees everything, per useAuth().hasRole).
// IMPORTANT: keep these in sync with the `allowedRoles` enforced on each
// route in App.jsx — a mismatch means a user either sees a link that 404s
// into Unauthorized, or a route they can access never shows in the nav.
const NAV_GROUPS = [
  {
    label: "Overview",
    links: [{ to: "/", label: "Dashboard", icon: "bi-speedometer2" }],
  },
  {
    label: "Front Desk",
    roles: [ROLES.RECEPTIONIST],
    links: [
      { to: "/patients", label: "Patients", icon: "bi-people" },
      { to: "/patients/register", label: "Register Patient", icon: "bi-person-plus" },
      { to: "/visits/register", label: "Register Visit", icon: "bi-clipboard2-plus" },
    ],
  },
  {
    label: "Billing",
    roles: [ROLES.CASHIER, ROLES.ACCOUNTANT],
    links: [
      { to: "/billing", label: "Billing", icon: "bi-cash-stack" },
      { to: "/billing/bulk-payment", label: "Bulk Payment", icon: "bi-stack" },
      { to: "/billing/walk-in-sale", label: "Walk-in Sale", icon: "bi-bag-check" },
      { to: "/billing/payments", label: "Payments", icon: "bi-receipt" },
      { to: "/billing/till", label: "Cash Till", icon: "bi-safe", roles: [ROLES.CASHIER] },
      { to: "/billing/request-refund", label: "Request Refund", icon: "bi-arrow-counterclockwise", roles: [ROLES.CASHIER] },
    ],
  },
  {
    label: "Queue",
    roles: [ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR],
    links: [{ to: "/queue", label: "Queue Board", icon: "bi-hourglass-split" }],
  },
  {
    label: "Emergency",
    roles: [ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR],
    links: [
      { to: "/emergency", label: "ED Board", icon: "bi-heart-pulse-fill" },
      { to: "/emergency/register", label: "Register Emergency", icon: "bi-plus-circle-fill" },
    ],
  },
  {
    label: "Inpatient",
    roles: [ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR],
    links: [
      { to: "/inpatient", label: "Ward Board", icon: "bi-hospital" },
      { to: "/inpatient/admissions", label: "Admissions", icon: "bi-clipboard2-pulse" },
      { to: "/inpatient/admit", label: "Admit Patient", icon: "bi-person-plus-fill", roles: [ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR] },
      { to: "/inpatient/beds", label: "Bed Management", icon: "bi-grid-3x3-gap", roles: [ROLES.NURSE] },
    ],
  },
  {
    label: "Maternal & Child Health",
    roles: [ROLES.NURSE, ROLES.DOCTOR, ROLES.RECEPTIONIST],
    links: [
      { to: "/mch", label: "MCH Dashboard", icon: "bi-heart" },
      { to: "/mch/antenatal", label: "Antenatal Care", icon: "bi-clipboard2-pulse" },
      { to: "/mch/children", label: "Child Records", icon: "bi-emoji-smile" },
    ],
  },
  {
    label: "Clinical",
    roles: [ROLES.NURSE, ROLES.DOCTOR],
    links: [
      { to: "/nurse", label: "Triage / Vitals", icon: "bi-heart-pulse", roles: [ROLES.NURSE] },
      { to: "/doctor", label: "My Queue", icon: "bi-clipboard2-pulse", roles: [ROLES.DOCTOR] },
      { to: "/doctor/consultations", label: "Consultations", icon: "bi-journal-medical", roles: [ROLES.DOCTOR] },
    ],
  },
  {
    label: "Diagnostics",
    roles: [ROLES.LAB_TECHNOLOGIST, ROLES.RADIOLOGIST],
    links: [
      { to: "/laboratory", label: "Laboratory", icon: "bi-droplet-half", roles: [ROLES.LAB_TECHNOLOGIST] },
      { to: "/radiology", label: "Radiology", icon: "bi-camera", roles: [ROLES.RADIOLOGIST] },
      { to: "/laboratory/reports", label: "My Reports", icon: "bi-graph-up", roles: [ROLES.LAB_TECHNOLOGIST] },
      { to: "/laboratory/catalog", label: "Test Catalog", icon: "bi-clipboard2-data", roles: [ROLES.LAB_TECHNOLOGIST] },
      { to: "/radiology/reports", label: "My Reports", icon: "bi-graph-up", roles: [ROLES.RADIOLOGIST] },
      { to: "/radiology/catalog", label: "Test Catalog", icon: "bi-clipboard2-data", roles: [ROLES.RADIOLOGIST] },
    ],
  },
  {
    label: "Pharmacy",
    roles: [ROLES.PHARMACIST],
    links: [
      { to: "/pharmacy", label: "Pharmacy", icon: "bi-capsule" },
      { to: "/inventory", label: "Inventory", icon: "bi-box-seam", roles: [ROLES.PHARMACIST, ROLES.ACCOUNTANT] },
      { to: "/suppliers", label: "Suppliers", icon: "bi-truck", roles: [ROLES.PHARMACIST, ROLES.ACCOUNTANT] },
      { to: "/pharmacy/reports", label: "My Reports", icon: "bi-graph-up" },
      { to: "/pharmacy/alerts", label: "Expiry & Stock Alerts", icon: "bi-exclamation-triangle" },
      { to: "/pharmacy/admission-orders", label: "Admission Medicine Orders", icon: "bi-hospital" },
      { to: "/pharmacy/emergency-orders", label: "Emergency Medicine Orders", icon: "bi-heart-pulse-fill" },
    ],
  },
  {
    label: "Stock Control",
    roles: [ROLES.PHARMACIST, ROLES.ACCOUNTANT],
    links: [
      { to: "/stockcontrol/locations", label: "Store Locations", icon: "bi-geo-alt", roles: [ROLES.PHARMACIST] },
      { to: "/stockcontrol/transfers", label: "Internal Transfers", icon: "bi-arrow-left-right", roles: [ROLES.PHARMACIST, ROLES.NURSE] },
      { to: "/stockcontrol/counts", label: "Stock Counts", icon: "bi-clipboard2-check" },
      { to: "/stockcontrol/discrepancies", label: "Discrepancy Report", icon: "bi-exclamation-triangle-fill" },
    ],
  },
  {
    label: "Insights",
    roles: [ROLES.ACCOUNTANT],
    links: [
      { to: "/reports", label: "Reports", icon: "bi-bar-chart-line" },
    ],
  },
  {
    label: "Revenue Leakage",
    roles: [ROLES.ACCOUNTANT],
    links: [
      { to: "/leakage", label: "Leakage Dashboard", icon: "bi-exclamation-diamond-fill" },
      { to: "/leakage/records", label: "All Leakage Records", icon: "bi-list-check" },
    ],
  },
  {
    label: "Analytics Reports",
    roles: [ROLES.ACCOUNTANT],
    links: [
      { to: "/reports/opd-daily", label: "Daily OPD Report", icon: "bi-clipboard2-pulse" },
      { to: "/reports/ipd", label: "IPD Report", icon: "bi-hospital" },
      { to: "/reports/mch", label: "MCH Report", icon: "bi-heart" },
      { to: "/reports/revenue", label: "Revenue Report", icon: "bi-cash-coin" },
      { to: "/reports/drug-consumption", label: "Drug Consumption", icon: "bi-capsule" },
      { to: "/reports/disease-statistics", label: "Disease Statistics", icon: "bi-clipboard2-data" },
    ],
  },
  {
    label: "Insurance / SHA",
    roles: [ROLES.RECEPTIONIST, ROLES.CASHIER, ROLES.ACCOUNTANT],
    links: [
      { to: "/insurance/policies", label: "Patient Policies", icon: "bi-shield-check" },
      { to: "/insurance/claims", label: "Claims", icon: "bi-file-earmark-medical", roles: [ROLES.CASHIER, ROLES.ACCOUNTANT] },
      { to: "/insurance/claims/new", label: "File Claim", icon: "bi-file-earmark-plus" },
    ],
  },
  {
    label: "eTIMS (KRA)",
    roles: [ROLES.ACCOUNTANT],
    links: [
      { to: "/etims/receipts", label: "Fiscalized Receipts", icon: "bi-qr-code" },
    ],
  },
  {
    label: "Executive Dashboard",
    roles: [ROLES.ACCOUNTANT],
    links: [
      { to: "/executive", label: "Executive Overview", icon: "bi-speedometer" },
      { to: "/executive/refunds", label: "Refunds", icon: "bi-arrow-counterclockwise" },
      { to: "/insights", label: "AI Business Insights", icon: "bi-lightbulb-fill" },
    ],
  },
  {
    label: "Asset Management",
    roles: [ROLES.ACCOUNTANT],
    links: [
      { to: "/assets", label: "Asset Register", icon: "bi-box-seam-fill" },
      { to: "/assets/register", label: "Register Asset", icon: "bi-plus-square" },
      { to: "/assets/maintenance", label: "Maintenance", icon: "bi-tools" },
    ],
  },
  {
    label: "Procurement",
    roles: [ROLES.PROCUREMENT_OFFICER],
    links: [
      { to: "/procurement/requisitions", label: "Requisitions", icon: "bi-clipboard2-check", roles: [ROLES.PROCUREMENT_OFFICER, ROLES.ACCOUNTANT] },
      { to: "/procurement/orders", label: "Purchase Orders", icon: "bi-cart4", roles: [ROLES.PROCUREMENT_OFFICER, ROLES.ACCOUNTANT] },
      { to: "/procurement/receipts", label: "Goods Receipts", icon: "bi-box-arrow-in-down", roles: [ROLES.PROCUREMENT_OFFICER, ROLES.ACCOUNTANT] },
      { to: "/procurement/invoices", label: "Supplier Invoices", icon: "bi-receipt", roles: [ROLES.PROCUREMENT_OFFICER, ROLES.ACCOUNTANT] },
    ],
  },
  {
    label: "Human Resources",
    roles: [ROLES.HR_OFFICER],
    links: [
      { to: "/hr/employees", label: "Employees", icon: "bi-people-fill" },
      { to: "/hr/employees/register", label: "Register Employee", icon: "bi-person-plus-fill" },
      { to: "/hr/leave", label: "Leave Requests", icon: "bi-calendar2-week" },
      { to: "/hr/attendance", label: "Attendance", icon: "bi-clock-history" },
      { to: "/hr/payroll", label: "Payroll", icon: "bi-cash-coin" },
    ],
  },
  {
    label: "Ambulance",
    roles: [ROLES.AMBULANCE_DISPATCHER, ROLES.RECEPTIONIST, ROLES.NURSE, ROLES.DOCTOR],
    links: [
      { to: "/ambulance", label: "Fleet & Dispatch Board", icon: "bi-truck-front-fill" },
      { to: "/ambulance/request", label: "Request Dispatch", icon: "bi-telephone-plus-fill" },
      { to: "/ambulance/fleet", label: "Manage Fleet", icon: "bi-gear-wide-connected", roles: [ROLES.AMBULANCE_DISPATCHER] },
      { to: "/ambulance/reports", label: "My Reports", icon: "bi-graph-up", roles: [ROLES.AMBULANCE_DISPATCHER] },
      { to: "/ambulance/maintenance", label: "Maintenance History", icon: "bi-tools", roles: [ROLES.AMBULANCE_DISPATCHER] },
    ],
  },
  {
    label: "Mortuary",
    roles: [ROLES.MORTUARY_ATTENDANT, ROLES.NURSE, ROLES.DOCTOR, ROLES.RECEPTIONIST],
    links: [
      { to: "/mortuary", label: "Mortuary Register", icon: "bi-house-lock-fill" },
      { to: "/mortuary/admit", label: "Admit Deceased", icon: "bi-file-earmark-plus" },
      { to: "/mortuary/reports", label: "My Reports", icon: "bi-graph-up", roles: [ROLES.MORTUARY_ATTENDANT] },
      { to: "/mortuary/releases", label: "Release History", icon: "bi-box-arrow-right", roles: [ROLES.MORTUARY_ATTENDANT] },
    ],
  },
  {
    label: "Theatre",
    roles: [ROLES.DOCTOR, ROLES.NURSE],
    links: [
      { to: "/theatre", label: "Theatre Board", icon: "bi-hospital" },
      { to: "/theatre/book", label: "Book Surgery", icon: "bi-calendar2-plus" },
    ],
  },
  {
    label: "Finance & Accounting",
    roles: [ROLES.ACCOUNTANT],
    links: [
      { to: "/finance", label: "Financial Summary", icon: "bi-graph-up-arrow" },
      { to: "/finance/journal", label: "Journal Entries", icon: "bi-journal-text" },
      { to: "/finance/expenses", label: "Expenses", icon: "bi-receipt-cutoff" },
      { to: "/finance/budgets", label: "Budgets", icon: "bi-pie-chart" },
      { to: "/finance/variance-approvals", label: "Variance Approvals", icon: "bi-exclamation-octagon" },
    ],
  },
  {
    label: "Blood Bank",
    roles: [ROLES.NURSE, ROLES.DOCTOR],
    links: [
      { to: "/bloodbank", label: "Inventory", icon: "bi-droplet-half" },
      { to: "/bloodbank/donors", label: "Donors", icon: "bi-people-fill" },
      { to: "/bloodbank/requests", label: "Blood Requests", icon: "bi-clipboard2-pulse" },
    ],
  },
  {
    label: "Dental",
    roles: [ROLES.DOCTOR, ROLES.NURSE],
    links: [
      { to: "/dental", label: "Dental Visits", icon: "bi-heart-fill" },
      { to: "/dental/register", label: "Register Visit", icon: "bi-plus-circle" },
    ],
  },
  {
    label: "Eye Clinic",
    roles: [ROLES.DOCTOR, ROLES.NURSE],
    links: [
      { to: "/eyeclinic", label: "Eye Clinic Visits", icon: "bi-eye-fill" },
      { to: "/eyeclinic/register", label: "Register Visit", icon: "bi-plus-circle" },
    ],
  },
  {
    label: "Dialysis",
    roles: [ROLES.NURSE, ROLES.DOCTOR],
    links: [
      { to: "/dialysis", label: "Today's Sessions", icon: "bi-droplet-fill" },
      { to: "/dialysis/patients", label: "Dialysis Patients", icon: "bi-people-fill" },
      { to: "/dialysis/register", label: "Register Patient", icon: "bi-plus-circle" },
    ],
  },
  {
    label: "ICU / HDU",
    roles: [ROLES.NURSE, ROLES.DOCTOR],
    links: [
      { to: "/icu", label: "ICU Board", icon: "bi-activity" },
      { to: "/icu/admit", label: "Admit to ICU", icon: "bi-plus-circle" },
    ],
  },
  {
    label: "Medical Records (HIM)",
    roles: [ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER],
    links: [
      { to: "/medrecords", label: "HIM Dashboard", icon: "bi-folder2-open" },
      { to: "/medrecords/files", label: "File Tracking", icon: "bi-archive" },
      { to: "/medrecords/documents", label: "Document Upload", icon: "bi-file-earmark-arrow-up" },
      { to: "/medrecords/birth-register", label: "Birth Register", icon: "bi-file-earmark-person" },
      { to: "/medrecords/death-register", label: "Death Register", icon: "bi-file-earmark-x" },
      { to: "/medrecords/referrals", label: "Referrals", icon: "bi-arrow-left-right", roles: [ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER, ROLES.DOCTOR] },
      { to: "/medrecords/discharge-summaries", label: "Discharge Summaries", icon: "bi-clipboard2-check", roles: [ROLES.HEALTH_RECORDS_OFFICER, ROLES.MEDICAL_RECORDS_OFFICER, ROLES.DOCTOR] },
      { to: "/medrecords/requests", label: "Record Requests", icon: "bi-envelope-paper" },
      { to: "/medrecords/audit-trail", label: "Audit Trail", icon: "bi-shield-lock" },
      { to: "/medrecords/coding-review", label: "ICD Coding Review", icon: "bi-clipboard2-data" },
    ],
  },
  {
    label: "Biomedical Engineering",
    roles: [ROLES.BIOMEDICAL_ENGINEER],
    links: [
      { to: "/biomed/equipment", label: "Equipment Register", icon: "bi-cpu" },
      { to: "/biomed/service-requests", label: "Service Requests", icon: "bi-tools" },
      { to: "/biomed/maintenance", label: "Maintenance", icon: "bi-wrench-adjustable" },
      { to: "/biomed/calibration", label: "Calibration Schedule", icon: "bi-speedometer2" },
      { to: "/biomed/spare-parts", label: "Spare Parts", icon: "bi-box-seam" },
      { to: "/biomed/contracts", label: "Service Contracts", icon: "bi-file-earmark-text" },
      { to: "/biomed/downtime-report", label: "Downtime Report", icon: "bi-bar-chart-line" },
    ],
  },
  {
    label: "Administration",
    roles: [],
    links: [
      { to: "/audit-logs", label: "Audit Log", icon: "bi-journal-text" },
      { to: "/settings/sessions", label: "Device & Session Monitoring", icon: "bi-shield-lock" },
      { to: "/settings/security-audit", label: "Security Audit Log", icon: "bi-clipboard2-pulse" },
      { to: "/users", label: "Staff", icon: "bi-person-badge" },
      { to: "/departments", label: "Departments", icon: "bi-building" },
      { to: "/settings/test-catalog", label: "Test Catalog", icon: "bi-clipboard2-data" },
      { to: "/insurance/insurers", label: "Insurers", icon: "bi-shield-check" },
      { to: "/etims/config", label: "eTIMS Settings", icon: "bi-gear-fill" },
      { to: "/assets/categories", label: "Asset Categories", icon: "bi-tags" },
      { to: "/theatre/setup", label: "Theatres & Procedures", icon: "bi-gear-wide-connected" },
      { to: "/finance/accounts", label: "Chart of Accounts", icon: "bi-list-columns" },
    ],
  },
  {
    label: "Account",
    links: [
      { to: "/profile", label: "My Profile", icon: "bi-person-circle" },
      { to: "/messages", label: "Messages", icon: "bi bi-chat-left" },
      { to: "/my-leave", label: "My Leave Requests", icon: "bi-calendar2-week" },
      { to: "/biomed/service-requests", label: "Report Equipment Issue", icon: "bi-exclamation-triangle" },
      { to: "/settings", label: "Settings", icon: "bi-gear", roles: [] },
    ],
  },
];

export default function Sidebar({ onNavigate }) {
  const { user, hasRole } = useAuth();

  // roles: [] on a group/link means "Super Admin only". We can't route this
  // through hasRole(...roles) — spreading an empty array calls hasRole()
  // with zero arguments, which AuthContext defines as "is anyone logged
  // in" (true for every role), not "no roles allowed". So the empty-array
  // case is checked directly against user.role instead.
  const canSee = (roles) => {
    if (roles === undefined) return true; // no restriction — any authenticated role
    if (roles.length === 0) return user?.role === ROLES.SUPER_ADMIN; // explicit Super Admin only
    return hasRole(...roles);
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img
          src={medicoreLogo}
          alt="Medicore HMIS"
          style={{
            height: 34,
            width: 'auto',
            borderRadius: '5px',
            flexShrink: 0
          }}
        />
        <span className="sidebar__brand-text">Medicore HMIS</span>
      </div>

      <div className="sidebar__scroll">
        {NAV_GROUPS.map((group) => {
          const visibleLinks = group.links.filter((link) => canSee(link.roles ?? group.roles));
          if (visibleLinks.length === 0) return null;

          return (
            <div className="sidebar__group" key={group.label}>
              <div className="sidebar__group-label">{group.label}</div>
              <nav className="sidebar__nav">
                {visibleLinks.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/"}
                    className={({ isActive }) => `sidebar__link${isActive ? " is-active" : ""}`}
                    onClick={onNavigate}
                  >
                    <span className="sidebar__link-icon">
                      <i className={`bi ${link.icon}`} aria-hidden="true" />
                    </span>
                    <span className="sidebar__link-text">{link.label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          );
        })}
      </div>

      <div className="sidebar__footer">HMIS v4.0 &middot; City General Hospital</div>
    </aside>
  );
}