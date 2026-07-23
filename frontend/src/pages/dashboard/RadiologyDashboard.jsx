import RoleDashboardBase from "./RoleDashboardBase.jsx";

export default function RadiologyDashboard() {
  return (
    <RoleDashboardBase
      eyebrow="Diagnostics" title="Radiology Dashboard" subtitle="Imaging orders and reporting"
      quickActions={[
        { to: "/radiology", icon: "bi-camera", title: "Pending Orders", desc: "Orders awaiting imaging" },
        { to: "/radiology", icon: "bi-clock-history", title: "Awaiting Report", desc: "Images pending review" },
        { to: "/radiology", icon: "bi-check-circle", title: "Reported Today", desc: "Finished reports" },
        { to: "/profile", icon: "bi-person-circle", title: "My Profile", desc: "Account settings" },
      ]}
    />
  );
}