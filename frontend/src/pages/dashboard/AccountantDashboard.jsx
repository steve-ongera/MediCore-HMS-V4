import RoleDashboardBase from "./RoleDashboardBase.jsx";

export default function AccountantDashboard() {
  return (
    <RoleDashboardBase
      eyebrow="Finance" title="Accountant Dashboard" subtitle="Revenue, expenses, and outstanding balances"
      quickActions={[
        { to: "/finance", icon: "bi-graph-up-arrow", title: "Financial Summary", desc: "P&L snapshot" },
        { to: "/reports", icon: "bi-bar-chart-line", title: "Reports", desc: "All analytics reports" },
        { to: "/finance/expenses", icon: "bi-receipt-cutoff", title: "Expenses", desc: "Approve & track expenses" },
        { to: "/procurement/invoices", icon: "bi-receipt", title: "Supplier Invoices", desc: "Accounts payable" },
      ]}
    />
  );
}