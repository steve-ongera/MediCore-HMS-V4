import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getChild, administerImmunization, createGrowthRecord } from "../../services/api";

export default function ChildDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [child, setChild] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [batchNumber, setBatchNumber] = useState({});
  const [growthForm, setGrowthForm] = useState({
    weight_kg: "", height_cm: "", muac_cm: "", nutrition_status: "NORMAL", notes: "",
  });

  useEffect(() => {
    load();
  }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getChild(id);
      setChild(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdminister = async (immunizationId) => {
    try {
      await administerImmunization(immunizationId, { batch_number: batchNumber[immunizationId] || "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGrowthChange = (field) => (e) => setGrowthForm((p) => ({ ...p, [field]: e.target.value }));

  const submitGrowth = async (e) => {
    e.preventDefault();
    try {
      await createGrowthRecord({ child: id, ...growthForm });
      setGrowthForm({ weight_kg: "", height_cm: "", muac_cm: "", nutrition_status: "NORMAL", notes: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading child details...</span>
      </div>
    );
  }

  if (!child) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Maternal & Child Health</div>
          <h1 className="page-title">{child.child_number}</h1>
          <p className="page-subtitle">
            {child.full_name || "Not yet named"} • {child.age_months} months old
          </p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/mch/children")}>
            <i className="bi bi-arrow-left me-2"></i> Back
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
              <i className="bi bi-person-child fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{child.full_name || "Not yet named"}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {child.child_number}
                </span>
                <span>•</span>
                <span>Mother: {child.mother_name} ({child.mother_hospital_number})</span>
                <span>•</span>
                <span className={`badge ${child.age_months < 12 ? "badge-primary" : "badge-success"}`}>
                  <span className="badge-dot"></span>
                  {child.age_months < 12 ? "Infant" : "Child"}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-calendar me-1"></i> DOB: {new Date(child.date_of_birth).toLocaleDateString()}
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Sex</div>
              <div className="info-item__value">{child.sex}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Age</div>
              <div className="info-item__value">{child.age_months} months</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Birth Weight</div>
              <div className="info-item__value">{child.birth_weight_kg || "—"} kg</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Birth Length</div>
              <div className="info-item__value">{child.birth_length_cm || "—"} cm</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Apgar (1 min)</div>
              <div className="info-item__value">{child.apgar_score_1min || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Apgar (5 min)</div>
              <div className="info-item__value">{child.apgar_score_5min || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-syringe me-2"></i> Immunization Schedule
          </h5>
        </div>
        <div className="card-body p-0">
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Vaccine</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Given Date</th>
                  <th>Batch #</th>
                  <th className="cell-actions"></th>
                </tr>
              </thead>
              <tbody>
                {(child.immunizations || []).map((imm) => (
                  <tr key={imm.id}>
                    <td className="cell-primary">{imm.vaccine_name}</td>
                    <td>{new Date(imm.due_date).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${imm.status === "DUE" ? "badge-warning" : imm.status === "GIVEN" ? "badge-success" : "badge-neutral"}`}>
                        <span className="badge-dot"></span>
                        {imm.status}
                      </span>
                    </td>
                    <td>{imm.given_date ? new Date(imm.given_date).toLocaleDateString() : "—"}</td>
                    <td>
                      {imm.status === "DUE" ? (
                        <input
                          type="text"
                          className="input"
                          placeholder="Batch #"
                          style={{ width: "120px" }}
                          value={batchNumber[imm.id] || ""}
                          onChange={(e) => setBatchNumber((p) => ({ ...p, [imm.id]: e.target.value }))}
                        />
                      ) : (
                        imm.batch_number || "—"
                      )}
                    </td>
                    <td className="cell-actions">
                      {imm.status === "DUE" && (
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={() => handleAdminister(imm.id)}
                        >
                          <i className="bi bi-check me-1"></i> Mark Given
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {(child.immunizations || []).length === 0 && (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-syringe"></i>
              </div>
              <h3 className="empty-state__title">No immunizations scheduled</h3>
              <p className="empty-state__desc">Immunization schedule will appear here.</p>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> Record Growth
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submitGrowth}>
            <div className="field-row">
              <div className="field">
                <label className="field-label">Weight (kg)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Weight"
                  value={growthForm.weight_kg}
                  onChange={handleGrowthChange("weight_kg")}
                  step="0.1"
                />
              </div>
              <div className="field">
                <label className="field-label">Height (cm)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Height"
                  value={growthForm.height_cm}
                  onChange={handleGrowthChange("height_cm")}
                  step="0.1"
                />
              </div>
              <div className="field">
                <label className="field-label">MUAC (cm)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="MUAC"
                  value={growthForm.muac_cm}
                  onChange={handleGrowthChange("muac_cm")}
                  step="0.1"
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label className="field-label">Nutrition Status</label>
                <select
                  className="select"
                  value={growthForm.nutrition_status}
                  onChange={handleGrowthChange("nutrition_status")}
                >
                  <option value="NORMAL">Normal</option>
                  <option value="MODERATE_MALNUTRITION">Moderate Malnutrition</option>
                  <option value="SEVERE_MALNUTRITION">Severe Malnutrition</option>
                  <option value="OVERWEIGHT">Overweight</option>
                </select>
              </div>
              <div className="field" style={{ flex: 2 }}>
                <label className="field-label">Notes</label>
                <input
                  type="text"
                  className="input"
                  placeholder="Additional notes"
                  value={growthForm.notes}
                  onChange={handleGrowthChange("notes")}
                />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">
              <i className="bi bi-floppy me-2"></i> Save Growth Record
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-bar-chart me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Growth History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {(child.growth_records || []).length} record{(child.growth_records || []).length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {(child.growth_records || []).length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-bar-chart"></i>
              </div>
              <h3 className="empty-state__title">No growth records</h3>
              <p className="empty-state__desc">Start tracking growth by recording measurements above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th className="cell-numeric">Weight</th>
                    <th className="cell-numeric">Height</th>
                    <th className="cell-numeric">MUAC</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {(child.growth_records || []).map((g) => (
                    <tr key={g.id}>
                      <td>{new Date(g.recorded_at).toLocaleDateString()}</td>
                      <td className="cell-numeric">{g.weight_kg || "—"}</td>
                      <td className="cell-numeric">{g.height_cm || "—"}</td>
                      <td className="cell-numeric">{g.muac_cm || "—"}</td>
                      <td>
                        <span className={`badge ${g.nutrition_status === "NORMAL" ? "badge-success" : g.nutrition_status === "OVERWEIGHT" ? "badge-warning" : "badge-danger"}`}>
                          <span className="badge-dot"></span>
                          {g.nutrition_status.replace("_", " ")}
                        </span>
                      </td>
                      <td>{g.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {(child.growth_records || []).length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {(child.growth_records || []).length} growth record{(child.growth_records || []).length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}