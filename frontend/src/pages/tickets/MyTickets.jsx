import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMyTickets } from "../../services/api";

export default function MyTickets() {
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try { const data = await getMyTickets(); setTickets(data); } catch (err) { setError(err.message); }
    })();
  }, []);

  return (
    <div>
      <h1>My Tickets</h1>
      {error && <p>Error: {error}</p>}
      <Link to="/tickets/raise"><button type="button">+ Raise Ticket</button></Link>

      <table>
        <thead><tr><th>Ticket #</th><th>Subject</th><th>Category</th><th>Priority</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id}>
              <td>{t.ticket_number}</td><td>{t.subject}</td><td>{t.category}</td>
              <td>{t.priority}</td><td>{t.status}</td>
              <td><Link to={`/tickets/${t.id}`}>View</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
      {tickets.length === 0 && <p>You haven't raised any tickets.</p>}
    </div>
  );
}