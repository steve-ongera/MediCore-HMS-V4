import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getTickets, assignTicket } from "../../services/api";

export default function ITSupportQueue() {
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [statusFilter, priorityFilter]);

  const load = async () => {
    try {
      const params = { page_size: 200 };
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const data = await getTickets(params);
      setTickets(data.results ?? data);
    } catch (err) { setError(err.message); }
  };

  const handleAssign = async (id) => {
    try { await assignTicket(id); load(); } catch (err) { setError(err.message); }
  };

  return (
    <div>
      <h1>IT Support Queue</h1>
      {error && <p>Error: {error}</p>}

      <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
        <option value="">All</option>
        <option value="OPEN">Open</option>
        <option value="ASSIGNED">Assigned</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="RESOLVED">Resolved</option>
        <option value="CLOSED">Closed</option>
        <option value="REOPENED">Reopened</option>
      </select>
      <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
        <option value="">All Priorities</option>
        <option value="CRITICAL">Critical</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </select>

      <table>
        <thead><tr><th>Ticket #</th><th>Raised By</th><th>Category</th><th>Priority</th><th>Subject</th><th>Status</th><th>Assigned To</th><th></th></tr></thead>
        <tbody>
          {tickets.map((t) => (
            <tr key={t.id} style={{ background: t.priority === "CRITICAL" ? "#fee" : "inherit" }}>
              <td>{t.ticket_number}</td><td>{t.raised_by_name}</td><td>{t.category}</td>
              <td>{t.priority}</td><td>{t.subject}</td><td>{t.status}</td>
              <td>{t.assigned_to_name || "—"}</td>
              <td>
                {t.status === "OPEN" && <button type="button" onClick={() => handleAssign(t.id)}>Assign to Me</button>}
                <Link to={`/tickets/${t.id}`}> View</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tickets.length === 0 && <p>No tickets match this filter.</p>}
    </div>
  );
}