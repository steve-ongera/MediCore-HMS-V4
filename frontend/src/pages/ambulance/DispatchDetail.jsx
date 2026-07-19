import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getDispatch, getAvailableAmbulances, getUsers,
  assignAmbulanceToDispatch, assignCrewToDispatch, markPatientOnboard,
  completeDispatch, cancelDispatch,
} from "../../services/api";

export default function DispatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [dispatch, setDispatch] = useState(null);
  const [ambulances, setAmbulances] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedAmbulance, setSelectedAmbulance] = useState("");
  const [crewForm, setCrewForm] = useState({ user: "", role: "DRIVER" });
  const [completeForm, setCompleteForm] = useState({ distance_km: "", notes: "" });

  useEffect(() => {
    load();
    loadAmbulances();
    loadUsers();
  }, [id]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getDispatch(id);
      setDispatch(data);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const loadAmbulances = async () => {
    try {
      const data = await getAvailableAmbulances();
      setAmbulances(data);
    } catch (err) { setError(err.message); }
  };

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleAssignAmbulance = async (e) => {
    e.preventDefault();
    if (!selectedAmbulance) return;
    try {
      await assignAmbulanceToDispatch(id, { ambulance: selectedAmbulance });
      setSelectedAmbulance("");
      load();
    } catch (err) { setError(err.message); }
  };

  const handleAssignCrew = async (e) => {
    e.preventDefault();
    try {
      await assignCrewToDispatch(id, crewForm);
      setCrewForm({ user: "", role: "DRIVER" });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleMarkOnboard = async () => {
    try {
      await markPatientOnboard(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    try {
      await completeDispatch(id, {
        distance_km: completeForm.distance_km || undefined,
        notes: completeForm.notes || undefined,
      });
      load();
    } catch (err) { setError(err.message); }
  };

  const handleCancel = async () => {
    if (!window.confirm("Cancel this dispatch?")) return;
    try {
      await cancelDispatch(id);
      load();
    } catch (err) { setError(err.message); }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      "REQUESTED": "badge-warning",
      "DISPATCHED": "badge-primary",
      "PATIENT_ONBOARD": "badge-info",
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
        <span className="loading-screen__label">Loading dispatch details...</span>
      </div>
    );
  }

  if (!dispatch) return null;

  const isRequested = dispatch.status === "REQUESTED";
  const isDispatched = dispatch.status === "DISPATCHED";
  const isOnboard = dispatch.status === "PATIENT_ONBOARD";
  const isActive = isRequested || isDispatched || isOnboard;

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-eyebrow">Ambulance Services</div>
          <h1 className="page-title">{dispatch.dispatch_number}</h1>
          <p className="page-subtitle">{dispatch.patient_display_name}</p>
        </div>
        <div className="page-header__actions">
          <button className="btn btn-secondary" onClick={() => navigate("/ambulance")}>
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
              <i className="bi bi-truck fs-2xl"></i>
            </div>
            <div className="patient-header__meta">
              <div className="patient-header__name">{dispatch.dispatch_number}</div>
              <div className="patient-header__sub">
                <span className="patient-header__id">
                  <i className="bi bi-person me-1"></i> {dispatch.patient_display_name}
                </span>
                <span>•</span>
                <span className={`badge ${getStatusBadge(dispatch.status)}`}>
                  <span className="badge-dot"></span>
                  {dispatch.status.replace("_", " ")}
                </span>
              </div>
            </div>
            <div className="patient-header__actions">
              <span className="text-sm font-bold">{formatCurrency(dispatch.estimated_fee)}</span>
            </div>
          </div>

          <div className="info-grid">
            <div className="info-item">
              <div className="info-item__label">Patient</div>
              <div className="info-item__value">
                {dispatch.patient_display_name}
                {dispatch.hospital_number && <div className="text-2xs text-tertiary">{dispatch.hospital_number}</div>}
              </div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Contact</div>
              <div className="info-item__value">{dispatch.contact_phone || "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Dispatch Type</div>
              <div className="info-item__value">{dispatch.dispatch_type}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Ambulance</div>
              <div className="info-item__value">{dispatch.ambulance_registration || "Unassigned"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Pickup Location</div>
              <div className="info-item__value">{dispatch.pickup_location}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Destination</div>
              <div className="info-item__value">{dispatch.destination}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Requested</div>
              <div className="info-item__value">{new Date(dispatch.requested_at).toLocaleString()}</div>
            </div>
            {dispatch.dispatched_at && (
              <div className="info-item">
                <div className="info-item__label">Dispatched</div>
                <div className="info-item__value">{new Date(dispatch.dispatched_at).toLocaleString()}</div>
              </div>
            )}
            {dispatch.picked_up_at && (
              <div className="info-item">
                <div className="info-item__label">Patient Onboard</div>
                <div className="info-item__value">{new Date(dispatch.picked_up_at).toLocaleString()}</div>
              </div>
            )}
            {dispatch.completed_at && (
              <div className="info-item">
                <div className="info-item__label">Completed</div>
                <div className="info-item__value">{new Date(dispatch.completed_at).toLocaleString()}</div>
              </div>
            )}
            <div className="info-item">
              <div className="info-item__label">Distance</div>
              <div className="info-item__value">{dispatch.distance_km ? `${dispatch.distance_km} km` : "—"}</div>
            </div>
            <div className="info-item">
              <div className="info-item__label">Estimated Fee</div>
              <div className="info-item__value font-bold">{formatCurrency(dispatch.estimated_fee)}</div>
            </div>
          </div>

          {dispatch.notes && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <div className="text-sm text-muted">Notes</div>
              <div className="diagnosis-chip">
                <span className="diagnosis-chip__code">📝</span>
                {dispatch.notes}
              </div>
            </div>
          )}

          {isActive && (
            <div style={{ marginTop: "var(--space-3)" }}>
              <button className="btn btn-danger" onClick={handleCancel}>
                <i className="bi bi-x-circle me-2"></i> Cancel Dispatch
              </button>
            </div>
          )}
        </div>
      </div>

      {!dispatch.ambulance_registration && isActive && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-truck me-2"></i> Assign Ambulance
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleAssignAmbulance}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Ambulance <span className="required">*</span></label>
                  <select className="select" value={selectedAmbulance} onChange={(e) => setSelectedAmbulance(e.target.value)} required>
                    <option value="">Select ambulance</option>
                    {ambulances.map((a) => (
                      <option key={a.id} value={a.id}>{a.registration_number} - {a.ambulance_type}</option>
                    ))}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-truck me-2"></i> Assign & Dispatch
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {isActive && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-people me-2"></i> Assign Crew
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleAssignCrew}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Staff <span className="required">*</span></label>
                  <select className="select" value={crewForm.user} onChange={(e) => setCrewForm((p) => ({ ...p, user: e.target.value }))} required>
                    <option value="">Select staff</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Role <span className="required">*</span></label>
                  <select className="select" value={crewForm.role} onChange={(e) => setCrewForm((p) => ({ ...p, role: e.target.value }))}>
                    <option value="DRIVER">Driver</option>
                    <option value="PARAMEDIC">Paramedic</option>
                    <option value="NURSE">Nurse</option>
                  </select>
                </div>
                <div className="field" style={{ marginBottom: 0, display: "flex", alignItems: "flex-end" }}>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-person-plus me-2"></i> Add Crew Member
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
            <h5 className="card-title" style={{ marginBottom: 0 }}>Crew on this Dispatch</h5>
          </div>
          <div>
            <span className="text-tertiary text-sm">
              {dispatch.crew.length} crew member{dispatch.crew.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
        <div className="card-body">
          {dispatch.crew.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__icon">
                <i className="bi bi-people"></i>
              </div>
              <h3 className="empty-state__title">No crew assigned</h3>
              <p className="empty-state__desc">Assign crew members to this dispatch above.</p>
            </div>
          ) : (
            <div className="rx-list">
              {dispatch.crew.map((c) => (
                <div key={c.id} className="rx-item">
                  <div>
                    <div className="rx-item__name">{c.user_name}</div>
                    <div className="rx-item__detail">{c.role}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isDispatched && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-person-walking me-2"></i> Mark Patient Onboard
            </h5>
          </div>
          <div className="card-body">
            <button className="btn btn-primary" onClick={handleMarkOnboard}>
              <i className="bi bi-check-circle me-2"></i> Mark Patient Onboard
            </button>
          </div>
        </div>
      )}

      {(isDispatched || isOnboard) && (
        <div className="card" style={{ marginBottom: "var(--space-6)" }}>
          <div className="card-header">
            <h5 className="card-title">
              <i className="bi bi-check-circle me-2"></i> Complete Dispatch
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleComplete}>
              <div className="field-row">
                <div className="field" style={{ marginBottom: 0, flex: 1 }}>
                  <label className="field-label">Distance Traveled (km)</label>
                  <input
                    type="number"
                    className="input"
                    placeholder="Distance in km"
                    value={completeForm.distance_km}
                    onChange={(e) => setCompleteForm((p) => ({ ...p, distance_km: e.target.value }))}
                  />
                </div>
                <div className="field" style={{ marginBottom: 0, flex: 2 }}>
                  <label className="field-label">Additional Notes</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="Completion notes"
                    value={completeForm.notes}
                    onChange={(e) => setCompleteForm((p) => ({ ...p, notes: e.target.value }))}
                  />
                </div>
              </div>
              <button type="submit" className="btn btn-success">
                <i className="bi bi-check-circle me-2"></i> Complete & Invoice
              </button>
            </form>
          </div>
        </div>
      )}

      {dispatch.invoice && (
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