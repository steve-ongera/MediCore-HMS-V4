import RoleDashboardBase from "./RoleDashboardBase.jsx";

export default function NurseHomeDashboard() {
  return (
    <RoleDashboardBase
      eyebrow="Clinical" title="Nurse Dashboard" subtitle="Queue, admissions, and today's activity"
      quickActions={[
        { to: "/nurse", icon: "bi-heart-pulse", title: "Triage / Vitals", desc: "Record patient vitals" },
        { to: "/inpatient", icon: "bi-hospital", title: "Ward Board", desc: "Inpatient wards" },
        { to: "/inpatient/admit", icon: "bi-person-plus-fill", title: "Admit Patient", desc: "New admission" },
        { to: "/queue", icon: "bi-hourglass-split", title: "Queue Board", desc: "Current waiting patients" },
      ]}
    />
  );
}