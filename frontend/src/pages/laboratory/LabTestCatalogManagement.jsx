import { useEffect, useState } from "react";
import { getLabTestCatalog, createLabTest, updateLabTest } from "../../services/api";

export default function LabTestCatalogManagement() {
  const [tests, setTests] = useState([]);
  const [form, setForm] = useState({ code: "", name: "", price: "" });
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);
  const load = async () => {
    try { const data = await getLabTestCatalog(); setTests(data.results ?? data); } catch (err) { setError(err.message); }
  };
  const submit = async (e) => {
    e.preventDefault();
    try { await createLabTest({ ...form, price: Number(form.price) }); setForm({ code: "", name: "", price: "" }); load(); } catch (err) { setError(err.message); }
  };
  const toggleActive = async (t) => { try { await updateLabTest(t.id, { is_active: !t.is_active }); load(); } catch (err) { setError(err.message); } };

  return (
    <div>
      <h1>Lab Test Catalog</h1>
      {error && <p>Error: {error}</p>}
      <form onSubmit={submit}>
        <input placeholder="Code" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} required />
        <input placeholder="Test Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
        <input type="number" placeholder="Price" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} required />
        <button type="submit">Add Test</button>
      </form>
      <table>
        <thead><tr><th>Code</th><th>Name</th><th>Price</th><th>Active</th></tr></thead>
        <tbody>{tests.map((t) => (
          <tr key={t.id}><td>{t.code}</td><td>{t.name}</td><td>KES {t.price}</td>
            <td><input type="checkbox" checked={t.is_active} onChange={() => toggleActive(t)} /></td></tr>
        ))}</tbody>
      </table>
    </div>
  );
}