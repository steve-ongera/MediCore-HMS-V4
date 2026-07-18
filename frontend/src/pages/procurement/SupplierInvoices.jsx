import { useEffect, useState } from "react";
import { getSupplierInvoices, createSupplierPayment } from "../../services/api";

export default function SupplierInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [payingId, setPayingId] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: "", method: "BANK_TRANSFER", reference_number: "" });

  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getSupplierInvoices(params);
      setInvoices(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const openPaymentForm = (invoice) => {
    setPayingId(invoice.id);
    setPaymentForm({ amount: invoice.balance, method: "BANK_TRANSFER", reference_number: "" });
  };

  const submitPayment = async (invoiceId) => {
    try {
      await createSupplierPayment({
        supplier_invoice: invoiceId,
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        reference_number: paymentForm.reference_number,
      });
      setPayingId(null);
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Supplier Invoices</h1>
      {error && <p>Error: {error}</p>}

      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="UNPAID">Unpaid</option>
        <option value="PARTIAL">Partially Paid</option>
        <option value="PAID">Paid</option>
        <option value="DISPUTED">Disputed</option>
      </select>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead>
            <tr>
              <th>Invoice #</th><th>Supplier Ref</th><th>Supplier</th><th>PO #</th>
              <th>Amount</th><th>Paid</th><th>Balance</th><th>Status</th><th>Due Date</th><th></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.invoice_number}</td><td>{inv.supplier_invoice_ref || "—"}</td>
                <td>{inv.supplier_name}</td><td>{inv.po_number}</td>
                <td>KES {inv.amount}</td><td>KES {inv.amount_paid}</td><td>KES {inv.balance}</td>
                <td>{inv.status}</td><td>{inv.due_date || "—"}</td>
                <td>
                  {inv.status !== "PAID" && (
                    payingId === inv.id ? (
                      <div>
                        <input type="number" placeholder="Amount" value={paymentForm.amount} onChange={(e) => setPaymentForm((p) => ({ ...p, amount: e.target.value }))} />
                        <select value={paymentForm.method} onChange={(e) => setPaymentForm((p) => ({ ...p, method: e.target.value }))}>
                          <option value="CASH">Cash</option>
                          <option value="BANK_TRANSFER">Bank Transfer</option>
                          <option value="MPESA">M-Pesa</option>
                          <option value="CHEQUE">Cheque</option>
                        </select>
                        <input type="text" placeholder="Reference #" value={paymentForm.reference_number} onChange={(e) => setPaymentForm((p) => ({ ...p, reference_number: e.target.value }))} />
                        <button type="button" onClick={() => submitPayment(inv.id)}>Confirm Payment</button>
                        <button type="button" onClick={() => setPayingId(null)}>Cancel</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => openPaymentForm(inv)}>Pay</button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && invoices.length === 0 && <p>No supplier invoices recorded.</p>}
    </div>
  );
}