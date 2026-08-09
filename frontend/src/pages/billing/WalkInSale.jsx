// src/pages/billing/WalkInSale.jsx
import { useEffect, useRef, useState } from "react";
import { toast } from "../../context/ToastContext";
import { searchMedicines, getMedicines, createOTCSale } from "../../services/api";
import { formatDateTime } from "../../utils/formatters";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "MPESA", label: "M-Pesa" },
  { value: "CARD", label: "Card" },
];

const toArray = (data) => (Array.isArray(data) ? data : data?.results ?? []);

const UNIT_ICONS = {
  tablet: "bi-capsule",
  capsule: "bi-capsule",
  syrup: "bi-droplet-half",
  injection: "bi-syringe",
  cream: "bi-droplet",
  ointment: "bi-droplet",
  drops: "bi-eyedropper",
  inhaler: "bi-wind",
  suppository: "bi-capsule-pill",
};
const iconForUnit = (unit) => UNIT_ICONS[(unit || "").toLowerCase()] || "bi-capsule";

function WalkInSaleStyles() {
  return (
    <style>{`
      .wis-results {
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        max-height: 280px;
        overflow-y: auto;
        box-shadow: var(--shadow-sm);
      }
      .wis-results__item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-3);
        width: 100%;
        padding: var(--space-3) var(--space-4);
        border-bottom: 1px solid var(--border-subtle);
        text-align: left;
        transition: background var(--duration-fast) var(--ease-standard);
      }
      .wis-results__item:last-child {
        border-bottom: none;
      }
      .wis-results__item:hover:not(:disabled) {
        background: var(--surface-hover);
      }
      .wis-results__item:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .wis-catalog {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: var(--space-3);
        max-height: 420px;
        overflow-y: auto;
        padding-right: var(--space-1);
      }
      .wis-catalog__card {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: var(--space-2);
        padding: var(--space-3);
        border: 1px solid var(--border-subtle);
        border-radius: var(--radius-md);
        text-align: left;
        background: var(--surface, #fff);
        transition: border-color var(--duration-fast) var(--ease-standard),
                    box-shadow var(--duration-fast) var(--ease-standard),
                    background var(--duration-fast) var(--ease-standard);
      }
      .wis-catalog__card:hover:not(:disabled) {
        border-color: var(--brand, var(--border-strong));
        box-shadow: var(--shadow-sm);
        background: var(--surface-hover);
      }
      .wis-catalog__card:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .wis-catalog__icon {
        width: 36px;
        height: 36px;
        display: grid;
        place-items: center;
        border-radius: var(--radius-md);
        background: var(--surface-hover);
        color: var(--text-secondary);
        font-size: 1.1rem;
      }
      .wis-catalog__name {
        font-weight: var(--fw-medium);
        font-size: var(--fs-sm);
        color: var(--text-primary);
        line-height: 1.2;
      }
      .wis-catalog__price {
        font-family: var(--font-mono);
        font-size: var(--fs-xs);
        color: var(--text-secondary);
      }
      .wis-catalog__stock {
        font-size: var(--fs-2xs, 0.7rem);
        padding: 2px 6px;
        border-radius: var(--radius-sm, 4px);
        font-weight: var(--fw-medium);
      }
      .wis-catalog__stock--ok {
        background: var(--success-soft, #ecfdf5);
        color: var(--success-strong, #047857);
      }
      .wis-catalog__stock--low {
        background: var(--warning-soft, #fffbeb);
        color: var(--warning-strong, #b45309);
      }
      .wis-catalog__stock--out {
        background: var(--danger-soft);
        color: var(--danger-strong);
      }

      .wis-stepper {
        display: inline-flex;
        align-items: center;
        border: 1px solid var(--border-strong);
        border-radius: var(--radius-md);
        overflow: hidden;
      }
      .wis-stepper button {
        width: 28px;
        height: 28px;
        display: grid;
        place-items: center;
        color: var(--text-secondary);
        transition: background var(--duration-fast) var(--ease-standard), color var(--duration-fast) var(--ease-standard);
      }
      .wis-stepper button:hover {
        background: var(--surface-hover);
        color: var(--text-primary);
      }
      .wis-stepper span {
        width: 32px;
        text-align: center;
        font-family: var(--font-mono);
        font-size: var(--fs-sm);
        color: var(--text-primary);
      }

      .wis-summary-line {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: var(--space-2) 0;
        font-size: var(--fs-sm);
      }
      .wis-summary-line--total {
        border-top: 1px solid var(--border-subtle);
        border-bottom: 1px solid var(--border-subtle);
        margin: var(--space-2) 0 var(--space-4);
        padding: var(--space-3) 0;
        font-weight: var(--fw-semibold);
        font-size: var(--fs-md);
        color: var(--text-primary);
      }
    `}</style>
  );
}

