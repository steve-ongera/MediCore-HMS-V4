import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getActiveDispatches, getAmbulances } from "../../services/api";

export default function AmbulanceDispatchBoard() {
  const [dispatches, setDispatches] = useState([]);
  const [ambulances, setAmbulances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [dispatchData, ambulanceData] = await Promise.all([
        getActiveDispatches(),
        getAmbulances(),
      ]);
      setDispatches(dispatchData);
      setAmbulances(ambulanceData.results ?? ambulanceData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Ambulance Dispatch Board</h1>
      {error && <p>Error: {error}</p>}
      <Link to="/ambulance/request"><button type="button">+ Request Dispatch</button></Link>{" "}
      <button type="button" onClick={load}>Refresh</button>

      <h2>Fleet Status</h2>
      <table>
        <thead><tr><th>Registration</th><th>Type</th><th>Status</th><th>Location</th><th>Active Dispatch</th></tr></thead>
        <tbody>
          {ambulances.map((a) => (
            <tr key={a.id}>
              <td>{a.registration_number}</td><td>{a.ambulance_type}</td><td>{a.status}</td>
              <td>{a.current_location || "—"}</td>
              <td>
                {a.active_dispatch ? (
                  <Link to={`/ambulance/${a.active_dispatch.dispatch_id}`}>
                    {a.active_dispatch.dispatch_number} - {a.active_dispatch.patient_name}
                  </Link>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Active Dispatches</h2>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Dispatch #</th><th>Patient</th><th>Ambulance</th><th>Type</th>
              <th>Status</th><th>Pickup</th><th>Destination</th><th>Requested</th><th></th>
            </tr>
          </thead>
          <tbody>
            {dispatches.map((d) => (
              <tr key={d.id}>
                <td>{d.dispatch_number}</td><td>{d.patient_display_name}</td>
                <td>{d.ambulance_registration || "Unassigned"}</td><td>{d.dispatch_type}</td>
                <td>{d.status}</td><td>{d.pickup_location}</td><td>{d.destination}</td>
                <td>{new Date(d.requested_at).toLocaleString()}</td>
                <td><Link to={`/ambulance/${d.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && dispatches.length === 0 && <p>No active dispatches.</p>}
    </div>
  );
}