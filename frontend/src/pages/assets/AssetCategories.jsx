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

  if (loading && categories.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading categories...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Asset Management</div>
          <h1 className="page-title">Asset Categories</h1>
          <p className="page-subtitle">Manage asset categories and depreciation rules</p>
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
            <i className="bi bi-plus-circle me-2"></i> Add Category
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                <label className="field-label">Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Medical Equipment"
                  value={form.name}
                  onChange={handleChange("name")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Default Useful Life <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  placeholder="Years"
                  value={form.default_useful_life_years}
                  onChange={handleChange("default_useful_life_years")}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Description</label>
              <input
                type="text"
                className="input"
                placeholder="Category description"
                value={form.description}
                onChange={handleChange("description")}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-plus-circle me-2"></i> Add Category
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-grid me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>All Categories</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {categories.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-tags"></i>
              </div>
              <h3 className="empty-state__title">No categories defined</h3>
              <p className="empty-state__desc">Add your first asset category using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th className="cell-numeric">Default Useful Life</th>
                    <th className="cell-numeric">Assets</th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td className="cell-primary">{c.name}</td>
                      <td>{c.description || "—"}</td>
                      <td className="cell-numeric">{c.default_useful_life_years} years</td>
                      <td className="cell-numeric">
                        <span className={`badge ${c.asset_count > 0 ? "badge-primary" : "badge-neutral"}`}>
                          <span className="badge-dot"></span>
                          {c.asset_count}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {categories.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {categories.length} categor{categories.length !== 1 ? "ies" : "y"}
            </span>
          </div>
        )}
      </div>
    </>
  );
}