import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getActiveEmergencyVisits } from "../../services/api";

export default function EmergencyBoard() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getActiveEmergencyVisits();
      setVisits(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Emergency Department Board</h1>
      {error && <p>Error: {error}</p>}
      <Link to="/emergency/register"><button type="button">+ Register Emergency</button></Link>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Visit #</th>
              <th>Patient</th>
              <th>Bay</th>
              <th>Triage</th>
              <th>Arrival Mode</th>
              <th>Duration (hrs)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visits.map((v) => (
              <tr key={v.id}>
                <td>{v.visit_number}</td>
                <td>{v.patient_name}</td>
                <td>{v.bay_number || "—"}</td>
                <td>{v.triage_level || "—"}</td>
                <td>{v.arrival_mode}</td>
                <td>{v.duration_hours}</td>
                <td><Link to={`/emergency/${v.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && visits.length === 0 && <p>No active emergency patients.</p>}
    </div>
  );
}