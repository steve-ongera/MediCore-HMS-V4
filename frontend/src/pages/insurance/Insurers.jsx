import { useEffect, useState } from "react";
import { getInsurers, createInsurer, updateInsurer } from "../../services/api";

export default function Insurers() {
  const [insurers, setInsurers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", code: "", insurer_type: "PRIVATE", requires_preauth: false, contact_email: "", contact_phone: "" });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getInsurers();
      setInsurers(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleChange = (f) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((p) => ({ ...p, [f]: v }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createInsurer(form);
      setForm({ name: "", code: "", insurer_type: "PRIVATE", requires_preauth: false, contact_email: "", contact_phone: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Insurers</h1>
      {error && <p>Error: {error}</p>}

      <h2>Add Insurer</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Name (e.g. SHA, AAR, Britam)" value={form.name} onChange={handleChange("name")} required />
        <input type="text" placeholder="Code" value={form.code} onChange={handleChange("code")} required />
        <select value={form.insurer_type} onChange={handleChange("insurer_type")}>
          <option value="SHA">SHA</option>
          <option value="PRIVATE">Private</option>
        </select>
        <label><input type="checkbox" checked={form.requires_preauth} onChange={handleChange("requires_preauth")} /> Requires Pre-authorization</label>
        <input type="email" placeholder="Contact email" value={form.contact_email} onChange={handleChange("contact_email")} />
        <input type="text" placeholder="Contact phone" value={form.contact_phone} onChange={handleChange("contact_phone")} />
        <button type="submit">Add Insurer</button>
      </form>

      <h2>All Insurers</h2>
      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Name</th><th>Code</th><th>Type</th><th>Pre-auth</th><th>Active</th></tr></thead>
          <tbody>
            {insurers.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td><td>{i.code}</td><td>{i.insurer_type}</td>
                <td>{i.requires_preauth ? "Yes" : "No"}</td>
                <td>
                  <input type="checkbox" checked={i.is_active} onChange={async (e) => { await updateInsurer(i.id, { is_active: e.target.checked }); load(); }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}