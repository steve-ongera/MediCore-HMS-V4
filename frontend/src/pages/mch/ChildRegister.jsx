import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPatients, getChildren, registerChild } from "../../services/api";

export default function ChildRegister() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [motherQuery, setMotherQuery] = useState("");
  const [motherResults, setMotherResults] = useState([]);
  const [selectedMother, setSelectedMother] = useState(null);

  const [form, setForm] = useState({
    full_name: "", sex: "MALE", date_of_birth: "",
    birth_weight_kg: "", birth_length_cm: "", apgar_score_1min: "", apgar_score_5min: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    setLoading(true);
    try {
      const data = await getChildren({ page_size: 100 });
      setChildren(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMotherSearch = async (e) => {
    e.preventDefault();
    if (!motherQuery.trim()) return;
    try {
      const data = await getPatients({ search: motherQuery });
      setMotherResults(data.results ?? data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFormChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedMother) {
      setError("Please select the mother first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await registerChild({ mother: selectedMother.id, ...form });
      setSelectedMother(null);
      setMotherQuery("");
      setMotherResults([]);
      setForm({ full_name: "", sex: "MALE", date_of_birth: "", birth_weight_kg: "", birth_length_cm: "", apgar_score_1min: "", apgar_score_5min: "" });
      loadChildren();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading children records...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Maternal & Child Health</div>
          <h1 className="page-title">Child Records</h1>
          <p className="page-subtitle">Register and manage child health records</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={loadChildren}>
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
            <i className="bi bi-plus-circle me-2"></i> Register Child
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handleMotherSearch} style={{ marginBottom: "var(--space-4)" }}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Search Mother</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Search by name or hospital number"
                  value={motherQuery}
                  onChange={(e) => setMotherQuery(e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-search me-2"></i> Search
                </button>
              </div>
            </div>
          </form>

          {motherResults.length > 0 && (
            <div style={{ marginBottom: "var(--space-4)" }}>
              <div className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)" }}>
                Search Results ({motherResults.length})
              </div>
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Hospital #</th>
                      <th>Phone</th>
                      <th className="cell-actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {motherResults.map((p) => (
                      <tr key={p.id}>
                        <td className="cell-primary">{p.full_name}</td>
                        <td className="cell-mono">{p.hospital_number}</td>
                        <td>{p.phone}</td>
                        <td className="cell-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setSelectedMother(p)}
                          >
                            <i className="bi bi-check me-1"></i> Select
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedMother && (
            <div className="card" style={{ borderColor: "var(--success)", background: "var(--success-soft)" }}>
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="avatar avatar-sm">
                    <i className="bi bi-person-check fs-xl"></i>
                  </div>
                  <div>
                    <div className="text-sm text-success font-semibold">
                      <i className="bi bi-check-circle me-1"></i> Selected Mother
                    </div>
                    <div className="font-bold">{selectedMother.full_name}</div>
                    <div className="text-sm text-muted">
                      {selectedMother.hospital_number} • {selectedMother.phone}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm ml-auto"
                    onClick={() => setSelectedMother(null)}
                  >
                    <i className="bi bi-x me-1"></i> Change
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="field-row">
              <div className="field">
                <label className="field-label">Child's Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Child's name (optional)"
                  value={form.full_name}
                  onChange={handleFormChange("full_name")}
                />
              </div>
              <div className="field">
                <label className="field-label">Sex <span className="required">*</span></label>
                <select className="select" value={form.sex} onChange={handleFormChange("sex")}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">Date of Birth <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={form.date_of_birth}
                  onChange={handleFormChange("date_of_birth")}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label">Birth Weight (kg)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Birth weight"
                  value={form.birth_weight_kg}
                  onChange={handleFormChange("birth_weight_kg")}
                />
              </div>
              <div className="field">
                <label className="field-label">Birth Length (cm)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Birth length"
                  value={form.birth_length_cm}
                  onChange={handleFormChange("birth_length_cm")}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label className="field-label">Apgar Score (1 min)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Apgar 1 min"
                  value={form.apgar_score_1min}
                  onChange={handleFormChange("apgar_score_1min")}
                />
              </div>
              <div className="field">
                <label className="field-label">Apgar Score (5 min)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Apgar 5 min"
                  value={form.apgar_score_5min}
                  onChange={handleFormChange("apgar_score_5min")}
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting || !selectedMother}
              >
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Registering...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle me-2"></i> Register Child
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-grid me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Registered Children</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {children.length} child{children.length !== 1 ? "ren" : ""} registered
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {children.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-person-child"></i>
              </div>
              <h3 className="empty-state__title">No children registered</h3>
              <p className="empty-state__desc">Start by registering a child above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Child #</th>
                    <th>Name</th>
                    <th>Mother</th>
                    <th>Sex</th>
                    <th>DOB</th>
                    <th className="cell-numeric">Age (months)</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {children.map((c) => (
                    <tr key={c.id}>
                      <td className="cell-mono">{c.child_number}</td>
                      <td className="cell-primary">{c.full_name || "—"}</td>
                      <td>{c.mother_name}</td>
                      <td>{c.sex}</td>
                      <td>{new Date(c.date_of_birth).toLocaleDateString()}</td>
                      <td className="cell-numeric">{c.age_months}</td>
                      <td className="cell-actions">
                        <Link to={`/mch/children/${c.id}`} className="btn btn-secondary btn-sm">
                          <i className="bi bi-eye me-1"></i> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {children.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {children.length} child{children.length !== 1 ? "ren" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}