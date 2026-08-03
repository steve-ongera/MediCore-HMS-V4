import RoleDashboardBase from "./RoleDashboardBase.jsx";

export default function HealthRecordsOfficerDashboard() {
  return (
    <RoleDashboardBase
      eyebrow="Medical Records" title="Health Records Officer Dashboard" subtitle="File tracking, requests, and statutory registers"
      quickActions={[
        { to: "/medrecords/files", icon: "bi-archive", title: "File Tracking", desc: "Checkout, return, overdue files" },
        { to: "/medrecords/requests", icon: "bi-envelope-paper", title: "Record Requests", desc: "Approve/deny access requests" },
        { to: "/medrecords/birth-register", icon: "bi-file-earmark-person", title: "Birth Register", desc: "Register births" },
        { to: "/medrecords/death-register", icon: "bi-file-earmark-x", title: "Death Register", desc: "Register deaths" },
      ]}
    />
  );
}