import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getEyeVisit, saveEyeExamination, prescribeSpectacles, getEyeProcedureCatalog,
  addEyeTreatmentPlanItem, performEyeProcedure, cancelEyeTreatmentPlanItem,
} from "../../services/api";

export default function EyeVisitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [visit, setVisit] = useState(null);
  const [procedures, setProcedures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [examForm, setExamForm] = useState({
    visual_acuity_od: "", visual_acuity_os: "", iop_od: "", iop_os: "",
    sphere_od: "", cylinder_od: "", axis_od: "", sphere_os: "", cylinder_os: "", axis_os: "",
    anterior_segment_notes: "", posterior_segment_notes: "", diagnosis: "",
  });

  const [rxForm, setRxForm] = useState({
    lens_type: "SINGLE_VISION", sphere_od: "", cylinder_od: "", axis_od: "", add_od: "",
    sphere_os: "", cylinder_os: "", axis_os: "", add_os: "", pupillary_distance_mm: "", price: "", notes: "",
  });

  const [planForm, setPlanForm] = useState({ procedure: "", eye: "BOTH", notes: "" });

  useEffect(() => { load(); loadProcedures(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getEyeVisit(id);
      setVisit(data);
      if (data.examination) {
        setExamForm({
          visual_acuity_od: data.examination.visual_acuity_od || "",
          visual_acuity_os: data.examination.visual_acuity_os || "",
          iop_od: data.examination.iop_od || "", iop_os: data.examination.iop_os || "",
          sphere_od: data.examination.sphere_od || "", cylinder_od: data.examination.cylinder_od || "",
          axis_od: data.examination.axis_od || "", sphere_os: data.examination.sphere_os || "",
          cylinder_os: data.examination.cylinder_os || "", axis_os: data.examination.axis_os || "",
          anterior_segment_notes: data.examination.anterior_segment_notes || "",
          posterior_segment_notes: data.examination.posterior_segment_notes || "",
          diagnosis: data.examination.diagnosis || "",
        });
      }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadProcedures = async () => {
    try {
      const data = await getEyeProcedureCatalog();
      setProcedures(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleExamChange = (f) => (e) => setExamForm((p) => ({ ...p, [f]: e.target.value }));
  const submitExam = async (e) => {
    e.preventDefault();
    try {
      await saveEyeExamination(id, examForm);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleRxChange = (f) => (e) => setRxForm((p) => ({ ...p, [f]: e.target.value }));
  const submitRx = async (e) => {
    e.preventDefault();
    try {
      await prescribeSpectacles(id, { ...rxForm, price: Number(rxForm.price) || 0 });
      setRxForm({ lens_type: "SINGLE_VISION", sphere_od: "", cylinder_od: "", axis_od: "", add_od: "", sphere_os: "", cylinder_os: "", axis_os: "", add_os: "", pupillary_distance_mm: "", price: "", notes: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitPlan = async (e) => {
    e.preventDefault();
    try {
      await addEyeTreatmentPlanItem(id, planForm);
      setPlanForm({ procedure: "", eye: "BOTH", notes: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handlePerform = async (planId) => {
    try {
      await performEyeProcedure(planId, {});
      load();
    } catch (err) { setError(err.message); }
  };

  const handleCancelPlan = async (planId) => {
    try {
      await cancelEyeTreatmentPlanItem(planId);
      load();
    } catch (err) { setError(err.message); }
  };

  const getPlanStatusBadge = (status) => {
    const statusMap = {
      "PLANNED": "badge-warning",
      "PERFORMED": "badge-success",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getLensTypeLabel = (type) => {
    const labels = {
      "SINGLE_VISION": "Single Vision",
      "BIFOCAL": "Bifocal",
      "PROGRESSIVE": "Progressive",
      "READING": "Reading Only",
    };
    return labels[type] || type;
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading eye visit...</span>
      </div>
    );
  }

  if (!visit) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Eye Clinic</div>
          <h1 className="page-title">{visit.visit_number}</h1>
          <p className="page-subtitle">{visit.patient_name}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/eyeclinic")}>
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
              <i className="bi bi-eye fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{visit.patient_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {visit.hospital_number}
                </span>
                <span>•</span>
                <span>Ophthalmologist: {visit.ophthalmologist_name || "—"}</span>
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
          <h5 className="card-title">
            <i className="bi bi-clipboard-check me-2"></i> Examination
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submitExam}>
            <div className="grid-2">
              <div className="card" style={{ borderColor: "var(--border-color)" }}>
                <div className="card-header" style={{ background: "var(--bg-secondary)" }}>
                  <h6 className="mb-0">Right Eye (OD)</h6>
                </div>
                <div className="card-body">
                  <div className="field">
                    <label className="field-label">Visual Acuity</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. 6/6"
                      value={examForm.visual_acuity_od}
                      onChange={handleExamChange("visual_acuity_od")}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">IOP (mmHg)</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="IOP"
                      value={examForm.iop_od}
                      onChange={handleExamChange("iop_od")}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Sphere</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Sphere"
                      value={examForm.sphere_od}
                      onChange={handleExamChange("sphere_od")}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Cylinder</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Cylinder"
                      value={examForm.cylinder_od}
                      onChange={handleExamChange("cylinder_od")}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Axis</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Axis"
                      value={examForm.axis_od}
                      onChange={handleExamChange("axis_od")}
                    />
                  </div>
                </div>
              </div>

              <div className="card" style={{ borderColor: "var(--border-color)" }}>
                <div className="card-header" style={{ background: "var(--bg-secondary)" }}>
                  <h6 className="mb-0">Left Eye (OS)</h6>
                </div>
                <div className="card-body">
                  <div className="field">
                    <label className="field-label">Visual Acuity</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. 6/6"
                      value={examForm.visual_acuity_os}
                      onChange={handleExamChange("visual_acuity_os")}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">IOP (mmHg)</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="IOP"
                      value={examForm.iop_os}
                      onChange={handleExamChange("iop_os")}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Sphere</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Sphere"
                      value={examForm.sphere_os}
                      onChange={handleExamChange("sphere_os")}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Cylinder</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Cylinder"
                      value={examForm.cylinder_os}
                      onChange={handleExamChange("cylinder_os")}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Axis</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Axis"
                      value={examForm.axis_os}
                      onChange={handleExamChange("axis_os")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="field" style={{ marginTop: "var(--space-3)" }}>
              <label className="field-label">Anterior Segment Notes</label>
              <textarea
                className="textarea"
                placeholder="Anterior segment findings"
                value={examForm.anterior_segment_notes}
                onChange={handleExamChange("anterior_segment_notes")}
              />
            </div>

            <div className="field">
              <label className="field-label">Posterior Segment Notes</label>
              <textarea
                className="textarea"
                placeholder="Posterior segment findings"
                value={examForm.posterior_segment_notes}
                onChange={handleExamChange("posterior_segment_notes")}
              />
            </div>

            <div className="field">
              <label className="field-label">Diagnosis</label>
              <textarea
                className="textarea"
                placeholder="Diagnosis"
                value={examForm.diagnosis}
                onChange={handleExamChange("diagnosis")}
              />
            </div>

            <button type="submit" className="btn btn-primary">
              <i className="bi bi-save me-2"></i> Save Examination
            </button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-eyeglasses me-2"></i> Prescribe Spectacles
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submitRx}>
            <div className="field">
              <label className="field-label">Lens Type</label>
              <select className="select" value={rxForm.lens_type} onChange={handleRxChange("lens_type")}>
                <option value="SINGLE_VISION">Single Vision</option>
                <option value="BIFOCAL">Bifocal</option>
                <option value="PROGRESSIVE">Progressive</option>
                <option value="READING">Reading Only</option>
              </select>
            </div>

            <div className="grid-2">
              <div className="card" style={{ borderColor: "var(--border-color)" }}>
                <div className="card-header" style={{ background: "var(--bg-secondary)" }}>
                  <h6 className="mb-0">Right Eye (OD)</h6>
                </div>
                <div className="card-body">
                  <div className="field">
                    <label className="field-label">Sphere</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Sphere"
                      value={rxForm.sphere_od}
                      onChange={handleRxChange("sphere_od")}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Cylinder</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Cylinder"
                      value={rxForm.cylinder_od}
                      onChange={handleRxChange("cylinder_od")}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Axis</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Axis"
                      value={rxForm.axis_od}
                      onChange={handleRxChange("axis_od")}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Add</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Add"
                      value={rxForm.add_od}
                      onChange={handleRxChange("add_od")}
                    />
                  </div>
                </div>
              </div>

              <div className="card" style={{ borderColor: "var(--border-color)" }}>
                <div className="card-header" style={{ background: "var(--bg-secondary)" }}>
                  <h6 className="mb-0">Left Eye (OS)</h6>
                </div>
                <div className="card-body">
                  <div className="field">
                    <label className="field-label">Sphere</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Sphere"
                      value={rxForm.sphere_os}
                      onChange={handleRxChange("sphere_os")}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Cylinder</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Cylinder"
                      value={rxForm.cylinder_os}
                      onChange={handleRxChange("cylinder_os")}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Axis</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Axis"
                      value={rxForm.axis_os}
                      onChange={handleRxChange("axis_os")}
                    />
                  </div>
                  <div className="field">
                    <label className="field-label">Add</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="Add"
                      value={rxForm.add_os}
                      onChange={handleRxChange("add_os")}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Pupillary Distance (mm)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="PD"
                  value={rxForm.pupillary_distance_mm}
                  onChange={handleRxChange("pupillary_distance_mm")}
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Price (KES)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Price"
                  value={rxForm.price}
                  onChange={handleRxChange("price")}
                />
              </div>
            </div>

            <div className="field">
              <label className="field-label">Notes</label>
              <textarea
                className="textarea"
                placeholder="Notes"
                value={rxForm.notes}
                onChange={handleRxChange("notes")}
              />
            </div>

            <button type="submit" className="btn btn-primary">
              <i className="bi bi-plus-circle me-2"></i> Save Prescription
            </button>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-eyeglasses me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Spectacle Prescriptions</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {visit.spectacle_prescriptions.length} prescription{visit.spectacle_prescriptions.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {visit.spectacle_prescriptions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-eyeglasses"></i>
              </div>
              <h3 className="empty-state__title">No prescriptions yet</h3>
              <p className="empty-state__desc">Prescribe spectacles using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Lens Type</th>
                    <th>OD (Sph/Cyl/Axis)</th>
                    <th>OS (Sph/Cyl/Axis)</th>
                    <th className="cell-numeric">Price</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {visit.spectacle_prescriptions.map((rx) => (
                    <tr key={rx.id}>
                      <td>{getLensTypeLabel(rx.lens_type)}</td>
                      <td>{rx.sphere_od}/{rx.cylinder_od}/{rx.axis_od}</td>
                      <td>{rx.sphere_os}/{rx.cylinder_os}/{rx.axis_os}</td>
                      <td className="cell-numeric">{formatCurrency(rx.price)}</td>
                      <td>{new Date(rx.prescribed_at).toLocaleDateString()}</td>
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
            <i className="bi bi-plus-circle me-2"></i> Add Treatment Plan Item
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submitPlan}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1.5 }}>
                <label className="field-label">Procedure <span className="required">*</span></label>
                <select className="select" value={planForm.procedure} onChange={(e) => setPlanForm((p) => ({ ...p, procedure: e.target.value }))} required>
                  <option value="">Select procedure</option>
                  {procedures.map((p) => <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price)})</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 0.8 }}>
                <label className="field-label">Eye</label>
                <select className="select" value={planForm.eye} onChange={(e) => setPlanForm((p) => ({ ...p, eye: e.target.value }))}>
                  <option value="OD">Right Eye (OD)</option>
                  <option value="OS">Left Eye (OS)</option>
                  <option value="BOTH">Both Eyes</option>
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Notes</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Notes"
                  value={planForm.notes}
                  onChange={(e) => setPlanForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
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
                    <th>Procedure</th>
                    <th>Eye</th>
                    <th className="cell-numeric">Price</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {visit.treatment_plans.map((p) => (
                    <tr key={p.id}>
                      <td className="cell-primary">{p.procedure_name}</td>
                      <td>{p.eye}</td>
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