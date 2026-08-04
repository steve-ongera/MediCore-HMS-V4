import RoleDashboardBase from "./RoleDashboardBase.jsx";

export default function BiomedicalEngineerDashboard() {
  return (
    <RoleDashboardBase
      eyebrow="Biomedical Engineering" title="Biomedical Engineer Dashboard" subtitle="Equipment status, maintenance, and service requests"
      quickActions={[
        { to: "/biomed/equipment", icon: "bi-cpu", title: "Equipment Register", desc: "All hospital equipment" },
        { to: "/biomed/service-requests", icon: "bi-tools", title: "Service Requests", desc: "Breakdown reports" },
        { to: "/biomed/maintenance", icon: "bi-wrench-adjustable", title: "Maintenance", desc: "Preventive & corrective" },
        { to: "/biomed/calibration", icon: "bi-speedometer2", title: "Calibration Schedule", desc: "Due & overdue calibrations" },
      ]}
    />
  );
}