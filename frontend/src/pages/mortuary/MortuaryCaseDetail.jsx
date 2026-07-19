import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getMortuaryCase, getMortuaryBilling, addMortuaryCharge,
  getMortuaryServiceCatalog, orderMortuaryService, releaseBody,
} from "../../services/api";

export default function MortuaryCaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [mortuaryCase, setMortuaryCase] = useState(null);
  const [billing, setBilling] = useState(null);
  const [serviceCatalog, setServiceCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [chargeForm, setChargeForm] = useState({ description: "", amount: "" });
  const [serviceForm, setServiceForm] = useState({ service: "", notes: "" });
  const [releaseForm, setReleaseForm] = useState({
    collector_name: "", collector_id_number: "", collector_phone: "",
    relationship: "SPOUSE", funeral_home: "", burial_permit_number: "", notes: "",
  });

  useEffect(() => {
    load();
    loadBilling();
    loadServiceCatalog();
  }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getMortuaryCase(id);
      setMortuaryCase(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadBilling = async () => {
    try {
      const data = await getMortuaryBilling(id);
      setBilling(data);
    } catch (err) { setError(err.message); }
  };

  const loadServiceCatalog = async () => {
    try {
      const data = await getMortuaryServiceCatalog();
      setServiceCatalog(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const submitCharge = async (e) => {
    e.preventDefault();
    try {
      await addMortuaryCharge(id, { description: chargeForm.description, amount: parseFloat(chargeForm.amount) });
      setChargeForm({ description: "", amount: "" });
      loadBilling();
    } catch (err) { setError(err.message); }
  };

  const submitService = async (e) => {
    e.preventDefault();
    try {
      await orderMortuaryService(id, serviceForm);
      setServiceForm({ service: "", notes: "" });
      load();
      loadBilling();
    } catch (err) { setError(err.message); }
  };

  const submitRelease = async (e) => {
    e.preventDefault();
    if (!window.confirm("Confirm body release? This cannot be undone.")) return;
    try {
      await releaseBody(id, releaseForm);
      load();
      loadBilling();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "ADMITTED": "badge-primary",
      "RELEASED": "badge-success",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getServiceStatusBadge = (status) => {
    const statusMap = {
      "ORDERED": "badge-warning",
      "IN_PROGRESS": "badge-info",
      "COMPLETED": "badge-success",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading mortuary case...</span>
      </div>
    );
  }

  if (!mortuaryCase) return null;

  const isAdmitted = mortuaryCase.status === "ADMITTED";

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Mortuary Services</div>
          <h1 className="page-title">{mortuaryCase.case_number}</h1>
          <p className="page-subtitle">{mortuaryCase.deceased_display_name}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/mortuary")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Register
          </button>
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
        <div className="card-body">
          <div className="patient-header">
            <div className="avatar avatar-lg">
              <i className="bi bi-person fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{mortuaryCase.deceased_display_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {mortuaryCase.case_number}
                </span>
                <span>•</span>
                <span>{mortuaryCase.gender}</span>
                <span>•</span>
                <span>Age: {mortuaryCase.estimated_age || "Unknown"}</span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(mortuaryCase.status)}`}>
                  <span className="badge-dot"></span>
                  {mortuaryCase.status}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-clock me-1"></i> {mortuaryCase.days_in_storage} days
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Date of Death</div>
              <div className="info-item__value">{new Date(mortuaryCase.date_of_death).toLocaleString()}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Cause of Death</div>
              <div className="info-item__value">{mortuaryCase.cause_of_death || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Source</div>
              <div className="info-item__value">
                <span className="tag">{mortuaryCase.source}</span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Compartment</div>
              <div className="info-item__value cell-mono">{mortuaryCase.compartment_number || "Unassigned"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Brought By</div>
              <div className="info-item__value">{mortuaryCase.brought_by || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Police OB #</div>
              <div className="info-item__value">{mortuaryCase.police_ob_number || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Admitted</div>
              <div className="info-item__value">
                {new Date(mortuaryCase.admitted_at).toLocaleString()}
                <div className="text-2xs text-tertiary">by {mortuaryCase.admitted_by_name}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-currency-dollar me-2"></i> Billing
          </h5>
        </div>
        <div className="card-body">
          {!billing ? (
            <div className="loading-screen" style={{ padding: "var(--space-4)" }}>
              <div className="spinner"></div>
              <span className="loading-screen__label">Loading billing...</span>
            </div>
          ) : (
            <>
              <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span className="stat-card__label">Grand Total</span>
                    <div className="stat-card__icon tone-info">
                      <i className="bi bi-receipt"></i>
                    </div>
                  </div>
                  <div className="stat-card__value">{formatCurrency(billing.grand_total)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span className="stat-card__label">Amount Paid</span>
                    <div className="stat-card__icon tone-success">
                      <i className="bi bi-check-circle"></i>
                    </div>
                  </div>
                  <div className="stat-card__value">{formatCurrency(billing.amount_paid)}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span className="stat-card__label">Balance</span>
                    <div className="stat-card__icon tone-warning">
                      <i className="bi bi-currency-dollar"></i>
                    </div>
                  </div>
                  <div className="stat-card__value">{formatCurrency(billing.balance)}</div>
                </div>
              </div>

              <div className="table-scroll" style={{ marginBottom: "var(--space-4)" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Description</th>
                      <th className="cell-numeric">Amount</th>
                      <th className="cell-numeric">Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="cell-mono">{inv.invoice_number}</td>
                        <td>{inv.description}</td>
                        <td className="cell-numeric">{formatCurrency(inv.amount)}</td>
                        <td className="cell-numeric">{formatCurrency(inv.balance)}</td>
                        <td>
                          <span className={`badge ${inv.status === "PAID" ? "badge-success" : inv.status === "PARTIAL" ? "badge-warning" : "badge-danger"}`}>
                            <span className="badge-dot"></span>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {Number(billing.balance) > 0 && (
                <div className="form-actions" style={{ marginBottom: "var(--space-4)" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => navigate(`/billing/payments?invoice=${billing.invoices.find((i) => Number(i.balance) > 0)?.id ?? ""}`)}
                  >
                    <i className="bi bi-credit-card me-2"></i> Go to Billing / Take Payment
                  </button>
                </div>
              )}

              <h6 className="text-sm font-semibold" style={{ marginTop: "var(--space-4)", marginBottom: "var(--space-2)" }}>
                Add Charge
              </h6>
              <form onSubmit={submitCharge}>
                <div className="field-row">
                  <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                    <input
                      type="text"
                      className="input"
                      placeholder="Description"
                      value={chargeForm.description}
                      onChange={(e) => setChargeForm((p) => ({ ...p, description: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                    <input
                      type="number"
                      className="input"
                      placeholder="Amount"
                      value={chargeForm.amount}
                      onChange={(e) => setChargeForm((p) => ({ ...p, amount: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="field" style={{ marginBottom: 0 }}>
                    <button type="submit" className="btn btn-primary">
                      <i className="bi bi-plus-circle me-2"></i> Add Charge
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </div>

      {isAdmitted && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-plus-circle me-2"></i> Order Service
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitService}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <select className="select" value={serviceForm.service} onChange={(e) => setServiceForm((p) => ({ ...p, service: e.target.value }))} required>
                    <option value="">Select service</option>
                    {serviceCatalog.map((s) => <option key={s.id} value={s.id}>{s.name} ({formatCurrency(s.price)})</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Notes"
                    value={serviceForm.notes}
                    onChange={(e) => setServiceForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0 }}>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-plus-circle me-2"></i> Order Service
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Services</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {(mortuaryCase.services || []).length} service{(mortuaryCase.services || []).length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {(mortuaryCase.services || []).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-list-ul"></i>
              </div>
              <h3 className="empty-state__title">No services ordered</h3>
              <p className="empty-state__desc">Order services for this case above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Status</th>
                    <th>Ordered</th>
                  </tr>
                </thead>
                <tbody>
                  {(mortuaryCase.services || []).map((s) => (
                    <tr key={s.id}>
                      <td className="cell-primary">{s.service_name}</td>
                      <td>
                        <span className={`badge ${getServiceStatusBadge(s.status)}`}>
                          <span className="badge-dot"></span>
                          {s.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{new Date(s.ordered_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isAdmitted ? (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-door-open me-2"></i> Release Body
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitRelease}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Collector's Name <span className="required">*</span></label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Full name"
                    value={releaseForm.collector_name}
                    onChange={(e) => setReleaseForm((p) => ({ ...p, collector_name: e.target.value }))}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">ID Number</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="ID number"
                    value={releaseForm.collector_id_number}
                    onChange={(e) => setReleaseForm((p) => ({ ...p, collector_id_number: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Phone</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Phone number"
                    value={releaseForm.collector_phone}
                    onChange={(e) => setReleaseForm((p) => ({ ...p, collector_phone: e.target.value }))}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Relationship <span className="required">*</span></label>
                  <select className="select" value={releaseForm.relationship} onChange={(e) => setReleaseForm((p) => ({ ...p, relationship: e.target.value }))}>
                    <option value="SPOUSE">Spouse</option>
                    <option value="CHILD">Child</option>
                    <option value="PARENT">Parent</option>
                    <option value="SIBLING">Sibling</option>
                    <option value="OTHER_RELATIVE">Other Relative</option>
                    <option value="UNDERTAKER">Undertaker / Funeral Home</option>
                    <option value="POLICE">Police</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Funeral Home</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Funeral home (if applicable)"
                    value={releaseForm.funeral_home}
                    onChange={(e) => setReleaseForm((p) => ({ ...p, funeral_home: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Burial Permit #</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Permit number"
                    value={releaseForm.burial_permit_number}
                    onChange={(e) => setReleaseForm((p) => ({ ...p, burial_permit_number: e.target.value }))}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Notes</label>
                <textarea
                  className="textarea"
                  placeholder="Additional notes"
                  value={releaseForm.notes}
                  onChange={(e) => setReleaseForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>

              <button type="submit" className="btn btn-danger">
                <i className="bi bi-door-open me-2"></i> Release Body
              </button>
            </form>
          </div>
        </div>
      ) : (
        mortuaryCase.release && (
          <div className="card">
            <div className="card-header">
              <h5 className="card-title">
                <i className="bi bi-file-text me-2"></i> Release Record
              </h5>
            </div>
            <div className="card-body">
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-item__label">Collected By</div>
                  <div className="info-item__value">
                    {mortuaryCase.release.collector_name}
                    <div className="text-2xs text-tertiary">{mortuaryCase.release.relationship}</div>
                  </div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">ID Number</div>
                  <div className="info-item__value">{mortuaryCase.release.collector_id_number || "—"}</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Phone</div>
                  <div className="info-item__value">{mortuaryCase.release.collector_phone || "—"}</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Funeral Home</div>
                  <div className="info-item__value">{mortuaryCase.release.funeral_home || "—"}</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Burial Permit #</div>
                  <div className="info-item__value">{mortuaryCase.release.burial_permit_number || "—"}</div>
                </div>
                <div className="info-item">
                  <div className="info-item__label">Released By</div>
                  <div className="info-item__value">
                    {mortuaryCase.release.released_by_name}
                    <div className="text-2xs text-tertiary">{new Date(mortuaryCase.release.released_at).toLocaleString()}</div>
                  </div>
                </div>
                <div className="info-item" style={{ gridColumn: "span 2" }}>
                  <div className="info-item__label">Notes</div>
                  <div className="info-item__value">{mortuaryCase.release.notes || "—"}</div>
                </div>
              </div>
            </div>
          </div>
        )
      )}
    </>
  );
}