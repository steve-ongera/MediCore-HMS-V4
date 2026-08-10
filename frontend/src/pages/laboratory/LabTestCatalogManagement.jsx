import { useEffect, useState } from "react";
import { getLabTestCatalog, createLabTest, updateLabTest } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";

export default function LabTestCatalogManagement() {
  const [tests, setTests] = useState([]);
  const [form, setForm] = useState({ code: "", name: "", price: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try { 
      const data = await getLabTestCatalog(); 
      setTests(data.results ?? data); 
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try { 
      await createLabTest({ ...form, price: Number(form.price) }); 
      setForm({ code: "", name: "", price: "" }); 
      load(); 
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setSubmitting(false); 
    }
  };

  const toggleActive = async (t) => { 
    try { 
      await updateLabTest(t.id, { is_active: !t.is_active }); 
      load(); 
    } catch (err) { 
      setError(err.message); 
    } 
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading lab tests...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Laboratory</div>
          <h1 className="page-title">Lab Test Catalog</h1>
          <p className="page-subtitle">Manage laboratory test catalog</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise  me-1"></i> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle  me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle  me-1"></i> Add Test
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 0.7 }}>
                <label className="field-label">Code <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., CBC-001"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1.5 }}>
                <label className="field-label">Test Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Test name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 0.8 }}>
                <label className="field-label">Price <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  placeholder="Price"
                  value={form.price}
                  onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                      Adding...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-plus-circle  me-1"></i> Add Test
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul  me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>All Tests</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {tests.length} test{tests.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {tests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-list-ul"></i>
              </div>
              <h3 className="empty-state__title">No tests configured</h3>
              <p className="empty-state__desc">Add your first lab test using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th className="cell-numeric">Price</th>
                    <th>Active</th>
                  </tr>
                </thead>
                <tbody>
                  {tests.map((t) => (
                    <tr key={t.id}>
                      <td className="cell-mono">{t.code}</td>
                      <td className="cell-primary">{t.name}</td>
                      <td className="cell-numeric">{formatCurrency(t.price)}</td>
                      <td>
                        <label className="toggle-switch" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={t.is_active}
                            onChange={() => toggleActive(t)}
                            style={{ width: "18px", height: "18px", cursor: "pointer" }}
                          />
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {tests.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {tests.length} test{tests.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Active
              </span>
              <span className="badge badge-neutral">
                <span className="badge-dot"></span>
                Inactive
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}