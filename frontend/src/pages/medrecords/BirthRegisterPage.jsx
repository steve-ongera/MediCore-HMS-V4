import { useEffect, useState } from "react";
import { getBirthRegister, createBirthRegistration, getPatients, getUsers } from "../../services/api";
import { formatDate } from "../../utils/formatters";

export default function BirthRegisterPage() {
  const [entries, setEntries] = useState([]);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [motherQuery, setMotherQuery] = useState("");
  const [motherResults, setMotherResults] = useState([]);
  const [selectedMother, setSelectedMother] = useState(null);

  const [form, setForm] = useState({
    child_name: "", sex: "MALE", date_of_birth: "", time_of_birth: "",
    place_of_birth: "Facility", father_name: "", father_national_id: "", attending_staff: "",
  });

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => { load(); }, [search]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (search) params.search = search;
      const data = await getBirthRegister(params);
      setEntries(data.results ?? data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try { const data = await getUsers(); setUsers(data.results ?? data); } catch (err) { setError(err.message); }
  };

  const handleMotherSearch = async (e) => {
    e.preventDefault();
    if (!motherQuery.trim()) return;
    try {
      const data = await getPatients({ search: motherQuery });
      setMotherResults(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedMother) { setError("Select the mother first."); return; }
    try {
      await createBirthRegistration({
        ...form,
        mother: selectedMother.id,
        time_of_birth: form.time_of_birth || undefined,
        attending_staff: form.attending_staff || undefined,
      });
      setSelectedMother(null);
      setMotherQuery("");
      setForm({ child_name: "", sex: "MALE", date_of_birth: "", time_of_birth: "", place_of_birth: "Facility", father_name: "", father_national_id: "", attending_staff: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading && entries.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading birth register...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Maternal & Child Health</div>
          <h1 className="page-title">Birth Register</h1>
          <p className="page-subtitle">Register and manage births</p>
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
            <i className="bi bi-plus-circle  me-1"></i> Register Birth
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
                  placeholder="Search by name / phone / hospital number"
                  value={motherQuery}
                  onChange={(e) => setMotherQuery(e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-search  me-1"></i> Search
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
                            <i className="bi bi-check  me-1"></i> Select
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
            <div className="card" style={{ borderColor: "var(--success)", background: "var(--success-soft)", marginBottom: "var(--space-4)" }}>
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="avatar avatar-sm">
                    <i className="bi bi-person-check fs-xl"></i>
                  </div>
                  <div>
                    <div className="text-sm text-success font-semibold">
                      <i className="bi bi-check-circle  me-1"></i> Selected Mother
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
                    <i className="bi bi-x  me-1"></i> Change
                  </button>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={submit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Child's Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Child's name (optional if not yet named)"
                  value={form.child_name}
                  onChange={(e) => setForm((p) => ({ ...p, child_name: e.target.value }))}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Sex <span className="required">*</span></label>
                <select className="select" value={form.sex} onChange={(e) => setForm((p) => ({ ...p, sex: e.target.value }))}>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Date of Birth <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={form.date_of_birth}
                  onChange={(e) => setForm((p) => ({ ...p, date_of_birth: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Time of Birth</label>
                <input
                  type="time"
                  className="input"
                  value={form.time_of_birth}
                  onChange={(e) => setForm((p) => ({ ...p, time_of_birth: e.target.value }))}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Place of Birth</label>
              <input
                type="text"
                className="input"
                placeholder="Place of birth"
                value={form.place_of_birth}
                onChange={(e) => setForm((p) => ({ ...p, place_of_birth: e.target.value }))}
              />
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Father's Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Father's name"
                  value={form.father_name}
                  onChange={(e) => setForm((p) => ({ ...p, father_name: e.target.value }))}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Father's National ID</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Father's national ID"
                  value={form.father_national_id}
                  onChange={(e) => setForm((p) => ({ ...p, father_national_id: e.target.value }))}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Attending Staff</label>
              <select className="select" value={form.attending_staff} onChange={(e) => setForm((p) => ({ ...p, attending_staff: e.target.value }))}>
                <option value="">Attending staff (optional)</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!selectedMother}
              >
                <i className="bi bi-plus-circle  me-1"></i> Register Birth
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="search-bar" style={{ width: "220px" }}>
              <i className="bi bi-search search-bar__icon"></i>
              <input
                type="text"
                className="search-bar__input"
                placeholder="Search by reg #, name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  type="button"
                  className="search-bar__clear"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {entries.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-baby"></i>
              </div>
              <h3 className="empty-state__title">No birth entries found</h3>
              <p className="empty-state__desc">
                {search 
                  ? "No entries match your search criteria." 
                  : "Register a birth using the form above."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reg #</th>
                    <th>Child Name</th>
                    <th>Sex</th>
                    <th>DOB</th>
                    <th>Mother</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e) => (
                    <tr key={e.id}>
                      <td className="cell-mono">{e.registration_number}</td>
                      <td className="cell-primary">{e.child_name || "Unnamed"}</td>
                      <td>
                        <span className={`badge ${e.sex === "MALE" ? "badge-primary" : "badge-danger"}`}>
                          <span className="badge-dot"></span>
                          {e.sex}
                        </span>
                      </td>
                      <td>{formatDate(e.date_of_birth)}</td>
                      <td>{e.mother_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {entries.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {entries.length} entr{entries.length !== 1 ? "ies" : "y"}
            </span>
          </div>
        )}
      </div>
    </>
  );
}