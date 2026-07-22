import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getICUBeds, getActiveICUAdmissions } from "../../services/api";

export default function ICUBoard() {
  const [beds, setBeds] = useState([]);
  const [admissions, setAdmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [b, a] = await Promise.all([getICUBeds(), getActiveICUAdmissions()]);
      setBeds(b.results ?? b);
      setAdmissions(a);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div>
      <h1>ICU / HDU Board</h1>
      {error && <p>Error: {error}</p>}
      <Link to="/icu/admit"><button type="button">+ Admit to ICU</button></Link>{" "}
      <button type="button" onClick={load}>Refresh</button>

      <h2>Beds</h2>
      <table>
        <thead><tr><th>Bed</th><th>Unit Type</th><th>Daily Rate</th><th>Ventilator</th><th>Status</th><th>Current Patient</th></tr></thead>
        <tbody>
          {beds.map((b) => (
            <tr key={b.id}>
              <td>{b.bed_number}</td><td>{b.unit_type}</td><td>KES {b.daily_rate}</td>
              <td>{b.has_ventilator ? "Yes" : "No"}</td><td>{b.status}</td>
              <td>
                {b.current_patient ? (
                  <Link to={`/icu/${b.current_patient.icu_admission_id}`}>{b.current_patient.patient_name}</Link>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Active ICU/HDU Admissions</h2>
      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Admission #</th><th>Patient</th><th>Bed</th><th>Reason</th><th>Severity Score</th><th>LOS (days)</th><th></th></tr></thead>
          <tbody>
            {admissions.map((a) => (
              <tr key={a.id}>
                <td>{a.icu_admission_number}</td><td>{a.patient_name}</td>
                <td>{a.bed_number} ({a.unit_type})</td><td>{a.admission_reason}</td>
                <td>{a.severity_score ?? "—"}</td><td>{a.length_of_stay_days}</td>
                <td><Link to={`/icu/${a.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && admissions.length === 0 && <p>No active ICU/HDU admissions.</p>}
    </div>
  );
}