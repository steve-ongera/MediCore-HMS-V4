import RoleReportBase from "./RoleReportBase.jsx";
export default function MortuaryReport() {
  return <RoleReportBase reportType="mortuary_report" title="Mortuary Activity" subtitle="Case admissions, releases, and storage duration"
    tableColumns={[{ key: "case_number", label: "Case #" }, { key: "deceased_name_freetext", label: "Deceased" }, { key: "source", label: "Source" }, { key: "status", label: "Status" }]} />;
}