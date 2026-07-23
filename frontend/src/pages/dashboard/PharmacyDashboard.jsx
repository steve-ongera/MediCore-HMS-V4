import RoleDashboardBase from "./RoleDashboardBase.jsx";

export default function PharmacyDashboard() {
  return (
    <RoleDashboardBase
      eyebrow="Pharmacy" title="Pharmacist Dashboard" subtitle="Dispensing, stock, and OTC sales"
      quickActions={[
        { to: "/pharmacy", icon: "bi-capsule", title: "Pharmacy", desc: "Dispense prescriptions" },
        { to: "/inventory", icon: "bi-box-seam", title: "Inventory", desc: "Stock levels & batches" },
        { to: "/suppliers", icon: "bi-truck", title: "Suppliers", desc: "Manage suppliers" },
        { to: "/billing/walk-in-sale", icon: "bi-bag-check", title: "Walk-in Sale", desc: "OTC pharmacy sale" },
      ]}
    />
  );
}