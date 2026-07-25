import RoleReportBase from "./RoleReportBase.jsx";
export default function AmbulanceReport() {
  return <RoleReportBase reportType="ambulance_report" title="Dispatch Activity" subtitle="Trip volume, types, and outcomes"
    tableColumns={[{ key: "dispatch_number", label: "Dispatch #" }, { key: "ambulance__registration_number", label: "Vehicle" }, { key: "dispatch_type", label: "Type" }, { key: "status", label: "Status" }]} />;
}