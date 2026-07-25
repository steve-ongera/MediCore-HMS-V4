import RoleReportBase from "./RoleReportBase.jsx";
export default function RadiologistReport() {
  return <RoleReportBase reportType="radiologist_report" title="My Radiology Activity" subtitle="Imaging orders and reporting status"
    tableColumns={[{ key: "test__name", label: "Test" }, { key: "status", label: "Status" }, { key: "ordered_at", label: "Ordered", render: (r) => new Date(r.ordered_at).toLocaleString() }]} />;
}