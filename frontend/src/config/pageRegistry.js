// Central registry of every navigable page — mirrors Sidebar.jsx's
// NAV_GROUPS structure but flattened for fast searching. `roles: undefined`
// means visible to everyone; Super Admin always sees everything (handled
// by the search component via hasRole(), same convention as the sidebar).
export const PAGE_REGISTRY = [
  { to: "/dashboard", label: "Dashboard", group: "Overview", icon: "bi-speedometer2" },

  // Front Desk
  { to: "/patients", label: "Patients", group: "Front Desk", icon: "bi-people", roles: ["RECEPTIONIST"] },
  { to: "/patients/register", label: "Register Patient", group: "Front Desk", icon: "bi-person-plus", roles: ["RECEPTIONIST"] },
  { to: "/visits/register", label: "Register Visit", group: "Front Desk", icon: "bi-clipboard2-plus", roles: ["RECEPTIONIST"] },

  // Billing
  { to: "/billing", label: "Billing", group: "Billing", icon: "bi-cash-stack", roles: ["CASHIER", "ACCOUNTANT"] },
  { to: "/billing/walk-in-sale", label: "Walk-in Sale", group: "Billing", icon: "bi-bag-check", roles: ["CASHIER", "ACCOUNTANT"] },
  { to: "/billing/payments", label: "Payments", group: "Billing", icon: "bi-receipt", roles: ["CASHIER", "ACCOUNTANT"] },
  { to: "/billing/bulk-payment", label: "Bulk Payment", group: "Billing", icon: "bi-stack", roles: ["CASHIER", "ACCOUNTANT"] },
  { to: "/billing/till", label: "Cash Till", group: "Billing", icon: "bi-safe", roles: ["CASHIER"] },
  { to: "/billing/request-refund", label: "Request Refund", group: "Billing", icon: "bi-arrow-counterclockwise", roles: ["CASHIER"] },

  // Queue
  { to: "/queue", label: "Queue Board", group: "Queue", icon: "bi-hourglass-split", roles: ["RECEPTIONIST", "NURSE", "DOCTOR"] },

  // Emergency
  { to: "/emergency", label: "ED Board", group: "Emergency", icon: "bi-heart-pulse-fill", roles: ["RECEPTIONIST", "NURSE", "DOCTOR"] },
  { to: "/emergency/register", label: "Register Emergency", group: "Emergency", icon: "bi-plus-circle-fill", roles: ["RECEPTIONIST", "NURSE", "DOCTOR"] },

  // Inpatient
  { to: "/inpatient", label: "Ward Board", group: "Inpatient", icon: "bi-hospital", roles: ["RECEPTIONIST", "NURSE", "DOCTOR"] },
  { to: "/inpatient/admissions", label: "Admissions", group: "Inpatient", icon: "bi-clipboard2-pulse", roles: ["RECEPTIONIST", "NURSE", "DOCTOR"] },
  { to: "/inpatient/admit", label: "Admit Patient", group: "Inpatient", icon: "bi-person-plus-fill", roles: ["RECEPTIONIST", "NURSE", "DOCTOR"] },
  { to: "/inpatient/beds", label: "Bed Management", group: "Inpatient", icon: "bi-grid-3x3-gap", roles: ["NURSE"] },

  // MCH
  { to: "/mch", label: "MCH Dashboard", group: "Maternal & Child Health", icon: "bi-heart", roles: ["NURSE", "DOCTOR", "RECEPTIONIST"] },
  { to: "/mch/antenatal", label: "Antenatal Care", group: "Maternal & Child Health", icon: "bi-clipboard2-pulse", roles: ["NURSE", "DOCTOR", "RECEPTIONIST"] },
  { to: "/mch/children", label: "Child Records", group: "Maternal & Child Health", icon: "bi-emoji-smile", roles: ["NURSE", "DOCTOR", "RECEPTIONIST"] },

  // Clinical
  { to: "/nurse", label: "Triage / Vitals", group: "Clinical", icon: "bi-heart-pulse", roles: ["NURSE"] },
  { to: "/doctor", label: "My Queue", group: "Clinical", icon: "bi-clipboard2-pulse", roles: ["DOCTOR"] },
  { to: "/doctor/consultations", label: "Consultations", group: "Clinical", icon: "bi-journal-medical", roles: ["DOCTOR"] },

  // Diagnostics
  { to: "/laboratory", label: "Laboratory", group: "Diagnostics", icon: "bi-droplet-half", roles: ["LAB_TECHNOLOGIST"] },
  { to: "/laboratory/reports", label: "Lab Reports", group: "Diagnostics", icon: "bi-graph-up", roles: ["LAB_TECHNOLOGIST"] },
  { to: "/laboratory/catalog", label: "Lab Test Catalog", group: "Diagnostics", icon: "bi-clipboard2-data", roles: ["LAB_TECHNOLOGIST"] },
  { to: "/radiology", label: "Radiology", group: "Diagnostics", icon: "bi-camera", roles: ["RADIOLOGIST"] },
  { to: "/radiology/reports", label: "Radiology Reports", group: "Diagnostics", icon: "bi-graph-up", roles: ["RADIOLOGIST"] },
  { to: "/radiology/catalog", label: "Radiology Test Catalog", group: "Diagnostics", icon: "bi-clipboard2-data", roles: ["RADIOLOGIST"] },

  // Pharmacy
  { to: "/pharmacy", label: "Pharmacy", group: "Pharmacy", icon: "bi-capsule", roles: ["PHARMACIST"] },
  { to: "/pharmacy/admission-orders", label: "Admission Medicine Orders", group: "Pharmacy", icon: "bi-hospital", roles: ["PHARMACIST"] },
  { to: "/pharmacy/emergency-orders", label: "Emergency Medicine Orders", group: "Pharmacy", icon: "bi-heart-pulse-fill", roles: ["PHARMACIST"] },
  { to: "/pharmacy/alerts", label: "Expiry & Stock Alerts", group: "Pharmacy", icon: "bi-exclamation-triangle", roles: ["PHARMACIST"] },
  { to: "/pharmacy/reports", label: "Pharmacy Reports", group: "Pharmacy", icon: "bi-graph-up", roles: ["PHARMACIST"] },
  { to: "/inventory", label: "Inventory", group: "Pharmacy", icon: "bi-box-seam", roles: ["PHARMACIST", "ACCOUNTANT"] },
  { to: "/suppliers", label: "Suppliers", group: "Pharmacy", icon: "bi-truck", roles: ["PHARMACIST", "ACCOUNTANT"] },

  // Insurance
  { to: "/insurance/policies", label: "Patient Policies", group: "Insurance / SHA", icon: "bi-shield-check", roles: ["RECEPTIONIST", "CASHIER", "ACCOUNTANT"] },
  { to: "/insurance/claims", label: "Claims", group: "Insurance / SHA", icon: "bi-file-earmark-medical", roles: ["CASHIER", "ACCOUNTANT"] },
  { to: "/insurance/claims/new", label: "File Claim", group: "Insurance / SHA", icon: "bi-file-earmark-plus", roles: ["RECEPTIONIST", "CASHIER", "ACCOUNTANT"] },

  // Assets
  { to: "/assets", label: "Asset Register", group: "Asset Management", icon: "bi-box-seam-fill", roles: ["ACCOUNTANT"] },
  { to: "/assets/register", label: "Register Asset", group: "Asset Management", icon: "bi-plus-square", roles: ["ACCOUNTANT"] },
  { to: "/assets/maintenance", label: "Asset Maintenance", group: "Asset Management", icon: "bi-tools", roles: ["ACCOUNTANT"] },

  // Procurement
  { to: "/procurement/requisitions", label: "Requisitions", group: "Procurement", icon: "bi-clipboard2-check", roles: ["PROCUREMENT_OFFICER"] },
  { to: "/procurement/orders", label: "Purchase Orders", group: "Procurement", icon: "bi-cart4", roles: ["PROCUREMENT_OFFICER"] },
  { to: "/procurement/receipts", label: "Goods Receipts", group: "Procurement", icon: "bi-box-arrow-in-down", roles: ["PROCUREMENT_OFFICER"] },
  { to: "/procurement/invoices", label: "Supplier Invoices", group: "Procurement", icon: "bi-receipt", roles: ["PROCUREMENT_OFFICER", "ACCOUNTANT"] },

  // HR
  { to: "/hr/employees", label: "Employees", group: "Human Resources", icon: "bi-people-fill", roles: ["HR_OFFICER"] },
  { to: "/hr/employees/register", label: "Register Employee", group: "Human Resources", icon: "bi-person-plus-fill", roles: ["HR_OFFICER"] },
  { to: "/hr/leave", label: "Leave Requests (Approve)", group: "Human Resources", icon: "bi-calendar2-week", roles: ["HR_OFFICER"] },
  { to: "/hr/attendance", label: "Attendance", group: "Human Resources", icon: "bi-clock-history", roles: ["HR_OFFICER"] },
  { to: "/hr/payroll", label: "Payroll", group: "Human Resources", icon: "bi-cash-coin", roles: ["HR_OFFICER"] },
  { to: "/my-leave", label: "My Leave Requests", group: "Human Resources", icon: "bi-calendar2-week" },

  // Ambulance
  { to: "/ambulance", label: "Ambulance Dispatch Board", group: "Ambulance", icon: "bi-truck-front-fill", roles: ["AMBULANCE_DISPATCHER", "RECEPTIONIST", "NURSE", "DOCTOR"] },
  { to: "/ambulance/request", label: "Request Dispatch", group: "Ambulance", icon: "bi-telephone-plus-fill", roles: ["AMBULANCE_DISPATCHER", "RECEPTIONIST", "NURSE", "DOCTOR"] },
  { to: "/ambulance/fleet", label: "Manage Fleet", group: "Ambulance", icon: "bi-gear-wide-connected", roles: ["AMBULANCE_DISPATCHER"] },
  { to: "/ambulance/maintenance", label: "Ambulance Maintenance", group: "Ambulance", icon: "bi-tools", roles: ["AMBULANCE_DISPATCHER"] },
  { to: "/ambulance/reports", label: "Ambulance Reports", group: "Ambulance", icon: "bi-graph-up", roles: ["AMBULANCE_DISPATCHER"] },

  // Mortuary
  { to: "/mortuary", label: "Mortuary Register", group: "Mortuary", icon: "bi-house-lock-fill", roles: ["MORTUARY_ATTENDANT", "NURSE", "DOCTOR", "RECEPTIONIST"] },
  { to: "/mortuary/admit", label: "Admit Deceased", group: "Mortuary", icon: "bi-file-earmark-plus", roles: ["MORTUARY_ATTENDANT", "NURSE", "DOCTOR", "RECEPTIONIST"] },
  { to: "/mortuary/releases", label: "Release History", group: "Mortuary", icon: "bi-box-arrow-right", roles: ["MORTUARY_ATTENDANT"] },
  { to: "/mortuary/reports", label: "Mortuary Reports", group: "Mortuary", icon: "bi-graph-up", roles: ["MORTUARY_ATTENDANT"] },

  // Theatre
  { to: "/theatre", label: "Theatre Board", group: "Theatre", icon: "bi-hospital", roles: ["DOCTOR", "NURSE"] },
  { to: "/theatre/book", label: "Book Surgery", group: "Theatre", icon: "bi-calendar2-plus", roles: ["DOCTOR", "NURSE"] },

  // Finance
  { to: "/finance", label: "Financial Summary", group: "Finance & Accounting", icon: "bi-graph-up-arrow", roles: ["ACCOUNTANT"] },
  { to: "/finance/journal", label: "Journal Entries", group: "Finance & Accounting", icon: "bi-journal-text", roles: ["ACCOUNTANT"] },
  { to: "/finance/expenses", label: "Expenses", group: "Finance & Accounting", icon: "bi-receipt-cutoff", roles: ["ACCOUNTANT"] },
  { to: "/finance/budgets", label: "Budgets", group: "Finance & Accounting", icon: "bi-pie-chart", roles: ["ACCOUNTANT"] },
  { to: "/finance/variance-approvals", label: "Cash Variance Approvals", group: "Finance & Accounting", icon: "bi-exclamation-octagon", roles: ["ACCOUNTANT"] },

  // Blood Bank
  { to: "/bloodbank", label: "Blood Inventory", group: "Blood Bank", icon: "bi-droplet-half", roles: ["NURSE", "DOCTOR"] },
  { to: "/bloodbank/donors", label: "Blood Donors", group: "Blood Bank", icon: "bi-people-fill", roles: ["NURSE", "DOCTOR"] },
  { to: "/bloodbank/requests", label: "Blood Requests", group: "Blood Bank", icon: "bi-clipboard2-pulse", roles: ["NURSE", "DOCTOR"] },

  // Dental / Eye
  { to: "/dental", label: "Dental Visits", group: "Dental", icon: "bi-heart-fill", roles: ["DOCTOR", "NURSE"] },
  { to: "/eyeclinic", label: "Eye Clinic Visits", group: "Eye Clinic", icon: "bi-eye-fill", roles: ["DOCTOR", "NURSE"] },

  // Dialysis / ICU
  { to: "/dialysis", label: "Today's Dialysis Sessions", group: "Dialysis", icon: "bi-droplet-fill", roles: ["NURSE", "DOCTOR"] },
  { to: "/dialysis/patients", label: "Dialysis Patients", group: "Dialysis", icon: "bi-people-fill", roles: ["NURSE", "DOCTOR"] },
  { to: "/icu", label: "ICU Board", group: "ICU / HDU", icon: "bi-activity", roles: ["NURSE", "DOCTOR"] },

  // eTIMS
  { to: "/etims/receipts", label: "Fiscalized Receipts", group: "eTIMS (KRA)", icon: "bi-qr-code", roles: ["ACCOUNTANT"] },

  // Executive / Insights / Leakage
  { to: "/executive", label: "Executive Overview", group: "Executive Dashboard", icon: "bi-speedometer", roles: ["ACCOUNTANT"] },
  { to: "/executive/refunds", label: "Approve Refunds", group: "Executive Dashboard", icon: "bi-arrow-counterclockwise", roles: ["ACCOUNTANT"] },
  { to: "/leakage", label: "Revenue Leakage Dashboard", group: "Revenue Leakage", icon: "bi-exclamation-diamond-fill", roles: ["ACCOUNTANT"] },
  { to: "/leakage/records", label: "Leakage Records", group: "Revenue Leakage", icon: "bi-list-check", roles: ["ACCOUNTANT"] },
  { to: "/insights", label: "AI Business Insights", group: "AI Business Insights", icon: "bi-lightbulb-fill", roles: ["ACCOUNTANT"] },

  // Medical Records
  { to: "/medrecords", label: "HIM Dashboard", group: "Medical Records (HIM)", icon: "bi-folder2-open", roles: ["HEALTH_RECORDS_OFFICER", "MEDICAL_RECORDS_OFFICER"] },
  { to: "/medrecords/files", label: "File Tracking", group: "Medical Records (HIM)", icon: "bi-archive", roles: ["HEALTH_RECORDS_OFFICER", "MEDICAL_RECORDS_OFFICER"] },
  { to: "/medrecords/documents", label: "Document Upload", group: "Medical Records (HIM)", icon: "bi-file-earmark-arrow-up", roles: ["HEALTH_RECORDS_OFFICER", "MEDICAL_RECORDS_OFFICER"] },
  { to: "/medrecords/birth-register", label: "Birth Register", group: "Medical Records (HIM)", icon: "bi-file-earmark-person", roles: ["HEALTH_RECORDS_OFFICER", "MEDICAL_RECORDS_OFFICER"] },
  { to: "/medrecords/death-register", label: "Death Register", group: "Medical Records (HIM)", icon: "bi-file-earmark-x", roles: ["HEALTH_RECORDS_OFFICER", "MEDICAL_RECORDS_OFFICER"] },
  { to: "/medrecords/referrals", label: "Referrals", group: "Medical Records (HIM)", icon: "bi-arrow-left-right", roles: ["HEALTH_RECORDS_OFFICER", "MEDICAL_RECORDS_OFFICER", "DOCTOR"] },
  { to: "/medrecords/discharge-summaries", label: "Discharge Summaries", group: "Medical Records (HIM)", icon: "bi-clipboard2-check", roles: ["HEALTH_RECORDS_OFFICER", "MEDICAL_RECORDS_OFFICER", "DOCTOR"] },
  { to: "/medrecords/coding-review", label: "ICD Coding Review", group: "Medical Records (HIM)", icon: "bi-clipboard2-data", roles: ["HEALTH_RECORDS_OFFICER", "MEDICAL_RECORDS_OFFICER"] },
  { to: "/medrecords/requests", label: "Record Requests", group: "Medical Records (HIM)", icon: "bi-envelope-paper", roles: ["HEALTH_RECORDS_OFFICER", "MEDICAL_RECORDS_OFFICER"] },
  { to: "/medrecords/audit-trail", label: "Record Audit Trail", group: "Medical Records (HIM)", icon: "bi-shield-lock", roles: ["HEALTH_RECORDS_OFFICER", "MEDICAL_RECORDS_OFFICER"] },

  // Biomed
  { to: "/biomed/equipment", label: "Equipment Register", group: "Biomedical Engineering", icon: "bi-cpu", roles: ["BIOMEDICAL_ENGINEER"] },
  { to: "/biomed/service-requests", label: "Service Requests", group: "Biomedical Engineering", icon: "bi-tools" },
  { to: "/biomed/maintenance", label: "Equipment Maintenance", group: "Biomedical Engineering", icon: "bi-wrench-adjustable", roles: ["BIOMEDICAL_ENGINEER"] },
  { to: "/biomed/calibration", label: "Calibration Schedule", group: "Biomedical Engineering", icon: "bi-speedometer2", roles: ["BIOMEDICAL_ENGINEER"] },
  { to: "/biomed/spare-parts", label: "Spare Parts Inventory", group: "Biomedical Engineering", icon: "bi-box-seam", roles: ["BIOMEDICAL_ENGINEER"] },
  { to: "/biomed/contracts", label: "Service Contracts", group: "Biomedical Engineering", icon: "bi-file-earmark-text", roles: ["BIOMEDICAL_ENGINEER"] },
  { to: "/biomed/downtime-report", label: "Downtime Report", group: "Biomedical Engineering", icon: "bi-bar-chart-line", roles: ["BIOMEDICAL_ENGINEER"] },

  // Messaging / Notifications
  { to: "/messages", label: "Messages", group: "Communication", icon: "bi-chat-dots-fill" },
  { to: "/messages/directory", label: "Staff Directory", group: "Communication", icon: "bi-people" },

  // Reports
  { to: "/reports", label: "Reports", group: "Analytics Reports", icon: "bi-bar-chart-line", roles: ["ACCOUNTANT"] },
  { to: "/reports/opd-daily", label: "Daily OPD Report", group: "Analytics Reports", icon: "bi-clipboard2-pulse", roles: ["ACCOUNTANT"] },
  { to: "/reports/ipd", label: "IPD Report", group: "Analytics Reports", icon: "bi-hospital", roles: ["ACCOUNTANT"] },
  { to: "/reports/mch", label: "MCH Report", group: "Analytics Reports", icon: "bi-heart", roles: ["ACCOUNTANT"] },
  { to: "/reports/revenue", label: "Revenue Report", group: "Analytics Reports", icon: "bi-cash-coin", roles: ["ACCOUNTANT"] },
  { to: "/reports/drug-consumption", label: "Drug Consumption Report", group: "Analytics Reports", icon: "bi-capsule", roles: ["ACCOUNTANT"] },
  { to: "/reports/disease-statistics", label: "Disease Statistics Report", group: "Analytics Reports", icon: "bi-clipboard2-data", roles: ["ACCOUNTANT"] },

  // Administration (Super Admin only — roles: [] means nobody but Super Admin per your convention)
  { to: "/audit-logs", label: "Audit Log", group: "Administration", icon: "bi-journal-text", roles: [] },
  { to: "/users", label: "Staff", group: "Administration", icon: "bi-person-badge", roles: [] },
  { to: "/departments", label: "Departments", group: "Administration", icon: "bi-building", roles: [] },
  { to: "/settings/test-catalog", label: "Test Catalog", group: "Administration", icon: "bi-clipboard2-data", roles: [] },
  { to: "/insurance/insurers", label: "Insurers", group: "Administration", icon: "bi-shield-check", roles: [] },
  { to: "/etims/config", label: "eTIMS Settings", group: "Administration", icon: "bi-gear-fill", roles: [] },
  { to: "/assets/categories", label: "Asset Categories", group: "Administration", icon: "bi-tags", roles: [] },
  { to: "/theatre/setup", label: "Theatre Setup", group: "Administration", icon: "bi-gear-wide-connected", roles: [] },
  { to: "/finance/accounts", label: "Chart of Accounts", group: "Administration", icon: "bi-list-columns", roles: [] },
  { to: "/settings/sessions", label: "Device & Session Monitoring", group: "Administration", icon: "bi-shield-lock", roles: [] },
  { to: "/settings/security-audit", label: "Security Audit Log", group: "Administration", icon: "bi-clipboard2-pulse", roles: [] },

  // Account
  { to: "/profile", label: "My Profile", group: "Account", icon: "bi-person-circle" },
  { to: "/settings", label: "Settings", group: "Account", icon: "bi-gear", roles: [] },
];