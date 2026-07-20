import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOperatingTheatres, getUpcomingBookings, getInProgressSurgeries } from "../../services/api";

export default function TheatreBoard() {
  const [theatres, setTheatres] = useState([]);
  const [upcoming, setUpcoming] = useState([]);
  const [inProgress, setInProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [t, u, s] = await Promise.all([
        getOperatingTheatres(), getUpcomingBookings(), getInProgressSurgeries(),
      ]);
      setTheatres(t.results ?? t);
      setUpcoming(u);
      setInProgress(s);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  return (
    <div>
      <h1>Theatre Board</h1>
      {error && <p>Error: {error}</p>}
      <Link to="/theatre/book"><button type="button">+ Book Surgery</button></Link>{" "}
      <button type="button" onClick={load}>Refresh</button>

      <h2>Theatres</h2>
      <table>
        <thead><tr><th>Theatre</th><th>Hourly Rate</th><th>Status</th><th>Active Surgery</th></tr></thead>
        <tbody>
          {theatres.map((t) => (
            <tr key={t.id}>
              <td>{t.theatre_number}</td><td>KES {t.hourly_rate}</td><td>{t.status}</td>
              <td>
                {t.active_surgery ? (
                  <Link to={`/theatre/${t.active_surgery.surgery_id}`}>
                    {t.active_surgery.patient_name} - {t.active_surgery.procedure}
                  </Link>
                ) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>In-Progress Surgeries</h2>
      {loading ? <p>Loading...</p> : (
        <table>
          <thead><tr><th>Patient</th><th>Procedure</th><th>Theatre</th><th>Duration</th><th></th></tr></thead>
          <tbody>
            {inProgress.map((s) => (
              <tr key={s.id}>
                <td>{s.patient_name}</td><td>{s.procedure_name}</td>
                <td>{s.theatre_number}</td><td>{s.duration_hours} hrs</td>
                <td><Link to={`/theatre/${s.id}`}>View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!loading && inProgress.length === 0 && <p>No surgeries currently in progress.</p>}

      <h2>Upcoming Bookings</h2>
      <table>
        <thead><tr><th>Booking #</th><th>Patient</th><th>Procedure</th><th>Priority</th><th>Requested Date</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {upcoming.map((b) => (
            <tr key={b.id}>
              <td>{b.booking_number}</td><td>{b.patient_name}</td><td>{b.procedure_name}</td>
              <td>{b.priority}</td><td>{new Date(b.requested_date).toLocaleString()}</td>
              <td>{b.status}</td>
              <td><Link to={`/theatre/booking/${b.id}`}>Details</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      {upcoming.length === 0 && <p>No upcoming bookings.</p>}
    </div>
  );
}