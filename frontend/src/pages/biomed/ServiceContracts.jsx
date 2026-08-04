import { useEffect, useState } from "react";
import { getServiceContracts, createServiceContract, getExpiringSoonContracts, getEquipment } from "../../services/api";
import { formatCurrency } from "../../utils/formatters";

export default function ServiceContracts() {
  const [contracts, setContracts] = useState([]);
  const [expiring, setExpiring] = useState([]);
  const [equipmentList, setEquipmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    contract_number: "", vendor_name: "", vendor_contact: "", equipment: [],
    start_date: "", end_date: "", coverage_details: "", annual_cost: "",
  });

  useEffect(() => { load(); loadExpiring(); loadEquipment(); }, []);

  const load = async () => {
    setLoading(true);
    try { 
      const data = await getServiceContracts({ page_size: 100 }); 
      setContracts(data.results ?? data); 
    } catch (err) { 
      setError(err.message); 
    } finally {
      setLoading(false);
    }
  };
  
  const loadExpiring = async () => {
    try { 
      const data = await getExpiringSoonContracts(); 
      setExpiring(data); 
    } catch (err) { 
      setError(err.message); 
    }
  };
  
  const loadEquipment = async () => {
    try { 
      const data = await getEquipment({ page_size: 300 }); 
      setEquipmentList(data.results ?? data); 
    } catch (err) { 
      setError(err.message); 
    }
  };

  const toggleEquipment = (id) => {
    setForm((p) => ({
      ...p,
      equipment: p.equipment.includes(id) ? p.equipment.filter((x) => x !== id) : [...p.equipment, id],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createServiceContract({ ...form, annual_cost: form.annual_cost || undefined });
      setForm({ contract_number: "", vendor_name: "", vendor_contact: "", equipment: [], start_date: "", end_date: "", coverage_details: "", annual_cost: "" });
      load(); 
      loadExpiring();
    } catch (err) { 
      setError(err.message); 
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && contracts.length === 0) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading service contracts...</span>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Biomedical Engineering</div>
          <h1 className="page-title">Service Contracts</h1>
          <p className="page-subtitle">Manage equipment service contracts</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => { load(); loadExpiring(); }}>
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
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-exclamation-triangle me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Expiring Soon ({expiring.length})</h5>
          </div>
        </div>
        <div className="card-body p-0">
          {expiring.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-check-circle"></i>
              </div>
              <h3 className="empty-state__title">No contracts expiring soon</h3>
              <p className="empty-state__desc">All service contracts are valid for at least 30 more days.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Contract #</th>
                    <th>Vendor</th>
                    <th>End Date</th>
                  </tr>
                </thead>
                <tbody>
                  {expiring.map((c) => (
                    <tr key={c.id} style={{ background: "var(--warning-soft)" }}>
                      <td className="cell-mono">{c.contract_number}</td>
                      <td className="cell-primary">{c.vendor_name}</td>
                      <td>{c.end_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> Add Service Contract
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submit}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Contract Number <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Contract Number"
                  value={form.contract_number}
                  onChange={(e) => setForm((p) => ({ ...p, contract_number: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Vendor Name <span className="required">*</span></label>
                <input
                  type="text"
                  className="input"
                  placeholder="Vendor Name"
                  value={form.vendor_name}
                  onChange={(e) => setForm((p) => ({ ...p, vendor_name: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Vendor Contact</label>
              <input
                type="text"
                className="input"
                placeholder="Vendor Contact"
                value={form.vendor_contact}
                onChange={(e) => setForm((p) => ({ ...p, vendor_contact: e.target.value }))}
              />
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Start Date <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={form.start_date}
                  onChange={(e) => setForm((p) => ({ ...p, start_date: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">End Date <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={form.end_date}
                  onChange={(e) => setForm((p) => ({ ...p, end_date: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 0.7 }}>
                <label className="field-label">Annual Cost</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Annual Cost"
                  value={form.annual_cost}
                  onChange={(e) => setForm((p) => ({ ...p, annual_cost: e.target.value }))}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Coverage Details</label>
              <textarea
                className="textarea"
                placeholder="Coverage details"
                value={form.coverage_details}
                onChange={(e) => setForm((p) => ({ ...p, coverage_details: e.target.value }))}
              />
            </div>

            <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)" }}>
              <i className="bi bi-tools me-1"></i> Covered Equipment
            </h6>
            <div className="card" style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid var(--border-color)" }}>
              <div className="card-body" style={{ padding: "var(--space-2)" }}>
                {equipmentList.map((eq) => (
                  <label key={eq.id} style={{ display: "block", fontSize: "13px", padding: "2px 0", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      className="checkbox"
                      style={{ width: "auto", margin: "0 var(--space-2) 0 0" }}
                      checked={form.equipment.includes(eq.id)}
                      onChange={() => toggleEquipment(eq.id)}
                    />
                    {eq.asset_tag} - {eq.name}
                  </label>
                ))}
                {equipmentList.length === 0 && (
                  <div className="text-sm text-muted">No equipment available. Please register equipment first.</div>
                )}
              </div>
            </div>

            <div className="form-actions" style={{ marginTop: "var(--space-3)" }}>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? (
                  <>
                    <span className="spinner spinner-sm" style={{ display: "inline-block", width: "16px", height: "16px", marginRight: "var(--space-2)" }}></span>
                    Adding...
                  </>
                ) : (
                  <>
                    <i className="bi bi-plus-circle me-2"></i> Add Contract
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
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>All Contracts</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {contracts.length} contract{contracts.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {contracts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-file-contract"></i>
              </div>
              <h3 className="empty-state__title">No service contracts</h3>
              <p className="empty-state__desc">Add your first service contract using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Contract #</th>
                    <th>Vendor</th>
                    <th>Equipment Covered</th>
                    <th>Start</th>
                    <th>End</th>
                    <th className="cell-numeric">Annual Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => (
                    <tr key={c.id} style={c.is_expiring_soon ? { background: "var(--warning-soft)" } : {}}>
                      <td className="cell-mono">{c.contract_number}</td>
                      <td className="cell-primary">{c.vendor_name}</td>
                      <td>{c.equipment_names.join(", ")}</td>
                      <td>{c.start_date}</td>
                      <td>{c.end_date}</td>
                      <td className="cell-numeric">{c.annual_cost ? formatCurrency(c.annual_cost) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {contracts.length > 0 && (
          <div className="card-footer">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-tertiary text-sm">
                Showing {contracts.length} service contract{contracts.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="flex gap-2">
              <span className="badge badge-success">
                <span className="badge-dot"></span>
                Active
              </span>
              <span className="badge badge-warning">
                <span className="badge-dot"></span>
                Expiring Soon
              </span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}