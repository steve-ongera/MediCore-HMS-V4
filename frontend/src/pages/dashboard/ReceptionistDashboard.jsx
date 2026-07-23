import RoleDashboardBase from "./RoleDashboardBase.jsx";

export default function ReceptionistDashboard() {
  return (
    <RoleDashboardBase
      eyebrow="Front Desk" title="Receptionist Dashboard" subtitle="Today's registrations and queue activity"
      quickActions={[
        { to: "/patients/register", icon: "bi-person-plus", title: "Register Patient", desc: "New patient registration" },
        { to: "/visits/register", icon: "bi-clipboard-plus", title: "Register Visit", desc: "New patient visit" },
        { to: "/queue", icon: "bi-hourglass-split", title: "Queue Board", desc: "Current waiting patients" },
        { to: "/emergency/register", icon: "bi-plus-circle-fill", title: "Register Emergency", desc: "Emergency intake" },
      ]}
    />
  );
}