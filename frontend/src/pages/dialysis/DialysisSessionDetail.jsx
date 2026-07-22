import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getDialysisSession, getAvailableDialysisMachines, startDialysisSession, completeDialysisSession, markSessionMissed } from "../../services/api";

export default function DialysisSessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [startForm, setStartForm] = useState({
    machine: "", pre_weight_kg: "", pre_bp_systolic: "", pre_bp_diastolic: "",
    ultrafiltration_target_ml: "", blood_flow_rate: "", dialysate_flow_rate: "",
  });
  const [completeForm, setCompleteForm] = useState({
    post_weight_kg: "", post_bp_systolic: "", post_bp_diastolic: "", complications: "", nursing_notes: "",
  });

  useEffect(() => { load(); loadMachines(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDialysisSession(id);
      setSession(data);
      if (data.machine) setStartForm((p) => ({ ...p, machine: data.machine }));
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadMachines = async () => {
    try {
      const data = await getAvailableDialysisMachines();
      setMachines(data);
    } catch (err) { setError(err.message); }
  };

  const submitStart = async (e) => {
    e.preventDefault();
    try {
      await startDialysisSession(id, {
        ...startForm,
        pre_weight_kg: startForm.pre_weight_kg || undefined,
        pre_bp_systolic: startForm.pre_bp_systolic || undefined,
        pre_bp_diastolic: startForm.pre_bp_diastolic || undefined,
        ultrafiltration_target_ml: startForm.ultrafiltration_target_ml || undefined,
        blood_flow_rate: startForm.blood_flow_rate || undefined,
        dialysate_flow_rate: startForm.dialysate_flow_rate || undefined,
      });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitComplete = async (e) => {
    e.preventDefault();
    try {
      await completeDialysisSession(id, {
        ...completeForm,
        post_weight_kg: completeForm.post_weight_kg || undefined,
        post_bp_systolic: completeForm.post_bp_systolic || undefined,
        post_bp_diastolic: completeForm.post_bp_diastolic || undefined,
      });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleMarkMissed = async () => {
    try {
      await markSessionMissed(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "SCHEDULED": "badge-warning",
      "IN_PROGRESS": "badge-primary",
      "COMPLETED": "badge-success",
      "CANCELLED": "badge-neutral",
      "NO_SHOW": "badge-danger",
    };
    return statusMap[status] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading session details...</span>
      </div>
    );
  }

  if (!session) return null;

  const isScheduled = session.status === "SCHEDULED";
  const isInProgress = session.status === "IN_PROGRESS";

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Dialysis</div>
          <h1 className="page-title">{session.session_number}</h1>
          <p className="page-subtitle">{session.patient_name}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate(-1)}>
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
              <i className="bi bi-heart-pulse fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{session.patient_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {session.session_number}
                </span>
                <span>•</span>
                <span>Machine: {session.machine_number || "Unassigned"}</span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(session.status)}`}>
                  <span className="badge-dot"></span>
                  {session.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-calendar me-1"></i> {new Date(session.scheduled_date).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Status</div>
              <div className="info-item__value">
                <span className={`badge ${getStatusBadge(session.status)}`}>
                  <span className="badge-dot"></span>
                  {session.status.replace("_", " ")}
                </span>
              </div>
            </div>
            {session.started_at && (
              <div className="info-item">
                <div className="info-item__label">Started</div>
                <div className="info-item__value">{new Date(session.started_at).toLocaleString()}</div>
              </div>
            )}
            {session.ended_at && (
              <div className="info-item">
                <div className="info-item__label">Ended</div>
                <div className="info-item__value">{new Date(session.ended_at).toLocaleString()}</div>
              </div>
            )}
            {session.fluid_removed_kg && (
              <div className="info-item">
                <div className="info-item__label">Fluid Removed</div>
                <div className="info-item__value">{session.fluid_removed_kg} kg</div>
              </div>
            )}
            <div className="info-item">
              <div className="info-item__label">Pre BP</div>
              <div className="info-item__value">{session.pre_bp_systolic}/{session.pre_bp_diastolic}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Pre Weight</div>
              <div className="info-item__value">{session.pre_weight_kg} kg</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Post BP</div>
              <div className="info-item__value">{session.post_bp_systolic}/{session.post_bp_diastolic}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Post Weight</div>
              <div className="info-item__value">{session.post_weight_kg} kg</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">UF Target</div>
              <div className="info-item__value">{session.ultrafiltration_target_ml} ml</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Blood Flow Rate</div>
              <div className="info-item__value">{session.blood_flow_rate} ml/min</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Dialysate Flow Rate</div>
              <div className="info-item__value">{session.dialysate_flow_rate} ml/min</div>
            </div>
            <div className="info-item" style={{ gridColumn: "span 2" }}>
              <div className="info-item__label">Complications</div>
              <div className="info-item__value">{session.complications || "—"}</div>
            </div>
            <div className="info-item" style={{ gridColumn: "span 2" }}>
              <div className="info-item__label">Nursing Notes</div>
              <div className="info-item__value">{session.nursing_notes || "—"}</div>
            </div>
          </div>

          {isScheduled && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <button className="btn btn-danger" onClick={handleMarkMissed}>
                <i className="bi bi-x-circle me-2"></i> Mark as Missed
              </button>
            </div>
          )}
        </div>
      </div>

      {isScheduled && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-play-circle me-2"></i> Start Session
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitStart}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Machine <span className="required">*</span></label>
                  <select className="select" value={startForm.machine} onChange={(e) => setStartForm((p) => ({ ...p, machine: e.target.value }))} required>
                    <option value="">Select machine</option>
                    {machines.map((m) => <option key={m.id} value={m.id}>{m.machine_number}</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Pre-weight (kg)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Weight"
                    value={startForm.pre_weight_kg}
                    onChange={(e) => setStartForm((p) => ({ ...p, pre_weight_kg: e.target.value }))}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Pre BP Systolic</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Systolic"
                    value={startForm.pre_bp_systolic}
                    onChange={(e) => setStartForm((p) => ({ ...p, pre_bp_systolic: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Pre BP Diastolic</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Diastolic"
                    value={startForm.pre_bp_diastolic}
                    onChange={(e) => setStartForm((p) => ({ ...p, pre_bp_diastolic: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">UF Target (ml)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="UF Target"
                    value={startForm.ultrafiltration_target_ml}
                    onChange={(e) => setStartForm((p) => ({ ...p, ultrafiltration_target_ml: e.target.value }))}
                  />
                </div>
              </div>

              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Blood Flow Rate (ml/min)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Blood flow"
                    value={startForm.blood_flow_rate}
                    onChange={(e) => setStartForm((p) => ({ ...p, blood_flow_rate: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Dialysate Flow Rate (ml/min)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Dialysate flow"
                    value={startForm.dialysate_flow_rate}
                    onChange={(e) => setStartForm((p) => ({ ...p, dialysate_flow_rate: e.target.value }))}
                  />
                </div>
              </div>

              <button type="submit" className="btn btn-primary">
                <i className="bi bi-play-circle me-2"></i> Start Session
              </button>
            </form>
          </div>
        </div>
      )}

      {isInProgress && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-check-circle me-2"></i> Complete Session
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitComplete}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Post-weight (kg)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Weight"
                    value={completeForm.post_weight_kg}
                    onChange={(e) => setCompleteForm((p) => ({ ...p, post_weight_kg: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Post BP Systolic</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Systolic"
                    value={completeForm.post_bp_systolic}
                    onChange={(e) => setCompleteForm((p) => ({ ...p, post_bp_systolic: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Post BP Diastolic</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Diastolic"
                    value={completeForm.post_bp_diastolic}
                    onChange={(e) => setCompleteForm((p) => ({ ...p, post_bp_diastolic: e.target.value }))}
                  />
                </div>
              </div>

              <div className="field">
                <label className="field-label">Complications</label>
                <textarea
                  className="textarea"
                  placeholder="Any complications"
                  value={completeForm.complications}
                  onChange={(e) => setCompleteForm((p) => ({ ...p, complications: e.target.value }))}
                />
              </div>

              <div className="field">
                <label className="field-label">Nursing Notes</label>
                <textarea
                  className="textarea"
                  placeholder="Nursing notes"
                  value={completeForm.nursing_notes}
                  onChange={(e) => setCompleteForm((p) => ({ ...p, nursing_notes: e.target.value }))}
                />
              </div>

              <button type="submit" className="btn btn-success">
                <i className="bi bi-check-circle me-2"></i> Complete Session & Bill
              </button>
            </form>
          </div>
        </div>
      )}

      {session.invoice && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-receipt me-2"></i> Billing
            </h5>
          </div>
          <div className="card-body">
            <div className="text-sm text-muted">
              <i className="bi bi-info-circle me-1"></i> Invoice created — view under Billing → Invoices.
            </div>
          </div>
        </div>
      )}
    </>
  );
}