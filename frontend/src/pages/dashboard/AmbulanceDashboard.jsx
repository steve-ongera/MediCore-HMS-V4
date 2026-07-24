import RoleDashboardBase from "./RoleDashboardBase.jsx";

export default function AmbulanceDashboard() {
  return (
    <RoleDashboardBase
      eyebrow="Ambulance" title="Ambulance Dispatch Dashboard" subtitle="Fleet status and active dispatches"
      quickActions={[
        { to: "/ambulance", icon: "bi-truck-front-fill", title: "Dispatch Board", desc: "Live fleet & dispatches" },
        { to: "/ambulance/request", icon: "bi-telephone-plus-fill", title: "Request Dispatch", desc: "New dispatch request" },
        { to: "/ambulance/fleet", icon: "bi-gear-wide-connected", title: "Manage Fleet", desc: "Vehicles & maintenance" },
        { to: "/profile", icon: "bi-person-circle", title: "My Profile", desc: "Account settings" },
      ]}
    />
  );
}