import { useEffect, useState } from "react";
import { getStoreLocations, createStoreLocation, getLocationStock, getUsers } from "../../services/api";

export default function StoreLocations() {
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [stock, setStock] = useState([]);
  const [form, setForm] = useState({ name: "", location_type: "WARD", custodian: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); loadUsers(); }, []);

  const load = async () => {
    setLoading(true);
    try { 
      const data = await getStoreLocations(); 
      setLocations(data.results ?? data); 
    } catch (err) { 
      setError(err.message); 
    } finally { 
      setLoading(false); 
    }
  };
  
  const loadUsers = async () => {
    try { 
      const data = await getUsers(); 
      setUsers(data.results ?? data); 
    } catch (err) { 
      setError(err.message); 
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      await createStoreLocation(form);
      setForm({ name: "", location_type: "WARD", custodian: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const viewStock = async (loc) => {
    setSelectedLocation(loc);
    try { 
      const data = await getLocationStock(loc.id); 
      setStock(data); 
    } catch (err) { 
      setError(err.message); 
    }
  };

  const getTypeBadge = (type) => {
    const typeMap = {
      "MAIN_PHARMACY": "badge-primary",
      "WARD": "badge-info",
      "AMBULANCE": "badge-warning",
      "THEATRE": "badge-danger",
      "EMERGENCY": "badge-danger",
      "OTHER": "badge-neutral",
    };
    return typeMap[type] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading store locations...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Inventory</div>
          <h1 className="page-title">Store Locations</h1>
          <p className="page-subtitle">Manage inventory locations and custodians</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => { load(); loadUsers(); }}>
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
            <i className="bi bi-plus-circle me-2"></i> Add Location
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1.5 }}>
                <label className="field-label">Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Ambulance Bay 1, Maternity Ward"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Type <span className="required">*</span></label>
                <select className="select" value={form.location_type} onChange={(e) => setForm((p) => ({ ...p, location_type: e.target.value }))}>
                  <option value="MAIN_PHARMACY">Main Pharmacy</option>
                  <option value="WARD">Ward / Department</option>
                  <option value="AMBULANCE">Ambulance</option>
                  <option value="THEATRE">Theatre</option>
                  <option value="EMERGENCY">Emergency Department</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Custodian <span className="required">*</span></label>
                <select className="select" value={form.custodian} onChange={(e) => setForm((p) => ({ ...p, custodian: e.target.value }))} required>
                  <option value="">Select custodian</option>
                  {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary" style={{ marginTop: "var(--space-3)" }}>
                <i className="bi bi-plus-circle me-2"></i> Add Location
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-grid me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>All Locations</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {locations.length} location{locations.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {locations.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-geo-alt"></i>
              </div>
              <h3 className="empty-state__title">No locations configured</h3>
              <p className="empty-state__desc">Add your first store location using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Custodian</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map((l) => (
                    <tr key={l.id}>
                      <td className="cell-primary">{l.name}</td>
                      <td>
                        <span className={`badge ${getTypeBadge(l.location_type)}`}>
                          <span className="badge-dot"></span>
                          {l.location_type.replace("_", " ")}
                        </span>
                      </td>
                      <td>{l.custodian_name}</td>
                      <td className="cell-actions">
                        <button className="btn btn-secondary btn-sm" onClick={() => viewStock(l)}>
                          <i className="bi bi-box-seam me-1"></i> View Stock
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {locations.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {locations.length} location{locations.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-primary">
                <span className="badge-dot"></span>
                Main Pharmacy
              </span>
              <span className="badge badge-info">
                <span className="badge-dot"></span>
                Ward
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Ambulance
              </span>
              <span className="badge badge-danger">
                <span className="badge-dot"></span>
                Theatre / ED
              </span>
            </div>
          </div>
        )}
      </div>

      {selectedLocation && (
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3 flex-wrap">
              <i className="bi bi-box-seam me-1"></i>
              <h5 className="card-title" style={{ marginBottom: 0 }}>
                Stock at {selectedLocation.name}
              </h5>
            </div>
            <div>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedLocation(null)}>
                <i className="bi bi-x me-1"></i> Close
              </button>
            </div>
          </div>
          <div className="card-body p-0">
            {stock.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__icon">
                  <i className="bi bi-box-seam"></i>
                </div>
                <h3 className="empty-state__title">No stock at this location</h3>
                <p className="empty-state__desc">No stock has been recorded at {selectedLocation.name}.</p>
              </div>
            ) : (
              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Medicine</th>
                      <th className="cell-numeric">Qty on Hand</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stock.map((s) => (
                      <tr key={s.id}>
                        <td className="cell-primary">{s.medicine_name}</td>
                        <td className="cell-numeric">{s.quantity_on_hand}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {stock.length > 0 && (
            <div className="card-footer">
              <span className="text-tertiary text-sm">
                Showing {stock.length} item{stock.length !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}