export default function WalkInSale() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const [catalog, setCatalog] = useState([]);
  const [catalogLoading, setCatalogLoading] = useState(true);

  const [cart, setCart] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [discount, setDiscount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [receipt, setReceipt] = useState(null);

  const loadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const data = await getMedicines({ page_size: 500 });
      setCatalog(toArray(data));
    } catch (err) {
      toast.error(err.message || "Failed to load medicine catalog");
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    loadCatalog();
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await searchMedicines(query);
        setResults(Array.isArray(data) ? data : data?.results ?? []);
      } catch (err) {
        toast.error(err.message || "Failed to search medicines");
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const addToCart = (medicine) => {
    if (medicine.current_stock <= 0) return;
    setCart((current) => {
      const existing = current.find((item) => item.medicine.id === medicine.id);
      if (existing) {
        if (existing.quantity >= medicine.current_stock) return current;
        return current.map((item) =>
          item.medicine.id === medicine.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...current, { medicine, quantity: 1 }];
    });
  };

  const handleSearchResultClick = (medicine) => {
    addToCart(medicine);
    setQuery("");
    setResults([]);
  };

  const updateQuantity = (medicineId, quantity) => {
    if (quantity < 1) return;
    setCart((current) =>
      current.map((item) => (item.medicine.id === medicineId ? { ...item, quantity } : item))
    );
  };

  const removeFromCart = (medicineId) => {
    setCart((current) => current.filter((item) => item.medicine.id !== medicineId));
  };

  const subtotal = cart.reduce((sum, item) => sum + Number(item.medicine.unit_price) * item.quantity, 0);
  const discountValue = Number(discount) || 0;
  const total = Math.max(subtotal - discountValue, 0);

  const resetSale = () => {
    setCart([]);
    setCustomerName("");
    setCustomerPhone("");
    setDiscount("0");
    setPaymentMethod("CASH");
    setReferenceNumber("");
    setAmountPaid("");
  };

  const handleCompleteSale = async (e) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast.error("Add at least one item to the cart");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        customer_name: customerName,
        customer_phone: customerPhone,
        discount: discountValue,
        payment_method: paymentMethod,
        reference_number: referenceNumber,
        amount_paid: amountPaid === "" ? total : Number(amountPaid),
        items: cart.map((item) => ({ medicine: item.medicine.id, quantity: item.quantity })),
      };
      const sale = await createOTCSale(payload);
      toast.success(`Sale ${sale.sale_number} completed`);
      setReceipt(sale);
      resetSale();
      loadCatalog();
    } catch (err) {
      toast.error(err.message || "Failed to complete sale");
    } finally {
      setSubmitting(false);
    }
  };

  const stockBadgeClass = (medicine) => {
    if (medicine.current_stock <= 0) return "wis-catalog__stock--out";
    if (medicine.is_low_stock) return "wis-catalog__stock--low";
    return "wis-catalog__stock--ok";
  };

  return (
    <>
      <WalkInSaleStyles />

      <div className="page-header">
        <div>
          <div className="page-eyebrow">Pharmacy</div>
          <h1 className="page-title">Walk-in Sale</h1>
          <p className="page-subtitle">Sell medicine directly over the counter — no patient record required</p>
        </div>
      </div>

      <div className="grid-8-4">
        {/* Left Column - 8 columns: Medicine Selection */}
        <div className="grid-8-4__main">
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">Find Medicine</h2>
              {!query.trim() && (
                <span className="text-xs text-faint">
                  {catalogLoading ? "Loading catalog..." : `${catalog.length} item${catalog.length !== 1 ? "s" : ""}`}
                </span>
              )}
            </div>
            <div className="card-body">
              <input
                className="input"
                placeholder="Search by medicine or generic name..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />

              {searching && <p className="text-xs text-faint mt-2">Searching...</p>}

              {query.trim() ? (
                results.length > 0 ? (
                  <div className="wis-results mt-2">
                    {results.map((medicine) => (
                      <button
                        type="button"
                        key={medicine.id}
                        className="wis-results__item"
                        onClick={() => handleSearchResultClick(medicine)}
                        disabled={medicine.current_stock <= 0}
                      >
                        <div className="min-w-0">
                          <div className="font-medium truncate">{medicine.name}</div>
                          <div className="text-2xs text-faint truncate">
                            {medicine.generic_name || "—"} &middot; {medicine.current_stock} {medicine.unit}
                            {medicine.current_stock !== 1 ? "s" : ""} in stock
                          </div>
                        </div>
                        <span className="font-mono text-sm flex-shrink-0">
                          KES {Number(medicine.unit_price).toLocaleString()}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  !searching && <p className="text-xs text-faint mt-2">No matches for "{query}".</p>
                )
              ) : catalogLoading ? (
                <p className="text-xs text-faint mt-3">Loading medicines...</p>
              ) : catalog.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state__icon">
                    <i className="bi bi-capsule" style={{ fontSize: "1.25rem" }}></i>
                  </div>
                  <div className="empty-state__title">No medicines in catalog</div>
                  <div className="empty-state__desc">Add medicines under Pharmacy &middot; Inventory first.</div>
                </div>
              ) : (
                <div className="wis-catalog mt-3">
                  {catalog.map((medicine) => (
                    <button
                      type="button"
                      key={medicine.id}
                      className="wis-catalog__card"
                      onClick={() => addToCart(medicine)}
                      disabled={medicine.current_stock <= 0}
                      title={medicine.current_stock <= 0 ? "Out of stock" : `Add ${medicine.name} to cart`}
                    >
                      <span className="wis-catalog__icon">
                        <i className={`bi ${iconForUnit(medicine.unit)}`}></i>
                      </span>
                      <span className="wis-catalog__name">{medicine.name}</span>
                      <span className="wis-catalog__price">
                        KES {Number(medicine.unit_price).toLocaleString()}
                      </span>
                      <span className={`wis-catalog__stock ${stockBadgeClass(medicine)}`}>
                        {medicine.current_stock <= 0
                          ? "Out of stock"
                          : `${medicine.current_stock} ${medicine.unit}${medicine.current_stock !== 1 ? "s" : ""}`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - 4 columns: Cart + Order Summary */}
        <div className="grid-4-8__sidebar">
          {/* Cart Section */}
          <div className="card" style={{ marginBottom: "var(--space-4)" }}>
            <div className="card-header">
              <h2 className="card-title">Cart</h2>
              <span className="text-xs text-faint">
                {cart.length} item{cart.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="card-body p-0">
              {cart.length === 0 ? (
                <div className="empty-state" style={{ padding: "var(--space-4)" }}>
                  <div className="empty-state__icon">
                    <i className="bi bi-cart" style={{ fontSize: "1.25rem" }}></i>
                  </div>
                  <div className="empty-state__title" style={{ fontSize: "14px" }}>Cart is empty</div>
                  <div className="empty-state__desc" style={{ fontSize: "12px" }}>Tap a medicine to add it.</div>
                </div>
              ) : (
                <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                  {cart.map((item) => (
                    <div
                      key={item.medicine.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "var(--space-2) var(--space-3)",
                        borderBottom: "1px solid var(--border-subtle)"
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "13px", fontWeight: 500, truncate: true }}>
                          {item.medicine.name}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                          <div className="wis-stepper" style={{ height: "28px" }}>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.medicine.id, item.quantity - 1)}
                              style={{ width: "24px", height: "24px" }}
                            >
                              <i className="bi bi-dash" style={{ fontSize: "12px" }}></i>
                            </button>
                            <span style={{ width: "24px", fontSize: "12px" }}>{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(item.medicine.id, item.quantity + 1)}
                              style={{ width: "24px", height: "24px" }}
                            >
                              <i className="bi bi-plus" style={{ fontSize: "12px" }}></i>
                            </button>
                          </div>
                          <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                            KES {(Number(item.medicine.unit_price) * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        style={{
                          background: "none",
                          border: "none",
                          color: "var(--danger-strong)",
                          cursor: "pointer",
                          padding: "4px"
                        }}
                        onClick={() => removeFromCart(item.medicine.id)}
                      >
                        <i className="bi bi-x-lg" style={{ fontSize: "12px" }}></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Order Summary Section */}
          <form className="card" onSubmit={handleCompleteSale}>
            <div className="card-header">
              <h2 className="card-title">Order Summary</h2>
            </div>
            <div className="card-body">
              <div className="field">
                <label className="field-label">Customer name (optional)</label>
                <input
                  className="input"
                  placeholder="Walk-in customer"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              <div className="field">
                <label className="field-label">Customer phone (optional)</label>
                <input className="input" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
              </div>

              <div className="wis-summary-line">
                <span className="text-muted">Subtotal</span>
                <span className="font-mono">KES {subtotal.toLocaleString()}</span>
              </div>

              <div className="field">
                <label className="field-label">Discount (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>

              <div className="wis-summary-line wis-summary-line--total">
                <span>Total</span>
                <span className="font-mono">KES {total.toLocaleString()}</span>
              </div>

              <div className="field">
                <label className="field-label">Payment method</label>
                <select className="select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {paymentMethod !== "CASH" && (
                <div className="field">
                  <label className="field-label">
                    {paymentMethod === "MPESA" ? "M-Pesa code" : "Card auth reference"}
                  </label>
                  <input className="input" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
                </div>
              )}

              <div className="field" style={{ marginBottom: 0 }}>
                <label className="field-label">Amount paid (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="input"
                  placeholder={total.toFixed(2)}
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                />
              </div>
            </div>
            <div className="card-footer" style={{ display: "block" }}>
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting || cart.length === 0}>
                {submitting ? "Processing..." : `Complete Sale — KES ${total.toLocaleString()}`}
              </button>
            </div>
          </form>
        </div>
      </div>

      {receipt && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <div>
                <h3 className="modal-title">Sale Complete</h3>
                <p className="modal-desc">{receipt.sale_number}</p>
              </div>
              <button type="button" className="modal-close" onClick={() => setReceipt(null)}>
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="modal-body">
              <div className="receipt" style={{ width: "100%", padding: 0 }}>
                <div className="receipt__header">
                  <div className="receipt__logo">H</div>
                  <div className="receipt__org">City General Hospital</div>
                  <div className="receipt__meta">
                    {receipt.customer_name || "Walk-in Customer"} &middot; {formatDateTime(receipt.sold_at)}
                  </div>
                </div>

                <div className="receipt__divider" />

                {receipt.items.map((item) => (
                  <div className="receipt__row" key={item.id}>
                    <span className="label">
                      {item.medicine_name} &times; {item.quantity}
                    </span>
                    <span className="value">KES {Number(item.subtotal).toLocaleString()}</span>
                  </div>
                ))}

                <div className="receipt__total-row">
                  <span>Total Paid</span>
                  <span>KES {Number(receipt.total_amount).toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setReceipt(null)}>
                Close
              </button>
              <button type="button" className="btn btn-primary" onClick={() => window.print()}>
                <i className="bi bi-printer" style={{ marginRight: "var(--space-2)" }}></i>
                Print Receipt
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}