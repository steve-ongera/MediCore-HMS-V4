import { useEffect, useState } from "react";
import { getStoreLocations, createStoreLocation, getLocationStock, getUsers, getMedicines, setLocationStock, getLocationAdjustments } from "../../services/api";
import { formatDateTime } from "../../utils/formatters";

export default function StoreLocations() {
  const [locations, setLocations] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [stock, setStock] = useState([]);
  const [adjustments, setAdjustments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [form, setForm] = useState({ name: "", location_type: "WARD", custodian: "" });

  const [medicineQuery, setMedicineQuery] = useState("");
  const [medicineResults, setMedicineResults] = useState([]);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const submitLocation = async (e) => {
    e.preventDefault();
    try {
      await createStoreLocation(form);
      setForm({ name: "", location_type: "WARD", custodian: "" });
      load();
    } catch (err) { 
      setError(err.message); 
    }
  };

  const viewStock = async (loc) => {
    setSelectedLocation(loc);
    setSuccess("");
    setSelectedMedicine(null);
    setMedicineQuery("");
    setMedicineResults([]);
    setQuantity("");
    setReason("");
    try {
      const [stockData, adjData] = await Promise.all([getLocationStock(loc.id), getLocationAdjustments(loc.id)]);
      setStock(stockData);
      setAdjustments(adjData);
    } catch (err) { 
      setError(err.message); 
    }
  };

  const searchMedicines = async (query) => {
    setMedicineQuery(query);
    if (query.length < 2) { setMedicineResults([]); return; }
    try {
      const data = await getMedicines({ search: query, page_size: 20 });
      setMedicineResults(data.results ?? data);
    } catch (err) { 
      setError(err.message); 
    }
  };

  const selectMedicine = (med) => {
    setSelectedMedicine(med);
    setMedicineResults([]);
    setMedicineQuery(med.name);
    const existing = stock.find((s) => s.medicine === med.id);
    setQuantity(existing ? String(existing.quantity_on_hand) : "0");
  };

  const submitSetStock = async (e) => {
    e.preventDefault();
    if (!selectedMedicine) { setError("Search and select a medicine first."); return; }
    if (quantity === "" || Number(quantity) < 0) { setError("Enter a valid quantity."); return; }
    if (!reason.trim()) { setError("Please explain this stock update."); return; }

    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      await setLocationStock(selectedLocation.id, {
        medicine: selectedMedicine.id,
        quantity: Number(quantity),
        reason,
      });
      setSuccess(`${selectedMedicine.name} set to ${quantity} units at ${selectedLocation.name}.`);
      setSelectedMedicine(null);
      setMedicineQuery("");
      setQuantity("");
      setReason("");
      viewStock(selectedLocation);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
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

  if (loading && locations.length === 0) {
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
          <p className="page-subtitle">Manage inventory locations and stock levels</p>
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

      {success && (
        <div className="card" style={{ marginBottom: "var(--space-4)", borderColor: "var(--success)", background: "var(--success-soft)" }}>
          <div className="card-body">
            <div className="text-success">
              <i className="bi bi-check-circle me-2"></i> {success}
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
          <form onSubmit={submitLocation}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1.5 }}>
                <label className="field-label">Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g. Main Pharmacy, Ambulance Bay 1"
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
              <button type="submit" className="btn btn-primary">
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
                    <tr key={l.id} style={selectedLocation?.id === l.id ? { background: "var(--primary-soft)" } : {}}>
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
                          <i className="bi bi-box-seam me-1"></i> Manage Stock
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
                Managing Stock: {selectedLocation.name}
              </h5>
            </div>
            <div>
              <button className="btn btn-secondary btn-sm" onClick={() => { setSelectedLocation(null); }}>
                <i className="bi bi-x me-1"></i> Close
              </button>
            </div>
          </div>
          <div className="card-body">
            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)" }}>
              <i className="bi bi-plus-circle me-1"></i> Set / Add Medicine to This Location
            </h6>
            <div className="text-sm text-muted" style={{ marginBottom: "var(--space-2)" }}>
              <i className="bi bi-info-circle me-1"></i>
              Search for a real medicine from the pharmacy catalog — this keeps location stock tied to the actual inventory.
            </div>
            <form onSubmit={submitSetStock}>
              <div className="field">
                <label className="field-label">Search Medicine</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Search medicine by name"
                  value={medicineQuery}
                  onChange={(e) => searchMedicines(e.target.value)}
                />
                {medicineResults.length > 0 && (
                  <div className="card" style={{ maxHeight: "150px", overflowY: "auto", marginTop: "var(--space-1)" }}>
                    <div className="card-body p-0">
                      <div className="table-scroll">
                        <table className="data-table">
                          <tbody>
                            {medicineResults.map((m) => (
                              <tr key={m.id} style={{ cursor: "pointer" }}>
                                <td className="cell-primary">
                                  {m.name} {m.strength ? `(${m.strength})` : ""}
                                </td>
                                <td className="cell-actions">
                                  <button className="btn btn-primary btn-sm" onClick={() => selectMedicine(m)}>
                                    Select
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedMedicine && (
                <div className="card" style={{ borderColor: "var(--success)", background: "var(--success-soft)", marginBottom: "var(--space-3)" }}>
                  <div className="card-body" style={{ padding: "var(--space-2) var(--space-3)" }}>
                    <div className="flex items-center gap-2">
                      <i className="bi bi-check-circle" style={{ color: "var(--success-strong)" }}></i>
                      <span className="text-sm">Selected: <strong>{selectedMedicine.name}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              {selectedMedicine && (
                <div className="field-row">
                  <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                    <label className="field-label">Quantity <span className="required">*</span></label>
                    <input
                      type="number"
                      className="input"
                      min="0"
                      placeholder="Quantity at this location"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                    <label className="field-label">Reason <span className="required">*</span></label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. Initial stocking, Physical count correction"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? (
                        <>
                          <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-save me-2"></i> Save Stock Level
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </form>

            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <i className="bi bi-list-ul me-1"></i> Current Stock at {selectedLocation.name}
            </h6>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th className="cell-numeric">Quantity on Hand</th>
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
            {stock.length === 0 && (
              <div className="text-sm text-muted" style={{ padding: "var(--space-2)" }}>
                No stock recorded at this location yet.
              </div>
            )}

            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
              <i className="bi bi-clock-history me-1"></i> Adjustment History
            </h6>
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Medicine</th>
                    <th className="cell-numeric">Previous</th>
                    <th className="cell-numeric">New</th>
                    <th>Reason</th>
                    <th>By</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {adjustments.map((a) => (
                    <tr key={a.id}>
                      <td className="cell-primary">{a.medicine_name}</td>
                      <td className="cell-numeric">{a.previous_quantity}</td>
                      <td className="cell-numeric">{a.new_quantity}</td>
                      <td>{a.reason}</td>
                      <td>{a.adjusted_by_name}</td>
                      <td>{formatDateTime(a.adjusted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {adjustments.length === 0 && (
              <div className="text-sm text-muted" style={{ padding: "var(--space-2)" }}>
                No adjustments recorded yet.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}