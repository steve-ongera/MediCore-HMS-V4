import RoleReportBase from "./RoleReportBase.jsx";
export default function PharmacistReport() {
  return <RoleReportBase reportType="pharmacist_report" title="Pharmacy Activity" subtitle="Dispensing, stock, and low-stock alerts"
    tableColumns={[{ key: "prescription__medicine__name", label: "Medicine" }, { key: "quantity_dispensed", label: "Qty" }, { key: "dispensed_at", label: "Dispensed", render: (r) => new Date(r.dispensed_at).toLocaleString() }]} />;
}