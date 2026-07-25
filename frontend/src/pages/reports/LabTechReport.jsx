import RoleReportBase from "./RoleReportBase.jsx";
export default function LabTechReport() {
  return <RoleReportBase reportType="lab_tech_report" title="My Lab Activity" subtitle="Test orders, turnaround, and status"
    tableColumns={[{ key: "test__name", label: "Test" }, { key: "status", label: "Status" }, { key: "ordered_at", label: "Ordered", render: (r) => new Date(r.ordered_at).toLocaleString() }]} />;
}