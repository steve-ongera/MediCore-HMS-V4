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

  return (
    <div>
      <h1>Chart of Accounts</h1>
      {error && <p>Error: {error}</p>}

      <h2>Add Account</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Code (e.g. 1000)" value={form.code} onChange={handleChange("code")} required />
        <input type="text" placeholder="Name (e.g. Cash / Bank)" value={form.name} onChange={handleChange("name")} required />
        <select value={form.account_type} onChange={handleChange("account_type")}>
          <option value="ASSET">Asset</option>
          <option value="LIABILITY">Liability</option>
          <option value="EQUITY">Equity</option>
          <option value="REVENUE">Revenue</option>
          <option value="EXPENSE">Expense</option>
        </select>
        <select value={form.parent} onChange={handleChange("parent")}>
          <option value="">No parent (top-level account)</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
        </select>
        <input type="text" placeholder="Description" value={form.description} onChange={handleChange("description")} />
        <button type="submit">Add Account</button>
      </form>

      <h2>All Accounts</h2>
      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Code</th><th>Name</th><th>Type</th><th>Parent</th><th>Balance</th></tr></thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td>{a.code}</td><td>{a.name}</td><td>{a.account_type}</td>
                <td>{a.parent_name || "—"}</td><td>KES {a.balance}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <p style={{ marginTop: "1em" }}>
        Note: account code <strong>1000</strong> is treated as the default Cash/Bank account by expense payment posting.
      </p>
    </div>
  );
}