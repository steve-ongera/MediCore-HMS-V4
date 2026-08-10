import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMyDepartmentBudgets, createRequisition, getMedicines } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";

export default function RaiseRequisition() {
  const navigate = useNavigate();
  const [budgets, setBudgets] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [form, setForm] = useState({ budget_line: "", category: "OTHER", justification: "" });
  const [items, setItems] = useState([{ medicine: "", description: "", quantity_requested: 1, estimated_unit_cost: "" }]);

  useEffect(() => { load(); loadMedicines(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getMyDepartmentBudgets();
      setBudgets(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadMedicines = async () => {
    try { const data = await getMedicines({ page_size: 200 }); setMedicines(data.results ?? data); } catch (err) { setError(err.message); }
  };

  const handleBudgetChange = (id) => {
    setForm((p) => ({ ...p, budget_line: id }));
    setSelectedBudget(budgets.find((b) => b.id === id) || null);
  };

  const addItem = () => setItems([...items, { medicine: "", description: "", quantity_requested: 1, estimated_unit_cost: "" }]);
  const updateItem = (i, field, val) => { const u = [...items]; u[i][field] = val; setItems(u); };
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  const resetForm = () => {
    setForm({ budget_line: "", category: "OTHER", justification: "" });
    setItems([{ medicine: "", description: "", quantity_requested: 1, estimated_unit_cost: "" }]);
    setSelectedBudget(null);
  };

  const estimatedTotal = items.reduce((sum, it) => sum + (Number(it.quantity_requested) || 0) * (Number(it.estimated_unit_cost) || 0), 0);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.budget_line) { setError("Select a budget line."); return; }
    if (selectedBudget && estimatedTotal > Number(selectedBudget.available_amount)) {
      setError(`Estimated total (KES ${estimatedTotal.toLocaleString()}) exceeds the available amount on this budget line.`);
      return;
    }
    setSubmitting(true);
    try {
      await createRequisition({
        budget_line: form.budget_line,
        category: form.category,
        justification: form.justification,
        items: items.map((it) => ({
          medicine: it.medicine || undefined,
          description: it.description,
          quantity_requested: Number(it.quantity_requested),
          estimated_unit_cost: it.estimated_unit_cost ? Number(it.estimated_unit_cost) : undefined,
        })),
      });
      setShowSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getUtilizationColor = (pct) => {
    if (pct >= 100) return "var(--danger-strong)";
    if (pct >= 85) return "var(--warning-strong)";
    return "var(--primary)";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading budget data...</span>
      </div>
    );
  }

  return (
    <>
      {showSuccess && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
        >
          <div className="card" style={{ maxWidth: "420px", width: "90%" }}>
            <div className="card-body" style={{ textAlign: "center", padding: "var(--space-5)" }}>
              <div
                style={{
                  width: "56px", height: "56px", borderRadius: "50%",
                  background: "var(--success-soft)", color: "var(--success-strong)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "28px", margin: "0 auto var(--space-3)",
                }}
              >
                <i className="bi bi-check-lg"></i>
              </div>
              <h5 className="card-title" style={{ marginBottom: "var(--space-2)" }}>
                Requisition Submitted
              </h5>
              <p className="text-sm text-muted" style={{ marginBottom: "var(--space-4)" }}>
                Successfully submitted — waiting for HOD approval.
              </p>
              <div style={{ display: "flex", gap: "var(--space-2)", justifyContent: "center" }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setShowSuccess(false); resetForm(); }}
                >
                  Raise Another
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate("/procurement/requisitions")}
                >
                  Back to Requisitions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          <div className="page-eyebrow">Procurement</div>
          <h1 className="page-title">Raise a Requisition</h1>
          <p className="page-subtitle">Request goods or services for your department</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/procurement/requisitions")}>
            <i className="bi bi-arrow-left  me-1"></i> Back to Requisitions
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle  me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-clipboard-plus  me-1"></i> Requisition Details
          </h5>
        </div>
        <div className="card-body">
          <div className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
            <i className="bi bi-info-circle  me-1"></i>
            Requisitions can be for medicines, equipment, IT items, tenders, construction, or any other departmental need — as long as it's tied to your department's active budget line.
          </div>

          <form onSubmit={submit}>
            <div className="field">
              <label className="field-label">Budget Line <span className="required">*</span></label>
              <select className="select" value={form.budget_line} onChange={(e) => handleBudgetChange(e.target.value)} required>
                <option value="">Select budget line</option>
                {budgets.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.department_name} — {b.fiscal_period_name} (Available: {formatCurrency(b.available_amount)})
                  </option>
                ))}
              </select>
              {budgets.length === 0 && (
                <div className="text-sm text-warning" style={{ marginTop: "var(--space-1)" }}>
                  <i className="bi bi-exclamation-triangle  me-1"></i>
                  No active budget line found for your department. Contact Accounting to have one allocated before raising a requisition.
                </div>
              )}
            </div>

            {selectedBudget && (
              <div className="card" style={{ borderColor: "var(--primary)", background: "var(--primary-soft)", marginBottom: "var(--space-3)" }}>
                <div className="card-body" style={{ padding: "var(--space-3)" }}>
                  <div className="info-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
                    <div className="info-item">
                      <div className="info-item__label">Allocated</div>
                      <div className="info-item__value">{formatCurrency(selectedBudget.allocated_amount)}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-item__label">Already Spent</div>
                      <div className="info-item__value">{formatCurrency(selectedBudget.spent_amount)}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-item__label">Committed</div>
                      <div className="info-item__value">{formatCurrency(selectedBudget.committed_amount)}</div>
                    </div>
                    <div className="info-item">
                      <div className="info-item__label">Available Now</div>
                      <div className="info-item__value" style={{ fontSize: "18px", fontWeight: 700, color: selectedBudget.utilization_percent >= 100 ? "var(--danger-strong)" : "var(--success-strong)" }}>
                        {formatCurrency(selectedBudget.available_amount)}
                      </div>
                    </div>
                  </div>
                  <div style={{ marginTop: "var(--space-2)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span className="text-2xs text-tertiary">{selectedBudget.utilization_percent}% utilized</span>
                      <span className="text-2xs text-tertiary">{formatCurrency(selectedBudget.allocated_amount)} total</span>
                    </div>
                    <div style={{ background: "var(--bg-secondary)", height: "8px", borderRadius: "4px", overflow: "hidden" }}>
                      <div
                        style={{
                          width: `${Math.min(selectedBudget.utilization_percent, 100)}%`,
                          background: getUtilizationColor(selectedBudget.utilization_percent),
                          height: "100%",
                          borderRadius: "4px",
                          transition: "width 0.3s ease"
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="field">
              <label className="field-label">Category <span className="required">*</span></label>
              <select className="select" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
                <option value="MEDICINE">Medicine / Pharmacy</option>
                <option value="IT_EQUIPMENT">IT Equipment (Laptops, Printers, etc.)</option>
                <option value="ASSET">General Asset / Equipment</option>
                <option value="CONSTRUCTION">Construction / Renovation</option>
                <option value="TENDER">Tender (Network Installation, Contracted Works)</option>
                <option value="SERVICE">Service Contract</option>
                <option value="CONSUMABLE">General Consumable</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div className="field">
              <label className="field-label">Justification</label>
              <textarea
                className="textarea"
                placeholder="Justification for this requisition"
                value={form.justification}
                onChange={(e) => setForm((p) => ({ ...p, justification: e.target.value }))}
              />
            </div>

            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <i className="bi bi-list-ul  me-1"></i> Items
            </h6>
            {items.map((it, i) => (
              <div key={i} className="field-row" style={{ marginBottom: "var(--space-2)" }}>
                {form.category === "MEDICINE" && (
                  <div className="field" style={{ marginBottom: 0, flex: 1.2 }}>
                    <select className="select" value={it.medicine} onChange={(e) => updateItem(i, "medicine", e.target.value)}>
                      <option value="">Link to a medicine (optional)</option>
                      {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="field" style={{ marginBottom: 0, flex: form.category === "MEDICINE" ? 1.2 : 1.8 }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Description"
                    value={it.description}
                    onChange={(e) => updateItem(i, "description", e.target.value)}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 0.6 }}>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    placeholder="Qty"
                    value={it.quantity_requested}
                    onChange={(e) => updateItem(i, "quantity_requested", e.target.value)}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 0.8 }}>
                  <input
                    type="number"
                    className="input"
                    placeholder="Est. unit cost"
                    value={it.estimated_unit_cost}
                    onChange={(e) => updateItem(i, "estimated_unit_cost", e.target.value)}
                  />
                </div>
                {items.length > 1 && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeItem(i)}>
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>
              <i className="bi bi-plus-circle  me-1"></i> Add Item
            </button>

            <div className="card" style={{ marginTop: "var(--space-3)", background: "var(--bg-secondary)" }}>
              <div className="card-body" style={{ padding: "var(--space-2) var(--space-3)" }}>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">Estimated Total:</span>
                  <span className="text-lg font-bold" style={{ color: selectedBudget && estimatedTotal > Number(selectedBudget.available_amount) ? "var(--danger-strong)" : "var(--text-color)" }}>
                    {formatCurrency(estimatedTotal)}
                  </span>
                  {selectedBudget && estimatedTotal > Number(selectedBudget.available_amount) && (
                    <span className="text-sm text-danger">
                      <i className="bi bi-exclamation-triangle  me-1"></i>
                      Exceeds available budget
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: "var(--space-3)" }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate("/procurement/requisitions")}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || budgets.length === 0}
              >
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <i className="bi bi-send  me-1"></i> Submit Requisition
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}