import { useEffect, useState } from "react";
import { getDoctorProfiles, getDoctorVisits } from "../../services/api";

export default function DoctorVisitsAll() {
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [visits, setVisits] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try { const data = await getDoctorProfiles(); setDoctors(data.results ?? data); } catch (err) { setError(err.message); }
    })();
  }, []);

  const loadVisits = async (id) => {
    setSelectedDoctor(id);
    if (!id) { setVisits([]); return; }
    try { const data = await getDoctorVisits(id); setVisits(data); } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>Doctor Visits</h1>
      {error && <p style={{ color: "red" }}>Error: {error}</p>}
      <select value={selectedDoctor} onChange={(e) => loadVisits(e.target.value)}>
        <option value="">Select a doctor</option>
        {doctors.map((d) => <option key={d.id} value={d.id}>Dr. {d.full_name}</option>)}
      </select>

      <table>
        <thead><tr><th>Visit #</th><th>Patient</th><th>Department</th><th>Status</th><th>Date</th></tr></thead>
        <tbody>
          {visits.map((v) => (
            <tr key={v.id}>
              <td>{v.visit_number}</td><td>{v.patient_name}</td><td>{v.department_name || "—"}</td>
              <td>{v.status}</td><td>{new Date(v.visit_date).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {selectedDoctor && visits.length === 0 && <p>No visits found for this doctor.</p>}
    </div>
  );
}