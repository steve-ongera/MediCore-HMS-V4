import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getPurchaseOrder, cancelPurchaseOrder, createGoodsReceipt, createSupplierInvoice } from "../../services/api";

export default function PurchaseOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [po, setPo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [receiptForm, setReceiptForm] = useState({ delivery_note_ref: "", notes: "" });
  const [receiptItems, setReceiptItems] = useState({});

  const [invoiceForm, setInvoiceForm] = useState({ supplier_invoice_ref: "", amount: "", due_date: "" });

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getPurchaseOrder(id);
      setPo(data);
      const initial = {};
      data.items.forEach((it) => {
        if (it.quantity_outstanding > 0) {
          initial[it.id] = { checked: false, quantity_received: it.quantity_outstanding, batch_number: "", expiry_date: "" };
        }
      });
      setReceiptItems(initial);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel this purchase order?")) return;
    try {
      await cancelPurchaseOrder(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleReceiptItemChange = (itemId, field) => (e) => {
    const value = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setReceiptItems((prev) => ({ ...prev, [itemId]: { ...prev[itemId], [field]: value } }));
  };

  const submitReceipt = async (e) => {
    e.preventDefault();
    const itemsToSend = Object.entries(receiptItems)
      .filter(([, v]) => v.checked)
      .map(([poItemId, v]) => ({
        po_item: poItemId,
        quantity_received: Number(v.quantity_received),
        batch_number: v.batch_number,
        expiry_date: v.expiry_date || undefined,
      }));
    if (itemsToSend.length === 0) {
      setError("Select at least one item to receive.");
      return;
    }
    try {
      await createGoodsReceipt({
        purchase_order: id,
        delivery_note_ref: receiptForm.delivery_note_ref,
        notes: receiptForm.notes,
        items: itemsToSend,
      });
      setReceiptForm({ delivery_note_ref: "", notes: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitInvoice = async (e) => {
    e.preventDefault();
    try {
      await createSupplierInvoice({
        purchase_order: id,
        supplier: po.supplier,
        supplier_invoice_ref: invoiceForm.supplier_invoice_ref,
        amount: Number(invoiceForm.amount),
        due_date: invoiceForm.due_date || undefined,
      });
      setInvoiceForm({ supplier_invoice_ref: "", amount: "", due_date: "" });
      alert("Supplier invoice recorded. View it under Supplier Invoices.");
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div>Loading...</div>;
  if (!po) return null;

  const hasOutstandingItems = po.items.some((it) => it.quantity_outstanding > 0);

  return (
    <div>
      <button type="button" onClick={() => navigate("/procurement/orders")}>&larr; Back</button>
      <h1>{po.po_number}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Supplier: {po.supplier_name}</p>
        <p>Requisition: {po.requisition_number || "—"}</p>
        <p>Status: {po.status}</p>
        <p>Order Date: {po.order_date} — Expected Delivery: {po.expected_delivery_date || "—"}</p>
        <p>Total: KES {po.total_amount}</p>
        <p>Notes: {po.notes || "—"}</p>
        {po.status !== "FULLY_RECEIVED" && po.status !== "CANCELLED" && (
          <button type="button" onClick={handleCancel}>Cancel Purchase Order</button>
        )}
      </section>

      <section>
        <h2>Order Items</h2>
        <table>
          <thead><tr><th>Description</th><th>Type</th><th>Ordered</th><th>Received</th><th>Outstanding</th><th>Unit Cost</th><th>Line Total</th></tr></thead>
          <tbody>
            {po.items.map((it) => (
              <tr key={it.id}>
                <td>{it.description}</td><td>{it.item_type}</td>
                <td>{it.quantity_ordered}</td><td>{it.quantity_received}</td><td>{it.quantity_outstanding}</td>
                <td>KES {it.unit_cost}</td><td>KES {it.line_total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {hasOutstandingItems && (
        <section>
          <h2>Record Goods Receipt</h2>
          <form onSubmit={submitReceipt}>
            <input type="text" placeholder="Delivery note ref" value={receiptForm.delivery_note_ref} onChange={(e) => setReceiptForm((p) => ({ ...p, delivery_note_ref: e.target.value }))} />
            <textarea placeholder="Notes" value={receiptForm.notes} onChange={(e) => setReceiptForm((p) => ({ ...p, notes: e.target.value }))} />

            <table>
              <thead><tr><th></th><th>Item</th><th>Qty Received</th><th>Batch #</th><th>Expiry (medicines)</th></tr></thead>
              <tbody>
                {po.items.filter((it) => it.quantity_outstanding > 0).map((it) => (
                  <tr key={it.id}>
                    <td>
                      <input type="checkbox" checked={receiptItems[it.id]?.checked || false} onChange={handleReceiptItemChange(it.id, "checked")} />
                    </td>
                    <td>{it.description} (outstanding: {it.quantity_outstanding})</td>
                    <td>
                      <input type="number" max={it.quantity_outstanding} value={receiptItems[it.id]?.quantity_received || ""} onChange={handleReceiptItemChange(it.id, "quantity_received")} />
                    </td>
                    <td>
                      <input type="text" value={receiptItems[it.id]?.batch_number || ""} onChange={handleReceiptItemChange(it.id, "batch_number")} />
                    </td>
                    <td>
                      {it.item_type === "MEDICINE" && (
                        <input type="date" value={receiptItems[it.id]?.expiry_date || ""} onChange={handleReceiptItemChange(it.id, "expiry_date")} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="submit">Record Receipt</button>
          </form>
        </section>
      )}

      <section>
        <h2>Goods Receipt History</h2>
        {(po.goods_receipts || []).length === 0 ? <p>No goods received yet.</p> : (
          <p>See full history under Goods Receipts.</p>
        )}
      </section>

      <section>
        <h2>Record Supplier Invoice</h2>
        <form onSubmit={submitInvoice}>
          <input type="text" placeholder="Supplier's invoice reference" value={invoiceForm.supplier_invoice_ref} onChange={(e) => setInvoiceForm((p) => ({ ...p, supplier_invoice_ref: e.target.value }))} />
          <input type="number" placeholder="Amount" value={invoiceForm.amount} onChange={(e) => setInvoiceForm((p) => ({ ...p, amount: e.target.value }))} required />
          <input type="date" placeholder="Due date" value={invoiceForm.due_date} onChange={(e) => setInvoiceForm((p) => ({ ...p, due_date: e.target.value }))} />
          <button type="submit">Record Supplier Invoice</button>
        </form>
      </section>
    </div>
  );
}