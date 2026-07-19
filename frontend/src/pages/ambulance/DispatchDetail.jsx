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

  if (loading) return <div>Loading...</div>;
  if (!dispatch) return null;

  const isRequested = dispatch.status === "REQUESTED";
  const isDispatched = dispatch.status === "DISPATCHED";
  const isOnboard = dispatch.status === "PATIENT_ONBOARD";
  const isActive = isRequested || isDispatched || isOnboard;

  return (
    <div>
      <button type="button" onClick={() => navigate("/ambulance")}>&larr; Back</button>
      <h1>{dispatch.dispatch_number}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Patient: {dispatch.patient_display_name} {dispatch.hospital_number && `(${dispatch.hospital_number})`}</p>
        <p>Contact: {dispatch.contact_phone || "—"}</p>
        <p>Type: {dispatch.dispatch_type}</p>
        <p>Pickup: {dispatch.pickup_location} — Destination: {dispatch.destination}</p>
        <p>Ambulance: {dispatch.ambulance_registration || "Unassigned"}</p>
        <p>Status: {dispatch.status}</p>
        <p>Requested: {new Date(dispatch.requested_at).toLocaleString()}</p>
        {dispatch.dispatched_at && <p>Dispatched: {new Date(dispatch.dispatched_at).toLocaleString()}</p>}
        {dispatch.picked_up_at && <p>Patient Onboard: {new Date(dispatch.picked_up_at).toLocaleString()}</p>}
        {dispatch.completed_at && <p>Completed: {new Date(dispatch.completed_at).toLocaleString()}</p>}
        <p>Distance: {dispatch.distance_km ? `${dispatch.distance_km} km` : "—"}</p>
        <p>Estimated Fee: KES {dispatch.estimated_fee}</p>
        <p>Notes: {dispatch.notes || "—"}</p>
        {isActive && <button type="button" onClick={handleCancel}>Cancel Dispatch</button>}
      </section>

      {!dispatch.ambulance_registration && isActive && (
        <section>
          <h2>Assign Ambulance</h2>
          <form onSubmit={handleAssignAmbulance}>
            <select value={selectedAmbulance} onChange={(e) => setSelectedAmbulance(e.target.value)} required>
              <option value="">Select ambulance</option>
              {ambulances.map((a) => (
                <option key={a.id} value={a.id}>{a.registration_number} - {a.ambulance_type}</option>
              ))}
            </select>
            <button type="submit">Assign & Dispatch</button>
          </form>
        </section>
      )}

      {isActive && (
        <section>
          <h2>Assign Crew</h2>
          <form onSubmit={handleAssignCrew}>
            <select value={crewForm.user} onChange={(e) => setCrewForm((p) => ({ ...p, user: e.target.value }))} required>
              <option value="">Select staff</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
            <select value={crewForm.role} onChange={(e) => setCrewForm((p) => ({ ...p, role: e.target.value }))}>
              <option value="DRIVER">Driver</option>
              <option value="PARAMEDIC">Paramedic</option>
              <option value="NURSE">Nurse</option>
            </select>
            <button type="submit">Add Crew Member</button>
          </form>
        </section>
      )}

      <section>
        <h2>Crew on this Dispatch</h2>
        {dispatch.crew.length === 0 ? <p>No crew assigned yet.</p> : (
          <ul>
            {dispatch.crew.map((c) => <li key={c.id}>{c.user_name} — {c.role}</li>)}
          </ul>
        )}
      </section>

      {isDispatched && (
        <section>
          <h2>Mark Patient Onboard</h2>
          <button type="button" onClick={handleMarkOnboard}>Mark Patient Onboard</button>
        </section>
      )}

      {(isDispatched || isOnboard) && (
        <section>
          <h2>Complete Dispatch</h2>
          <form onSubmit={handleComplete}>
            <input type="number" placeholder="Distance traveled (km)" value={completeForm.distance_km} onChange={(e) => setCompleteForm((p) => ({ ...p, distance_km: e.target.value }))} />
            <textarea placeholder="Additional notes" value={completeForm.notes} onChange={(e) => setCompleteForm((p) => ({ ...p, notes: e.target.value }))} />
            <button type="submit">Complete & Invoice</button>
          </form>
        </section>
      )}

      {dispatch.invoice && (
        <section>
          <h2>Billing</h2>
          <p>Invoice created — view under Billing → Invoices.</p>
        </section>
      )}
    </div>
  );
}