import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getBranches, createBranch, updateBranch } from "../../services/api";

export default function BranchManagement() {
  const [branches, setBranches] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    code: "",
    level: "LEVEL_4",
    address: "",
    county: "",
    phone: "",
    email: "",
  });

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getBranches();
      setBranches(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createBranch(form);
      setForm({
        name: "",
        code: "",
        level: "LEVEL_4",
        address: "",
        county: "",
        phone: "",
        email: "",
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (branch) => {
    try {
      await updateBranch(branch.id, { is_active: !branch.is_active });
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  const getLevelLabel = (level) => {
    const levelMap = {
      LEVEL_2: "Level 2 (Dispensary)",
      LEVEL_3: "Level 3 (Health Centre)",
      LEVEL_4: "Level 4 (Sub-County Hospital)",
      LEVEL_5: "Level 5 (County/Referral Hospital)",
      CLINIC: "Clinic",
    };
    return levelMap[level] || level;
  };

  const getLevelBadge = (level) => {
    const levelMap = {
      LEVEL_2: "badge-info",
      LEVEL_3: "badge-info",
      LEVEL_4: "badge-primary",
      LEVEL_5: "badge-success",
      CLINIC: "badge-neutral",
    };
    return levelMap[level] || "badge-neutral";
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Administration</div>
          <h1 className="page-title">Branch Management</h1>
          <p className="page-subtitle">Manage every facility in your hospital group</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary btn-sm" onClick={load} disabled={loading}>
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--danger)", background: "var(--danger-soft)" }}>
          <div className="card-body">
            <div className="text-danger">
              <i className="bi bi-exclamation-circle me-1"></i> {error}
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-1"></i> Add Branch
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="name">
                  Branch Name <span className="required">*</span>
                </label>
                <input
                  id="name"
                  type="text"
                  className="input"
                  placeholder="Branch Name"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="code">
                  Code <span className="required">*</span>
                </label>
                <input
                  id="code"
                  type="text"
                  className="input"
                  placeholder="e.g. NRB"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="level">
                  Level <span className="required">*</span>
                </label>
                <select
                  id="level"
                  className="select"
                  value={form.level}
                  onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
                >
                  <option value="LEVEL_2">Level 2 (Dispensary)</option>
                  <option value="LEVEL_3">Level 3 (Health Centre)</option>
                  <option value="LEVEL_4">Level 4 (Sub-County Hospital)</option>
                  <option value="LEVEL_5">Level 5 (County/Referral Hospital)</option>
                  <option value="CLINIC">Clinic</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="county">County</label>
                <input
                  id="county"
                  type="text"
                  className="input"
                  placeholder="County"
                  value={form.county}
                  onChange={(e) => setForm((p) => ({ ...p, county: e.target.value }))}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="address">Address</label>
              <input
                id="address"
                type="text"
                className="input"
                placeholder="Address"
                value={form.address}
                onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label" htmlFor="phone">Phone</label>
                <input
                  id="phone"
                  type="text"
                  className="input"
                  placeholder="Phone"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  className="input"
                  placeholder="Email"
                  value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px", marginRight: "var(--space-2)" }}></span>
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle me-2"></i>
                    Add Branch
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="card-title">All Branches</h5>
          <div>
            <span className="text-tertiary text-sm">
              {branches.length} branch{branches.length !== 1 ? "es" : ""}
            </span>
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="loading-screen" style={{ minHeight: "200px" }}>
              <div className="spinner spinner-lg"></div>
              <span className="loading-screen__label">Loading branches...</span>
            </div>
          ) : branches.length === 0 ? (
            <div className="empty-state" style={{ padding: "var(--space-8)" }}>
              <div className="empty-state__icon">
                <i className="bi bi-building"></i>
              </div>
              <div className="empty-state__title">No branches found</div>
              <div className="empty-state__desc">Add your first branch using the form above.</div>
            </div>
          ) : (
            <div className="table-wrap">
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Code</th>
                      <th>Level</th>
                      <th>County</th>
                      <th style={{ textAlign: "center" }}>Staff</th>
                      <th>Status</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branches.map((b) => (
                      <tr key={b.id} className="is-clickable">
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="cell-primary">{b.name}</span>
                            {b.is_headquarters && (
                              <span className="badge badge-primary">HQ</span>
                            )}
                          </div>
                        </td>
                        <td className="cell-mono">{b.code}</td>
                        <td>
                          <span className={`badge ${getLevelBadge(b.level)}`}>
                            {getLevelLabel(b.level)}
                          </span>
                        </td>
                        <td>{b.county || "—"}</td>
                        <td style={{ textAlign: "center" }}>
                          <span className="pill-count">{b.staff_count || 0}</span>
                        </td>
                        <td>
                          <span className={`badge ${b.is_active ? "badge-success" : "badge-neutral"}`}>
                            <span className="badge-dot"></span>
                            {b.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className={`btn btn-sm ${b.is_active ? "btn-danger-outline" : "btn-success"}`}
                            onClick={() => toggleActive(b)}
                          >
                            {b.is_active ? (
                              <>
                                <i className="bi bi-x-circle me-1"></i>
                                Deactivate
                              </>
                            ) : (
                              <>
                                <i className="bi bi-check-circle me-1"></i>
                                Activate
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {!loading && branches.length > 0 && (
          <div className="table-footer">
            <span className="table-footer__meta">
              Showing {branches.length} branch{branches.length !== 1 ? "es" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}