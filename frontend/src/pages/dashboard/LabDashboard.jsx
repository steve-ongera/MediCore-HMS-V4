import RoleDashboardBase from "./RoleDashboardBase.jsx";

export default function LabDashboard() {
  return (
    <RoleDashboardBase
      eyebrow="Diagnostics" title="Laboratory Dashboard" subtitle="Test orders and turnaround"
      quickActions={[
        { to: "/laboratory", icon: "bi-droplet-half", title: "Pending Orders", desc: "Orders awaiting collection" },
        { to: "/laboratory", icon: "bi-clock-history", title: "Processing", desc: "Samples being tested" },
        { to: "/laboratory", icon: "bi-check-circle", title: "Completed Today", desc: "Finished results" },
        { to: "/profile", icon: "bi-person-circle", title: "My Profile", desc: "Account settings" },
      ]}
    />
  );
}