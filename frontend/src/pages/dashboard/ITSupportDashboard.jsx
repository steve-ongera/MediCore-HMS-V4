import RoleDashboardBase from "./RoleDashboardBase.jsx";

export default function ITSupportDashboard() {
  return (
    <RoleDashboardBase
      eyebrow="IT Support" title="IT Support Dashboard" subtitle="Tickets, accounts, and system security"
      quickActions={[
        { to: "/tickets/queue", icon: "bi-headset", title: "Support Queue", desc: "Manage open tickets" },
        { to: "/users", icon: "bi-person-badge", title: "Staff Accounts", desc: "Manage user accounts" },
        { to: "/settings/sessions", icon: "bi-shield-lock", title: "Session Monitoring", desc: "Active sessions & lockouts" },
        { to: "/settings/security-audit", icon: "bi-clipboard2-pulse", title: "Security Audit Log", desc: "System-wide security events" },
      ]}
    />
  );
}