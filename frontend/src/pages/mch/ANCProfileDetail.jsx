import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getAntenatalProfile, createANCVisit, recordDelivery, createPostnatalVisit,
  getAntenatalProfileBilling, addAntenatalCharge, addDeliveryCharge,
} from "../../services/api";
import Modal from "../../components/Modal";

export default function ANCProfileDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [billing, setBilling] = useState(null);
  const [billingLoading, setBillingLoading] = useState(true);

  const [showChargeModal, setShowChargeModal] = useState(false);
  const [chargeForm, setChargeForm] = useState({ description: "", amount: "" });
  const [chargeSubmitting, setChargeSubmitting] = useState(false);
  const [chargeErrors, setChargeErrors] = useState({});

  // Delivery-scoped billing modal
  const [showDeliveryChargeModal, setShowDeliveryChargeModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [deliveryChargeForm, setDeliveryChargeForm] = useState({ description: "", amount: "" });
  const [deliveryChargeSubmitting, setDeliveryChargeSubmitting] = useState(false);
  const [deliveryChargeErrors, setDeliveryChargeErrors] = useState({});

  const [ancForm, setAncForm] = useState({
    gestational_age_weeks: "", weight_kg: "", bp_systolic: "", bp_diastolic: "",
    fundal_height_cm: "", fetal_heartbeat_bpm: "", fetal_presentation: "",
    urinalysis: "", hemoglobin_level: "", notes: "", next_appointment: "",
  });

  const [deliveryForm, setDeliveryForm] = useState({
    delivery_date: "", mode_of_delivery: "SVD", outcome: "LIVE_BIRTH",
    place_of_delivery: "Facility", complications: "", blood_loss_ml: "",
    child_full_name: "", child_sex: "MALE", birth_weight_kg: "",
    birth_length_cm: "", apgar_score_1min: "", apgar_score_5min: "",
  });

  const [pncForm, setPncForm] = useState({
    visit_day: "", mother_bp_systolic: "", mother_bp_diastolic: "", mother_temp_c: "",
    lochia_assessment: "", breastfeeding_status: "", child_weight_kg: "", child_temp_c: "", notes: "",
  });

  useEffect(() => {
    load();
    loadBilling();
  }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getAntenatalProfile(id);
      setProfile(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadBilling = async () => {
    setBillingLoading(true);
    try {
      const data = await getAntenatalProfileBilling(id);
      setBilling(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setBillingLoading(false);
    }
  };

  const handleAncChange = (field) => (e) => setAncForm((p) => ({ ...p, [field]: e.target.value }));
  const handleDeliveryChange = (field) => (e) => setDeliveryForm((p) => ({ ...p, [field]: e.target.value }));
  const handlePncChange = (field) => (e) => setPncForm((p) => ({ ...p, [field]: e.target.value }));

  const submitAncVisit = async (e) => {
    e.preventDefault();
    try {
      await createANCVisit({ profile: id, ...ancForm });
      setAncForm({
        gestational_age_weeks: "", weight_kg: "", bp_systolic: "", bp_diastolic: "",
        fundal_height_cm: "", fetal_heartbeat_bpm: "", fetal_presentation: "",
        urinalysis: "", hemoglobin_level: "", notes: "", next_appointment: "",
      });
      load();
      loadBilling();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitDelivery = async (e) => {
    e.preventDefault();
    try {
      const result = await recordDelivery(id, {
        ...deliveryForm,
        blood_loss_ml: deliveryForm.blood_loss_ml || undefined,
        birth_weight_kg: deliveryForm.birth_weight_kg || undefined,
        birth_length_cm: deliveryForm.birth_length_cm || undefined,
        apgar_score_1min: deliveryForm.apgar_score_1min || undefined,
        apgar_score_5min: deliveryForm.apgar_score_5min || undefined,
      });
      if (result.child) {
        navigate(`/mch/children/${result.child.id}`);
        return;
      }
      load();
      loadBilling();
    } catch (err) {
      setError(err.message);
    }
  };

  const submitPnc = async (e) => {
    e.preventDefault();
    try {
      await createPostnatalVisit({ profile: id, ...pncForm });
      setPncForm({
        visit_day: "", mother_bp_systolic: "", mother_bp_diastolic: "", mother_temp_c: "",
        lochia_assessment: "", breastfeeding_status: "", child_weight_kg: "", child_temp_c: "", notes: "",
      });
      load();
      loadBilling();
    } catch (err) {
      setError(err.message);
    }
  };

  // ---------------------------------------------------------------------
  // General ANC "Add Charge" modal
  // ---------------------------------------------------------------------
  const handleChargeFormChange = (field) => (e) => {
    setChargeForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (chargeErrors[field]) setChargeErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const validateCharge = (form, setErrs) => {
    const errs = {};
    if (!form.description.trim()) errs.description = "Description is required";
    if (!form.amount || parseFloat(form.amount) <= 0) errs.amount = "Amount must be greater than 0";
    setErrs(errs);
    return Object.keys(errs).length === 0;
  };

  const submitCharge = async (e) => {
    e.preventDefault();
    if (!validateCharge(chargeForm, setChargeErrors)) return;
    setChargeSubmitting(true);
    try {
      await addAntenatalCharge(id, {
        description: chargeForm.description,
        amount: parseFloat(chargeForm.amount),
      });
      setShowChargeModal(false);
      setChargeForm({ description: "", amount: "" });
      loadBilling();
    } catch (err) {
      setError(err.message);
    } finally {
      setChargeSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------
  // Delivery-scoped "Bill Delivery" modal
  // ---------------------------------------------------------------------
  const openDeliveryChargeModal = (delivery) => {
    setSelectedDelivery(delivery);
    setDeliveryChargeForm({ description: "", amount: "" });
    setDeliveryChargeErrors({});
    setShowDeliveryChargeModal(true);
  };

  const handleDeliveryChargeFormChange = (field) => (e) => {
    setDeliveryChargeForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (deliveryChargeErrors[field]) setDeliveryChargeErrors((prev) => ({ ...prev, [field]: "" }));
  };

  const submitDeliveryCharge = async (e) => {
    e.preventDefault();
    if (!selectedDelivery) return;
    if (!validateCharge(deliveryChargeForm, setDeliveryChargeErrors)) return;
    setDeliveryChargeSubmitting(true);
    try {
      await addDeliveryCharge(selectedDelivery.id, {
        description: deliveryChargeForm.description,
        amount: parseFloat(deliveryChargeForm.amount),
      });
      setShowDeliveryChargeModal(false);
      setSelectedDelivery(null);
      setDeliveryChargeForm({ description: "", amount: "" });
      load();
      loadBilling();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeliveryChargeSubmitting(false);
    }
  };

  const goToBillingPayment = () => {
    const unpaidInvoice = billing?.invoices?.find((inv) => Number(inv.balance) > 0);
    if (unpaidInvoice) {
      navigate(`/billing/payments?invoice=${unpaidInvoice.id}`);
    } else {
      navigate("/billing/payments");
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      PAID: "badge-success",
      PARTIAL: "badge-warning",
      UNPAID: "badge-danger",
      CANCELLED: "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading ANC profile...</span>
      </div>
    );
  }

  if (!profile) return null;

  const isActive = profile.status === "ACTIVE";

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Maternal & Child Health</div>
          <h1 className="page-title">{profile.anc_number}</h1>
          <p className="page-subtitle">
            {profile.mother_name} • {profile.gestational_age_weeks} weeks gestation
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/mch/antenatal")}>
            <i className="bi bi-arrow-left me-2"></i> Back
          </button>
          <button className="btn btn-secondary" onClick={() => { load(); loadBilling(); }}>
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
              <i className="bi bi-person-pregnant fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{profile.mother_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {profile.hospital_number}
                </span>
                <span>•</span>
                <span>Gravida/Para: {profile.gravida}/{profile.para}</span>
                <span>•</span>
                <span className={`badge ${isActive ? "badge-primary" : "badge-success"}`}>
                  <span className="badge-dot"></span>
                  {profile.status}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-calendar me-1"></i> EDD: {profile.edd || "—"}
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">LMP</div>
              <div className="info-item__value">{profile.lmp || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">EDD</div>
              <div className="info-item__value">{profile.edd || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Gestational Age</div>
              <div className="info-item__value">{profile.gestational_age_weeks} weeks</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Blood Group</div>
              <div className="info-item__value">{profile.blood_group}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">HIV Status</div>
              <div className="info-item__value">{profile.hiv_status}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">High Risk</div>
              <div className="info-item__value">
                <span className={`badge ${profile.high_risk ? "badge-danger" : "badge-success"}`}>
                  <span className="badge-dot"></span>
                  {profile.high_risk ? "Yes" : "No"}
                </span>
              </div>
            </div>
          </div>

          {profile.risk_factors && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <div className="text-sm text-muted">Risk Factors</div>
              <div className="diagnosis-chip">
                <span className="diagnosis-chip__code">RF</span>
                {profile.risk_factors}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Billing */}
      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-currency-dollar me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Billing</h5>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowChargeModal(true)}>
            <i className="bi bi-plus-circle me-1"></i> Add Charge
          </button>
        </div>
        <div className="card-body">
          {billingLoading ? (
            <div className="loading-screen" style={{ padding: "var(--space-6)" }}>
              <div className="spinner"></div>
              <span className="loading-screen__label">Loading billing summary...</span>
            </div>
          ) : !billing ? (
            <div className="text-sm text-muted text-center" style={{ padding: "var(--space-6)" }}>
              <i className="bi bi-info-circle me-1"></i> No billing data yet.
            </div>
          ) : (
            <div>
              <div className="stat-grid" style={{ marginBottom: "var(--space-4)" }}>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span className="stat-card__label">Grand Total</span>
                    <div className="stat-card__icon tone-info">
                      <i className="bi bi-receipt"></i>
                    </div>
                  </div>
                  <div className="stat-card__value">KES {billing.grand_total}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span className="stat-card__label">Amount Paid</span>
                    <div className="stat-card__icon tone-success">
                      <i className="bi bi-check-circle"></i>
                    </div>
                  </div>
                  <div className="stat-card__value">KES {billing.amount_paid}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card__top">
                    <span className="stat-card__label">Balance</span>
                    <div className="stat-card__icon tone-warning">
                      <i className="bi bi-currency-dollar"></i>
                    </div>
                  </div>
                  <div className="stat-card__value">KES {billing.balance}</div>
                </div>
              </div>

              <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Invoice #</th>
                      <th>Description</th>
                      <th className="cell-numeric">Amount</th>
                      <th className="cell-numeric">Paid</th>
                      <th className="cell-numeric">Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billing.invoices.map((inv) => (
                      <tr key={inv.id}>
                        <td className="cell-mono">{inv.invoice_number}</td>
                        <td>{inv.description}</td>
                        <td className="cell-numeric">KES {inv.amount}</td>
                        <td className="cell-numeric">KES {inv.amount_paid}</td>
                        <td className="cell-numeric">KES {inv.balance}</td>
                        <td>
                          <span className={`badge ${getStatusBadge(inv.status)}`}>
                            <span className="badge-dot"></span>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {billing.invoices.length === 0 && (
                <div className="text-sm text-muted text-center" style={{ padding: "var(--space-6)" }}>
                  No charges yet. ANC visits, deliveries, and PNC visits will appear here automatically.
                </div>
              )}

              <div className="form-actions" style={{ marginTop: "var(--space-4)" }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={goToBillingPayment}
                  disabled={!billing.invoices.length || Number(billing.balance) <= 0}
                >
                  <i className="bi bi-credit-card me-2"></i> Go to Billing / Take Payment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {isActive && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-plus-circle me-2"></i> Record ANC Visit
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitAncVisit}>
              <div className="field-row">
                <div className="field">
                  <label className="field-label">Gestational Age (weeks)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Weeks"
                    value={ancForm.gestational_age_weeks}
                    onChange={handleAncChange("gestational_age_weeks")}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Weight (kg)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Weight"
                    value={ancForm.weight_kg}
                    onChange={handleAncChange("weight_kg")}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label">BP Systolic</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Systolic"
                    value={ancForm.bp_systolic}
                    onChange={handleAncChange("bp_systolic")}
                  />
                </div>
                <div className="field">
                  <label className="field-label">BP Diastolic</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Diastolic"
                    value={ancForm.bp_diastolic}
                    onChange={handleAncChange("bp_diastolic")}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Fundal Height (cm)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Fundal height"
                    value={ancForm.fundal_height_cm}
                    onChange={handleAncChange("fundal_height_cm")}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label">Fetal Heartbeat (bpm)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="FHR"
                    value={ancForm.fetal_heartbeat_bpm}
                    onChange={handleAncChange("fetal_heartbeat_bpm")}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Fetal Presentation</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Presentation"
                    value={ancForm.fetal_presentation}
                    onChange={handleAncChange("fetal_presentation")}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Urinalysis</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Urinalysis"
                    value={ancForm.urinalysis}
                    onChange={handleAncChange("urinalysis")}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label">Hemoglobin Level</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Hb level"
                    value={ancForm.hemoglobin_level}
                    onChange={handleAncChange("hemoglobin_level")}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Next Appointment</label>
                  <input
                    type="date"
                    className="input"
                    value={ancForm.next_appointment}
                    onChange={handleAncChange("next_appointment")}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Notes</label>
                <textarea
                  className="textarea"
                  placeholder="Additional notes"
                  value={ancForm.notes}
                  onChange={handleAncChange("notes")}
                />
              </div>

              <button type="submit" className="btn btn-primary">
                <i className="bi bi-floppy me-2"></i> Save ANC Visit
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clipboard me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>ANC Visit History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {(profile.visits || []).length} visit{(profile.visits || []).length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {(profile.visits || []).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clipboard"></i>
              </div>
              <h3 className="empty-state__title">No ANC visits recorded</h3>
              <p className="empty-state__desc">Record the first ANC visit above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th className="cell-numeric">Weeks</th>
                    <th className="cell-numeric">Weight</th>
                    <th>BP</th>
                    <th className="cell-numeric">FHR</th>
                    <th>Next Appt</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.visits || []).map((v) => (
                    <tr key={v.id}>
                      <td className="cell-mono">{v.visit_number}</td>
                      <td className="cell-numeric">{v.gestational_age_weeks}</td>
                      <td className="cell-numeric">{v.weight_kg}</td>
                      <td>{v.bp_systolic}/{v.bp_diastolic}</td>
                      <td className="cell-numeric">{v.fetal_heartbeat_bpm}</td>
                      <td>{v.next_appointment || "—"}</td>
                      <td>{new Date(v.visit_date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isActive && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-plus-circle me-2"></i> Record Delivery
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitDelivery}>
              <div className="field-row">
                <div className="field">
                  <label className="field-label">Delivery Date & Time <span className="required">*</span></label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={deliveryForm.delivery_date}
                    onChange={handleDeliveryChange("delivery_date")}
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label">Mode of Delivery <span className="required">*</span></label>
                  <select className="select" value={deliveryForm.mode_of_delivery} onChange={handleDeliveryChange("mode_of_delivery")}>
                    <option value="SVD">Spontaneous Vaginal Delivery</option>
                    <option value="ASSISTED">Assisted Vaginal Delivery</option>
                    <option value="CAESAREAN">Caesarean Section</option>
                    <option value="BREECH">Breech Delivery</option>
                  </select>
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label">Outcome <span className="required">*</span></label>
                  <select className="select" value={deliveryForm.outcome} onChange={handleDeliveryChange("outcome")}>
                    <option value="LIVE_BIRTH">Live Birth</option>
                    <option value="STILLBIRTH">Stillbirth</option>
                  </select>
                </div>
                <div className="field">
                  <label className="field-label">Place of Delivery</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Place of delivery"
                    value={deliveryForm.place_of_delivery}
                    onChange={handleDeliveryChange("place_of_delivery")}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label">Blood Loss (ml)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Blood loss"
                    value={deliveryForm.blood_loss_ml}
                    onChange={handleDeliveryChange("blood_loss_ml")}
                  />
                </div>
                <div className="field" style={{ flex: 2 }}>
                  <label className="field-label">Complications</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Any complications"
                    value={deliveryForm.complications}
                    onChange={handleDeliveryChange("complications")}
                  />
                </div>
              </div>

              {deliveryForm.outcome === "LIVE_BIRTH" && (
                <>
                  <h6 className="text-sm font-semibold" style={{ marginBottom: "var(--space-2)", marginTop: "var(--space-3)" }}>
                    Baby Details
                  </h6>
                  <div className="field-row">
                    <div className="field">
                      <label className="field-label">Baby's Name</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Name (optional)"
                        value={deliveryForm.child_full_name}
                        onChange={handleDeliveryChange("child_full_name")}
                      />
                    </div>
                    <div className="field">
                      <label className="field-label">Sex</label>
                      <select className="select" value={deliveryForm.child_sex} onChange={handleDeliveryChange("child_sex")}>
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                      </select>
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field">
                      <label className="field-label">Birth Weight (kg)</label>
                      <input
                        type="number"
                        className="input"
                        placeholder="Weight"
                        value={deliveryForm.birth_weight_kg}
                        onChange={handleDeliveryChange("birth_weight_kg")}
                      />
                    </div>
                    <div className="field">
                      <label className="field-label">Birth Length (cm)</label>
                      <input
                        type="number"
                        className="input"
                        placeholder="Length"
                        value={deliveryForm.birth_length_cm}
                        onChange={handleDeliveryChange("birth_length_cm")}
                      />
                    </div>
                    <div className="field">
                      <label className="field-label">Apgar (1 min)</label>
                      <input
                        type="number"
                        className="input"
                        placeholder="Apgar 1 min"
                        value={deliveryForm.apgar_score_1min}
                        onChange={handleDeliveryChange("apgar_score_1min")}
                      />
                    </div>
                    <div className="field">
                      <label className="field-label">Apgar (5 min)</label>
                      <input
                        type="number"
                        className="input"
                        placeholder="Apgar 5 min"
                        value={deliveryForm.apgar_score_5min}
                        onChange={handleDeliveryChange("apgar_score_5min")}
                      />
                    </div>
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary">
                <i className="bi bi-plus-circle me-2"></i> Record Delivery
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-baby me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Delivery History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {(profile.deliveries || []).length} delivery{(profile.deliveries || []).length !== 1 ? "ies" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {(profile.deliveries || []).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-baby"></i>
              </div>
              <h3 className="empty-state__title">No deliveries recorded</h3>
              <p className="empty-state__desc">Record delivery when the mother gives birth.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Delivery #</th>
                    <th>Date</th>
                    <th>Mode</th>
                    <th>Outcome</th>
                    <th>Place</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.deliveries || []).map((d) => (
                    <React.Fragment key={d.id}>
                      <tr>
                        <td className="cell-mono">{d.delivery_number}</td>
                        <td>{new Date(d.delivery_date).toLocaleString()}</td>
                        <td>{d.mode_of_delivery}</td>
                        <td>
                          <span className={`badge ${d.outcome === "LIVE_BIRTH" ? "badge-success" : "badge-danger"}`}>
                            <span className="badge-dot"></span>
                            {d.outcome}
                          </span>
                        </td>
                        <td>{d.place_of_delivery || "—"}</td>
                        <td className="cell-actions">
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => openDeliveryChargeModal(d)}
                          >
                            <i className="bi bi-currency-dollar me-1"></i> Bill Delivery
                          </button>
                        </td>
                      </tr>
                      {(d.charges || []).length > 0 && (
                        <tr>
                          <td colSpan={6} style={{ paddingLeft: "var(--space-6)" }}>
                            <div className="text-sm text-muted" style={{ marginBottom: "var(--space-2)" }}>
                              Charges for this delivery — Total: KES {d.total_billed}
                            </div>
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
                                {d.charges.map((c) => (
                                  <tr key={c.id}>
                                    <td className="cell-mono">{c.invoice_number}</td>
                                    <td>{c.description}</td>
                                    <td className="cell-numeric">KES {c.amount}</td>
                                    <td className="cell-numeric">KES {c.balance}</td>
                                    <td>
                                      <span className={`badge ${getStatusBadge(c.status)}`}>
                                        <span className="badge-dot"></span>
                                        {c.status}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {profile.status === "DELIVERED" && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-plus-circle me-2"></i> Record Postnatal Visit
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitPnc}>
              <div className="field-row">
                <div className="field">
                  <label className="field-label">Day Post-Delivery <span className="required">*</span></label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Day"
                    value={pncForm.visit_day}
                    onChange={handlePncChange("visit_day")}
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label">Mother BP Systolic</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Systolic"
                    value={pncForm.mother_bp_systolic}
                    onChange={handlePncChange("mother_bp_systolic")}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Mother BP Diastolic</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Diastolic"
                    value={pncForm.mother_bp_diastolic}
                    onChange={handlePncChange("mother_bp_diastolic")}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label">Mother Temp (°C)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Temp"
                    value={pncForm.mother_temp_c}
                    onChange={handlePncChange("mother_temp_c")}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Lochia Assessment</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Lochia assessment"
                    value={pncForm.lochia_assessment}
                    onChange={handlePncChange("lochia_assessment")}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Breastfeeding Status</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Breastfeeding status"
                    value={pncForm.breastfeeding_status}
                    onChange={handlePncChange("breastfeeding_status")}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field">
                  <label className="field-label">Child Weight (kg)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Child weight"
                    value={pncForm.child_weight_kg}
                    onChange={handlePncChange("child_weight_kg")}
                  />
                </div>
                <div className="field">
                  <label className="field-label">Child Temp (°C)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Child temp"
                    value={pncForm.child_temp_c}
                    onChange={handlePncChange("child_temp_c")}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Notes</label>
                <textarea
                  className="textarea"
                  placeholder="Additional notes"
                  value={pncForm.notes}
                  onChange={handlePncChange("notes")}
                />
              </div>

              <button type="submit" className="btn btn-primary">
                <i className="bi bi-floppy me-2"></i> Save PNC Visit
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-file-text me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Postnatal Visit History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {(profile.postnatal_visits || []).length} visit{(profile.postnatal_visits || []).length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {(profile.postnatal_visits || []).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-file-text"></i>
              </div>
              <h3 className="empty-state__title">No postnatal visits recorded</h3>
              <p className="empty-state__desc">Record postnatal visits after delivery.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="cell-numeric">Day</th>
                    <th>Mother BP</th>
                    <th>Lochia</th>
                    <th>Breastfeeding</th>
                    <th className="cell-numeric">Child Weight</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(profile.postnatal_visits || []).map((v) => (
                    <tr key={v.id}>
                      <td className="cell-numeric">{v.visit_day}</td>
                      <td>{v.mother_bp_systolic}/{v.mother_bp_diastolic}</td>
                      <td>{v.lochia_assessment || "—"}</td>
                      <td>{v.breastfeeding_status || "—"}</td>
                      <td className="cell-numeric">{v.child_weight_kg || "—"}</td>
                      <td>{new Date(v.visit_date).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Charge Modal (general ANC) */}
      <Modal
        show={showChargeModal}
        onClose={() => {
          setShowChargeModal(false);
          setChargeForm({ description: "", amount: "" });
          setChargeErrors({});
        }}
        title="Add Charge"
        size="modal-md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowChargeModal(false)}
              disabled={chargeSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitCharge}
              disabled={chargeSubmitting}
            >
              {chargeSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  Adding...
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg me-2"></i>
                  Add Charge
                </>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={submitCharge}>
          <div className="field">
            <label className="field-label" htmlFor="charge_description">
              Description <span className="required">*</span>
            </label>
            <input
              id="charge_description"
              type="text"
              className={`input ${chargeErrors.description ? "has-error" : ""}`}
              placeholder="e.g. Ultrasound scan, specialist review fee"
              value={chargeForm.description}
              onChange={handleChargeFormChange("description")}
            />
            {chargeErrors.description && <div className="field-error">{chargeErrors.description}</div>}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="charge_amount">
              Amount <span className="required">*</span>
            </label>
            <div className="input-group">
              <span className="input-addon">KES</span>
              <input
                id="charge_amount"
                type="number"
                step="0.01"
                min="0.01"
                className={`input ${chargeErrors.amount ? "has-error" : ""}`}
                placeholder="0.00"
                value={chargeForm.amount}
                onChange={handleChargeFormChange("amount")}
              />
            </div>
            {chargeErrors.amount && <div className="field-error">{chargeErrors.amount}</div>}
          </div>
        </form>
      </Modal>

      {/* Bill Delivery Modal (scoped to a specific delivery) */}
      <Modal
        show={showDeliveryChargeModal}
        onClose={() => {
          setShowDeliveryChargeModal(false);
          setSelectedDelivery(null);
          setDeliveryChargeForm({ description: "", amount: "" });
          setDeliveryChargeErrors({});
        }}
        title={selectedDelivery ? `Bill Delivery — ${selectedDelivery.delivery_number}` : "Bill Delivery"}
        size="modal-md"
        footer={
          <>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowDeliveryChargeModal(false)}
              disabled={deliveryChargeSubmitting}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={submitDeliveryCharge}
              disabled={deliveryChargeSubmitting}
            >
              {deliveryChargeSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" />
                  Adding...
                </>
              ) : (
                <>
                  <i className="bi bi-check-lg me-2"></i>
                  Add Charge
                </>
              )}
            </button>
          </>
        }
      >
        <form onSubmit={submitDeliveryCharge}>
          {selectedDelivery && (
            <p className="text-sm text-muted" style={{ marginBottom: "var(--space-3)" }}>
              This charge will be linked to delivery <strong>{selectedDelivery.delivery_number}</strong>{" "}
              ({selectedDelivery.mode_of_delivery}, {new Date(selectedDelivery.delivery_date).toLocaleDateString()}).
            </p>
          )}
          <div className="field">
            <label className="field-label" htmlFor="delivery_charge_description">
              Description <span className="required">*</span>
            </label>
            <input
              id="delivery_charge_description"
              type="text"
              className={`input ${deliveryChargeErrors.description ? "has-error" : ""}`}
              placeholder="e.g. Surgical consumables, blood transfusion, theatre time"
              value={deliveryChargeForm.description}
              onChange={handleDeliveryChargeFormChange("description")}
            />
            {deliveryChargeErrors.description && (
              <div className="field-error">{deliveryChargeErrors.description}</div>
            )}
          </div>

          <div className="field">
            <label className="field-label" htmlFor="delivery_charge_amount">
              Amount <span className="required">*</span>
            </label>
            <div className="input-group">
              <span className="input-addon">KES</span>
              <input
                id="delivery_charge_amount"
                type="number"
                step="0.01"
                min="0.01"
                className={`input ${deliveryChargeErrors.amount ? "has-error" : ""}`}
                placeholder="0.00"
                value={deliveryChargeForm.amount}
                onChange={handleDeliveryChargeFormChange("amount")}
              />
            </div>
            {deliveryChargeErrors.amount && <div className="field-error">{deliveryChargeErrors.amount}</div>}
          </div>
        </form>
      </Modal>
    </>
  );
}