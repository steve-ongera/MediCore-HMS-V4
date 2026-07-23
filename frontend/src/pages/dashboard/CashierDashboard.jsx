import RoleDashboardBase from "./RoleDashboardBase.jsx";

export default function CashierDashboard() {
  return (
    <RoleDashboardBase
      eyebrow="Billing" title="Cashier Dashboard" subtitle="Today's collections and outstanding balances"
      quickActions={[
        { to: "/billing", icon: "bi-cash-stack", title: "Billing", desc: "Invoices & payments" },
        { to: "/billing/payments", icon: "bi-receipt", title: "Payments", desc: "Process a payment" },
        { to: "/billing/walk-in-sale", icon: "bi-bag-check", title: "Walk-in Sale", desc: "OTC pharmacy sale" },
        { to: "/insurance/claims/new", icon: "bi-file-earmark-plus", title: "File Claim", desc: "Insurance claim" },
      ]}
    />
  );
}