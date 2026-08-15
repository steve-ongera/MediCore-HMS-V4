import { useEffect, useState } from "react";
import { getBranches, createBranch, updateBranch } from "../../services/api";

export default function BranchManagement() {
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", code: "", level: "LEVEL_4", address: "", county: "", phone: "", email: "" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { const data = await getBranches(); setBranches(data.results ?? data); } catch (err) { setError(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createBranch(form);
      setForm({ name: "", code: "", level: "LEVEL_4", address: "", county: "", phone: "", email: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const toggleActive = async (branch) => {
    try { await updateBranch(branch.id, { is_active: !branch.is_active }); load(); } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Branch Management</h1>
      <p>Manage every facility in your hospital group.</p>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}

      <h2>Add Branch</h2>
      <form onSubmit={submit}>
        <input type="text" placeholder="Branch Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
        <input type="text" placeholder="Code (e.g. NRB)" value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} required />
        <select value={form.level} onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}>
          <option value="LEVEL_2">Level 2 (Dispensary)</option>
          <option value="LEVEL_3">Level 3 (Health Centre)</option>
          <option value="LEVEL_4">Level 4 (Sub-County Hospital)</option>
          <option value="LEVEL_5">Level 5 (County/Referral Hospital)</option>
          <option value="CLINIC">Clinic</option>
        </select>
        <input type="text" placeholder="Address" value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))} />
        <input type="text" placeholder="County" value={form.county} onChange={(e) => setForm((p) => ({ ...p, county: e.target.value }))} />
        <input type="text" placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
        <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
        <button type="submit">Add Branch</button>
      </form>

      <h2>All Branches</h2>
      <table>
        <thead><tr><th>Name</th><th>Code</th><th>Level</th><th>County</th><th>Staff</th><th>Active</th><th></th></tr></thead>
        <tbody>
          {branches.map((b) => (
            <tr key={b.id}>
              <td>{b.name} {b.is_headquarters && "🏠"}</td><td>{b.code}</td><td>{b.level}</td>
              <td>{b.county || "—"}</td><td>{b.staff_count}</td><td>{b.is_active ? "Yes" : "No"}</td>
              <td><button type="button" onClick={() => toggleActive(b)}>{b.is_active ? "Deactivate" : "Activate"}</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}