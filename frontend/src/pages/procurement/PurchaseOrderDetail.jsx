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

  const getStatusBadge = (status) => {
    const statusMap = {
      "OPEN": "badge-primary",
      "PARTIALLY_RECEIVED": "badge-warning",
      "FULLY_RECEIVED": "badge-success",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading purchase order...</span>
      </div>
    );
  }

  if (!po) return null;

  const hasOutstandingItems = po.items.some((it) => it.quantity_outstanding > 0);

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Procurement</div>
          <h1 className="page-title">{po.po_number}</h1>
          <p className="page-subtitle">{po.supplier_name}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/procurement/orders")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Orders
          </button>
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise me-2"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-2"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-file-earmark-text fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{po.po_number}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-building me-1"></i> {po.supplier_name}
                </span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(po.status)}`}>
                  <span className="badge-dot"></span>
                  {po.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm font-bold">{formatCurrency(po.total_amount)}</span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Requisition</div>
              <div className="info-item__value">{po.requisition_number || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Order Date</div>
              <div className="info-item__value">{new Date(po.order_date).toLocaleDateString()}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Expected Delivery</div>
              <div className="info-item__value">{po.expected_delivery_date || "—"}</div>
            </div>
            <div className="info-item" style={{ gridColumn: "span 2" }}>
              <div className="info-item__label">Notes</div>
              <div className="info-item__value">{po.notes || "—"}</div>
            </div>
          </div>

          {po.status !== "FULLY_RECEIVED" && po.status !== "CANCELLED" && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <button className="btn btn-danger" onClick={handleCancel}>
                <i className="bi bi-x-circle me-2"></i> Cancel Purchase Order
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Order Items</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {po.items.length} item{po.items.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Type</th>
                  <th className="cell-numeric">Ordered</th>
                  <th className="cell-numeric">Received</th>
                  <th className="cell-numeric">Outstanding</th>
                  <th className="cell-numeric">Unit Cost</th>
                  <th className="cell-numeric">Line Total</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map((it) => (
                  <tr key={it.id}>
                    <td className="cell-primary">{it.description}</td>
                    <td>
                      <span className="tag">{it.item_type}</span>
                    </td>
                    <td className="cell-numeric">{it.quantity_ordered}</td>
                    <td className="cell-numeric">{it.quantity_received}</td>
                    <td className="cell-numeric">{it.quantity_outstanding}</td>
                    <td className="cell-numeric">{formatCurrency(it.unit_cost)}</td>
                    <td className="cell-numeric">{formatCurrency(it.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {hasOutstandingItems && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-box-seam me-2"></i> Record Goods Receipt
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitReceipt}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Delivery Note Reference</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Delivery note ref"
                    value={receiptForm.delivery_note_ref}
                    onChange={(e) => setReceiptForm((p) => ({ ...p, delivery_note_ref: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                  <label className="field-label">Notes</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Receipt notes"
                    value={receiptForm.notes}
                    onChange={(e) => setReceiptForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>

              <div className="table-scroll" style={{ marginTop: "var(--space-3)" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: "40px" }}></th>
                      <th>Item</th>
                      <th className="cell-numeric" style={{ width: "120px" }}>Qty Received</th>
                      <th style={{ width: "150px" }}>Batch #</th>
                      <th style={{ width: "150px" }}>Expiry (medicines)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {po.items.filter((it) => it.quantity_outstanding > 0).map((it) => (
                      <tr key={it.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={receiptItems[it.id]?.checked || false}
                            onChange={handleReceiptItemChange(it.id, "checked")}
                          />
                        </td>
                        <td className="cell-primary">
                          {it.description}
                          <div className="text-2xs text-tertiary">Outstanding: {it.quantity_outstanding}</div>
                        </td>
                        <td>
                          <input
                            type="number"
                            className="input"
                            max={it.quantity_outstanding}
                            value={receiptItems[it.id]?.quantity_received || ""}
                            onChange={handleReceiptItemChange(it.id, "quantity_received")}
                            style={{ width: "100px" }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            className="input"
                            placeholder="Batch #"
                            value={receiptItems[it.id]?.batch_number || ""}
                            onChange={handleReceiptItemChange(it.id, "batch_number")}
                            style={{ width: "140px" }}
                          />
                        </td>
                        <td>
                          {it.item_type === "MEDICINE" && (
                            <input
                              type="date"
                              className="input"
                              value={receiptItems[it.id]?.expiry_date || ""}
                              onChange={handleReceiptItemChange(it.id, "expiry_date")}
                              style={{ width: "140px" }}
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                <i className="bi bi-box-seam me-2"></i> Record Receipt
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-clock-history me-2"></i> Goods Receipt History
          </h5>
        </div>
        <div className="card-body">
          {(po.goods_receipts || []).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-box-seam"></i>
              </div>
              <h3 className="empty-state__title">No goods received yet</h3>
              <p className="empty-state__desc">Record the first goods receipt above.</p>
            </div>
          ) : (
            <div className="text-sm text-muted">
              <i className="bi bi-info-circle me-1"></i> {po.goods_receipts.length} receipt(s) recorded.
              <Link to={`/procurement/receipts?po=${po.id}`} className="btn btn-secondary btn-sm" style={{ marginLeft: "var(--space-2)" }}>
                <i className="bi bi-eye me-1"></i> View All
              </Link>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-file-earmark-plus me-2"></i> Record Supplier Invoice
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submitInvoice}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Supplier Invoice Reference <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Invoice ref"
                  value={invoiceForm.supplier_invoice_ref}
                  onChange={(e) => setInvoiceForm((p) => ({ ...p, supplier_invoice_ref: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Amount <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  placeholder="Amount"
                  value={invoiceForm.amount}
                  onChange={(e) => setInvoiceForm((p) => ({ ...p, amount: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Due Date</label>
                <input
                  type="date"
                  className="input"
                  value={invoiceForm.due_date}
                  onChange={(e) => setInvoiceForm((p) => ({ ...p, due_date: e.target.value }))}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              <i className="bi bi-file-earmark-plus me-2"></i> Record Supplier Invoice
            </button>
          </form>
        </div>
      </div>
    </>
  );
}