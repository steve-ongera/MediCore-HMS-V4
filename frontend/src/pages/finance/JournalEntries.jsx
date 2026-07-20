import { useEffect, useState } from "react";
import {
  getJournalEntries, createJournalEntry, postJournalEntry, voidJournalEntry,
  getAccounts, getFiscalPeriods,
} from "../../services/api";

export default function JournalEntries() {
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ entry_date: new Date().toISOString().slice(0, 10), fiscal_period: "", reference: "", description: "" });
  const [lines, setLines] = useState([
    { account: "", debit: "", credit: "", description: "" },
    { account: "", debit: "", credit: "", description: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { loadAccounts(); loadPeriods(); }, []);
  useEffect(() => { load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      const data = await getJournalEntries(params);
      setEntries(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadAccounts = async () => {
    try {
      const data = await getAccounts();
      setAccounts(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadPeriods = async () => {
    try {
      const data = await getFiscalPeriods();
      setPeriods(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleFormChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleLineChange = (index, field) => (e) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: e.target.value };
    setLines(updated);
  };

  const addLine = () => setLines([...lines, { account: "", debit: "", credit: "", description: "" }]);
  const removeLine = (index) => setLines(lines.filter((_, i) => i !== index));

  const totalDebit = lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createJournalEntry({
        entry_date: form.entry_date,
        fiscal_period: form.fiscal_period || undefined,
        reference: form.reference,
        description: form.description,
        lines: lines.map((l) => ({
          account: l.account, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description,
        })),
      });
      setForm({ entry_date: new Date().toISOString().slice(0, 10), fiscal_period: "", reference: "", description: "" });
      setLines([{ account: "", debit: "", credit: "", description: "" }, { account: "", debit: "", credit: "", description: "" }]);
      load();
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  const handlePost = async (id) => {
    try { await postJournalEntry(id); load(); } catch (err) { setError(err.message); }
  };

  const handleVoid = async (id) => {
    if (!window.confirm("Void this posted entry?")) return;
    try { await voidJournalEntry(id); load(); } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "DRAFT": "badge-warning",
      "POSTED": "badge-success",
      "VOIDED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading && entries.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading journal entries...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1 className="page-title">Journal Entries</h1>
          <p className="page-subtitle">Manage accounting journal entries</p>
        </div>
        <div className="page-header__actions">
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
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> New Journal Entry
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Entry Date <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={form.entry_date}
                  onChange={handleFormChange("entry_date")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Fiscal Period</label>
                <select className="select" value={form.fiscal_period} onChange={handleFormChange("fiscal_period")}>
                  <option value="">No fiscal period</option>
                  {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Reference</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Reference"
                  value={form.reference}
                  onChange={handleFormChange("reference")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                <label className="field-label">Description <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Description"
                  value={form.description}
                  onChange={handleFormChange("description")}
                  required
                />
              </div>
            </div>

            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <i className="bi bi-list-ul me-1"></i> Lines
            </h6>
            {lines.map((line, index) => (
              <div key={index} className="field-row" style={{ marginBottom: "var(--space-2)" }}>
                <div className="field" style={{ marginBottom: 0, flex: 1.5 }}>
                  <select className="select" value={line.account} onChange={handleLineChange(index, "account")} required>
                    <option value="">Select account</option>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 0.8 }}>
                  <input
                    type="number"
                    className="input"
                    placeholder="Debit"
                    value={line.debit}
                    onChange={handleLineChange(index, "debit")}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 0.8 }}>
                  <input
                    type="number"
                    className="input"
                    placeholder="Credit"
                    value={line.credit}
                    onChange={handleLineChange(index, "credit")}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1.2 }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Line description"
                    value={line.description}
                    onChange={handleLineChange(index, "description")}
                  />
                </div>
                {lines.length > 2 && (
                  <button type="button" className="btn btn-danger btn-sm" onClick={() => removeLine(index)}>
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={addLine}>
              <i className="bi bi-plus-circle me-1"></i> Add Line
            </button>

            <div className="info-grid" style={{ marginTop: "var(--space-3)" }}>
              <div className="info-item">
                <div className="info-item__label">Total Debit</div>
                <div className="info-item__value">{formatCurrency(totalDebit)}</div>
              </div>
              <div className="info-item">
                <div className="info-item__label">Total Credit</div>
                <div className="info-item__value">{formatCurrency(totalCredit)}</div>
              </div>
              <div className="info-item">
                <div className="info-item__label">Status</div>
                <div className="info-item__value">
                  <span className={`badge ${isBalanced ? "badge-success" : "badge-danger"}`}>
                    <span className="badge-dot"></span>
                    {isBalanced ? "Balanced ✓" : "Not Balanced"}
                  </span>
                </div>
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: "var(--space-3)" }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !isBalanced}
              >
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Creating...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle me-2"></i> Create Draft Entry
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-funnel me-1"></i>
            <div className="field" style={{ marginBottom: 0 }}>
              <label className="field-label" style={{ marginBottom: 0, fontSize: "13px" }}>Filter by Status</label>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "160px" }}
              >
                <option value="">All</option>
                <option value="DRAFT">Draft</option>
                <option value="POSTED">Posted</option>
                <option value="VOIDED">Voided</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {entries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-journal-text"></i>
              </div>
              <h3 className="empty-state__title">No journal entries found</h3>
              <p className="empty-state__desc">
                {statusFilter 
                  ? `No entries with status "${statusFilter}" found.` 
                  : "Create your first journal entry using the form above."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Entry #</th>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Source</th>
                    <th className="cell-numeric">Total Debit</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="cell-mono">{e.entry_number}</td>
                      <td>{e.entry_date}</td>
                      <td className="cell-primary">{e.description}</td>
                      <td>{e.source}</td>
                      <td className="cell-numeric">{formatCurrency(e.total_debit)}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(e.status)}`}>
                          <span className="badge-dot"></span>
                          {e.status}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <div className="flex gap-1 justify-end">
                          {e.status === "DRAFT" && (
                            <button className="btn btn-success btn-sm" onClick={() => handlePost(e.id)}>
                              <i className="bi bi-check-circle me-1"></i> Post
                            </button>
                          )}
                          {e.status === "POSTED" && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleVoid(e.id)}>
                              <i className="bi bi-x-circle me-1"></i> Void
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {entries.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Draft
              </span>
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Posted
              </span>
              <span className="badge badge-neutral">
                <span className="badge-dot"></span>
                Voided
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}