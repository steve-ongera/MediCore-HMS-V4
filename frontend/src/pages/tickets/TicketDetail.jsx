import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getTicketDetail, commentOnTicket, assignTicket, startTicketProgress,
  resolveTicket, closeTicket, reopenTicket,
} from "../../services/api";
import { useAuth } from "../../context/AuthContext.jsx";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, hasRole } = useAuth();
  const isIT = hasRole("IT_SUPPORT_OFFICER");

  const [ticket, setTicket] = useState(null);
  const [commentText, setCommentText] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [rating, setRating] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try { const data = await getTicketDetail(id); setTicket(data); } catch (err) { setError(err.message); }
  };

  const submitComment = async (e) => {
    e.preventDefault();
    try {
      await commentOnTicket(id, commentText);
      setCommentText("");
      load();
    } catch (err) { setError(err.message); }
  };

  const handleAssign = async () => { try { await assignTicket(id); load(); } catch (err) { setError(err.message); } };
  const handleStart = async () => { try { await startTicketProgress(id); load(); } catch (err) { setError(err.message); } };
  const handleResolve = async () => {
    try { await resolveTicket(id, { resolution_notes: resolutionNotes }); load(); } catch (err) { setError(err.message); }
  };
  const handleClose = async () => {
    try { await closeTicket(id, { satisfaction_rating: rating || undefined }); load(); } catch (err) { setError(err.message); }
  };
  const handleReopen = async () => { try { await reopenTicket(id); load(); } catch (err) { setError(err.message); } };

  if (!ticket) return <div>Loading...</div>;

  const isOwner = user?.id === ticket.raised_by;

  return (
    <div>
      <button type="button" onClick={() => navigate(-1)}>&larr; Back</button>
      <h1>{ticket.ticket_number}</h1>
      {error && <p>Error: {error}</p>}

      <section>
        <p>Raised By: {ticket.raised_by_name} ({ticket.raised_by_role})</p>
        <p>Category: {ticket.category} — Priority: {ticket.priority} — Location: {ticket.location || "—"}</p>
        <p>Subject: {ticket.subject}</p>
        <p>Description: {ticket.description}</p>
        <p>Status: {ticket.status}</p>
        <p>Assigned To: {ticket.assigned_to_name || "Unassigned"}</p>
        {ticket.resolution_notes && <p>Resolution: {ticket.resolution_notes}</p>}
        {ticket.resolution_hours != null && <p>Resolved in {ticket.resolution_hours} hours</p>}
        {ticket.satisfaction_rating && <p>Satisfaction Rating: {ticket.satisfaction_rating}/5</p>}

        {isIT && ticket.status === "OPEN" && <button type="button" onClick={handleAssign}>Assign to Me</button>}
        {isIT && ticket.status === "ASSIGNED" && <button type="button" onClick={handleStart}>Start Working</button>}
        {isIT && (ticket.status === "ASSIGNED" || ticket.status === "IN_PROGRESS") && (
          <div>
            <textarea placeholder="Resolution notes" value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} />
            <button type="button" onClick={handleResolve}>Mark Resolved</button>
          </div>
        )}
        {(isOwner || isIT) && ticket.status === "RESOLVED" && (
          <div>
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="">Rate the resolution (optional)</option>
              <option value="5">5 - Excellent</option>
              <option value="4">4 - Good</option>
              <option value="3">3 - Average</option>
              <option value="2">2 - Poor</option>
              <option value="1">1 - Very Poor</option>
            </select>
            <button type="button" onClick={handleClose}>Confirm & Close Ticket</button>
          </div>
        )}
        {(isOwner || isIT) && (ticket.status === "RESOLVED" || ticket.status === "CLOSED") && (
          <button type="button" onClick={handleReopen}>Reopen — Issue Not Fixed</button>
        )}
      </section>

      <section>
        <h2>Comments</h2>
        {ticket.comments.map((c) => (
          <div key={c.id}><strong>{c.author_name}:</strong> {c.text} <small>({new Date(c.created_at).toLocaleString()})</small></div>
        ))}
        <form onSubmit={submitComment}>
          <input type="text" placeholder="Add a comment" value={commentText} onChange={(e) => setCommentText(e.target.value)} required />
          <button type="submit">Post</button>
        </form>
      </section>
    </div>
  );
}