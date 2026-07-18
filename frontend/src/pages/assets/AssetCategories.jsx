import { useEffect, useState } from "react";
import { getAssetCategories, createAssetCategory } from "../../services/api";

export default function AssetCategories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "", default_useful_life_years: 5 });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getAssetCategories();
      setCategories(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await createAssetCategory({ ...form, default_useful_life_years: Number(form.default_useful_life_years) });
      setForm({ name: "", description: "", default_useful_life_years: 5 });
      load();
    } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Asset Categories</h1>
      {error && <p>Error: {error}</p>}

      <h2>Add Category</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Name (e.g. Medical Equipment)" value={form.name} onChange={handleChange("name")} required />
        <input type="text" placeholder="Description" value={form.description} onChange={handleChange("description")} />
        <input type="number" placeholder="Default useful life (years)" value={form.default_useful_life_years} onChange={handleChange("default_useful_life_years")} required />
        <button type="submit">Add Category</button>
      </form>

      <h2>All Categories</h2>
      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Name</th><th>Description</th><th>Default Useful Life</th><th>Assets</th></tr></thead>
          <tbody>
            {categories.map((c) => (
              <tr key={c.id}>
                <td>{c.name}</td><td>{c.description}</td>
                <td>{c.default_useful_life_years} yrs</td><td>{c.asset_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}