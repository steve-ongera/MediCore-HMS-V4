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

  return (
    <div>
      <h1>Journal Entries</h1>
      {error && <p>Error: {error}</p>}

      <h2>New Journal Entry</h2>
      <form onSubmit={handleSubmit}>
        <input type="date" value={form.entry_date} onChange={handleFormChange("entry_date")} required />
        <select value={form.fiscal_period} onChange={handleFormChange("fiscal_period")}>
          <option value="">No fiscal period</option>
          {periods.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="text" placeholder="Reference" value={form.reference} onChange={handleFormChange("reference")} />
        <textarea placeholder="Description" value={form.description} onChange={handleFormChange("description")} required />

        <h3>Lines</h3>
        {lines.map((line, index) => (
          <div key={index}>
            <select value={line.account} onChange={handleLineChange(index, "account")} required>
              <option value="">Select account</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.code} - {a.name}</option>)}
            </select>
            <input type="number" placeholder="Debit" value={line.debit} onChange={handleLineChange(index, "debit")} />
            <input type="number" placeholder="Credit" value={line.credit} onChange={handleLineChange(index, "credit")} />
            <input type="text" placeholder="Line description" value={line.description} onChange={handleLineChange(index, "description")} />
            {lines.length > 2 && <button type="button" onClick={() => removeLine(index)}>Remove</button>}
          </div>
        ))}
        <button type="button" onClick={addLine}>+ Add Line</button>

        <p>Total Debit: {totalDebit} — Total Credit: {totalCredit} — {isBalanced ? "Balanced ✓" : "Not Balanced"}</p>

        <button type="submit" disabled={submitting || !isBalanced}>
          {submitting ? "Creating..." : "Create Draft Entry"}
        </button>
      </form>

      <h2>All Entries</h2>
      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="DRAFT">Draft</option>
        <option value="POSTED">Posted</option>
        <option value="VOIDED">Voided</option>
      </select>

      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Entry #</th><th>Date</th><th>Description</th><th>Source</th><th>Debit</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{e.entry_number}</td><td>{e.entry_date}</td><td>{e.description}</td>
                <td>{e.source}</td><td>KES {e.total_debit}</td><td>{e.status}</td>
                <td>
                  {e.status === "DRAFT" && <button type="button" onClick={() => handlePost(e.id)}>Post</button>}
                  {e.status === "POSTED" && <button type="button" onClick={() => handleVoid(e.id)}>Void</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}