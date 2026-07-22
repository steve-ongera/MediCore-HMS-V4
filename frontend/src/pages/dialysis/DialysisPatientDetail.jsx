import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getDialysisPatient, getAvailableDialysisMachines, scheduleDialysisSession, addAccessCheck } from "../../services/api";

export default function DialysisPatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [scheduleForm, setScheduleForm] = useState({ machine: "", scheduled_date: "" });
  const [accessForm, setAccessForm] = useState({
    check_date: new Date().toISOString().slice(0, 10), thrill_present: false, bruit_present: false,
    signs_of_infection: false, signs_of_stenosis: false, notes: "",
  });

  useEffect(() => { load(); loadMachines(); }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDialysisPatient(id);
      setProfile(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadMachines = async () => {
    try {
      const data = await getAvailableDialysisMachines();
      setMachines(data);
    } catch (err) { setError(err.message); }
  };

  const submitSchedule = async (e) => {
    e.preventDefault();
    try {
      await scheduleDialysisSession(id, {
        machine: scheduleForm.machine || undefined,
        scheduled_date: scheduleForm.scheduled_date,
      });
      setScheduleForm({ machine: "", scheduled_date: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleAccessChange = (f) => (e) => {
    const v = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setAccessForm((p) => ({ ...p, [f]: v }));
  };

  const submitAccessCheck = async (e) => {
    e.preventDefault();
    try {
      await addAccessCheck(id, accessForm);
      setAccessForm({ check_date: new Date().toISOString().slice(0, 10), thrill_present: false, bruit_present: false, signs_of_infection: false, signs_of_stenosis: false, notes: "" });
      load();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "ACTIVE": "badge-success",
      "TRANSFERRED": "badge-primary",
      "TRANSPLANTED": "badge-info",
      "DECEASED": "badge-danger",
      "DISCONTINUED": "badge-neutral",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getSessionStatusBadge = (status) => {
    const statusMap = {
      "SCHEDULED": "badge-warning",
      "IN_PROGRESS": "badge-primary",
      "COMPLETED": "badge-success",
      "CANCELLED": "badge-neutral",
      "NO_SHOW": "badge-danger",
    };
    return statusMap[status] || "badge-neutral";
  };

  const getAccessTypeBadge = (type) => {
    const typeMap = {
      "AV_FISTULA": "badge-primary",
      "AV_GRAFT": "badge-info",
      "CATHETER": "badge-warning",
    };
    return typeMap[type] || "badge-neutral";
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="spinner spinner-lg"></div>
        <span className="loading-screen__label">Loading patient details...</span>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Dialysis</div>
          <h1 className="page-title">{profile.profile_number}</h1>
          <p className="page-subtitle">{profile.patient_name}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/dialysis/patients")}>
            <i className="bi bi-arrow-left me-2"></i> Back to Patients
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
              <div className="patient-header__name">{profile.patient_name}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-hash me-1"></i> {profile.hospital_number}
                </span>
                <span>•</span>
                <span>
                  <span className={`badge ${getAccessTypeBadge(profile.vascular_access_type)}`}>
                    <span className="badge-dot"></span>
                    {profile.vascular_access_type.replace("_", " ")}
                  </span>
                </span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(profile.status)}`}>
                  <span className="badge-dot"></span>
                  {profile.status}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm text-muted">
                <i className="bi bi-calendar me-1"></i> Started: {profile.started_on}
              </span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Primary Diagnosis</div>
              <div className="info-item__value">{profile.primary_diagnosis || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Dry Weight</div>
              <div className="info-item__value">{profile.dry_weight_kg ? `${profile.dry_weight_kg} kg` : "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Sessions/Week</div>
              <div className="info-item__value">{profile.sessions_per_week}x/week</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Session Duration</div>
              <div className="info-item__value">{profile.session_duration_hours}h per session</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Dialyzer Type</div>
              <div className="info-item__value">{profile.dialyzer_type || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Anticoagulation</div>
              <div className="info-item__value">{profile.anticoagulation_protocol || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Nephrologist</div>
              <div className="info-item__value">{profile.nephrologist_name || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Access Site Notes</div>
              <div className="info-item__value">{profile.access_site_notes || "—"}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <h5 className="card-title">
            <i className="bi bi-plus-circle me-2"></i> Schedule Session
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submitSchedule}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Machine</label>
                <select className="select" value={scheduleForm.machine} onChange={(e) => setScheduleForm((p) => ({ ...p, machine: e.target.value }))}>
                  <option value="">Assign machine later</option>
                  {machines.map((m) => <option key={m.id} value={m.id}>{m.machine_number}</option>)}
                </select>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Scheduled Date & Time <span className="required">*</span></label>
                <input
                  type="datetime-local"
                  className="input"
                  value={scheduleForm.scheduled_date}
                  onChange={(e) => setScheduleForm((p) => ({ ...p, scheduled_date: e.target.value }))}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-plus-circle me-2"></i> Schedule
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "var(--space-6)" }}>
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-clock-history me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Session History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {profile.sessions.length} session{profile.sessions.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {profile.sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-clock-history"></i>
              </div>
              <h3 className="empty-state__title">No sessions scheduled</h3>
              <p className="empty-state__desc">Schedule a dialysis session using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Session #</th>
                    <th>Machine</th>
                    <th>Scheduled</th>
                    <th>Status</th>
                    <th className="cell-actions"></th>
                  </tr>
                </thead>
                <tbody>
                  {profile.sessions.map((s) => (
                    <tr key={s.id}>
                      <td className="cell-mono">{s.session_number}</td>
                      <td>{s.machine_number || "—"}</td>
                      <td>{new Date(s.scheduled_date).toLocaleString()}</td>
                      <td>
                        <span className={`badge ${getSessionStatusBadge(s.status)}`}>
                          <span className="badge-dot"></span>
                          {s.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="cell-actions">
                        <Link to={`/dialysis/sessions/${s.id}`} className="btn btn-secondary btn-sm">
                          <i className="bi bi-eye me-1"></i> View
                        </Link>
                      </td>
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
            <i className="bi bi-plus-circle me-2"></i> Vascular Access Check
          </h5>
        </div>
        <div className="card-body">
          <form onSubmit={submitAccessCheck}>
            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label">Check Date <span className="required">*</span></label>
                <input
                  type="date"
                  className="input"
                  value={accessForm.check_date}
                  onChange={handleAccessChange("check_date")}
                  required
                />
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    className="input"
                    style={{ width: "auto", margin: 0 }}
                    checked={accessForm.thrill_present}
                    onChange={handleAccessChange("thrill_present")}
                  />
                  <span>Thrill Present</span>
                </label>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    className="input"
                    style={{ width: "auto", margin: 0 }}
                    checked={accessForm.bruit_present}
                    onChange={handleAccessChange("bruit_present")}
                  />
                  <span>Bruit Present</span>
                </label>
              </div>
            </div>

            <div className="field-row">
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    className="input"
                    style={{ width: "auto", margin: 0 }}
                    checked={accessForm.signs_of_infection}
                    onChange={handleAccessChange("signs_of_infection")}
                  />
                  <span>Signs of Infection</span>
                </label>
              </div>
              <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                <label className="field-label" style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    className="input"
                    style={{ width: "auto", margin: 0 }}
                    checked={accessForm.signs_of_stenosis}
                    onChange={handleAccessChange("signs_of_stenosis")}
                  />
                  <span>Signs of Stenosis</span>
                </label>
              </div>
            </div>

            <div className="field">
              <label className="field-label">Notes</label>
              <textarea
                className="textarea"
                placeholder="Additional notes"
                value={accessForm.notes}
                onChange={handleAccessChange("notes")}
              />
            </div>

            <button type="submit" className="btn btn-primary">
              <i className="bi bi-save me-2"></i> Save Access Check
            </button>
          </form>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <div className="flex items-center gap-3 flex-wrap">
            <i className="bi bi-list-ul me-1"></i>
            <h5 className="card-title" style={{ marginBottom: 0 }}>Access Check History</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {profile.access_checks.length} check{profile.access_checks.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body p-0">
          {profile.access_checks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-list-ul"></i>
              </div>
              <h3 className="empty-state__title">No access checks recorded</h3>
              <p className="empty-state__desc">Record a vascular access check using the form above.</p>
            </div>
          ) : (
            <div className="table-scroll">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Thrill</th>
                    <th>Bruit</th>
                    <th>Infection</th>
                    <th>Stenosis</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {profile.access_checks.map((c) => (
                    <tr key={c.id}>
                      <td>{c.check_date}</td>
                      <td>
                        <span className={`badge ${c.thrill_present ? "badge-success" : "badge-neutral"}`}>
                          <span className="badge-dot"></span>
                          {c.thrill_present ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${c.bruit_present ? "badge-success" : "badge-neutral"}`}>
                          <span className="badge-dot"></span>
                          {c.bruit_present ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${c.signs_of_infection ? "badge-danger" : "badge-success"}`}>
                          <span className="badge-dot"></span>
                          {c.signs_of_infection ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${c.signs_of_stenosis ? "badge-warning" : "badge-success"}`}>
                          <span className="badge-dot"></span>
                          {c.signs_of_stenosis ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>{c.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {profile.access_checks.length > 0 && (
          <div className="card-footer">
            <span className="text-tertiary text-sm">
              Showing {profile.access_checks.length} access check{profile.access_checks.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </>
  );
}