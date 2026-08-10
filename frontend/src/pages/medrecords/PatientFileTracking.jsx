import { useEffect, useState } from "react";
import { getPatientFiles, createPatientFile, checkoutPatientFile, returnPatientFile, getOverdueFiles, getPatients, getUsers } from "../../services/api";
import { formatDateTime } from "../../utils/formatters";

export default function PatientFileTracking() {
  const [files, setFiles] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const [patientQuery, setPatientQuery] = useState("");
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [location, setLocation] = useState("");

  const [checkoutId, setCheckoutId] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({ to_custodian: "", location: "", reason: "", expected_return_at: "" });

  useEffect(() => { loadUsers(); loadOverdue(); }, []);
  useEffect(() => { load(); }, [statusFilter, search]);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page_size: 100 };
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const data = await getPatientFiles(params);
      setFiles(data.results ?? data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadOverdue = async () => {
    try { const data = await getOverdueFiles(); setOverdue(data); } catch (err) { setError(err.message); }
  };

  const loadUsers = async () => {
    try { const data = await getUsers(); setUsers(data.results ?? data); } catch (err) { setError(err.message); }
  };

  const handlePatientSearch = async (e) => {
    e.preventDefault();
    if (!patientQuery.trim()) return;
    try {
      const data = await getPatients({ search: patientQuery });
      setPatientResults(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const createFile = async () => {
    if (!selectedPatient) return;
    try {
      await createPatientFile({ patient: selectedPatient.id, current_location: location });
      setSelectedPatient(null);
      setPatientQuery("");
      setPatientResults([]);
      setLocation("");
      load();
    } catch (err) { setError(err.message); }
  };

  const openCheckout = (id) => {
    setCheckoutId(id);
    setCheckoutForm({ to_custodian: "", location: "", reason: "", expected_return_at: "" });
  };

  const submitCheckout = async () => {
    try {
      await checkoutPatientFile(checkoutId, {
        to_custodian: checkoutForm.to_custodian,
        location: checkoutForm.location,
        reason: checkoutForm.reason,
        expected_return_at: checkoutForm.expected_return_at || undefined,
      });
      setCheckoutId(null);
      load();
      loadOverdue();
    } catch (err) { setError(err.message); }
  };

  const handleReturn = async (id) => {
    try {
      await returnPatientFile(id, { location: "Records Room" });
      load();
      loadOverdue();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "IN_ARCHIVE": "badge-success",
      "CHECKED_OUT": "badge-warning",
      "IN_TRANSIT": "badge-info",
      "ARCHIVED_OFFSITE": "badge-neutral",
      "LOST": "badge-danger",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading && files.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading patient files...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Medical Records</div>
          <h1 className="page-title">Patient File Tracking</h1>
          <p className="page-subtitle">Track and manage patient files</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => { load(); loadOverdue(); }}>
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
            <i className="bi bi-plus-circle  me-1"></i> Register New File
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={handlePatientSearch} style={{ marginBottom: "var(--space-4)" }}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Search Patient</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Search by name / phone / hospital number"
                  value={patientQuery}
                  onChange={(e) => setPatientQuery(e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-search  me-1"></i> Search
                </button>
              </div>
            </div>
          </form>

          {patientResults.length > 0 && (
            <div style={{ marginBottom: "var(--space-4)" }}>
              <div className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)" }}>
                Search Results ({patientResults.length})
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
                    {patientResults.map((p) => (
                      <tr key={p.id}>
                        <td className="cell-primary">{p.full_name}</td>
                        <td className="cell-mono">{p.hospital_number}</td>
                        <td>{p.phone}</td>
                        <td className="cell-actions">
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={() => setSelectedPatient(p)}
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

          {selectedPatient && (
            <div className="card" style={{ borderColor: "var(--success)", background: "var(--success-soft)", marginBottom: "var(--space-4)" }}>
              <div className="card-body">
                <div className="flex items-center gap-3">
                  <div className="avatar avatar-sm">
                    <i className="bi bi-person-check fs-xl"></i>
                  </div>
                  <div>
                    <div className="text-sm text-success font-semibold">
                      <i className="bi bi-check-circle  me-1"></i> Selected Patient
                    </div>
                    <div className="font-bold">{selectedPatient.full_name}</div>
                    <div className="text-sm text-muted">
                      {selectedPatient.hospital_number} • {selectedPatient.phone}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm ml-auto"
                    onClick={() => setSelectedPatient(null)}
                  >
                    <i className="bi bi-x  me-1"></i> Change
                  </button>
                </div>
              </div>
            </div>
          )}

          {selectedPatient && (
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Initial Location</label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Records Room Shelf B12"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button type="button" className="btn btn-primary" onClick={createFile}>
                  <i className="bi bi-plus-circle  me-1"></i> Create File Record
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-exclamation-triangle  me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Overdue Files ({overdue.length})</h5>
          </div>
        </div>
        <div className="card-body p-0">
          {overdue.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <h3 className="empty-state__title">No overdue files</h3>
              <p className="empty-state__desc">All checked out files are within their expected return date.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>File #</th>
                    <th>Patient</th>
                    <th>Custodian</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {overdue.map((f) => (
                    <tr key={f.id} style={{ background: "var(--danger-soft)" }}>
                      <td className="cell-mono">{f.file_number}</td>
                      <td className="cell-primary">{f.patient_name}</td>
                      <td>{f.current_custodian_name}</td>
                      <td>{f.current_location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="search-bar" style={{ width: "200px" }}>
              <i className="bi bi-search search-bar__icon"></i>
              <input
                type="text"
                className="search-bar__input"
                placeholder="Search by file #, patient..."
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
            <div className="field" style={{ marginBottom: 0 }}>
              <select
                className="select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: "180px" }}
              >
                <option value="">All</option>
                <option value="IN_ARCHIVE">In Archive</option>
                <option value="CHECKED_OUT">Checked Out</option>
                <option value="IN_TRANSIT">In Transit</option>
                <option value="ARCHIVED_OFFSITE">Archived Offsite</option>
                <option value="LOST">Lost / Missing</option>
              </select>
            </div>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {files.length} file{files.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {files.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-files"></i>
              </div>
              <h3 className="empty-state__title">No files found</h3>
              <p className="empty-state__desc">
                {search || statusFilter 
                  ? "No files match your search criteria." 
                  : "Register a new file using the form above."}
              </p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>File #</th>
                    <th>Patient</th>
                    <th>Status</th>
                    <th>Custodian</th>
                    <th>Location</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((f) => (
                    <tr key={f.id}>
                      <td className="cell-mono">{f.file_number}</td>
                      <td className="cell-primary">{f.patient_name}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(f.status)}`}>
                          <span className="badge-dot"></span>
                          {f.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{f.current_custodian_name || "—"}</td>
                      <td>{f.current_location || "—"}</td>
                      <td className="cell-actions">
                        {f.status === "CHECKED_OUT" ? (
                          <button className="btn btn-success btn-sm" onClick={() => handleReturn(f.id)}>
                            <i className="bi bi-arrow-return-left  me-1"></i> Return
                          </button>
                        ) : (
                          checkoutId === f.id ? (
                            <div className="flex gap-1" style={{ flexWrap: "wrap", minWidth: "300px" }}>
                              <select
                                className="select"
                                value={checkoutForm.to_custodian}
                                onChange={(e) => setCheckoutForm((p) => ({ ...p, to_custodian: e.target.value }))}
                                style={{ width: "130px" }}
                              >
                                <option value="">Custodian</option>
                                {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                              </select>
                              <input
                                type="text"
                                className="input"
                                placeholder="Location"
                                value={checkoutForm.location}
                                onChange={(e) => setCheckoutForm((p) => ({ ...p, location: e.target.value }))}
                                style={{ width: "120px" }}
                              />
                              <input
                                type="datetime-local"
                                className="input"
                                value={checkoutForm.expected_return_at}
                                onChange={(e) => setCheckoutForm((p) => ({ ...p, expected_return_at: e.target.value }))}
                                style={{ width: "170px" }}
                              />
                              <button className="btn btn-primary btn-sm" onClick={submitCheckout}>
                                <i className="bi bi-check  me-1"></i> Confirm
                              </button>
                              <button className="btn btn-secondary btn-sm" onClick={() => setCheckoutId(null)}>
                                <i className="bi bi-x"></i>
                              </button>
                            </div>
                          ) : (
                            <button className="btn btn-primary btn-sm" onClick={() => openCheckout(f.id)}>
                              <i className="bi bi-box-arrow-right  me-1"></i> Check Out
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {files.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {files.length} file{files.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                In Archive
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Checked Out
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                In Transit
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Lost
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}