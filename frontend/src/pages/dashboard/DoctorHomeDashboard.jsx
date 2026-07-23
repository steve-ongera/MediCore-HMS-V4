import RoleDashboardBase from "./RoleDashboardBase.jsx";

export default function DoctorHomeDashboard() {
  return (
    <RoleDashboardBase
      eyebrow="Clinical" title="Doctor Dashboard" subtitle="My queue, consultations, and theatre schedule"
      quickActions={[
        { to: "/doctor", icon: "bi-clipboard2-pulse", title: "My Queue", desc: "Patients waiting for me" },
        { to: "/doctor/consultations", icon: "bi-journal-medical", title: "Consultations", desc: "My consultation history" },
        { to: "/theatre", icon: "bi-hospital", title: "Theatre Board", desc: "Surgery schedule" },
        { to: "/theatre/book", icon: "bi-calendar2-plus", title: "Book Surgery", desc: "Schedule a procedure" },
      ]}
    />
  );
}