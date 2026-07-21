import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getDentalVisit, recordTooth, addTreatmentPlanItem, getDentalProcedureCatalog,
  performDentalProcedure, cancelTreatmentPlanItem,
} from "../../services/api";

const FDI_QUADRANTS = {
  "Upper Right (1)": [18, 17, 16, 15, 14, 13, 12, 11],
  "Upper Left (2)": [21, 22, 23, 24, 25, 26, 27, 28],
  "Lower Left (3)": [31, 32, 33, 34, 35, 36, 37, 38],
  "Lower Right (4)": [48, 47, 46, 45, 44, 43, 42, 41],
};

export default function DentalVisitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [visit, setVisit] = useState(null);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedTooth, setSelectedTooth] = useState("");
  const [toothForm, setToothForm] = useState({ condition: "HEALTHY", notes: "" });

  const [planForm, setPlanForm] = useState({ tooth_number: "", procedure: "", sequence: "1", notes: "" });

  useEffect(() => { load(); loadProcedures(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDentalVisit(id);
      setVisit(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadProcedures = async () => {
    try {
      const data = await getDentalProcedureCatalog();
      setProcedures(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const getToothCondition = (toothNumber) => {
    const entry = (visit?.tooth_chart || []).find((t) => t.tooth_number === String(toothNumber));
    return entry ? entry.condition : null;
  };

  const openToothForm = (toothNumber) => {
    const existing = (visit?.tooth_chart || []).find((t) => t.tooth_number === String(toothNumber));
    setSelectedTooth(String(toothNumber));
    setToothForm({ condition: existing?.condition || "HEALTHY", notes: existing?.notes || "" });
  };

  const submitTooth = async (e) => {
    e.preventDefault();
    try {
      await recordTooth(id, { tooth_number: selectedTooth, ...toothForm });
      setSelectedTooth("");
      load();
    } catch (err) { setError(err.message); }
  };

  const submitPlan = async (e) => {
    e.preventDefault();
    try {
      await addTreatmentPlanItem(id, { ...planForm, sequence: Number(planForm.sequence) });
      setPlanForm({ tooth_number: "", procedure: "", sequence: "1", notes: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handlePerform = async (planId) => {
    try {
      await performDentalProcedure(planId, {});
      load();
    } catch (err) { setError(err.message); }
  };

  const handleCancelPlan = async (planId) => {
    try {
      await cancelTreatmentPlanItem(planId);
      load();
    } catch (err) { setError(err.message); }
  };

  const getConditionBadge = (condition) => {
    const conditionMap = {
      "HEALTHY": "badge-success",
      "CARIES": "badge-danger",
      "FILLED": "badge-primary",
      "CROWNED": "badge-info",
      "MISSING": "badge-neutral",
      "IMPACTED": "badge-warning",
      "FRACTURED": "badge-danger",
      "ROOT_CANAL_TREATED": "badge-primary",
    };
    return conditionMap[condition] || "badge-neutral";
  };

  const getPlanStatusBadge = (status) => {
    const statusMap = {
      "PLANNED": "badge-warning",
      "PERFORMED": "badge-success",
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
        <span className="loading-screen__label">Loading dental visit...</span>
      </div>
    );
  }

  if (!visit) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Dental</div>
          <h1 className="page-title">{visit.visit_number}</h1>
          <p className="page-subtitle">{visit.patient_name}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/dental")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Visits
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
              <i className="bi bi-teeth fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{visit.patient_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {visit.hospital_number}
                </span>
                <span>•</span>
                <span>Dentist: {visit.dentist_name || "—"}</span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-calendar me-1"></i> {new Date(visit.visit_date).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Chief Complaint</div>
              <div className="info-item__value">{visit.chief_complaint || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-grid me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Tooth Chart (FDI Notation)</h5>
          </div>
        </div>
        <div className="card-body">
          <div className="tooth-grid">
            {Object.entries(FDI_QUADRANTS).map(([quadrantName, teeth]) => (
              <div key={quadrantName} className="tooth-quadrant">
                <div className="text-sm font-semibold text-muted" style={{ marginBottom: "var(--space-2)" }}>
                  {quadrantName}
                </div>
                <div className="flex flex-wrap gap-2">
                  {teeth.map((t) => {
                    const condition = getToothCondition(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        className={`tooth-btn ${condition ? `tooth-btn--${condition.toLowerCase()}` : ""}`}
                        onClick={() => openToothForm(t)}
                        title={condition || "Not yet examined"}
                      >
                        <span className="tooth-btn__number">{t}</span>
                        {condition && <span className={`badge ${getConditionBadge(condition)}`} style={{ fontSize: "0.5rem", padding: "1px 4px" }}>{condition}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {selectedTooth && (
            <div className="card" style={{ borderColor: "var(--primary)", background: "var(--primary-soft)", marginTop: "var(--space-4)" }}>
              <div className="card-body">
                <h6 className="card-title">Tooth {selectedTooth}</h6>
                <form onSubmit={submitTooth}>
                  <div className="field-row">
                    <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                      <label className="field-label">Condition</label>
                      <select className="select" value={toothForm.condition} onChange={(e) => setToothForm((p) => ({ ...p, condition: e.target.value }))}>
                        <option value="HEALTHY">Healthy</option>
                        <option value="CARIES">Caries / Decay</option>
                        <option value="FILLED">Filled</option>
                        <option value="CROWNED">Crowned</option>
                        <option value="MISSING">Missing</option>
                        <option value="IMPACTED">Impacted</option>
                        <option value="FRACTURED">Fractured</option>
                        <option value="ROOT_CANAL_TREATED">Root Canal Treated</option>
                      </select>
                    </div>
                    <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                      <label className="field-label">Notes</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Notes"
                        value={toothForm.notes}
                        onChange={(e) => setToothForm((p) => ({ ...p, notes: e.target.value }))}
                      />
                    </div>
                    <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end", gap: "var(--space-2)" }}>
                      <button type="submit" className="btn btn-primary">
                        <i className="bi bi-save me-2"></i> Save
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => setSelectedTooth("")}>
                        <i className="bi bi-x"></i>
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> Add Treatment Plan Item
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submitPlan}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Tooth</label>
                <select className="select" value={planForm.tooth_number} onChange={(e) => setPlanForm((p) => ({ ...p, tooth_number: e.target.value }))}>
                  <option value="">Whole-mouth procedure</option>
                  {Object.values(FDI_QUADRANTS).flat().map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1.5 }}>
                <label className="field-label">Procedure <span className="required">*</span></label>
                <select className="select" value={planForm.procedure} onChange={(e) => setPlanForm((p) => ({ ...p, procedure: e.target.value }))} required>
                  <option value="">Select procedure</option>
                  {procedures.map((p) => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price)})</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 0.7 }}>
                <label className="field-label">Sequence</label>
                <input
                  type="number"
                  className="input"
                  placeholder="1"
                  value={planForm.sequence}
                  onChange={(e) => setPlanForm((p) => ({ ...p, sequence: e.target.value }))}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Notes</label>
              <input
                type="text"
                className="input"
                placeholder="Notes"
                value={planForm.notes}
                onChange={(e) => setPlanForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            <button type="submit" className="btn btn-primary">
              <i className="bi bi-plus-circle me-2"></i> Add to Plan
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Treatment Plan</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {visit.treatment_plans.length} item{visit.treatment_plans.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {visit.treatment_plans.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-list-ul"></i>
              </div>
              <h3 className="empty-state__title">No treatment plan items</h3>
              <p className="empty-state__desc">Add treatment plan items using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th className="cell-numeric">#</th>
                    <th>Tooth</th>
                    <th>Procedure</th>
                    <th className="cell-numeric">Price</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {visit.treatment_plans.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-numeric">{p.sequence}</td>
                      <td>{p.tooth_number || "N/A"}</td>
                      <td className="cell-primary">{p.procedure_name}</td>
                      <td className="cell-numeric">{formatCurrency(p.procedure_price)}</td>
                      <td>
                        <span className={`badge ${getPlanStatusBadge(p.status)}`}>
                          <span className="badge-dot"></span>
                          {p.status}
                        </span>
                      </td>
                      <td className="cell-actions">
                        {p.status === "PLANNED" && (
                          <div className="flex gap-1 justify-end">
                            <button className="btn btn-success btn-sm" onClick={() => handlePerform(p.id)}>
                              <i className="bi bi-check-circle me-1"></i> Perform & Bill
                            </button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleCancelPlan(p.id)}>
                              <i className="bi bi-x-circle me-1"></i> Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {visit.treatment_plans.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {visit.treatment_plans.length} treatment plan item{visit.treatment_plans.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}