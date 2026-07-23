import RoleDashboardBase from "./RoleDashboardBase.jsx";

export default function MortuaryDashboard() {
  return (
    <RoleDashboardBase
      eyebrow="Mortuary" title="Mortuary Dashboard" subtitle="Storage occupancy and case activity"
      quickActions={[
        { to: "/mortuary", icon: "bi-house-lock-fill", title: "Mortuary Register", desc: "All cases in storage" },
        { to: "/mortuary/admit", icon: "bi-file-earmark-plus", title: "Admit Deceased", desc: "New case intake" },
        { to: "/mortuary", icon: "bi-box-arrow-right", title: "Body Release", desc: "Process a release" },
        { to: "/profile", icon: "bi-person-circle", title: "My Profile", desc: "Account settings" },
      ]}
    />
  );
}