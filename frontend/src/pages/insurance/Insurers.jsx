import { useEffect, useState } from "react";
import { getInsurers, createInsurer, updateInsurer } from "../../services/api";

export default function Insurers() {
  const [insurers, setInsurers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ 
    name: "", code: "", insurer_type: "PRIVATE", 
    requires_preauth: false, contact_email: "", contact_phone: "" 
  });

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
      setForm({ 
        name: "", code: "", insurer_type: "PRIVATE", 
        requires_preauth: false, contact_email: "", contact_phone: "" 
      });
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading insurers...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Billing & Insurance</div>
          <h1 className="page-title">Insurers</h1>
          <p className="page-subtitle">Manage insurance companies</p>
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
            <i className="bi bi-plus-circle me-2"></i> Add Insurer
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
                  placeholder="e.g. SHA, AAR, Britam"
                  value={form.name}
                  onChange={handleChange("name")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Code <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. SHA, AAR"
                  value={form.code}
                  onChange={handleChange("code")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Type <span className="required">*</span></label>
                <select className="select" value={form.insurer_type} onChange={handleChange("insurer_type")} required>
                  <option value="SHA">SHA</option>
                  <option value="PRIVATE">Private</option>
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Contact Email</label>
                <input
                  type="email"
                  className="input"
                  placeholder="contact@email.com"
                  value={form.contact_email}
                  onChange={handleChange("contact_email")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Contact Phone</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Phone number"
                  value={form.contact_phone}
                  onChange={handleChange("contact_phone")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
                <label className="field-label" style={{ marginBottom: 0 }}>Requires Pre-auth</label>
                <input
                  type="checkbox"
                  className="input"
                  style={{ width: "auto", margin: 0 }}
                  checked={form.requires_preauth}
                  onChange={handleChange("requires_preauth")}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-plus-circle me-2"></i> Add Insurer
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-building me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>All Insurers</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {insurers.length} insurer{insurers.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {insurers.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-building"></i>
              </div>
              <h3 className="empty-state__title">No insurers configured</h3>
              <p className="empty-state__desc">Add your first insurer using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Code</th>
                    <th>Type</th>
                    <th>Pre-auth</th>
                    <th>Contact</th>
                    <th>Status</th>
                    <th className="cell-actions">Active</th>
                  </tr>
                </thead>
                <tbody>
                  {insurers.map((i) => (
                    <tr key={i.id}>
                      <td className="cell-primary">{i.name}</td>
                      <td className="cell-mono">{i.code}</td>
                      <td>
                        <span className={`badge ${i.insurer_type === "SHA" ? "badge-primary" : "badge-info"}`}>
                          <span className="badge-dot"></span>
                          {i.insurer_type}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${i.requires_preauth ? "badge-warning" : "badge-success"}`}>
                          <span className="badge-dot"></span>
                          {i.requires_preauth ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        {i.contact_email || i.contact_phone ? (
                          <div className="text-sm">
                            {i.contact_email && <div>{i.contact_email}</div>}
                            {i.contact_phone && <div className="text-muted">{i.contact_phone}</div>}
                          </div>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${i.is_active ? "badge-success" : "badge-neutral"}`}>
                          <span className="badge-dot"></span>
                          {i.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <label className="toggle-switch" style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={i.is_active}
                            onChange={async (e) => { 
                              await updateInsurer(i.id, { is_active: e.target.checked }); 
                              load(); 
                            }}
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
        {insurers.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {insurers.length} insurer{insurers.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}