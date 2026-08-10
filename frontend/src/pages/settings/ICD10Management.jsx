import { useEffect, useState } from "react";
import {
  getICD10CodesPaginated, createICD10Code, updateICD10Code, deleteICD10Code,
} from "../../services/api";

const PAGE_SIZE = 20;

export default function ICD10Management() {
  const [codes, setCodes] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ code: "", description: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, [page, search]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, page_size: PAGE_SIZE };
      if (search) params.search = search;
      const data = await getICD10CodesPaginated(params);
      setCodes(data.results ?? data);
      setTotal(data.count ?? (data.results ?? data).length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const openAddForm = () => {
    setEditingId(null);
    setForm({ code: "", description: "" });
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditingId(item.id);
    setForm({ code: item.code, description: item.description });
    setShowForm(true);
  };

  const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      if (editingId) {
        await updateICD10Code(editingId, form);
        setSuccess(`Code ${form.code} updated.`);
      } else {
        await createICD10Code(form);
        setSuccess(`Code ${form.code} added.`);
      }
      setShowForm(false);
      setForm({ code: "", description: "" });
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete ICD-10 code ${item.code} - ${item.description}? This cannot be undone.`)) return;
    setError("");
    try {
      await deleteICD10Code(item.id);
      setSuccess(`Code ${item.code} deleted.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  if (loading && codes.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading ICD-10 codes...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Medical Records</div>
          <h1 className="page-title">ICD-10 Code Management</h1>
          <p className="page-subtitle">Manage diagnosis codes used across clinical modules</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={load}>
            <i className="bi bi-arrow-clockwise  me-1"></i> Refresh
          </button>
          <button className="btn btn-primary" onClick={openAddForm}>
            <i className="bi bi-plus-circle  me-1"></i> Add ICD-10 Code
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

      {success && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--success)", background: "var(--success-soft)" }}>
          <div className="card-body">
            <div className="text-success">
              <i className="bi bi-check-circle  me-1"></i> {success}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="search-bar" style={{ width: "260px" }}>
              <i className="bi bi-search search-bar__icon"></i>
              <input
                type="text"
                className="search-bar__input"
                placeholder="Search by code or description..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              {search && (
                <button
                  type="button"
                  className="search-bar__clear"
                  onClick={() => { setSearch(""); setPage(1); }}
                  aria-label="Clear search"
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {total} code{total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          {codes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-file-earmark-text"></i>
              </div>
              <h3 className="empty-state__title">No ICD-10 codes found</h3>
              <p className="empty-state__desc">
                {search 
                  ? "No codes match your search criteria." 
                  : "Add your first ICD-10 code using the button above."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Description</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((c) => (
                    <tr key={c.id}>
                      <td className="cell-mono">{c.code}</td>
                      <td className="cell-primary">{c.description}</td>
                      <td className="cell-actions">
                        <div className="flex gap-1 justify-end">
                          <button className="btn btn-secondary btn-sm" onClick={() => openEditForm(c)}>
                            <i className="bi bi-pencil  me-1"></i> Edit
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c)}>
                            <i className="bi bi-trash  me-1"></i> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing page {page} of {totalPages} ({total} total)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <i className="bi bi-chevron-left  me-1"></i> Previous
              </button>
              <span className="text-2xs text-tertiary">Page {page} of {totalPages}</span>
              <button
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <i className="bi bi-chevron-right ms-1"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowForm(false); setEditingId(null); } }}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <div>
                <h5 className="modal-title">{editingId ? "Edit ICD-10 Code" : "Add ICD-10 Code"}</h5>
                <p className="modal-desc">
                  {editingId ? "Update the diagnosis code and description." : "Enter a new ICD-10 diagnosis code."}
                </p>
              </div>
              <button type="button" className="modal-close" onClick={() => { setShowForm(false); setEditingId(null); }} aria-label="Close">
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label className="field-label">Code <span className="required">*</span></label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. A00.0"
                    value={form.code}
                    onChange={handleChange("code")}
                    required
                  />
                  <div className="text-2xs text-tertiary" style={{ marginTop: "var(--space-1)" }}>
                    Enter the ICD-10 code in the correct format (e.g. A00.0, B20, Z00.00)
                  </div>
                </div>
                <div className="field">
                  <label className="field-label">Description <span className="required">*</span></label>
                  <textarea
                    className="textarea"
                    placeholder="Full description of the diagnosis"
                    value={form.description}
                    onChange={handleChange("description")}
                    required
                    rows={3}
                  />
                </div>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setShowForm(false); setEditingId(null); }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                        Saving...
                      </>
                    ) : (
                      editingId ? "Save Changes" : "Add Code"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}