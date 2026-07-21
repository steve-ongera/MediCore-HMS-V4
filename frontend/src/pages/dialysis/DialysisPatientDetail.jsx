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

  if (loading) return <div>Loading...</div>;
  if (!profile) return null;

  return (
    <div>
      <button type="button" onClick={() => navigate("/dialysis/patients")}>&larr; Back</button>
      <h1>{profile.profile_number} — {profile.patient_name}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Hospital #: {profile.hospital_number}</p>
        <p>Primary Diagnosis: {profile.primary_diagnosis || "—"}</p>
        <p>Dry Weight: {profile.dry_weight_kg ? `${profile.dry_weight_kg} kg` : "—"}</p>
        <p>Vascular Access: {profile.vascular_access_type} — {profile.access_site_notes || "—"}</p>
        <p>Prescription: {profile.sessions_per_week}x/week, {profile.session_duration_hours}h per session</p>
        <p>Dialyzer: {profile.dialyzer_type || "—"} — Anticoagulation: {profile.anticoagulation_protocol || "—"}</p>
        <p>Nephrologist: {profile.nephrologist_name || "—"}</p>
        <p>Started: {profile.started_on} — Status: {profile.status}</p>
      </section>

      <section>
        <h2>Schedule Session</h2>
        <form onSubmit={submitSchedule}>
          <select value={scheduleForm.machine} onChange={(e) => setScheduleForm((p) => ({ ...p, machine: e.target.value }))}>
            <option value="">Assign machine later</option>
            {machines.map((m) => <option key={m.id} value={m.id}>{m.machine_number}</option>)}
          </select>
          <input type="datetime-local" value={scheduleForm.scheduled_date} onChange={(e) => setScheduleForm((p) => ({ ...p, scheduled_date: e.target.value }))} required />
          <button type="submit">Schedule Session</button>
        </form>
      </section>

      <section>
        <h2>Session History</h2>
        <table>
          <thead><tr><th>Session #</th><th>Machine</th><th>Scheduled</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {profile.sessions.map((s) => (
              <tr key={s.id}>
                <td>{s.session_number}</td><td>{s.machine_number || "—"}</td>
                <td>{new Date(s.scheduled_date).toLocaleString()}</td><td>{s.status}</td>
                <td><Link to={`/dialysis/sessions/${s.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {profile.sessions.length === 0 && <p>No sessions scheduled yet.</p>}
      </section>

      <section>
        <h2>Vascular Access Check</h2>
        <form onSubmit={submitAccessCheck}>
          <input type="date" value={accessForm.check_date} onChange={handleAccessChange("check_date")} required />
          <label><input type="checkbox" checked={accessForm.thrill_present} onChange={handleAccessChange("thrill_present")} /> Thrill Present</label>
          <label><input type="checkbox" checked={accessForm.bruit_present} onChange={handleAccessChange("bruit_present")} /> Bruit Present</label>
          <label><input type="checkbox" checked={accessForm.signs_of_infection} onChange={handleAccessChange("signs_of_infection")} /> Signs of Infection</label>
          <label><input type="checkbox" checked={accessForm.signs_of_stenosis} onChange={handleAccessChange("signs_of_stenosis")} /> Signs of Stenosis</label>
          <textarea placeholder="Notes" value={accessForm.notes} onChange={handleAccessChange("notes")} />
          <button type="submit">Save Access Check</button>
        </form>
      </section>

      <section>
        <h2>Access Check History</h2>
        <table>
          <thead><tr><th>Date</th><th>Thrill</th><th>Bruit</th><th>Infection</th><th>Stenosis</th><th>Notes</th></tr></thead>
          <tbody>
            {profile.access_checks.map((c) => (
              <tr key={c.id}>
                <td>{c.check_date}</td><td>{c.thrill_present ? "Yes" : "No"}</td>
                <td>{c.bruit_present ? "Yes" : "No"}</td><td>{c.signs_of_infection ? "Yes" : "No"}</td>
                <td>{c.signs_of_stenosis ? "Yes" : "No"}</td><td>{c.notes || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {profile.access_checks.length === 0 && <p>No access checks recorded.</p>}
      </section>
    </div>
  );
}