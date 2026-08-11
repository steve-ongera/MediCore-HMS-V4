import { useEffect, useState } from "react";
import { getDoctorProfiles, getDoctorTreatmentHistory } from "../../services/api";

export default function TreatmentHistoryAll() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try { const data = await getDoctorProfiles(); setDoctors(data.results ?? data); } catch (err) { setError(err.message); }
    })();
  }, []);

  const loadHistory = async (id) => {
    setSelectedDoctor(id);
    if (!id) { setHistory([]); return; }
    try { const data = await getDoctorTreatmentHistory(id); setHistory(data); } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Treatment History</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <select value={selectedDoctor} onChange={(e) => loadHistory(e.target.value)}>
        <option value="">Select a doctor</option>
        {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
      </select>

      <table>
        <thead><tr><th>Patient</th><th>Chief Complaint</th><th>Status</th><th>Started</th><th>Completed</th></tr></thead>
        <tbody>
          {history.map((h) => (
            <tr key={h.id}>
              <td>{h.patient_name}</td><td>{h.chief_complaint}</td><td>{h.status}</td>
              <td>{new Date(h.started_at).toLocaleString()}</td>
              <td>{h.completed_at ? new Date(h.completed_at).toLocaleString() : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectedDoctor && history.length === 0 && <p>No treatment history for this doctor.</p>}
    </div>
  );
}