import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAssetCategories, getSuppliers, getDepartments, createAsset } from "../../services/api";

export default function AssetForm() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    name: "", category: "", description: "", serial_number: "", manufacturer: "", model_number: "",
    supplier: "", purchase_date: "", purchase_cost: "", useful_life_years: "", salvage_value: "0",
    warranty_expiry: "", department: "", location_notes: "", condition: "GOOD",
  });

  useEffect(() => {
    loadCategories();
    loadSuppliers();
    loadDepartments();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getAssetCategories();
      setCategories(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadSuppliers = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleChange = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const asset = await createAsset({
        ...form,
        purchase_cost: Number(form.purchase_cost),
        useful_life_years: form.useful_life_years ? Number(form.useful_life_years) : undefined,
        salvage_value: Number(form.salvage_value || 0),
        supplier: form.supplier || undefined,
        department: form.department || undefined,
        warranty_expiry: form.warranty_expiry || undefined,
        purchase_date: form.purchase_date || undefined,
      });
      navigate(`/assets/${asset.id}`);
    } catch (err) { setError(err.message); } finally { setSubmitting(false); }
  };

  return (
    <div>
      <h1>Register Asset</h1>
      {error && <p>Error: {error}</p>}

      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Asset Name" value={form.name} onChange={handleChange("name")} required />
        <select value={form.category} onChange={handleChange("category")} required>
          <option value="">Select category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <textarea placeholder="Description" value={form.description} onChange={handleChange("description")} />

        <input type="text" placeholder="Serial Number" value={form.serial_number} onChange={handleChange("serial_number")} />
        <input type="text" placeholder="Manufacturer" value={form.manufacturer} onChange={handleChange("manufacturer")} />
        <input type="text" placeholder="Model Number" value={form.model_number} onChange={handleChange("model_number")} />

        <select value={form.supplier} onChange={handleChange("supplier")}>
          <option value="">Select supplier (optional)</option>
          {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <label>Purchase Date</label>
        <input type="date" value={form.purchase_date} onChange={handleChange("purchase_date")} />
        <label>Purchase Cost</label>
        <input type="number" placeholder="Purchase Cost (KES)" value={form.purchase_cost} onChange={handleChange("purchase_cost")} required />
        <label>Useful Life Override (years, optional)</label>
        <input type="number" placeholder="Leave blank to use category default" value={form.useful_life_years} onChange={handleChange("useful_life_years")} />
        <label>Salvage Value</label>
        <input type="number" placeholder="Salvage Value" value={form.salvage_value} onChange={handleChange("salvage_value")} />
        <label>Warranty Expiry</label>
        <input type="date" value={form.warranty_expiry} onChange={handleChange("warranty_expiry")} />

        <select value={form.department} onChange={handleChange("department")}>
          <option value="">Select department (optional)</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <input type="text" placeholder="Location notes (e.g. Ward 3, Room 4)" value={form.location_notes} onChange={handleChange("location_notes")} />

        <select value={form.condition} onChange={handleChange("condition")}>
          <option value="EXCELLENT">Excellent</option>
          <option value="GOOD">Good</option>
          <option value="FAIR">Fair</option>
          <option value="POOR">Poor</option>
          <option value="NON_FUNCTIONAL">Non-Functional</option>
        </select>

        <button type="submit" disabled={submitting}>
          {submitting ? "Registering..." : "Register Asset"}
        </button>
      </form>
    </div>
  );
}