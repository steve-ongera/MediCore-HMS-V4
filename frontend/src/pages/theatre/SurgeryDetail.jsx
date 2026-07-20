import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getSurgery, markIncision, markClosure, getUsers, assignSurgicalTeamMember,
  getMedicines, recordConsumable, addPostOpNote, completeSurgery,
} from "../../services/api";

export default function SurgeryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [surgery, setSurgery] = useState(null);
  const [users, setUsers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [teamForm, setTeamForm] = useState({ user: "", role: "ASSISTANT_SURGEON", fee: "" });
  const [consumableForm, setConsumableForm] = useState({ medicine: "", quantity: "1" });
  const [postOpForm, setPostOpForm] = useState({
    bp_systolic: "", bp_diastolic: "", pulse_bpm: "", oxygen_saturation: "",
    consciousness_level: "", pain_score: "", notes: "",
  });
  const [completeForm, setCompleteForm] = useState({
    outcome: "SUCCESSFUL", operative_notes: "", complications: "", estimated_blood_loss_ml: "",
  });

  useEffect(() => { load(); loadUsers(); loadMedicines(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getSurgery(id);
      setSurgery(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const loadMedicines = async () => {
    try {
      const data = await getMedicines({ page_size: 200 });
      setMedicines(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleMarkIncision = async () => {
    try { await markIncision(id); load(); } catch (err) { setError(err.message); }
  };

  const handleMarkClosure = async () => {
    try { await markClosure(id); load(); } catch (err) { setError(err.message); }
  };

  const submitTeam = async (e) => {
    e.preventDefault();
    try {
      await assignSurgicalTeamMember(id, { ...teamForm, fee: teamForm.fee || 0 });
      setTeamForm({ user: "", role: "ASSISTANT_SURGEON", fee: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitConsumable = async (e) => {
    e.preventDefault();
    try {
      await recordConsumable(id, { medicine: consumableForm.medicine, quantity: Number(consumableForm.quantity) });
      setConsumableForm({ medicine: "", quantity: "1" });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitPostOp = async (e) => {
    e.preventDefault();
    try {
      await addPostOpNote(id, postOpForm);
      setPostOpForm({ bp_systolic: "", bp_diastolic: "", pulse_bpm: "", oxygen_saturation: "", consciousness_level: "", pain_score: "", notes: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const submitComplete = async (e) => {
    e.preventDefault();
    if (!window.confirm("Complete this surgery? This closes the theatre and finalizes billing.")) return;
    try {
      await completeSurgery(id, {
        ...completeForm,
        estimated_blood_loss_ml: completeForm.estimated_blood_loss_ml || undefined,
      });
      load();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "SCHEDULED": "badge-warning",
      "IN_PROGRESS": "badge-primary",
      "COMPLETED": "badge-success",
      "CANCELLED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getOutcomeBadge = (outcome) => {
    const outcomeMap = {
      "SUCCESSFUL": "badge-success",
      "COMPLICATIONS": "badge-warning",
      "DECEASED": "badge-danger",
    };
    return outcomeMap[outcome] || "badge-neutral";
  };

  const getRoleBadge = (role) => {
    const roleMap = {
      "PRIMARY_SURGEON": "badge-primary",
      "ASSISTANT_SURGEON": "badge-info",
      "ANESTHETIST": "badge-warning",
      "SCRUB_NURSE": "badge-success",
      "CIRCULATING_NURSE": "badge-info",
      "OTHER": "badge-neutral",
    };
    return roleMap[role] || "badge-neutral";
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return "KES 0.00";
    return `KES ${Number(amount).toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading surgery details...</span>
      </div>
    );
  }

  if (!surgery) return null;

  const isActive = surgery.status === "IN_PROGRESS";

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Theatre Management</div>
          <h1 className="page-title">{surgery.patient_name}</h1>
          <p className="page-subtitle">{surgery.procedure_name}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/theatre")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Board
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
              <i className="bi bi-scissors fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{surgery.patient_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-activity me-1"></i> {surgery.procedure_name}
                </span>
                <span>•</span>
                <span>Theatre: {surgery.theatre_number}</span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(surgery.status)}`}>
                  <span className="badge-dot"></span>
                  {surgery.status.replace("_", " ")}
                </span>
                {surgery.outcome && (
                  <span className={`badge ${getOutcomeBadge(surgery.outcome)}`}>
                    <span className="badge-dot"></span>
                    {surgery.outcome}
                  </span>
                )}
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-clock me-1"></i> {surgery.duration_hours} hrs
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Status</div>
              <div className="info-item__value">
                <span className={`badge ${getStatusBadge(surgery.status)}`}>
                  <span className="badge-dot"></span>
                  {surgery.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Theatre In</div>
              <div className="info-item__value">{new Date(surgery.theatre_in_at).toLocaleString()}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Incision</div>
              <div className="info-item__value">{surgery.incision_at ? new Date(surgery.incision_at).toLocaleString() : "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Closure</div>
              <div className="info-item__value">{surgery.closure_at ? new Date(surgery.closure_at).toLocaleString() : "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Theatre Out</div>
              <div className="info-item__value">{surgery.theatre_out_at ? new Date(surgery.theatre_out_at).toLocaleString() : "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Duration</div>
              <div className="info-item__value">{surgery.duration_hours} hrs</div>
            </div>
            <div className="info-item" style={{ gridColumn: "span 2" }}>
              <div className="info-item__label">Operative Notes</div>
              <div className="info-item__value">{surgery.operative_notes || "—"}</div>
            </div>
            {surgery.complications && (
              <div className="info-item" style={{ gridColumn: "span 2" }}>
                <div className="info-item__label">Complications</div>
                <div className="info-item__value" style={{ color: "var(--danger)" }}>{surgery.complications}</div>
              </div>
            )}
            {surgery.estimated_blood_loss_ml && (
              <div className="info-item">
                <div className="info-item__label">Estimated Blood Loss</div>
                <div className="info-item__value">{surgery.estimated_blood_loss_ml} ml</div>
              </div>
            )}
          </div>

          {isActive && (
            <div className="flex gap-3 flex-wrap" style={{ marginTop: "var(--space-3)" }}>
              {!surgery.incision_at && (
                <button className="btn btn-primary" onClick={handleMarkIncision}>
                  <i className="bi bi-scissors me-2"></i> Mark Incision
                </button>
              )}
              {surgery.incision_at && !surgery.closure_at && (
                <button className="btn btn-warning" onClick={handleMarkClosure}>
                  <i className="bi bi-check-circle me-2"></i> Mark Closure
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {isActive && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-person-plus me-2"></i> Assign Team Member
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitTeam}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Staff <span className="required">*</span></label>
                  <select className="select" value={teamForm.user} onChange={(e) => setTeamForm((p) => ({ ...p, user: e.target.value }))} required>
                    <option value="">Select staff</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Role <span className="required">*</span></label>
                  <select className="select" value={teamForm.role} onChange={(e) => setTeamForm((p) => ({ ...p, role: e.target.value }))}>
                    <option value="PRIMARY_SURGEON">Primary Surgeon</option>
                    <option value="ASSISTANT_SURGEON">Assistant Surgeon</option>
                    <option value="ANESTHETIST">Anesthetist</option>
                    <option value="SCRUB_NURSE">Scrub Nurse</option>
                    <option value="CIRCULATING_NURSE">Circulating Nurse</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 0.7 }}>
                  <label className="field-label">Fee</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Fee"
                    value={teamForm.fee}
                    onChange={(e) => setTeamForm((p) => ({ ...p, fee: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-person-plus me-2"></i> Add to Team
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
            <i className="bi bi-people me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Surgical Team</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {surgery.team.length} member{surgery.team.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body">
          {surgery.team.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-people"></i>
              </div>
              <h3 className="empty-state__title">No team members assigned</h3>
              <p className="empty-state__desc">Assign team members using the form above.</p>
            </div>
          ) : (
            <div className="rx-list">
              {surgery.team.map((m) => (
                <div key={m.id} className="rx-item">
                  <div>
                    <div className="rx-item__name">{m.user_name}</div>
                    <div className="rx-item__detail">
                      <span className={`badge ${getRoleBadge(m.role)}`}>
                        <span className="badge-dot"></span>
                        {m.role.replace("_", " ")}
                      </span>
                      {m.fee > 0 && <span className="text-2xs text-tertiary"> • Fee: {formatCurrency(m.fee)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isActive && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-plus-circle me-2"></i> Record Consumable Used
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitConsumable}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Medicine <span className="required">*</span></label>
                  <select className="select" value={consumableForm.medicine} onChange={(e) => setConsumableForm((p) => ({ ...p, medicine: e.target.value }))} required>
                    <option value="">Select medicine</option>
                    {medicines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 0.5 }}>
                  <label className="field-label">Quantity <span className="required">*</span></label>
                  <input
                    type="number"
                    className="input"
                    min="1"
                    value={consumableForm.quantity}
                    onChange={(e) => setConsumableForm((p) => ({ ...p, quantity: e.target.value }))}
                    required
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-plus-circle me-2"></i> Record Usage
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
            <i className="bi bi-capsule me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Consumables Used</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {surgery.consumables_used.length} item{surgery.consumables_used.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body">
          {surgery.consumables_used.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-capsule"></i>
              </div>
              <h3 className="empty-state__title">No consumables recorded</h3>
              <p className="empty-state__desc">Record consumables used during the surgery above.</p>
            </div>
          ) : (
            <div className="rx-list">
              {surgery.consumables_used.map((c) => (
                <div key={c.id} className="rx-item">
                  <div>
                    <div className="rx-item__name">{c.medicine_name}</div>
                    <div className="rx-item__detail">Quantity: {c.quantity}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isActive && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-plus-circle me-2"></i> Add Post-Op Note
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitPostOp}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">BP Systolic</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Systolic"
                    value={postOpForm.bp_systolic}
                    onChange={(e) => setPostOpForm((p) => ({ ...p, bp_systolic: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">BP Diastolic</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Diastolic"
                    value={postOpForm.bp_diastolic}
                    onChange={(e) => setPostOpForm((p) => ({ ...p, bp_diastolic: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Pulse</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Pulse"
                    value={postOpForm.pulse_bpm}
                    onChange={(e) => setPostOpForm((p) => ({ ...p, pulse_bpm: e.target.value }))}
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">SpO2 (%)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="SpO2"
                    value={postOpForm.oxygen_saturation}
                    onChange={(e) => setPostOpForm((p) => ({ ...p, oxygen_saturation: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Consciousness Level</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Level"
                    value={postOpForm.consciousness_level}
                    onChange={(e) => setPostOpForm((p) => ({ ...p, consciousness_level: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Pain Score (0-10)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Pain score"
                    value={postOpForm.pain_score}
                    onChange={(e) => setPostOpForm((p) => ({ ...p, pain_score: e.target.value }))}
                  />
                </div>
              </div>
              <div className="field">
                <label className="field-label">Notes</label>
                <textarea
                  className="textarea"
                  placeholder="Post-op notes"
                  value={postOpForm.notes}
                  onChange={(e) => setPostOpForm((p) => ({ ...p, notes: e.target.value }))}
                />
              </div>
              <button type="submit" className="btn btn-primary">
                <i className="bi bi-floppy me-2"></i> Save Note
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Post-Op Notes History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {surgery.post_op_notes.length} note{surgery.post_op_notes.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {surgery.post_op_notes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No post-op notes</h3>
              <p className="empty-state__desc">Add post-op notes above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th className="cell-numeric">BP</th>
                    <th className="cell-numeric">Pulse</th>
                    <th className="cell-numeric">SpO2</th>
                    <th className="cell-numeric">Pain</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {surgery.post_op_notes.map((n) => (
                    <tr key={n.id}>
                      <td>{new Date(n.recorded_at).toLocaleString()}</td>
                      <td className="cell-numeric">{n.bp_systolic}/{n.bp_diastolic}</td>
                      <td className="cell-numeric">{n.pulse_bpm}</td>
                      <td className="cell-numeric">{n.oxygen_saturation}%</td>
                      <td className="cell-numeric">{n.pain_score}</td>
                      <td>{n.notes}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {isActive && (
        <div className="card">
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-check-circle me-2"></i> Complete Surgery
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={submitComplete}>
              <div className="field">
                <label className="field-label">Outcome <span className="required">*</span></label>
                <select className="select" value={completeForm.outcome} onChange={(e) => setCompleteForm((p) => ({ ...p, outcome: e.target.value }))}>
                  <option value="SUCCESSFUL">Successful</option>
                  <option value="COMPLICATIONS">Completed with Complications</option>
                  <option value="DECEASED">Patient Deceased</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label">Operative Notes</label>
                <textarea
                  className="textarea"
                  placeholder="Operative notes"
                  value={completeForm.operative_notes}
                  onChange={(e) => setCompleteForm((p) => ({ ...p, operative_notes: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label">Complications</label>
                <textarea
                  className="textarea"
                  placeholder="Complications"
                  value={completeForm.complications}
                  onChange={(e) => setCompleteForm((p) => ({ ...p, complications: e.target.value }))}
                />
              </div>
              <div className="field">
                <label className="field-label">Estimated Blood Loss (ml)</label>
                <input
                  type="number"
                  className="input"
                  placeholder="Blood loss in ml"
                  value={completeForm.estimated_blood_loss_ml}
                  onChange={(e) => setCompleteForm((p) => ({ ...p, estimated_blood_loss_ml: e.target.value }))}
                />
              </div>
              <button type="submit" className="btn btn-success">
                <i className="bi bi-check-circle me-2"></i> Complete Surgery & Finalize Billing
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}