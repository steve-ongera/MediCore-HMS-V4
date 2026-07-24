import RoleDashboardBase from "./RoleDashboardBase.jsx";

export default function ProcurementDashboard() {
  return (
    <RoleDashboardBase
      eyebrow="Procurement" title="Procurement Dashboard" subtitle="Requisitions, orders, and supplier activity"
      quickActions={[
        { to: "/procurement/requisitions", icon: "bi-clipboard2-check", title: "Requisitions", desc: "Approve requests" },
        { to: "/procurement/orders", icon: "bi-cart4", title: "Purchase Orders", desc: "Manage open POs" },
        { to: "/procurement/receipts", icon: "bi-box-arrow-in-down", title: "Goods Receipts", desc: "Record deliveries" },
        { to: "/procurement/invoices", icon: "bi-receipt", title: "Supplier Invoices", desc: "Accounts payable" },
      ]}
    />
  );
}