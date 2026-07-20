import { useEffect, useState } from "react";
import { getOperatingTheatres, getSurgicalProcedureCatalog } from "../../services/api";
import client from "../../services/api";

export default function TheatreSetup() {
  const [theatres, setTheatres] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [theatreForm, setTheatreForm] = useState({ theatre_number: "", hourly_rate: "" });
  const [procForm, setProcForm] = useState({ code: "", name: "", base_price: "", estimated_duration_minutes: "60" });

  useEffect(() => { loadTheatres(); loadProcedures(); }, []);

  const loadTheatres = async () => {
    try {
      const data = await getOperatingTheatres();
      setTheatres(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadProcedures = async () => {
    try {
      const data = await getSurgicalProcedureCatalog();
      setProcedures(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const submitTheatre = async (e) => {
    e.preventDefault();
    try {
      await client.post("/operating-theatres/", {
        theatre_number: theatreForm.theatre_number,
        hourly_rate: Number(theatreForm.hourly_rate),
      });
      setTheatreForm({ theatre_number: "", hourly_rate: "" });
      loadTheatres();
    } catch (err) { setError(err.message); }
  };

  const submitProcedure = async (e) => {
    e.preventDefault();
    try {
      await client.post("/surgical-procedure-catalog/", {
        code: procForm.code, name: procForm.name,
        base_price: Number(procForm.base_price),
        estimated_duration_minutes: Number(procForm.estimated_duration_minutes),
      });
      setProcForm({ code: "", name: "", base_price: "", estimated_duration_minutes: "60" });
      loadProcedures();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "AVAILABLE": "badge-success",
      "IN_USE": "badge-danger",
      "CLEANING": "badge-warning",
      "OUT_OF_SERVICE": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading && theatres.length === 0 && procedures.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading setup data...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Theatre Management</div>
          <h1 className="page-title">Theatres & Procedures Setup</h1>
          <p className="page-subtitle">Configure operating theatres and surgical procedures</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => { loadTheatres(); loadProcedures(); }}>
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
            <i className="bi bi-building me-2"></i> Add Theatre
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submitTheatre}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Theatre Number <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Theatre 1, Theatre A"
                  value={theatreForm.theatre_number}
                  onChange={(e) => setTheatreForm((p) => ({ ...p, theatre_number: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Hourly Rate (KES) <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  value={theatreForm.hourly_rate}
                  onChange={(e) => setTheatreForm((p) => ({ ...p, hourly_rate: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-plus-circle me-2"></i> Add Theatre
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-building me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Theatres</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {theatres.length} theatre{theatres.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {theatres.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-building"></i>
              </div>
              <h3 className="empty-state__title">No theatres configured</h3>
              <p className="empty-state__desc">Add your first theatre using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Theatre</th>
                    <th className="cell-numeric">Hourly Rate</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {theatres.map((t) => (
                    <tr key={t.id}>
                      <td className="cell-primary">{t.theatre_number}</td>
                      <td className="cell-numeric">{formatCurrency(t.hourly_rate)}</td>
                      <td>
                        <span className={`badge ${getStatusBadge(t.status)}`}>
                          <span className="badge-dot"></span>
                          {t.status.replace("_", " ")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {theatres.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {theatres.length} theatre{theatres.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Available
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                In Use
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Cleaning
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> Add Procedure
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submitProcedure}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 0.7 }}>
                <label className="field-label">Code <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., APP-001"
                  value={procForm.code}
                  onChange={(e) => setProcForm((p) => ({ ...p, code: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1.2 }}>
                <label className="field-label">Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Procedure name"
                  value={procForm.name}
                  onChange={(e) => setProcForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 0.8 }}>
                <label className="field-label">Base Price (KES) <span className="required">*</span></label>
                <input
                  type="number"
                  className="input"
                  placeholder="0.00"
                  value={procForm.base_price}
                  onChange={(e) => setProcForm((p) => ({ ...p, base_price: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 0.7 }}>
                <label className="field-label">Est. Duration (min)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="60"
                  value={procForm.estimated_duration_minutes}
                  onChange={(e) => setProcForm((p) => ({ ...p, estimated_duration_minutes: e.target.value }))}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-plus-circle me-2"></i> Add Procedure
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Procedures</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {procedures.length} procedure{procedures.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {procedures.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-list-ul"></i>
              </div>
              <h3 className="empty-state__title">No procedures configured</h3>
              <p className="empty-state__desc">Add your first procedure using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Name</th>
                    <th className="cell-numeric">Base Price</th>
                    <th className="cell-numeric">Est. Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {procedures.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-mono">{p.code}</td>
                      <td className="cell-primary">{p.name}</td>
                      <td className="cell-numeric">{formatCurrency(p.base_price)}</td>
                      <td className="cell-numeric">{p.estimated_duration_minutes} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {procedures.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {procedures.length} procedure{procedures.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}