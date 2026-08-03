import RoleDashboardBase from "./RoleDashboardBase.jsx";

export default function MedicalRecordsOfficerDashboard() {
  return (
    <RoleDashboardBase
      eyebrow="Medical Records" title="Medical Records Officer Dashboard" subtitle="Referrals, discharge summaries, and coding quality"
      quickActions={[
        { to: "/medrecords/referrals", icon: "bi-arrow-left-right", title: "Referrals", desc: "Manage in/out referrals" },
        { to: "/medrecords/discharge-summaries", icon: "bi-clipboard2-check", title: "Discharge Summaries", desc: "Review completeness" },
        { to: "/medrecords/coding-review", icon: "bi-clipboard2-data", title: "ICD Coding Review", desc: "Verify diagnosis coding" },
        { to: "/medrecords/audit-trail", icon: "bi-shield-lock", title: "Audit Trail", desc: "Record access history" },
      ]}
    />
  );
}