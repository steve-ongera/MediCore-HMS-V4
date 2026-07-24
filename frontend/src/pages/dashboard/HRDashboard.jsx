import RoleDashboardBase from "./RoleDashboardBase.jsx";

export default function HRDashboard() {
  return (
    <RoleDashboardBase
      eyebrow="Human Resources" title="HR Dashboard" subtitle="Staffing, leave, and payroll status"
      quickActions={[
        { to: "/hr/employees", icon: "bi-people-fill", title: "Employees", desc: "Staff directory" },
        { to: "/hr/employees/register", icon: "bi-person-plus-fill", title: "Register Employee", desc: "Add new staff" },
        { to: "/hr/leave", icon: "bi-calendar2-week", title: "Leave Requests", desc: "Approve leave" },
        { to: "/hr/payroll", icon: "bi-cash-coin", title: "Payroll", desc: "Run payroll" },
      ]}
    />
  );
}