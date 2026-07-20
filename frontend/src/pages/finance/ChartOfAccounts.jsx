import { useEffect, useState } from "react";
import { getAccounts, createAccount } from "../../services/api";

export default function ChartOfAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({ code: "", name: "", account_type: "ASSET", parent: "", description: "" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAccounts();
      setAccounts(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createAccount({ ...form, parent: form.parent || undefined });
      setForm({ code: "", name: "", account_type: "ASSET", parent: "", description: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      "ASSET": "badge-success",
      "LIABILITY": "badge-danger",
      "EQUITY": "badge-primary",
      "REVENUE": "badge-info",
      "EXPENSE": "badge-warning",
    };
    return typeMap[type] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading chart of accounts...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Finance</div>
          <h1 className="page-title">Chart of Accounts</h1>
          <p className="page-subtitle">Manage the general ledger accounts</p>
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
            <i className="bi bi-plus-circle me-2"></i> Add Account
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 0.7 }}>
                <label className="field-label">Code <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., 1000"
                  value={form.code}
                  onChange={handleChange("code")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1.3 }}>
                <label className="field-label">Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Cash / Bank"
                  value={form.name}
                  onChange={handleChange("name")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Account Type <span className="required">*</span></label>
                <select className="select" value={form.account_type} onChange={handleChange("account_type")}>
                  <option value="ASSET">Asset</option>
                  <option value="LIABILITY">Liability</option>
                  <option value="EQUITY">Equity</option>
                  <option value="REVENUE">Revenue</option>
                  <option value="EXPENSE">Expense</option>
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Parent Account</label>
                <select className="select" value={form.parent} onChange={handleChange("parent")}>
                  <option value="">No parent (top-level account)</option>
                  {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Description</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Description"
                  value={form.description}
                  onChange={handleChange("description")}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-plus-circle me-2"></i> Add Account
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>All Accounts</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {accounts.length} account{accounts.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {accounts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-list-ul"></i>
              </div>
              <h3 className="empty-state__title">No accounts configured</h3>
              <p className="empty-state__desc">Add your first account using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Parent</th>
                    <th className="cell-numeric">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => (
                    <tr key={a.id}>
                      <td className="cell-mono">{a.code}</td>
                      <td className="cell-primary">{a.name}</td>
                      <td>
                        <span className={`badge ${getTypeBadge(a.account_type)}`}>
                          <span className="badge-dot"></span>
                          {a.account_type}
                        </span>
                      </td>
                      <td>{a.parent_name || "—"}</td>
                      <td className="cell-numeric">{formatCurrency(a.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {accounts.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {accounts.length} account{accounts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Asset
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Liability
              </span>
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                Equity
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                Revenue
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Expense
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: "var(--space-4)" }}>
        <div className="card-body">
          <div className="text-sm text-muted">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Note:</strong> Account code <strong>1000</strong> is treated as the default Cash/Bank account by expense payment posting.
          </div>
        </div>
      </div>
    </>
  );
}